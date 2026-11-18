import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FinbankApi } from '../port.ts'
import { ApiError, type IsoDate, type ListTransactionsInput, type SavingsGoal, type Transaction, type YearMonth } from '../types.ts'
import {
  createMemoryStorage,
  createMockApi,
  MOCK_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  type MockApiOptions,
  savingDayWeight,
  savingSummarySeries,
  type StorageLike,
} from './mockApi.ts'
import { MOCK_STATE_VERSION, seed } from './seed.ts'
import { buildSeedTransactions } from './seedTransactions.ts'

const stores = () => ({ local: localStorage, session: sessionStorage })
const make = (options: MockApiOptions = {}) =>
  createMockApi({ storage: localStorage, sessionStores: stores(), delayMs: 0, ...options })

const stored = () => JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY) ?? 'null')

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => {
      throw new Error('expected a rejection')
    },
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ApiError)
  return error as ApiError
}

const throwingStorage = (error: unknown = new DOMException('quota', 'QuotaExceededError')): StorageLike => ({
  getItem: () => null,
  setItem: () => {
    throw error
  },
  removeItem: () => {},
})

const seedJson = () => ({
  version: MOCK_STATE_VERSION,
  today: '2023-05-19',
  profile: seed.profile,
  accounts: seed.accounts,
  transactions: seed.transactions,
  bills: seed.bills,
  savingsGoals: seed.savingsGoals,
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

// Restores every `setItem` spy even when an assertion fails before an inline restore.
afterEach(() => {
  vi.restoreAllMocks()
})

describe('seed', () => {
  it('serves mock today and the single seeded user', async () => {
    const api = make()
    await expect(api.getToday()).resolves.toBe('2023-05-19')
    await expect(api.getProfile()).resolves.toEqual({
      fullName: 'Tanzir Rahman',
      email: 'tanzir.rahman@email.com',
      username: 'tanzir.rahman',
      phoneCountryCode: '+880',
      phoneNumber: '51547 58868',
      avatarUrl: null,
    })
  })

  it('writes the seed through to storage as the current version on first use', async () => {
    await make().getToday()
    expect(stored()).toEqual(seedJson())
  })

  it('hands out copies, so callers cannot mutate adapter state', async () => {
    const api = make()
    const profile = await api.getProfile()
    profile.fullName = 'Changed'
    await expect(api.getProfile()).resolves.toMatchObject({ fullName: 'Tanzir Rahman' })
  })
})

describe('persistence', () => {
  it('round-trips state through storage into a new adapter', async () => {
    const custom = {
      version: MOCK_STATE_VERSION,
      today: '2024-02-29',
      profile: { ...seed.profile, fullName: 'Someone Else' },
      accounts: [seed.accounts[2]],
      transactions: seed.transactions.filter((t) => t.accountId === 'acc_3'),
      bills: [seed.bills[1]],
      savingsGoals: [{ month: '2024-02', targetCents: 50_000, achievedCents: 60_000 }],
    }
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(custom))
    const api = make()
    await expect(api.getToday()).resolves.toBe('2024-02-29')
    await expect(api.getProfile()).resolves.toMatchObject({ fullName: 'Someone Else' })
    await expect(api.listAccounts()).resolves.toEqual([seed.accounts[2]])
    await expect(api.getBalanceSummary()).resolves.toEqual({
      totalBalanceCents: seed.accounts[2]!.balanceCents,
    })
    await expect(api.getSavingsGoal('2024-02' as YearMonth)).resolves.toEqual(custom.savingsGoals[0])
    expect(stored()).toEqual(custom)
  })

  it.each([
    ['missing', null],
    ['unparseable', '{not json'],
    ['an older version', JSON.stringify({ version: 1, today: '2024-01-01' })],
    ['a newer version', JSON.stringify({ version: MOCK_STATE_VERSION + 1, today: '2024-01-01' })],
    ['not an object', JSON.stringify([1, 2, 3])],
    ['null', 'null'],
  ])('falls back to the seed when the entry is %s', async (_name, raw) => {
    if (raw !== null) localStorage.setItem(MOCK_STORAGE_KEY, raw)
    const api = make()
    await expect(api.getToday()).resolves.toBe('2023-05-19')
    expect(stored()).toEqual(seedJson())
  })

  it('backfills missing top-level keys from the seed and keeps the rest', async () => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ version: MOCK_STATE_VERSION, today: '2024-03-01' }))
    const api = make()
    await expect(api.getToday()).resolves.toBe('2024-03-01')
    await expect(api.getProfile()).resolves.toEqual(seed.profile)
    expect(stored()).toEqual({ ...seedJson(), today: '2024-03-01' })
  })

  it.each([
    ['today is a number', { today: 123 }, { today: '2023-05-19' }],
    ['today is not a real date', { today: '2023-02-30' }, { today: '2023-05-19' }],
    ['today is null', { today: null }, { today: '2023-05-19' }],
    ['profile is null', { profile: null }, { profile: seed.profile }],
    ['profile is a string', { profile: 'x' }, { profile: seed.profile }],
    ['profile is an array', { profile: [1] }, { profile: seed.profile }],
    ['profile is empty', { profile: {} }, { profile: seed.profile }],
    [
      'profile fields are partly mistyped',
      { profile: { fullName: 'Jane', email: 42, avatarUrl: 7, phoneNumber: null } },
      { profile: { ...seed.profile, fullName: 'Jane' } },
    ],
    [
      'profile has a string avatar',
      { profile: { ...seed.profile, avatarUrl: 'data:image/jpeg;base64,AA' } },
      { profile: { ...seed.profile, avatarUrl: 'data:image/jpeg;base64,AA' } },
    ],
  ])('repairs a v1 entry where %s', async (_name, patch, expected) => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ ...seedJson(), ...patch }))
    const api = make()
    const want = { ...seedJson(), ...expected }
    await expect(api.getToday()).resolves.toBe(want.today)
    await expect(api.getProfile()).resolves.toEqual(want.profile)
    expect(stored()).toEqual(want)
  })

  it('keeps serving reads from memory when the first write-back hits a full store', async () => {
    const api = make({ storage: throwingStorage() })
    await expect(api.getToday()).resolves.toBe('2023-05-19')
    await expect(api.getProfile()).resolves.toEqual(seed.profile)
    await expect(api.getToday()).resolves.toBe('2023-05-19')
  })

  it('keeps serving reads when the write-back fails for another reason', async () => {
    const api = make({ storage: throwingStorage(new Error('disk')) })
    await expect(api.getToday()).resolves.toBe('2023-05-19')
  })
})

