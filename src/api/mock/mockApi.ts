// The v1 adapter (AD-6): the only owner of mock state, written through to localStorage.
import { toIsoDate } from '../../lib/dates.ts'
import type { FinbankApi } from '../port.ts'
import {
  type Account,
  type AccountType,
  ApiError,
  type BalanceSummary,
  type CardNetwork,
  type ExpenseCategoryId,
  type GoogleLoginInput,
  type IsoDate,
  type ListTransactionsInput,
  type LoginInput,
  type Session,
  type SignupInput,
  type Transaction,
  type TransactionIcon,
  type TransactionKind,
  type TransactionPage,
  type UserProfile,
} from '../types.ts'
import { MOCK_STATE_VERSION, MOCK_USER_ID, type MockState, seedState } from './seed.ts'
import { PAYMENT_METHOD_BY_ACCOUNT_TYPE } from './seedTransactions.ts'

export const MOCK_STORAGE_KEY = 'finbank:mock:v1'
export const SESSION_STORAGE_KEY = 'finbank:session'

/** The subset of the Web Storage API the adapter uses, so tests can inject stubs. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type MockApiOptions = {
  /** Where mock state is persisted. Defaults to `localStorage`. */
  storage?: StorageLike
  /** Where the session lives: `local` when persistent, `session` (tab-scoped) when not. */
  sessionStores?: { local: StorageLike; session: StorageLike }
  /** Artificial latency per call, so loading states are exercised. */
  delayMs?: number
}

/** A non-persistent `StorageLike`, used when the browser's storage is unavailable. */
export function createMemoryStorage(): StorageLike {
  const items = new Map<string, string>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, String(value))
    },
    removeItem: (key) => {
      items.delete(key)
    },
  }
}

/** The browser store, or an in-memory one when reading it throws (e.g. a `SecurityError`). */
function browserStore(name: 'localStorage' | 'sessionStorage'): StorageLike {
  try {
    const store = globalThis[name]
    if (store) return store
  } catch {
    // Storage disabled: fall through to memory.
  }
  return createMemoryStorage()
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldErrors = Record<string, string>

function throwIfInvalid(fieldErrors: FieldErrors) {
  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError('VALIDATION', 'Please correct the highlighted fields.', fieldErrors)
  }
}

function checkEmail(email: unknown, errors: FieldErrors) {
  const value = typeof email === 'string' ? email.trim() : ''
  if (value === '') errors.email = 'Email is required.'
  else if (!EMAIL.test(value)) errors.email = 'Enter a valid email address.'
}

function checkRequired(value: unknown, field: string, label: string, errors: FieldErrors) {
  if (typeof value !== 'string' || value.trim() === '') errors[field] = `${label} is required.`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const { name, code } = error as { name?: unknown; code?: unknown }
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  )
}

/** Writes one item. A full store gives `STORAGE_FULL`; any other storage failure `UNKNOWN`. */
function writeItem(store: StorageLike, key: string, value: string) {
  try {
    store.setItem(key, value)
  } catch (error) {
    if (isQuotaError(error)) {
      throw new ApiError(
        'STORAGE_FULL',
        'Your browser storage is full. Free some space and try again.',
      )
    }
    throw new ApiError('UNKNOWN', 'Could not save your data. Please try again.')
  }
}

function validIsoDate(value: unknown): IsoDate | null {
  try {
    return toIsoDate(value as string)
  } catch {
    return null
  }
}

const PROFILE_STRING_FIELDS = [
  'fullName',
  'email',
  'username',
  'phoneCountryCode',
  'phoneNumber',
] as const satisfies readonly (keyof UserProfile)[]

/** Stored profile fields merged over the seed profile; a missing or mistyped field keeps the seed value. */
function normalizeProfile(value: unknown, fallback: UserProfile): UserProfile {
  if (!isPlainObject(value)) return fallback
  const profile = { ...fallback }
  for (const field of PROFILE_STRING_FIELDS) {
    const stored = value[field]
    if (typeof stored === 'string') profile[field] = stored
  }
  if (value.avatarUrl === null || typeof value.avatarUrl === 'string') {
    profile.avatarUrl = value.avatarUrl
  }
  return profile
}

