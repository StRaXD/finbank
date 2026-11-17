import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FinbankApi } from '../port.ts'
import { ApiError, type ListTransactionsInput, type Transaction } from '../types.ts'
import {
  createMemoryStorage,
  createMockApi,
  MOCK_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  type MockApiOptions,
  type StorageLike,
} from './mockApi.ts'
import { seed } from './seed.ts'
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
  version: 1,
  today: '2023-05-19',
  profile: seed.profile,
  accounts: seed.accounts,
  transactions: seed.transactions,
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
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

  it('writes the seed through to storage as version 1 on first use', async () => {
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
      version: 1,
      today: '2024-02-29',
      profile: { ...seed.profile, fullName: 'Someone Else' },
      accounts: [seed.accounts[2]],
      transactions: seed.transactions.filter((t) => t.accountId === 'acc_3'),
    }
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(custom))
    const api = make()
    await expect(api.getToday()).resolves.toBe('2024-02-29')
    await expect(api.getProfile()).resolves.toMatchObject({ fullName: 'Someone Else' })
    await expect(api.listAccounts()).resolves.toEqual([seed.accounts[2]])
    await expect(api.getBalanceSummary()).resolves.toEqual({
      totalBalanceCents: seed.accounts[2]!.balanceCents,
    })
    expect(stored()).toEqual(custom)
  })

  it.each([
    ['missing', null],
    ['unparseable', '{not json'],
    ['the wrong version', JSON.stringify({ version: 2, today: '2024-01-01' })],
    ['not an object', JSON.stringify([1, 2, 3])],
    ['null', 'null'],
  ])('falls back to the seed when the entry is %s', async (_name, raw) => {
    if (raw !== null) localStorage.setItem(MOCK_STORAGE_KEY, raw)
    const api = make()
    await expect(api.getToday()).resolves.toBe('2023-05-19')
    expect(stored()).toEqual(seedJson())
  })

  it('backfills missing top-level keys from the seed and keeps the rest', async () => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ version: 1, today: '2024-03-01' }))
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

  it('backfills a v1 state without accounts from the seed and writes it back', async () => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({ version: 1, today: '2023-05-19', profile: seed.profile }))
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
    setItem.mockRestore()
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
    setItem.mockRestore()
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
      expect(t.date >= '2023-04-01' && t.date <= '2023-05-19').toBe(true)
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
    // Accounts without a network: their normalized key order matches storage byte for byte.
    const kept = new Set(['acc_3', 'acc_4', 'acc_5'])
    withState({
      accounts: seed.accounts.filter((a) => kept.has(a.id)),
      transactions: seed.transactions.filter((t) => kept.has(t.accountId)),
    })
    const before = localStorage.getItem(MOCK_STORAGE_KEY)
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await make().listTransactions({ limit: 10 })
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
    expect(localStorage.getItem(MOCK_STORAGE_KEY)).toBe(before)
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