describe('accounts', () => {
  const seedTypes = ['creditCard', 'checking', 'savings', 'investment', 'loan']
  const withAccounts = (accounts: unknown) =>
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ ...seedJson(), accounts }))
  const account = (patch: Record<string, unknown> = {}) => ({ ...seed.accounts[1], ...patch })

  it('lists the five seed accounts in seed order', async () => {
    const accounts = await make().listAccounts()
    expect(accounts.map((a) => a.id)).toEqual(['acc_1', 'acc_2', 'acc_3', 'acc_4', 'acc_5'])
    expect(accounts.map((a) => a.type)).toEqual(seedTypes)
    expect(accounts[0]).toMatchObject({ network: 'mastercard', bankName: 'AB Bank Ltd.' })
    expect(accounts[0]!.accountNumber.endsWith('2598')).toBe(true)
    expect(accounts[1]).toMatchObject({
      network: 'visa',
      bankName: 'AB Bank Ltd.',
      branchName: 'Park Street Branch',
      balanceCents: 2_505_600,
    })
  })

  it('does not rewrite clean stored accounts, including card accounts with a network, on load', async () => {
    expect(seed.accounts.some((a) => a.network)).toBe(true)
    withAccounts(seed.accounts)
    const before = localStorage.getItem(MOCK_STORAGE_KEY)
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await make().listAccounts()
    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage.getItem(MOCK_STORAGE_KEY)).toBe(before)
  })

  it('derives the seed Total Balance of $240,399', async () => {
    await expect(make().getBalanceSummary()).resolves.toEqual({ totalBalanceCents: 24_039_900 })
  })

  it('adds asset accounts and subtracts liability accounts', async () => {
    withAccounts([
      account({ id: 'a', type: 'checking', balanceCents: 1000 }),
      account({ id: 'b', type: 'savings', balanceCents: 200 }),
      account({ id: 'c', type: 'investment', balanceCents: 30 }),
      account({ id: 'd', type: 'creditCard', balanceCents: 4 }),
      account({ id: 'e', type: 'loan', balanceCents: 5000 }),
    ])
    await expect(make().getBalanceSummary()).resolves.toEqual({ totalBalanceCents: 1230 - 5004 })
  })

  it('backfills a current-version state without accounts from the seed and writes it back', async () => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ version: MOCK_STATE_VERSION, today: '2023-05-19', profile: seed.profile }))
    await expect(make().listAccounts()).resolves.toEqual(seed.accounts)
    expect(stored().accounts).toEqual(seed.accounts)
  })

  it('keeps an empty account list: no cards and a zero total', async () => {
    withAccounts([])
    const api = make()
    await expect(api.listAccounts()).resolves.toEqual([])
    await expect(api.getBalanceSummary()).resolves.toEqual({ totalBalanceCents: 0 })
    expect(stored().accounts).toEqual([])
  })

  it.each([['a string', 'x'], ['an object', { acc_1: {} }], ['a number', 3]])(
    'replaces accounts stored as %s with the seed',
    async (_name, value) => {
      withAccounts(value)
      await expect(make().listAccounts()).resolves.toEqual(seed.accounts)
    },
  )

  it('drops invalid entries and repeated ids, and keeps the valid ones', async () => {
    const good = account({ id: 'ok' })
    withAccounts([
      good,
      null,
      'x',
      account({ id: '' }),
      account({ id: 'type', type: 'crypto' }),
      account({ id: 'bank', bankName: 3 }),
      account({ id: 'branch', branchName: undefined }),
      account({ id: 'net', network: 'amex' }),
      account({ id: 'num', accountNumber: '12a4' }),
      account({ id: 'short', accountNumber: '123' }),
      account({ id: 'neg', balanceCents: -1 }),
      account({ id: 'frac', balanceCents: 1.5 }),
      account({ id: 'ok', bankName: 'Duplicate' }),
    ])
    await expect(make().listAccounts()).resolves.toEqual([good])
    expect(stored().accounts).toEqual([good])
  })

  it('accepts an account without a network', async () => {
    const plain = account({ id: 'plain', network: undefined })
    withAccounts([plain])
    const [loaded] = await make().listAccounts()
    expect(loaded).toEqual(plain)
    expect(loaded).not.toHaveProperty('network')
  })

  it('treats a stored null network as absent and keeps the account', async () => {
    const plain = account({ id: 'nullnet', network: undefined })
    withAccounts([{ ...plain, network: null }])
    const [loaded] = await make().listAccounts()
    expect(loaded).toEqual(plain)
    expect(loaded).not.toHaveProperty('network')
    expect(stored().accounts).toEqual([plain])
  })

  it('hands out copies, so callers cannot mutate adapter state', async () => {
    const api = make()
    const accounts = await api.listAccounts()
    accounts[1]!.balanceCents = 1
    accounts.pop()
    const again = await api.listAccounts()
    expect(again).toHaveLength(5)
    expect(again[1]!.balanceCents).toBe(2_505_600)
    await expect(api.getBalanceSummary()).resolves.toEqual({ totalBalanceCents: 24_039_900 })
  })

  it('getAccount returns a copy of the stored account, or null for an unknown id', async () => {
    const api = make()
    const account = await api.getAccount('acc_2')
    expect(account).toEqual(seed.accounts[1])
    account!.balanceCents = 1
    await expect(api.getAccount('acc_2')).resolves.toEqual(seed.accounts[1])
    await expect(api.getAccount('nope')).resolves.toBeNull()
    await api.removeAccount('acc_2')
    await expect(api.getAccount('acc_2')).resolves.toBeNull()
  })
})

describe('removeAccount', () => {
  it('removes the account, updates the summary and persists the change', async () => {
    const api = make()
    await api.removeAccount('acc_2')
    const accounts = await api.listAccounts()
    expect(accounts.map((a) => a.id)).toEqual(['acc_1', 'acc_3', 'acc_4', 'acc_5'])
    await expect(api.getBalanceSummary()).resolves.toEqual({ totalBalanceCents: 24_039_900 - 2_505_600 })
    expect(stored().accounts.map((a: { id: string }) => a.id)).not.toContain('acc_2')
  })

  it('removes the account and its transactions in one write, leaving the other balances as stored', async () => {
    const api = make()
    await api.listAccounts()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await api.removeAccount('acc_1')
    expect(setItem).toHaveBeenCalledTimes(1)
    const { items } = await api.listTransactions({ limit: 50 })
    expect(items.some((t) => t.accountId === 'acc_1')).toBe(false)
    await expect(api.listTransactions({ accountId: 'acc_1', limit: 10 })).resolves.toEqual({
      items: [],
      nextCursor: null,
    })
    expect(stored().transactions).toEqual(seed.transactions.filter((t) => t.accountId !== 'acc_1'))
    expect(stored().accounts).toEqual(seed.accounts.filter((a) => a.id !== 'acc_1'))
    const fresh = await make().listTransactions({ limit: 50 })
    expect(fresh.items.some((t) => t.accountId === 'acc_1')).toBe(false)
  })

  it('keeps the account removed for a new adapter over the same storage', async () => {
    await make().removeAccount('acc_2')
    const accounts = await make().listAccounts()
    expect(accounts).toHaveLength(4)
    expect(accounts.map((a) => a.id)).not.toContain('acc_2')
  })

  it('resolves as a no-op for an unknown id, and when removing twice, without writing', async () => {
    const api = make()
    await api.listAccounts()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await expect(api.removeAccount('nope')).resolves.toBeUndefined()
    expect(setItem).not.toHaveBeenCalled()
    expect(await api.listAccounts()).toEqual(seed.accounts)
    expect(stored().accounts).toEqual(seed.accounts)
    await api.removeAccount('acc_1')
    expect(setItem).toHaveBeenCalledTimes(1)
    await expect(api.removeAccount('acc_1')).resolves.toBeUndefined()
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(await api.listAccounts()).toHaveLength(4)
  })

  it.each([
    ['STORAGE_FULL', new DOMException('quota', 'QuotaExceededError')],
    ['UNKNOWN', new Error('boom')],
  ])('rejects %s on a failed write and leaves memory and storage unchanged', async (code, thrown) => {
    const api = make()
    await api.listAccounts()
    const before = localStorage.getItem(MOCK_STORAGE_KEY)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw thrown
    })
    const error = await rejection(api.removeAccount('acc_2'))
    setItem.mockRestore()
    expect(error.code).toBe(code)
    expect(localStorage.getItem(MOCK_STORAGE_KEY)).toBe(before)
    expect((await api.listAccounts()).map((a) => a.id)).toContain('acc_2')
    await expect(api.getBalanceSummary()).resolves.toEqual({ totalBalanceCents: 24_039_900 })
  })

  it('removes the last account: an empty list and a zero total', async () => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ ...seedJson(), accounts: [seed.accounts[1]] }))
    const api = make()
    await api.removeAccount('acc_2')
    await expect(api.listAccounts()).resolves.toEqual([])
    await expect(api.getBalanceSummary()).resolves.toEqual({ totalBalanceCents: 0 })
    expect(stored().accounts).toEqual([])
    await expect(make().listAccounts()).resolves.toEqual([])
  })
})

describe('seed transactions', () => {
  const txns = seed.transactions
  const accountType = new Map(seed.accounts.map((a) => [a.id, a.type]))
  const payment = {
    creditCard: 'Credit Card',
    checking: 'Debit Card',
    savings: 'Bank Transfer',
    investment: 'Bank Transfer',
    loan: 'Bank Transfer',
  }

  it('ties every transaction to a seeded account, with payment method and type following the rules', () => {
    for (const t of txns) {
      const type = accountType.get(t.accountId)
      expect(type).toBeDefined()
      expect(t.paymentMethod).toBe(payment[type!])
      expect(t.type).toBe(t.kind === 'revenue' ? 'credit' : 'debit')
      if (t.kind === 'revenue') expect(t).not.toHaveProperty('category')
      else expect(t.category).toBeDefined()
      expect(Number.isSafeInteger(t.amountCents) && t.amountCents > 0).toBe(true)
      expect(t.receiptId).toMatch(/^[0-9A-Za-z]{11}$/)
      expect(t.date >= '2022-01-01' && t.date <= '2023-05-19').toBe(true)
    }
    expect(new Set(txns.map((t) => t.id)).size).toBe(txns.length)
    expect(txns.map((t) => t.id)).toEqual(txns.map((_, i) => `txn_${i + 1}`))
  })

  it('gives every account at least 15 transactions and at least one revenue row', () => {
    for (const account of seed.accounts) {
      const own = txns.filter((t) => t.accountId === account.id)
      expect(own.length).toBeGreaterThanOrEqual(15)
      expect(own.some((t) => t.kind === 'revenue')).toBe(true)
    }
  })

  it('has expenses in all six categories in both April and May 2023', () => {
    for (const month of ['2023-04', '2023-05']) {
      const categories = new Set(
        txns.filter((t) => t.kind === 'expense' && t.date.startsWith(month)).map((t) => t.category),
      )
      expect([...categories].sort()).toEqual([
        'entertainment',
        'food',
        'housing',
        'others',
        'shopping',
        'transportation',
      ])
    }
  })

  it('is mostly complete, with a few pending', () => {
    const pending = txns.filter((t) => t.status === 'pending').length
    expect(pending).toBeGreaterThan(0)
    expect(pending).toBeLessThan(txns.length / 10)
  })

  it('is deterministic', () => {
    expect(buildSeedTransactions(seed.accounts)).toEqual(txns)
  })
})