const ACCOUNT_TYPES: readonly AccountType[] = ['creditCard', 'checking', 'savings', 'investment', 'loan']
const CARD_NETWORKS: readonly CardNetwork[] = ['mastercard', 'visa']

/** Assets add to the Total Balance, liabilities subtract from it. */
const ACCOUNT_SIGN: Record<AccountType, 1 | -1> = {
  checking: 1,
  savings: 1,
  investment: 1,
  creditCard: -1,
  loan: -1,
}

function normalizeAccount(value: unknown): Account | null {
  if (!isPlainObject(value)) return null
  const { id, type, bankName, branchName, network, accountNumber, balanceCents } = value
  if (typeof id !== 'string' || id === '') return null
  if (!ACCOUNT_TYPES.includes(type as AccountType)) return null
  if (typeof bankName !== 'string' || typeof branchName !== 'string') return null
  if (network != null && !CARD_NETWORKS.includes(network as CardNetwork)) return null
  if (typeof accountNumber !== 'string' || !/^\d{4,}$/.test(accountNumber)) return null
  if (typeof balanceCents !== 'number' || !Number.isSafeInteger(balanceCents) || balanceCents < 0) {
    return null
  }
  const account: Account = {
    id,
    type: type as AccountType,
    bankName,
    branchName,
    accountNumber,
    balanceCents,
  }
  if (network != null) account.network = network as CardNetwork
  return account
}

/**
 * A non-array value is replaced by the seed accounts. Invalid entries and repeated ids are
 * dropped; an empty array is kept (the user may remove every account).
 */
function normalizeAccounts(value: unknown, fallback: Account[]): Account[] {
  if (!Array.isArray(value)) return fallback
  const seen = new Set<string>()
  const accounts: Account[] = []
  for (const entry of value) {
    const account = normalizeAccount(entry)
    if (!account || seen.has(account.id)) continue
    seen.add(account.id)
    accounts.push(account)
  }
  return accounts
}

const TRANSACTION_KINDS: readonly TransactionKind[] = ['revenue', 'expense']
const EXPENSE_CATEGORIES: readonly ExpenseCategoryId[] = [
  'housing',
  'food',
  'transportation',
  'entertainment',
  'shopping',
  'others',
]
const TRANSACTION_ICONS: readonly TransactionIcon[] = [
  'gadget',
  'shopping',
  'food',
  'entertainment',
  'transport',
  'housing',
  'salary',
  'transfer',
  'other',
]
const TRANSACTION_STATUSES: readonly Transaction['status'][] = ['complete', 'pending']

/** A shape-checked transaction, or `null`. `type` must follow `kind`; only expenses carry a category. */
function normalizeTransaction(value: unknown): Transaction | null {
  if (!isPlainObject(value)) return null
  const { id, accountId, item, shop, kind, category, paymentMethod, status, type, receiptId, amountCents, date, icon } =
    value
  if (typeof id !== 'string' || id === '') return null
  if (typeof accountId !== 'string' || accountId === '') return null
  if (typeof item !== 'string' || typeof shop !== 'string') return null
  if (!TRANSACTION_KINDS.includes(kind as TransactionKind)) return null
  if (type !== (kind === 'revenue' ? 'credit' : 'debit')) return null
  if (kind === 'expense') {
    if (category != null && !EXPENSE_CATEGORIES.includes(category as ExpenseCategoryId)) return null
  } else if (category != null) {
    return null
  }
  if (typeof paymentMethod !== 'string' || paymentMethod === '') return null
  if (!TRANSACTION_STATUSES.includes(status as Transaction['status'])) return null
  if (typeof receiptId !== 'string' || receiptId === '') return null
  if (typeof amountCents !== 'number' || !Number.isSafeInteger(amountCents) || amountCents <= 0) return null
  const isoDate = validIsoDate(date)
  if (!isoDate) return null
  if (!TRANSACTION_ICONS.includes(icon as TransactionIcon)) return null
  // Same key order as the seed builder, so a clean stored entry round-trips byte for byte.
  const transaction: Transaction = {
    id,
    accountId,
    item,
    shop,
    kind: kind as TransactionKind,
    paymentMethod,
    status: status as Transaction['status'],
    type: type as Transaction['type'],
    receiptId,
    amountCents,
    date: isoDate,
    icon: icon as TransactionIcon,
  }
  if (category != null) transaction.category = category as ExpenseCategoryId
  return transaction
}

