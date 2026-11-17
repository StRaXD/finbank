// The v1 adapter (AD-6): the only owner of mock state, written through to localStorage.
import { toIsoDate } from '../../lib/dates.ts'
import type { FinbankApi } from '../port.ts'
import {
  type Account,
  type AccountType,
  ApiError,
  type BalanceSummary,
  type CardNetwork,
  type GoogleLoginInput,
  type IsoDate,
  type LoginInput,
  type Session,
  type SignupInput,
  type UserProfile,
} from '../types.ts'
import { MOCK_STATE_VERSION, MOCK_USER_ID, type MockState, seedState } from './seed.ts'

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
        // Story 2.3: also drop this account's transactions here (AD-6).
        const next: MockState = { ...prev, accounts: prev.accounts.filter((account) => account.id !== id) }
        // Write first: a failed write leaves both memory and storage unchanged.
        writeItem(storage, MOCK_STORAGE_KEY, JSON.stringify(next))
        current = next
      }),
  }
}