describe('listTransactions', () => {
  const seven = [
    ['GTR 5', 'Gadget & Gear', 16_000],
    ['Polo shirt', 'XL fashions', 2_000],
    ['Biriyani', 'Hajir Biriyani', 1_200],
    ['Movie ticket', 'Inox', 1_500],
    ['Taxi fare', 'Uber', 1_000],
    ['Pizza', 'Pizza Hit', 2_000],
    ['Keyboard', 'Gadget & Gear', 3_000],
  ]

  async function allPages(api: FinbankApi, input: Omit<ListTransactionsInput, 'cursor'>) {
    const items: Transaction[] = []
    let cursor: string | undefined
    let pages = 0
    for (;;) {
      const page = await api.listTransactions({ ...input, cursor })
      items.push(...page.items)
      pages += 1
      if (page.nextCursor === null) break
      cursor = page.nextCursor
    }
    return { items, pages }
  }

  const newestFirst = (items: Transaction[]) => items.every((t, i) => i === 0 || items[i - 1]!.date >= t.date)

  it('returns the 10 newest first, starting with the seven 107 rows on 2023-05-17', async () => {
    const page = await make().listTransactions({ limit: 10 })
    expect(page.items).toHaveLength(10)
    expect(page.nextCursor).toEqual(expect.any(String))
    expect(page.items.slice(0, 7).map((t) => [t.item, t.shop, t.amountCents])).toEqual(seven)
    for (const t of page.items.slice(0, 7)) {
      expect(t).toMatchObject({ date: '2023-05-17', accountId: 'acc_1', paymentMethod: 'Credit Card' })
    }
    expect(page.items[0]!.id).toBe('txn_1')
    expect(page.items.slice(7).every((t) => t.date < '2023-05-17')).toBe(true)
  })

  it('pages through every transaction exactly once, newest first, ending with a null cursor', async () => {
    const { items, pages } = await allPages(make(), { limit: 10 })
    expect(items.map((t) => t.id).sort()).toEqual(seed.transactions.map((t) => t.id).sort())
    expect(new Set(items.map((t) => t.id)).size).toBe(items.length)
    expect(pages).toBe(Math.ceil(seed.transactions.length / 10))
    expect(newestFirst(items)).toBe(true)
  })

  it('keeps stored order for equal dates', async () => {
    const { items } = await allPages(make(), { limit: 50 })
    const storedOrder = seed.transactions.map((t) => t.id)
    for (let i = 1; i < items.length; i++) {
      if (items[i - 1]!.date === items[i]!.date) {
        expect(storedOrder.indexOf(items[i - 1]!.id)).toBeLessThan(storedOrder.indexOf(items[i]!.id))
      }
    }
  })

  it.each(['revenue', 'expense'] as const)('filters by kind %s', async (kind) => {
    const { items } = await allPages(make(), { kind, limit: 10 })
    expect(items.length).toBe(seed.transactions.filter((t) => t.kind === kind).length)
    expect(items.every((t) => t.kind === kind)).toBe(true)
    expect(newestFirst(items)).toBe(true)
  })

  it('filters by account', async () => {
    const api = make()
    const first = await api.listTransactions({ accountId: 'acc_2', limit: 10 })
    expect(first.items).toHaveLength(10)
    expect(first.nextCursor).not.toBeNull()
    const { items } = await allPages(api, { accountId: 'acc_2', limit: 10 })
    expect(items.length).toBeGreaterThanOrEqual(15)
    expect(items.every((t) => t.accountId === 'acc_2')).toBe(true)
    expect(newestFirst(items)).toBe(true)
  })

  it('combines the kind and account filters', async () => {
    const { items } = await allPages(make(), { kind: 'revenue', accountId: 'acc_2', limit: 10 })
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((t) => t.kind === 'revenue' && t.accountId === 'acc_2')).toBe(true)
  })

  it('returns an empty last page for an unknown account', async () => {
    await expect(make().listTransactions({ accountId: 'nope', limit: 10 })).resolves.toEqual({
      items: [],
      nextCursor: null,
    })
  })

  it.each([
    ['limit 0', { limit: 0 }],
    ['limit 51', { limit: 51 }],
    ['a fractional limit', { limit: 2.5 }],
    ['a missing limit', {}],
    ["cursor 'x'", { limit: 10, cursor: 'x' }],
    ['a negative cursor', { limit: 10, cursor: '-1' }],
    ['an unknown kind', { limit: 10, kind: 'refund' }],
  ])('rejects %s with VALIDATION', async (_name, input) => {
    const error = await rejection(make().listTransactions(input as ListTransactionsInput))
    expect(error.code).toBe('VALIDATION')
  })

  it('accepts the page sizes 1 and 50', async () => {
    const api = make()
    await expect(api.listTransactions({ limit: 1 })).resolves.toMatchObject({ items: [{ id: 'txn_1' }] })
    expect((await api.listTransactions({ limit: 50 })).items).toHaveLength(50)
  })

  it('hands out copies, so callers cannot mutate adapter state', async () => {
    const api = make()
    const page = await api.listTransactions({ limit: 1 })
    page.items[0]!.amountCents = 1
    page.items[0]!.item = 'Changed'
    await expect(api.listTransactions({ limit: 1 })).resolves.toMatchObject({
      items: [{ item: 'GTR 5', amountCents: 16_000 }],
    })
  })
})