/**
 * A non-array value is replaced by the seed transactions. Invalid entries, repeated ids, orphans
 * (an `accountId` not in `accounts`) and rows whose payment method disagrees with their account's
 * type are dropped. Run after the accounts are normalized.
 */
function normalizeTransactions(value: unknown, fallback: Transaction[], accounts: Account[]): Transaction[] {
  const accountTypes = new Map(accounts.map((account) => [account.id, account.type]))
  const seen = new Set<string>()
  const transactions: Transaction[] = []
  for (const entry of Array.isArray(value) ? value : fallback) {
    const transaction = normalizeTransaction(entry)
    if (!transaction || seen.has(transaction.id)) continue
    const accountType = accountTypes.get(transaction.accountId)
    if (!accountType || transaction.paymentMethod !== PAYMENT_METHOD_BY_ACCOUNT_TYPE[accountType]) continue
    seen.add(transaction.id)
    transactions.push(transaction)
  }
  return transactions
}

const MAX_PAGE_SIZE = 50

/** The offset a cursor holds. A missing cursor is the first page; anything unparseable is `null`. */
function parseCursor(cursor: unknown): number | null {
  if (cursor === undefined || cursor === null) return 0
  if (typeof cursor !== 'string' || !/^o(0|[1-9]\d{0,8})$/.test(cursor)) return null
  return Number(cursor.slice(1))
}

const cursorAt = (offset: number) => `o${offset}`

/** Filters, orders newest first (stable, so equal dates keep stored order) and pages. */
function pageTransactions(all: readonly Transaction[], input: ListTransactionsInput): TransactionPage {
  const limit = input?.limit
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new ApiError('VALIDATION', `The page size must be a whole number from 1 to ${MAX_PAGE_SIZE}.`)
  }
  const offset = parseCursor(input.cursor)
  if (offset === null) throw new ApiError('VALIDATION', 'The page cursor is not valid.')
  if (input.kind !== undefined && !TRANSACTION_KINDS.includes(input.kind)) {
    throw new ApiError('VALIDATION', 'The transaction kind is not valid.')
  }
  const filtered = all
    .filter(
      (t) =>
        (input.kind === undefined || t.kind === input.kind) &&
        (input.accountId === undefined || t.accountId === input.accountId),
    )
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const end = offset + limit
  return {
    items: structuredClone(filtered.slice(offset, end)),
    nextCursor: end < filtered.length ? cursorAt(end) : null,
  }
}

/**
 * Reads the persisted state. A missing, unparseable or wrong-version entry falls back to the
 * seed (wrong versions are reseeded, not migrated). Missing or `null` top-level keys are filled
 * from the seed so later epics can extend the state, and known keys are shape-checked.
 * `dirty` is true when the result differs from what is stored and should be written back.
 */
function loadState(storage: StorageLike): { state: MockState; dirty: boolean } {
  const seeded = seedState()
  let parsed: unknown
  try {
    const raw = storage.getItem(MOCK_STORAGE_KEY)
    if (raw === null) return { state: seeded, dirty: true }
    parsed = JSON.parse(raw)
  } catch {
    return { state: seeded, dirty: true }
  }
  if (!isPlainObject(parsed) || parsed.version !== MOCK_STATE_VERSION) {
    return { state: seeded, dirty: true }
  }
  const state: Record<string, unknown> = { ...parsed }
  for (const [key, value] of Object.entries(seeded)) {
    if (state[key] === undefined || state[key] === null) state[key] = value
  }
  state.today = validIsoDate(state.today) ?? seeded.today
  state.profile = normalizeProfile(state.profile, seeded.profile)
  state.accounts = normalizeAccounts(state.accounts, seeded.accounts)
  state.transactions = normalizeTransactions(state.transactions, seeded.transactions, state.accounts as Account[])
  return { state: state as MockState, dirty: JSON.stringify(state) !== JSON.stringify(parsed) }
}

function parseSession(raw: string | null): Session | null {
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (
      isPlainObject(value) &&
      value.userId === MOCK_USER_ID &&
      typeof value.persistent === 'boolean'
    ) {
      return { userId: value.userId, persistent: value.persistent }
    }
  } catch {
    // A corrupt entry reads as signed out.
  }
  return null
}