describe('transactions in storage', () => {
  const withState = (patch: Record<string, unknown>) =>
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ ...seedJson(), ...patch }))
  const txn = (patch: Record<string, unknown> = {}) => ({ ...seed.transactions[0], ...patch })

  it('drops orphans whose account is not stored, and writes the result back', async () => {
    withState({ accounts: seed.accounts.filter((a) => a.id !== 'acc_1') })
    const { items } = await make().listTransactions({ limit: 50, accountId: 'acc_1' })
    expect(items).toEqual([])
    expect(stored().transactions).toEqual(seed.transactions.filter((t) => t.accountId !== 'acc_1'))
  })

  it('backfills an old v1 state without transactions from the seed, minus removed accounts', async () => {
    const v1: Record<string, unknown> = { ...seedJson(), accounts: seed.accounts.filter((a) => a.id !== 'acc_2') }
    delete v1.transactions
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(v1))
    await make().getToday()
    expect(stored().transactions).toEqual(seed.transactions.filter((t) => t.accountId !== 'acc_2'))
  })

  it.each([
    ['a string', 'x'],
    ['an object', { txn_1: {} }],
    ['null', null],
  ])('replaces transactions stored as %s with the seed', async (_name, value) => {
    withState({ transactions: value })
    await make().getToday()
    expect(stored().transactions).toEqual(seed.transactions)
  })

  it('keeps an empty transaction list', async () => {
    withState({ transactions: [] })
    await expect(make().listTransactions({ limit: 10 })).resolves.toEqual({ items: [], nextCursor: null })
    expect(stored().transactions).toEqual([])
  })

  it('drops invalid entries and repeated ids, and keeps the valid ones', async () => {
    const good = txn({ id: 'ok' })
    const { category: _category, ...expense } = txn({ id: 'rev' })
    void _category
    const revenue = { ...expense, kind: 'revenue', type: 'credit', icon: 'salary' }
    withState({
      transactions: [
        good,
        revenue,
        null,
        'x',
        txn({ id: '' }),
        txn({ id: 'acct', accountId: 3 }),
        txn({ id: 'kind', kind: 'gift' }),
        txn({ id: 'type', type: 'credit' }),
        txn({ id: 'revcat', kind: 'revenue', type: 'credit' }),
        txn({ id: 'cat', category: 'travel' }),
        txn({ id: 'status', status: 'failed' }),
        txn({ id: 'pay', paymentMethod: '' }),
        txn({ id: 'receipt', receiptId: 7 }),
        txn({ id: 'zero', amountCents: 0 }),
        txn({ id: 'frac', amountCents: 1.5 }),
        txn({ id: 'date', date: '2023-02-30' }),
        txn({ id: 'icon', icon: 'rocket' }),
        txn({ id: 'ok', item: 'Duplicate' }),
      ],
    })
    const { items } = await make().listTransactions({ limit: 50 })
    expect(items).toEqual([good, revenue])
    expect(stored().transactions).toEqual([good, revenue])
  })

  it('pages stored rows newest first whatever their stored order, keeping stored order for equal dates', async () => {
    const at = (id: string, date: string) => txn({ id, date })
    withState({
      transactions: [
        at('mid', '2023-05-01'),
        at('oldest', '2023-04-02'),
        at('sameA', '2023-05-10'),
        at('newest', '2023-05-16'),
        at('sameB', '2023-05-10'),
        at('old', '2023-04-20'),
      ],
    })
    const api = make()
    const ids: string[] = []
    let cursor: string | undefined
    for (;;) {
      const page = await api.listTransactions({ limit: 2, cursor })
      ids.push(...page.items.map((t) => t.id))
      if (page.nextCursor === null) break
      cursor = page.nextCursor
    }
    expect(ids).toEqual(['newest', 'sameA', 'sameB', 'mid', 'old', 'oldest'])
  })

  it('drops rows whose payment method disagrees with their account type, and writes the result back', async () => {
    const good = txn({ id: 'ok' })
    const debitOnCredit = txn({ id: 'wrong', paymentMethod: 'Debit Card' })
    withState({ transactions: [good, debitOnCredit] })
    await expect(make().listTransactions({ limit: 10 })).resolves.toEqual({ items: [good], nextCursor: null })
    expect(stored().transactions).toEqual([good])
  })

  it('does not rewrite clean stored transactions on load', async () => {
    // The full seed, including card accounts with a `network`: normalized key order matches
    // storage byte for byte.
    withState({})
    const before = localStorage.getItem(MOCK_STORAGE_KEY)
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await make().listTransactions({ limit: 10 })
    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage.getItem(MOCK_STORAGE_KEY)).toBe(before)
  })
})

describe('listCategorySummaries', () => {
  const withTransactions = (transactions: unknown) =>
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ ...seedJson(), transactions }))
  const txn = (patch: Record<string, unknown>) => ({ ...seed.transactions.find((t) => t.kind === 'expense')!, ...patch })
  const order = ['housing', 'food', 'transportation', 'entertainment', 'shopping', 'others']

  it('returns six May 2023 summaries in fixed order, with totals and signed % change from the seed', async () => {
    const summaries = await make().listCategorySummaries()
    expect(summaries.map((s) => [s.category, s.totalCents, s.changePct])).toEqual([
      ['housing', 202_300, -11],
      ['food', 8_370, -89],
      ['transportation', 22_000, -62],
      ['entertainment', 54_999, 409],
      ['shopping', 84_900, -24],
      ['others', 370_240, -10],
    ])
  })

  it('totals every May expense of the category, pending included, and nothing else', async () => {
    const summaries = await make().listCategorySummaries()
    for (const summary of summaries) {
      const expected = seed.transactions
        .filter((t) => t.kind === 'expense' && t.category === summary.category && t.date.startsWith('2023-05'))
        .reduce((total, t) => total + t.amountCents, 0)
      expect(summary.totalCents).toBe(expected)
    }
  })

  it('lists the two newest items, equal dates in stored order', async () => {
    const summaries = await make().listCategorySummaries()
    const shopping = summaries.find((s) => s.category === 'shopping')!
    expect(shopping.recentItems.map((t) => t.item)).toEqual(['GTR 5', 'Polo shirt'])
    for (const summary of summaries) {
      expect(summary.recentItems).toHaveLength(2)
      for (const item of summary.recentItems) {
        expect(item.category).toBe(summary.category)
        expect(item.date.startsWith('2023-05')).toBe(true)
      }
    }
  })

  it('returns copies', async () => {
    const api = make()
    const first = await api.listCategorySummaries()
    first[0]!.recentItems[0]!.item = 'Mutated'
    const second = await api.listCategorySummaries()
    expect(second[0]!.recentItems[0]!.item).not.toBe('Mutated')
  })

  it('rounds a half percent away from zero for both signs', async () => {
    withTransactions([
      // Food: 2000 -> 1010 is -49.5% -> -50; Housing: 2000 -> 2990 is +49.5% -> +50.
      txn({ id: 'f0', category: 'food', date: '2023-04-03', amountCents: 2_000 }),
      txn({ id: 'f1', category: 'food', date: '2023-05-03', amountCents: 1_010 }),
      txn({ id: 'h0', category: 'housing', date: '2023-04-03', amountCents: 2_000 }),
      txn({ id: 'h1', category: 'housing', date: '2023-05-03', amountCents: 2_990 }),
    ])
    const by = Object.fromEntries((await make().listCategorySummaries()).map((s) => [s.category, s]))
    expect(by.food!.changePct).toBe(-50)
    expect(by.housing!.changePct).toBe(50)
  })

  it('handles empty, from-zero, flat, untagged and other-month rows', async () => {
    const { category: _category, ...untagged } = txn({ id: 'untagged', date: '2023-05-10', amountCents: 99_999 })
    void _category
    withTransactions([
      // Food: 0 -> 1500 (pending): undefined growth, shown as 100.
      txn({ id: 'f1', category: 'food', date: '2023-05-02', amountCents: 1_500, status: 'pending' }),
      // Housing: 1000 -> 1000: 0.
      txn({ id: 'h0', category: 'housing', date: '2023-04-20', amountCents: 1_000 }),
      txn({ id: 'h1', category: 'housing', date: '2023-05-01', amountCents: 1_000 }),
      // Transportation: 1000 -> 0: -100, no items.
      txn({ id: 't0', category: 'transportation', date: '2023-04-03', amountCents: 1_000 }),
      // Shopping: 1000 -> 1004 rounds to 0; March is ignored.
      txn({ id: 's0', category: 'shopping', date: '2023-04-03', amountCents: 1_000 }),
      txn({ id: 's1', category: 'shopping', date: '2023-05-03', amountCents: 1_004 }),
      txn({ id: 's2', category: 'shopping', date: '2023-03-03', amountCents: 50_000 }),
      // Entertainment: 1000 -> 996 rounds to -0, normalised to 0.
      txn({ id: 'e0', category: 'entertainment', date: '2023-04-03', amountCents: 1_000 }),
      txn({ id: 'e1', category: 'entertainment', date: '2023-05-03', amountCents: 996 }),
      untagged,
    ])
    const summaries = await make().listCategorySummaries()
    expect(summaries.map((s) => s.category)).toEqual(order)
    const by = Object.fromEntries(summaries.map((s) => [s.category, s]))
    expect(by.food).toMatchObject({ totalCents: 1_500, changePct: 100 })
    expect(by.food!.recentItems.map((t) => t.id)).toEqual(['f1'])
    expect(by.housing).toMatchObject({ totalCents: 1_000, changePct: 0 })
    expect(by.transportation).toEqual({ category: 'transportation', totalCents: 0, changePct: -100, recentItems: [] })
    expect(by.shopping).toMatchObject({ totalCents: 1_004, changePct: 0 })
    expect(Object.is(by.entertainment!.changePct, 0)).toBe(true)
    expect(by.others).toEqual({ category: 'others', totalCents: 0, changePct: 0, recentItems: [] })
    expect(summaries.flatMap((s) => s.recentItems).some((t) => t.id === 'untagged')).toBe(false)
  })

  it('reflects removeAccount on the next call', async () => {
    const api = make()
    await api.listCategorySummaries()
    await api.removeAccount('acc_5')
    const summaries = await api.listCategorySummaries()
    expect(summaries.map((s) => [s.category, s.totalCents, s.changePct])).toEqual([
      ['housing', 174_300, 43],
      ['food', 8_370, -55],
      ['transportation', 7_000, -79],
      ['entertainment', 6_999, -35],
      ['shopping', 29_900, -73],
      ['others', 367_740, -9],
    ])
    expect(summaries.flatMap((s) => s.recentItems).some((t) => t.accountId === 'acc_5')).toBe(false)
  })
})

describe('seed history', () => {
  const history = seed.transactions.filter((t) => t.date < '2023-04-01')

  it('covers every month from Jan 2022 to Mar 2023 in all six categories, on existing accounts, none pending', () => {
    const accounts = new Set(seed.accounts.map((a) => a.id))
    const months = [...new Set(history.map((t) => t.date.slice(0, 7)))].sort()
    expect(months).toHaveLength(15)
    expect(months[0]).toBe('2022-01')
    expect(months.at(-1)).toBe('2023-03')
    for (const month of months) {
      const rows = history.filter((t) => t.date.startsWith(month))
      expect(new Set(rows.map((t) => t.category)).size).toBe(6)
      const total = rows.reduce((sum, t) => sum + t.amountCents, 0)
      expect(total).toBeGreaterThanOrEqual(3_000_00)
      expect(total).toBeLessThanOrEqual(15_000_00)
    }
    for (const t of history) {
      expect(t.kind).toBe('expense')
      expect(t.status).toBe('complete')
      expect(accounts.has(t.accountId)).toBe(true)
    }
  })

  it('comes after every April/May row, so their ids are unchanged', () => {
    const recent = seed.transactions.filter((t) => t.date >= '2023-04-01')
    expect(recent.map((t) => t.id)).toEqual(recent.map((_, i) => `txn_${i + 1}`))
    expect(seed.transactions[0]).toMatchObject({ id: 'txn_1', item: 'GTR 5' })
    expect(history[0]!.id).toBe(`txn_${recent.length + 1}`)
  })
})

describe('getComparison', () => {
  const expenseSum = (transactions: readonly Transaction[], prefix: string) =>
    transactions
      .filter((t) => t.kind === 'expense' && t.category !== undefined && t.date.startsWith(prefix))
      .reduce((total, t) => total + t.amountCents, 0)
  const sumOn = (prefix: string) => expenseSum(seed.transactions, prefix)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  it('year: Jan–Dec 2023 against 2022, null after May', async () => {
    const points = await make().getComparison('year')
    expect(points.map((p) => p.label)).toEqual(months)
    points.forEach((point, i) => {
      const mm = String(i + 1).padStart(2, '0')
      expect(point.currentCents).toBe(i < 5 ? sumOn(`2023-${mm}`) : null)
      expect(point.previousCents).toBe(sumOn(`2022-${mm}`))
      expect(typeof point.previousCents).toBe('number')
    })
    expect(points.map((p) => p.currentCents)).toEqual([
      520_000, 910_000, 640_000, 897_959, 742_809, null, null, null, null, null, null, null,
    ])
    expect(points.map((p) => p.previousCents)).toEqual([
      420_000, 680_000, 310_000, 940_000, 1_250_000, 560_000, 790_000, 1_480_000, 360_000, 1_020_000, 830_000,
      1_360_000,
    ])
  })

  it('shares one expense source with the category summaries', async () => {
    const api = make()
    const [points, summaries] = await Promise.all([api.getComparison('year'), api.listCategorySummaries()])
    const may = points.find((p) => p.label === 'May')!
    expect(may.currentCents).toBe(summaries.reduce((total, s) => total + s.totalCents, 0))
    // April against the April category sums (the summaries' previous month).
    expect(points.find((p) => p.label === 'Apr')!.currentCents).toBe(sumOn('2023-04'))
  })

  it('week: 14 Sun to 20 Sat against 7–13 May, null after today', async () => {
    const points = await make().getComparison('week')
    expect(points.map((p) => p.label)).toEqual(['14 Sun', '15 Mon', '16 Tue', '17 Wed', '18 Thu', '19 Fri', '20 Sat'])
    points.forEach((point, i) => {
      const day = 14 + i
      expect(point.currentCents).toBe(day <= 19 ? sumOn(`2023-05-${day}`) : null)
      expect(point.previousCents).toBe(sumOn(`2023-05-${String(day - 7).padStart(2, '0')}`))
    })
    expect(points[5]!.currentCents).toBe(0)
    expect(points[6]!.currentCents).toBeNull()
    expect(points.map((p) => p.currentCents)).toEqual([6_800, 4_520, 0, 26_700, 0, 0, null])
  })

  it('week: each day equals the categorized expenses Transactions and Account Details list for it', async () => {
    const api = make()
    async function listed(input: Omit<ListTransactionsInput, 'cursor' | 'limit'>) {
      const items: Transaction[] = []
      let cursor: string | undefined
      for (let page = 0; page < 100; page++) {
        const result = await api.listTransactions({ ...input, limit: 50, cursor })
        items.push(...result.items)
        if (result.nextCursor === null) return items
        cursor = result.nextCursor
      }
      throw new Error('listTransactions never ran out of pages')
    }
    const dayTotal = (items: readonly Transaction[], day: string) =>
      items.filter((t) => t.category !== undefined && t.date === day).reduce((total, t) => total + t.amountCents, 0)
    const expenses = await listed({ kind: 'expense' })
    const byAccount = await Promise.all((await api.listAccounts()).map((a) => listed({ accountId: a.id, kind: 'expense' })))
    const week = await api.getComparison('week')
    week.forEach((point, i) => {
      const day = `2023-05-${String(14 + i).padStart(2, '0')}`
      const previous = `2023-05-${String(7 + i).padStart(2, '0')}`
      if (point.currentCents !== null) {
        expect(point.currentCents).toBe(dayTotal(expenses, day))
        expect(point.currentCents).toBe(byAccount.reduce((total, items) => total + dayTotal(items, day), 0))
      }
      expect(point.previousCents).toBe(dayTotal(expenses, previous))
    })
    expect(week.map((p) => p.currentCents)).toEqual([6_800, 4_520, 0, 26_700, 0, 0, null])
    expect(Math.max(...week.map((p) => p.previousCents))).toBe(dayTotal(expenses, '2023-05-12'))
  })

  it('counts pending, leaves out revenue and untagged expenses', async () => {
    const base = seed.transactions.find((t) => t.kind === 'expense')!
    const { category: _category, ...untagged } = { ...base, id: 'u', date: '2023-05-15', amountCents: 9_999 }
    void _category
    const revenue = seed.transactions.find((t) => t.kind === 'revenue' && t.accountId === base.accountId)!
    localStorage.setItem(
      MOCK_STORAGE_KEY,
      JSON.stringify({
        ...seedJson(),
        transactions: [
          { ...base, id: 'p', date: '2023-05-15', amountCents: 1_000, status: 'pending' },
          { ...base, id: 'c', date: '2022-05-08', amountCents: 2_000 },
          { ...revenue, id: 'r', date: '2023-05-15', amountCents: 50_000 },
          untagged,
        ],
      }),
    )
    const api = make()
    const week = await api.getComparison('week')
    expect(week[1]).toEqual({ label: '15 Mon', currentCents: 1_000, previousCents: 0 })
    const year = await api.getComparison('year')
    expect(year[4]).toEqual({ label: 'May', currentCents: 1_000, previousCents: 2_000 })
    expect(year[0]).toEqual({ label: 'Jan', currentCents: 0, previousCents: 0 })
  })

  it('follows mock today', async () => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ ...seedJson(), today: '2023-01-01' }))
    const api = make()
    const year = await api.getComparison('year')
    expect(year.map((p) => p.currentCents === null)).toEqual([false, ...Array<boolean>(11).fill(true)])
    const week = await api.getComparison('week')
    expect(week.map((p) => p.label)).toEqual(['01 Sun', '02 Mon', '03 Tue', '04 Wed', '05 Thu', '06 Fri', '07 Sat'])
    expect(week.slice(1).every((p) => p.currentCents === null)).toBe(true)
  })

  it('reflects removeAccount on the next call', async () => {
    const api = make()
    await api.getComparison('year')
    await api.removeAccount('acc_5')
    const remaining = seed.transactions.filter((t) => t.accountId !== 'acc_5')
    const year = await api.getComparison('year')
    expect(year[4]).toEqual({
      label: 'May',
      currentCents: expenseSum(remaining, '2023-05'),
      previousCents: expenseSum(remaining, '2022-05'),
    })
    expect(year[4]!.currentCents).toBe(594_309)
    expect(year[4]!.previousCents).toBeLessThan(sumOn('2022-05'))
    const week = await api.getComparison('week')
    expect(week[5]!.previousCents).toBe(expenseSum(remaining, '2023-05-12'))
  })

  it('rejects an unknown granularity with VALIDATION', async () => {
    const error = await rejection(make().getComparison('month' as never))
    expect(error.code).toBe('VALIDATION')
  })
})