export function createMockApi(options: MockApiOptions = {}): FinbankApi {
  const local = options.storage && options.sessionStores ? null : browserStore('localStorage')
  const storage = options.storage ?? local!
  const sessionStores = options.sessionStores ?? {
    local: local!,
    session: browserStore('sessionStorage'),
  }
  const delayMs = options.delayMs ?? 200

  let current: MockState | null = null

  function state(): MockState {
    if (current) return current
    const { state: loaded, dirty } = loadState(storage)
    current = loaded
    if (dirty) {
      try {
        writeItem(storage, MOCK_STORAGE_KEY, JSON.stringify(loaded))
      } catch {
        // Read path: a failed write-back keeps the state in memory and is retried on the next write.
      }
    }
    return loaded
  }

  function writeSession(session: Session): Session {
    const [target, other] = session.persistent
      ? [sessionStores.local, sessionStores.session]
      : [sessionStores.session, sessionStores.local]
    writeItem(target, SESSION_STORAGE_KEY, JSON.stringify(session))
    other.removeItem(SESSION_STORAGE_KEY)
    return session
  }

  /** Awaits the artificial delay, then guarantees that only `ApiError` escapes. */
  async function call<T>(fn: () => T): Promise<T> {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
    try {
      return fn()
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError('UNKNOWN', 'Something went wrong. Please try again.')
    }
  }

  return {
    getToday: () => call(() => state().today),

    login: (input: LoginInput) =>
      call(() => {
        const errors: FieldErrors = {}
        checkEmail(input?.email, errors)
        checkRequired(input?.password, 'password', 'Password', errors)
        throwIfInvalid(errors)
        // Single-user mock: any well-formed credentials sign in as usr_1.
        return writeSession({ userId: MOCK_USER_ID, persistent: input.persistent === true })
      }),

    loginWithGoogle: (input: GoogleLoginInput) =>
      call(() => writeSession({ userId: MOCK_USER_ID, persistent: input?.persistent === true })),

    signup: (input: SignupInput) =>
      call(() => {
        const errors: FieldErrors = {}
        checkRequired(input?.name, 'name', 'Name', errors)
        checkEmail(input?.email, errors)
        checkRequired(input?.password, 'password', 'Password', errors)
        throwIfInvalid(errors)
        // The entered name and email are validated, then discarded (single-user decision).
        return writeSession({ userId: MOCK_USER_ID, persistent: true })
      }),

    logout: () =>
      call(() => {
        sessionStores.local.removeItem(SESSION_STORAGE_KEY)
        sessionStores.session.removeItem(SESSION_STORAGE_KEY)
      }),

    requestPasswordReset: (email: string) =>
      call(() => {
        const errors: FieldErrors = {}
        checkEmail(email, errors)
        throwIfInvalid(errors)
      }),

    getSession: () =>
      call(
        () =>
          parseSession(sessionStores.local.getItem(SESSION_STORAGE_KEY)) ??
          parseSession(sessionStores.session.getItem(SESSION_STORAGE_KEY)),
      ),

    getProfile: () => call(() => structuredClone(state().profile)),

    listAccounts: () => call(() => structuredClone(state().accounts)),

    getAccount: (id: string) =>
      call(() => {
        const account = state().accounts.find((candidate) => candidate.id === id)
        return account ? structuredClone(account) : null
      }),

    getBalanceSummary: () =>
      call((): BalanceSummary => ({
        totalBalanceCents: state().accounts.reduce(
          (total, account) => total + ACCOUNT_SIGN[account.type] * account.balanceCents,
          0,
        ),
      })),

    removeAccount: (id: string) =>
      call(() => {
        const prev = state()
        if (!prev.accounts.some((account) => account.id === id)) return
        // The account and its transactions go in the same single write (AD-6).
        const next: MockState = {
          ...prev,
          accounts: prev.accounts.filter((account) => account.id !== id),
          transactions: prev.transactions.filter((transaction) => transaction.accountId !== id),
        }
        // Write first: a failed write leaves both memory and storage unchanged.
        writeItem(storage, MOCK_STORAGE_KEY, JSON.stringify(next))
        current = next
      }),

    listTransactions: (input: ListTransactionsInput) => call(() => pageTransactions(state().transactions, input)),
  }
}