describe('seed bills', () => {
  const addMonths = (iso: string, months: number) => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
    const total = y * 12 + (m - 1) + months
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  it('has the three 108 bills, all due after mock today and last charged one cycle before', () => {
    expect(seed.bills.map((b) => [b.id, b.vendor, b.logo, b.title, b.amountCents, b.billingCycle])).toEqual([
      ['bill_1', 'Figma', 'figma', 'Figma - Yearly Plan', 15_000, 'yearly'],
      ['bill_2', 'Adobe', 'adobe', 'Adobe Inc - Yearly Plan', 55_900, 'yearly'],
      ['bill_3', 'Google', 'google', 'Google Workspace - Monthly Plan', 7_200, 'monthly'],
    ])
    for (const bill of seed.bills) {
      expect(bill.dueDate > seed.today).toBe(true)
      expect(bill.lastChargeDate <= seed.today).toBe(true)
      expect(addMonths(bill.lastChargeDate, bill.billingCycle === 'yearly' ? 12 : 1)).toBe(bill.dueDate)
      expect(bill.description.length).toBeGreaterThan(0)
    }
  })
})

describe('listBills', () => {
  const withBills = (bills: unknown) =>
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ ...seedJson(), bills }))
  const bill = (patch: Record<string, unknown> = {}) => ({ ...seed.bills[0], ...patch })

  it('returns every bill by due date: Figma (May 25), Adobe (Jun 16), Google (Jun 18)', async () => {
    const bills = await make().listBills({})
    expect(bills.map((b) => [b.vendor, b.dueDate])).toEqual([
      ['Figma', '2023-05-25'],
      ['Adobe', '2023-06-16'],
      ['Google', '2023-06-18'],
    ])
    await expect(make().listBills()).resolves.toEqual(bills)
  })

  it('truncates to the limit', async () => {
    const bills = await make().listBills({ limit: 2 })
    expect(bills.map((b) => b.vendor)).toEqual(['Figma', 'Adobe'])
    await expect(make().listBills({ limit: 50 })).resolves.toHaveLength(3)
  })

  it.each([0, 51, 1.5, -1, Number.NaN])('rejects the limit %s with VALIDATION', async (limit) => {
    const error = await rejection(make().listBills({ limit }))
    expect(error.code).toBe('VALIDATION')
  })

  it('sorts shuffled storage by due date, keeping stored order for equal dates', async () => {
    withBills([
      bill({ id: 'late', dueDate: '2023-07-01' }),
      bill({ id: 'sameA', dueDate: '2023-06-01' }),
      bill({ id: 'early', dueDate: '2023-05-20' }),
      bill({ id: 'sameB', dueDate: '2023-06-01' }),
    ])
    const bills = await make().listBills()
    expect(bills.map((b) => b.id)).toEqual(['early', 'sameA', 'sameB', 'late'])
  })

  it('hands out copies, so callers cannot mutate adapter state', async () => {
    const api = make()
    const [first] = await api.listBills()
    first!.amountCents = 1
    await expect(api.listBills()).resolves.toEqual(seed.bills)
  })

  it('backfills an old v1 state without bills from the seed and writes it back', async () => {
    const v1: Record<string, unknown> = seedJson()
    delete v1.bills
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(v1))
    await expect(make().listBills()).resolves.toEqual(seed.bills)
    expect(stored().bills).toEqual(seed.bills)
  })

  it.each([
    ['a string', 'x'],
    ['an object', { bill_1: {} }],
    ['null', null],
  ])('replaces bills stored as %s with the seed', async (_name, value) => {
    withBills(value)
    await make().getToday()
    expect(stored().bills).toEqual(seed.bills)
  })

  it('keeps an empty bill list', async () => {
    withBills([])
    await expect(make().listBills()).resolves.toEqual([])
    expect(stored().bills).toEqual([])
  })

  it('drops invalid entries and repeated ids, and keeps the valid ones', async () => {
    const good = bill({ id: 'ok' })
    withBills([
      good,
      null,
      'x',
      bill({ id: '' }),
      bill({ id: 'logo', logo: 'netflix' }),
      bill({ id: 'cycle', billingCycle: 'weekly' }),
      bill({ id: 'due', dueDate: '2023-02-30' }),
      bill({ id: 'last', lastChargeDate: 'soon' }),
      bill({ id: 'zero', amountCents: 0 }),
      bill({ id: 'neg', amountCents: -100 }),
      bill({ id: 'frac', amountCents: 1.5 }),
      bill({ id: 'title', title: 7 }),
      bill({ id: 'ok', vendor: 'Duplicate' }),
    ])
    await expect(make().listBills()).resolves.toEqual([good])
    expect(stored().bills).toEqual([good])
  })

  it('does not rewrite clean stored bills on load', async () => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(seedJson()))
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await make().listBills()
    expect(setItem).not.toHaveBeenCalled()
  })
})

describe('getSavingsGoal', () => {
  const withGoals = (savingsGoals: unknown) =>
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ ...seedJson(), savingsGoals }))
  const goal = (patch: Record<string, unknown> = {}) => ({ ...seed.savingsGoals[4], ...patch })
  const ym = (value: string) => value as YearMonth

  it('seeds one goal per month from January to May 2023', () => {
    expect(seed.savingsGoals.map((g) => [g.month, g.targetCents, g.achievedCents])).toEqual([
      ['2023-01', 1_500_000, 1_420_000],
      ['2023-02', 1_500_000, 1_560_000],
      ['2023-03', 1_800_000, 1_630_000],
      ['2023-04', 1_800_000, 1_710_000],
      ['2023-05', 2_000_000, 1_250_000],
    ])
  })

  it('returns the seeded goal of a month', async () => {
    await expect(make().getSavingsGoal(ym('2023-05'))).resolves.toEqual({
      month: '2023-05',
      targetCents: 2_000_000,
      achievedCents: 1_250_000,
    })
  })

  it('returns a zero goal for a month without one', async () => {
    await expect(make().getSavingsGoal(ym('2022-08'))).resolves.toEqual({
      month: '2022-08',
      targetCents: 0,
      achievedCents: 0,
    })
  })

  it.each(['2023-13', '2023-05-01', '', 'May'])('rejects the month %j with VALIDATION', async (month) => {
    expect((await rejection(make().getSavingsGoal(ym(month)))).code).toBe('VALIDATION')
  })

  it('hands out copies, so callers cannot mutate adapter state', async () => {
    const api = make()
    const first = await api.getSavingsGoal(ym('2023-05'))
    first.targetCents = 1
    await expect(api.getSavingsGoal(ym('2023-05'))).resolves.toMatchObject({ targetCents: 2_000_000 })
  })

  it('backfills a stored state without goals from the seed and writes it back', async () => {
    const old: Record<string, unknown> = seedJson()
    delete old.savingsGoals
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(old))
    await expect(make().getSavingsGoal(ym('2023-04'))).resolves.toMatchObject({ achievedCents: 1_710_000 })
    expect(stored().savingsGoals).toEqual(seed.savingsGoals)
  })

  it.each([
    ['a string', 'x'],
    ['an object', { '2023-05': {} }],
    ['null', null],
  ])('replaces goals stored as %s with the seed', async (_name, value) => {
    withGoals(value)
    await make().getToday()
    expect(stored().savingsGoals).toEqual(seed.savingsGoals)
  })

  it('drops invalid entries and repeated months, keeps the valid ones and writes the result back', async () => {
    const good = goal()
    withGoals([
      good,
      null,
      'x',
      goal({ month: '2023-13' }),
      goal({ month: '2023-04-01' }),
      goal({ month: '2023-03', targetCents: -1 }),
      goal({ month: '2023-03', achievedCents: 1.5 }),
      goal({ month: '2023-03', targetCents: '100' }),
      goal({ month: '2023-03', achievedCents: Number.MAX_SAFE_INTEGER + 1 }),
      goal({ targetCents: 1 }),
    ])
    await expect(make().getSavingsGoal(ym('2023-05'))).resolves.toEqual(good)
    await expect(make().getSavingsGoal(ym('2023-03'))).resolves.toMatchObject({ targetCents: 0, achievedCents: 0 })
    expect(stored().savingsGoals).toEqual([good])
  })

  it('does not rewrite clean stored goals on load', async () => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(seedJson()))
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await make().getSavingsGoal(ym('2023-05'))
    expect(setItem).not.toHaveBeenCalled()
  })
})

describe('updateSavingsGoal', () => {
  const ym = (value: string) => value as YearMonth

  it('updates a seeded month, returns a copy and persists it for a fresh adapter', async () => {
    const api = make()
    const saved = await api.updateSavingsGoal(ym('2023-05'), { targetCents: 2_500_000, achievedCents: 1_300_050 })
    expect(saved).toEqual({ month: '2023-05', targetCents: 2_500_000, achievedCents: 1_300_050 })
    saved.targetCents = 1
    await expect(api.getSavingsGoal(ym('2023-05'))).resolves.toEqual({
      month: '2023-05',
      targetCents: 2_500_000,
      achievedCents: 1_300_050,
    })
    await expect(make().getSavingsGoal(ym('2023-05'))).resolves.toMatchObject({ targetCents: 2_500_000 })
    expect(stored().savingsGoals).toHaveLength(seed.savingsGoals.length)
    expect(stored().savingsGoals[4]).toEqual({ month: '2023-05', targetCents: 2_500_000, achievedCents: 1_300_050 })
  })

  it('accepts a present amount above the target', async () => {
    await expect(
      make().updateSavingsGoal(ym('2023-05'), { targetCents: 2_000_000, achievedCents: 3_000_000 }),
    ).resolves.toMatchObject({ targetCents: 2_000_000, achievedCents: 3_000_000 })
  })

  it('creates the goal of a month that had none', async () => {
    await make().updateSavingsGoal(ym('2022-06'), { targetCents: 100_000, achievedCents: 0 })
    await expect(make().getSavingsGoal(ym('2022-06'))).resolves.toEqual({
      month: '2022-06',
      targetCents: 100_000,
      achievedCents: 0,
    })
    expect(stored().savingsGoals).toHaveLength(seed.savingsGoals.length + 1)
  })

  it.each([
    ['negative', -1],
    ['non-integer', 1.5],
    ['unsafe', Number.MAX_SAFE_INTEGER + 1],
    ['NaN', Number.NaN],
    ['a string', '100'],
  ])('rejects %s cents with VALIDATION field errors and does not write', async (_name, bad) => {
    const api = make()
    await api.getToday()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const error = await rejection(
      api.updateSavingsGoal(ym('2023-05'), { targetCents: bad as number, achievedCents: bad as number }),
    )
    expect(error.code).toBe('VALIDATION')
    expect(Object.keys(error.fieldErrors ?? {}).sort()).toEqual(['achievedCents', 'targetCents'])
    expect(setItem).not.toHaveBeenCalled()
  })

  it('names only the bad field', async () => {
    const error = await rejection(make().updateSavingsGoal(ym('2023-05'), { targetCents: 100, achievedCents: -5 }))
    expect(Object.keys(error.fieldErrors ?? {})).toEqual(['achievedCents'])
  })

  it.each(['2023-13', '2023-05-01', ''])('rejects the month %j with VALIDATION', async (month) => {
    const error = await rejection(make().updateSavingsGoal(ym(month), { targetCents: 1, achievedCents: 1 }))
    expect(error.code).toBe('VALIDATION')
  })

  it('rejects on a failed write and leaves memory and storage unchanged', async () => {
    const api = make()
    await api.getToday()
    const before = localStorage.getItem(MOCK_STORAGE_KEY)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const error = await rejection(api.updateSavingsGoal(ym('2023-05'), { targetCents: 1, achievedCents: 1 }))
    setItem.mockRestore()
    expect(error.code).toBe('STORAGE_FULL')
    expect(localStorage.getItem(MOCK_STORAGE_KEY)).toBe(before)
    await expect(api.getSavingsGoal(ym('2023-05'))).resolves.toMatchObject({ targetCents: 2_000_000 })
  })
})

describe('getSavingSummary', () => {
  const ym = (value: string) => value as YearMonth
  const iso = (value: string) => value as IsoDate
  const sum = (values: readonly (number | null)[]) => values.reduce<number>((a, b) => a + (b ?? 0), 0)

  it('splits the current month over days 1 to today and leaves later days null', async () => {
    const points = await make().getSavingSummary(ym('2023-05'))
    expect(points).toHaveLength(31)
    expect(points[0]!.date).toBe('2023-05-01')
    expect(points[30]!.date).toBe('2023-05-31')
    expect(points.slice(0, 19).every((p) => p.currentCents !== null)).toBe(true)
    expect(points.slice(19).every((p) => p.currentCents === null)).toBe(true)
    expect(sum(points.map((p) => p.currentCents))).toBe(1_250_000)
  })

  it('splits the previous month over all its days, null on a day it lacks', async () => {
    const points = await make().getSavingSummary(ym('2023-05'))
    expect(points.slice(0, 30).every((p) => p.previousCents !== null)).toBe(true)
    expect(points[30]!.previousCents).toBeNull()
    expect(sum(points.map((p) => p.previousCents))).toBe(1_710_000)
  })

  it('uses every day of a past month', async () => {
    const points = await make().getSavingSummary(ym('2023-04'))
    expect(points).toHaveLength(30)
    expect(points.every((p) => p.currentCents !== null && p.previousCents !== null)).toBe(true)
    expect(sum(points.map((p) => p.currentCents))).toBe(1_710_000)
    // March has 31 days: its split is the same one March's own chart shows, minus March 31.
    const march = await make().getSavingSummary(ym('2023-03'))
    expect(sum(march.map((p) => p.currentCents))).toBe(1_630_000)
    expect(points.map((p) => p.previousCents)).toEqual(march.slice(0, 30).map((p) => p.currentCents))
  })

  it('gives zeros for a month, or a previous month, without a stored goal', async () => {
    const jan = await make().getSavingSummary(ym('2023-01'))
    expect(jan.every((p) => p.previousCents === 0)).toBe(true)
    expect(sum(jan.map((p) => p.currentCents))).toBe(1_420_000)
    const june = await make().getSavingSummary(ym('2022-06'))
    expect(june.every((p) => p.currentCents === 0 && p.previousCents === 0)).toBe(true)
  })

  it('gives every day a non-negative integer share', async () => {
    const points = await make().getSavingSummary(ym('2023-05'))
    for (const p of points) {
      for (const v of [p.currentCents, p.previousCents]) {
        if (v !== null) expect(Number.isSafeInteger(v) && v >= 0).toBe(true)
      }
    }
  })

  it.each(['2023-13', '2023-05-01', '', 'May'])('rejects the month %j with VALIDATION', async (month) => {
    expect((await rejection(make().getSavingSummary(ym(month)))).code).toBe('VALIDATION')
  })

  it('follows updateSavingsGoal: the series rescales to the new stored Present', async () => {
    const api = make()
    const before = await api.getSavingSummary(ym('2023-05'))
    await api.updateSavingsGoal(ym('2023-05'), { targetCents: 1, achievedCents: 2_500_000 })
    const after = await api.getSavingSummary(ym('2023-05'))
    expect(sum(after.map((p) => p.currentCents))).toBe(2_500_000)
    expect(after.map((p) => p.previousCents)).toEqual(before.map((p) => p.previousCents))
    await api.updateSavingsGoal(ym('2023-04'), { targetCents: 1, achievedCents: 300 })
    expect(sum((await api.getSavingSummary(ym('2023-05'))).map((p) => p.previousCents))).toBe(300)
  })

  it('ignores the target', async () => {
    const api = make()
    const before = await api.getSavingSummary(ym('2023-05'))
    await api.updateSavingsGoal(ym('2023-05'), { targetCents: 99_999_999, achievedCents: 1_250_000 })
    expect(await api.getSavingSummary(ym('2023-05'))).toEqual(before)
  })

  it('keeps values above $5,000 a day as they are (the chart clamps, the data does not)', () => {
    const goals: SavingsGoal[] = [{ month: ym('2023-04'), targetCents: 0, achievedCents: 100_000_000 }]
    const points = savingSummarySeries(goals, iso('2023-05-19'), ym('2023-04'))
    expect(Math.max(...points.map((p) => p.currentCents ?? 0))).toBeGreaterThan(500_000)
    expect(sum(points.map((p) => p.currentCents))).toBe(100_000_000)
  })

  it('splits huge safe amounts exactly', () => {
    const goals: SavingsGoal[] = [{ month: ym('2023-04'), targetCents: 0, achievedCents: Number.MAX_SAFE_INTEGER }]
    const points = savingSummarySeries(goals, iso('2023-05-19'), ym('2023-04'))
    expect(points.reduce((a, p) => a + BigInt(p.currentCents!), 0n)).toBe(BigInt(Number.MAX_SAFE_INTEGER))
  })

  it('is all null for the current series of a month after today', () => {
    const points = savingSummarySeries([], iso('2023-05-19'), ym('2023-06'))
    expect(points.every((p) => p.currentCents === null)).toBe(true)
  })

  it('weights each day deterministically within 0.4…1.6', () => {
    for (const month of ['2023-02', '2023-04', '2023-05', '2024-02']) {
      for (let d = 1; d <= 28; d++) {
        const date = iso(`${month}-${String(d).padStart(2, '0')}`)
        const w = savingDayWeight(date)
        expect(w).toBe(savingDayWeight(date))
        expect(Number.isInteger(w) && w >= 40 && w <= 160).toBe(true)
      }
    }
  })
})

describe('default stores', () => {
  function blockStorage(name: 'localStorage' | 'sessionStorage') {
    const original = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    return () => {
      if (original) Object.defineProperty(globalThis, name, original)
      else Reflect.deleteProperty(globalThis, name)
    }
  }

  it('falls back to in-memory stores when browser storage throws on access', async () => {
    const restoreLocal = blockStorage('localStorage')
    const restoreSession = blockStorage('sessionStorage')
    try {
      const api = createMockApi({ delayMs: 0 })
      await expect(api.getToday()).resolves.toBe('2023-05-19')
      await api.login({ email: 'a@b.co', password: 'pw', persistent: false })
      await expect(api.getSession()).resolves.toEqual({ userId: 'usr_1', persistent: false })
      await api.logout()
      await expect(api.getSession()).resolves.toBeNull()
    } finally {
      restoreLocal()
      restoreSession()
    }
  })

  it('createMemoryStorage round-trips items', () => {
    const store = createMemoryStorage()
    expect(store.getItem('k')).toBeNull()
    store.setItem('k', 'v')
    expect(store.getItem('k')).toBe('v')
    store.removeItem('k')
    expect(store.getItem('k')).toBeNull()
  })
})

describe('session', () => {
  const credentials = { email: 'a@b.co', password: 'secret' }

  it('stores a persistent login in localStorage only', async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'old', persistent: false }))
    const session = await make().login({ ...credentials, persistent: true })
    expect(session).toEqual({ userId: 'usr_1', persistent: true })
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual(session)
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()

    // A reload: a new adapter over the same stores finds it in localStorage.
    await expect(make().getSession()).resolves.toEqual(session)
  })

  it('stores a non-persistent login in sessionStorage only', async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'old', persistent: true }))
    const session = await make().login({ ...credentials, persistent: false })
    expect(session).toEqual({ userId: 'usr_1', persistent: false })
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual(session)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()

    await expect(make().getSession()).resolves.toEqual(session)
  })

  it.each([
    ['loginWithGoogle', () => make().loginWithGoogle({ persistent: true })],
    ['signup', () => make().signup({ name: 'Jane', ...credentials })],
  ])('%s creates a persistent session for usr_1', async (_name, run) => {
    await expect(run()).resolves.toEqual({ userId: 'usr_1', persistent: true })
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual({
      userId: 'usr_1',
      persistent: true,
    })
  })

  it('stores a non-persistent Google login in sessionStorage only', async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'old', persistent: true }))
    const session = await make().loginWithGoogle({ persistent: false })
    expect(session).toEqual({ userId: 'usr_1', persistent: false })
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual(session)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()

    await expect(make().getSession()).resolves.toEqual(session)
  })

  it('discards the signup name and email: the profile stays the seeded user', async () => {
    const api = make()
    await api.signup({ name: 'Jane Doe', email: 'jane@doe.com', password: 'pw' })
    await expect(api.getProfile()).resolves.toEqual(seed.profile)
  })

  it('logout clears both stores', async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'usr_1', persistent: true }))
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'usr_1', persistent: false }))
    const api = make()
    await api.logout()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    await expect(api.getSession()).resolves.toBeNull()
  })

  it('returns null with no session', async () => {
    await expect(make().getSession()).resolves.toBeNull()
  })

  it('reads localStorage before sessionStorage', async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'usr_1', persistent: true }))
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'usr_1', persistent: false }))
    await expect(make().getSession()).resolves.toEqual({ userId: 'usr_1', persistent: true })
  })

  it('a corrupt localStorage entry does not mask a valid sessionStorage session', async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, '{oops')
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'usr_1', persistent: false }))
    await expect(make().getSession()).resolves.toEqual({ userId: 'usr_1', persistent: false })
  })

  it.each([
    '{oops',
    '"usr_1"',
    'null',
    JSON.stringify({ userId: 'usr_1' }),
    JSON.stringify({ userId: 1, persistent: true }),
    JSON.stringify({ userId: 'usr_2', persistent: true }),
  ])(
    'returns null for corrupt session data %s',
    async (raw) => {
      localStorage.setItem(SESSION_STORAGE_KEY, raw)
      await expect(make().getSession()).resolves.toBeNull()
      localStorage.clear()
      sessionStorage.setItem(SESSION_STORAGE_KEY, raw)
      await expect(make().getSession()).resolves.toBeNull()
    },
  )

  it.each([
    ['a quota name', new DOMException('quota', 'QuotaExceededError')],
    ['Firefox quota name', { name: 'NS_ERROR_DOM_QUOTA_REACHED' }],
    ['legacy code 22', { name: 'Error', code: 22 }],
    ['legacy code 1014', { name: 'Error', code: 1014 }],
  ])('fails the session write with STORAGE_FULL for %s', async (_name, thrown) => {
    const api = make({ sessionStores: { local: throwingStorage(thrown), session: sessionStorage } })
    const error = await rejection(api.login({ ...credentials, persistent: true }))
    expect(error.code).toBe('STORAGE_FULL')
  })

  it('fails the session write with UNKNOWN for a non-quota storage error', async () => {
    const api = make({
      sessionStores: { local: localStorage, session: throwingStorage(new DOMException('no', 'SecurityError')) },
    })
    const error = await rejection(api.login({ ...credentials, persistent: false }))
    expect(error.code).toBe('UNKNOWN')
  })
})

describe('validation', () => {
  it.each([
    ['malformed email', { email: 'nope', password: 'pw', persistent: true }, ['email']],
    ['empty email', { email: '  ', password: 'pw', persistent: true }, ['email']],
    ['empty password', { email: 'a@b.co', password: '', persistent: true }, ['password']],
    ['both', { email: 'a@', password: '', persistent: false }, ['email', 'password']],
  ])('login rejects %s with VALIDATION field errors', async (_name, input, fields) => {
    const error = await rejection(make().login(input))
    expect(error.code).toBe('VALIDATION')
    expect(Object.keys(error.fieldErrors ?? {}).sort()).toEqual(fields)
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('signup requires name, a well-formed email and a password', async () => {
    const error = await rejection(make().signup({ name: ' ', email: 'x@y', password: '' }))
    expect(error.code).toBe('VALIDATION')
    expect(error.fieldErrors).toEqual({
      name: expect.any(String),
      email: expect.any(String),
      password: expect.any(String),
    })
  })

  it('requestPasswordReset validates the email and resolves for a well-formed one', async () => {
    const error = await rejection(make().requestPasswordReset('bad'))
    expect(error.code).toBe('VALIDATION')
    expect(error.fieldErrors).toHaveProperty('email')
    await expect(make().requestPasswordReset('a@b.co')).resolves.toBeUndefined()
  })

  it('wraps unexpected failures in ApiError', async () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
    const api = make({
      sessionStores: {
        local: { ...storage, getItem: () => { throw new Error('boom') } },
        session: storage,
      },
    })
    const error = await rejection(api.getSession())
    expect(error.code).toBe('UNKNOWN')
  })
})

describe('delay', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('awaits delayMs (200 by default) before every response', async () => {
    vi.useFakeTimers()
    const api = createMockApi({ storage: localStorage, sessionStores: stores() })
    const onDone = vi.fn()
    void api.getToday().then(onDone)
    await vi.advanceTimersByTimeAsync(199)
    expect(onDone).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onDone).toHaveBeenCalledWith('2023-05-19')
  })

  it('honours a custom delay on every method', async () => {
    vi.useFakeTimers()
    const api = make({ delayMs: 50 })
    const onDone = vi.fn()
    void api.logout().then(onDone)
    await vi.advanceTimersByTimeAsync(49)
    expect(onDone).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onDone).toHaveBeenCalled()
  })
})
