// The v1 adapter (AD-6): the only owner of mock state, written through to localStorage.
import {
  addDays,
  addMonths,
  currentMonth,
  monthRange,
  toIsoDate,
  toYearMonth,
  weekOf,
  yearMonthOf,
} from '../../lib/dates.ts'
import { formatDate } from '../../lib/format.ts'
import type { FinbankApi } from '../port.ts'
import {
  type Account,
  type AccountType,
  ApiError,
  type BalanceSummary,
  type Bill,
  type BillingCycle,
  type BillLogo,
  type CardNetwork,
  type CategoryLimit,
  type CategorySummary,
  type ComparisonGranularity,
  type ComparisonPoint,
  type ExpenseCategoryId,
  type GoogleLoginInput,
  type IsoDate,
  type ListBillsInput,
  type ListTransactionsInput,
  type LoginInput,
  type SavingSummaryPoint,
  type SavingsGoal,
  type SavingsGoalAmounts,
  type Session,
  type SignupInput,
  type Transaction,
  type TransactionIcon,
  type TransactionKind,
  type TransactionPage,
  type UserProfile,
  type YearMonth,
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
  // Keys in seed order, so a clean stored seed round-trips byte for byte and loading does not
  // rewrite storage.
  return {
    id,
    type: type as AccountType,
    bankName,
    branchName,
    ...(network != null && { network: network as CardNetwork }),
    accountNumber,
    balanceCents,
  }
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
 * The one expense source of Expenses (AD-5): expense-kind transactions that carry a category,
 * whatever their status. Category summaries and comparison series both read it, so a month's bar
 * always equals the sum of that month's category totals.
 */
function categorizedExpenses(all: readonly Transaction[]): Transaction[] {
  return all.filter((t) => t.kind === 'expense' && t.category !== undefined)
}

/** How many items a category summary lists. */
const SUMMARY_RECENT_ITEMS = 2

/**
 * Signed integer percent from `prev` to `cur`, with -0 normalised to 0. When `prev` is 0 the
 * growth is undefined: by display convention it is 100 (an increase) when `cur` is above 0, and
 * 0 when both are 0. This is not a calculated percentage.
 */
function changePercent(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0
  // Round half away from zero, so a change of the same size shows the same magnitude either way.
  const raw = ((cur - prev) / prev) * 100
  const pct = Math.sign(raw) * Math.round(Math.abs(raw))
  return pct === 0 ? 0 : pct
}

/**
 * The six category summaries for the month containing `today`, in `EXPENSE_CATEGORIES` order.
 * Every expense counts whatever its status; expenses without a category are left out.
 */
function summarizeCategories(all: readonly Transaction[], today: IsoDate): CategorySummary[] {
  const month = currentMonth(today)
  const previous = addMonths(month, -1)
  // Stable newest-first sort, as in `pageTransactions`: equal dates keep stored order.
  const expenses = categorizedExpenses(all).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return EXPENSE_CATEGORIES.map((category) => {
    let totalCents = 0
    let previousCents = 0
    const current: Transaction[] = []
    for (const t of expenses) {
      if (t.category !== category) continue
      const ym = yearMonthOf(t.date)
      if (ym === month) {
        totalCents += t.amountCents
        current.push(t)
      } else if (ym === previous) {
        previousCents += t.amountCents
      }
    }
    return {
      category,
      totalCents,
      changePct: changePercent(totalCents, previousCents),
      recentItems: structuredClone(current.slice(0, SUMMARY_RECENT_ITEMS)),
    }
  })
}

const COMPARISON_GRANULARITIES: readonly ComparisonGranularity[] = ['year', 'week']

/** Sums `expenses` per key (a `YYYY-MM` month or a `YYYY-MM-DD` day). */
function totalsBy(expenses: readonly Transaction[], keyOf: (t: Transaction) => string): Map<string, number> {
  const totals = new Map<string, number>()
  for (const t of expenses) {
    const key = keyOf(t)
    totals.set(key, (totals.get(key) ?? 0) + t.amountCents)
  }
  return totals
}

/**
 * The comparison series from the same expenses as `summarizeCategories`. `'year'`: Jan–Dec of
 * today's year, each against the same month a year earlier. `'week'`: Sun–Sat of the week that
 * contains today, each against the same weekday 7 days earlier. Periods after today are `null`.
 */
function comparisonSeries(
  all: readonly Transaction[],
  today: IsoDate,
  granularity: ComparisonGranularity,
): ComparisonPoint[] {
  const expenses = categorizedExpenses(all)
  if (granularity === 'year') {
    const byMonth = totalsBy(expenses, (t) => yearMonthOf(t.date))
    const thisMonth = currentMonth(today)
    const year = thisMonth.slice(0, 4)
    return Array.from({ length: 12 }, (_, i) => {
      const month = toYearMonth(`${year}-${String(i + 1).padStart(2, '0')}`)
      const lastYear = addMonths(month, -12)
      return {
        label: formatDate(toIsoDate(`${month}-01`), 'month'),
        currentCents: month > thisMonth ? null : (byMonth.get(month) ?? 0),
        previousCents: byMonth.get(lastYear) ?? 0,
      }
    })
  }
  const byDay = totalsBy(expenses, (t) => t.date)
  return weekOf(today).map((day) => ({
    label: formatDate(day, 'weekday'),
    currentCents: day > today ? null : (byDay.get(day) ?? 0),
    previousCents: byDay.get(addDays(day, -7)) ?? 0,
  }))
}

/** The largest `listBills` limit; independent of the transaction page size. */
const MAX_BILL_LIMIT = 50

const BILL_LOGOS: readonly BillLogo[] = ['figma', 'adobe', 'google']
const BILLING_CYCLES: readonly BillingCycle[] = ['monthly', 'yearly']

/** A shape-checked bill, or `null`. */
function normalizeBill(value: unknown): Bill | null {
  if (!isPlainObject(value)) return null
  const { id, vendor, logo, title, description, billingCycle, dueDate, lastChargeDate, amountCents } = value
  if (typeof id !== 'string' || id === '') return null
  if (typeof vendor !== 'string' || typeof title !== 'string' || typeof description !== 'string') return null
  if (!BILL_LOGOS.includes(logo as BillLogo)) return null
  if (!BILLING_CYCLES.includes(billingCycle as BillingCycle)) return null
  const due = validIsoDate(dueDate)
  const lastCharge = validIsoDate(lastChargeDate)
  if (!due || !lastCharge) return null
  if (typeof amountCents !== 'number' || !Number.isSafeInteger(amountCents) || amountCents <= 0) return null
  // Same key order as the seed, so a clean stored entry round-trips byte for byte.
  return {
    id,
    vendor,
    logo: logo as BillLogo,
    title,
    description,
    billingCycle: billingCycle as BillingCycle,
    dueDate: due,
    lastChargeDate: lastCharge,
    amountCents,
  }
}

/** A non-array value is replaced by the seed bills. Invalid entries and repeated ids are dropped. */
function normalizeBills(value: unknown, fallback: Bill[]): Bill[] {
  if (!Array.isArray(value)) return fallback
  const seen = new Set<string>()
  const bills: Bill[] = []
  for (const entry of value) {
    const bill = normalizeBill(entry)
    if (!bill || seen.has(bill.id)) continue
    seen.add(bill.id)
    bills.push(bill)
  }
  return bills
}

function validYearMonth(value: unknown): YearMonth | null {
  try {
    return toYearMonth(value as string)
  } catch {
    return null
  }
}

function isCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** A shape-checked savings goal, or `null`. */
function normalizeSavingsGoal(value: unknown): SavingsGoal | null {
  if (!isPlainObject(value)) return null
  const { targetCents, achievedCents } = value
  const month = validYearMonth(value.month)
  if (!month || !isCents(targetCents) || !isCents(achievedCents)) return null
  // Same key order as the seed, so a clean stored entry round-trips byte for byte.
  return { month, targetCents, achievedCents }
}

/** A non-array value is replaced by the seed goals. Invalid entries and repeated months are dropped. */
function normalizeSavingsGoals(value: unknown, fallback: SavingsGoal[]): SavingsGoal[] {
  if (!Array.isArray(value)) return fallback
  const seen = new Set<string>()
  const goals: SavingsGoal[] = []
  for (const entry of value) {
    const goal = normalizeSavingsGoal(entry)
    if (!goal || seen.has(goal.month)) continue
    seen.add(goal.month)
    goals.push(goal)
  }
  return goals
}

/**
 * Exactly one limit per category, in `EXPENSE_CATEGORIES` order. A non-array value is replaced by
 * the seed limits. Within an array, the first valid entry of each category wins; invalid entries,
 * unknown categories and repeats are dropped, and a category without a valid entry falls back to
 * its seed limit.
 */
function normalizeCategoryLimits(value: unknown, fallback: CategoryLimit[]): CategoryLimit[] {
  if (!Array.isArray(value)) return fallback
  const found = new Map<ExpenseCategoryId, number>()
  for (const entry of value) {
    if (!isPlainObject(entry)) continue
    const { category, limitCents } = entry
    if (!EXPENSE_CATEGORIES.includes(category as ExpenseCategoryId) || !isCents(limitCents)) continue
    if (!found.has(category as ExpenseCategoryId)) found.set(category as ExpenseCategoryId, limitCents)
  }
  return EXPENSE_CATEGORIES.map((category) => ({
    // Same key order as the seed, so a clean stored entry round-trips byte for byte.
    category,
    limitCents:
      found.get(category) ?? fallback.find((limit) => limit.category === category)?.limitCents ?? 0,
  }))
}

/** Every day of `month`, day 1 first. */
function daysOf(month: YearMonth): IsoDate[] {
  const { start, end } = monthRange(month)
  const days: IsoDate[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day)
  return days
}

/** A 32-bit FNV-1a hash of `text`: a deterministic seed, never randomness. */
function hash32(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/**
 * The integer weight (40…160, i.e. 0.4…1.6 in hundredths) of one day's share of a month's saving.
 * Deterministic in `date`: two sine waves over the day of the month, phased by the month, so the
 * series reads as a smooth curve that differs from month to month.
 */
export function savingDayWeight(date: IsoDate): number {
  const day = Number(date.slice(8, 10))
  const seed = hash32(date.slice(0, 7))
  const phaseA = (seed % 628) / 100
  const phaseB = ((seed >>> 12) % 628) / 100
  return Math.round(100 + 40 * Math.sin(day * 0.55 + phaseA) + 20 * Math.sin(day * 1.3 + phaseB))
}

/**
 * Splits `totalCents` over `days` in proportion to their weights, exactly: each day gets the floor
 * of its share and the leftover cents go to the largest remainders (earlier day first on a tie), so
 * the parts sum to `totalCents`. BigInt keeps `total × weight` exact for any safe amount.
 */
function splitByDay(totalCents: number, days: readonly IsoDate[]): number[] {
  if (days.length === 0) return []
  const weights = days.map((day) => BigInt(savingDayWeight(day)))
  const sum = weights.reduce((a, b) => a + b, 0n)
  const total = BigInt(totalCents)
  const parts = weights.map((w) => (total * w) / sum)
  const remainders = weights.map((w, i) => ({ i, rest: (total * w) % sum }))
  let left = Number(total - parts.reduce((a, b) => a + b, 0n))
  remainders.sort((a, b) => (a.rest === b.rest ? a.i - b.i : a.rest > b.rest ? -1 : 1))
  for (const { i } of remainders) {
    if (left === 0) break
    parts[i]! += 1n
    left--
  }
  return parts.map(Number)
}

/**
 * The Saving Summary series of `month` from the stored goals (the same ones `getSavingsGoal` reads).
 * Current: `month`'s `achievedCents` split over days 1 to min(today, month end), `null` after
 * today. Previous: the previous month's `achievedCents` split over all its days, `null` on a day
 * of `month` it does not have. A month without a stored goal splits 0.
 */
export function savingSummarySeries(
  goals: readonly SavingsGoal[],
  today: IsoDate,
  month: YearMonth,
): SavingSummaryPoint[] {
  const achieved = (ym: YearMonth) => goals.find((goal) => goal.month === ym)?.achievedCents ?? 0
  const days = daysOf(month)
  const elapsed = days.filter((day) => day <= today)
  const current = splitByDay(achieved(month), elapsed)
  const previousMonth = addMonths(month, -1)
  const previous = splitByDay(achieved(previousMonth), daysOf(previousMonth))
  return days.map((date, i) => ({
    date,
    currentCents: date > today ? null : current[i]!,
    previousCents: previous[i] ?? null,
  }))
}

/** Earliest due date first (stable, so equal dates keep stored order), truncated to `limit`. */
function sortBills(all: readonly Bill[], input: ListBillsInput | undefined): Bill[] {
  const limit = input?.limit
  if (
    limit !== undefined &&
    (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > MAX_BILL_LIMIT)
  ) {
    throw new ApiError('VALIDATION', `The bill limit must be a whole number from 1 to ${MAX_BILL_LIMIT}.`)
  }
  const sorted = [...all].sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
  return structuredClone(limit === undefined ? sorted : sorted.slice(0, limit))
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
  state.bills = normalizeBills(state.bills, seeded.bills)
  state.savingsGoals = normalizeSavingsGoals(state.savingsGoals, seeded.savingsGoals)
  state.categoryLimits = normalizeCategoryLimits(state.categoryLimits, seeded.categoryLimits)
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

    listBills: (input?: ListBillsInput) => call(() => sortBills(state().bills, input)),

    listCategorySummaries: () =>
      call(() => {
        const { transactions, today } = state()
        return summarizeCategories(transactions, today)
      }),

    getComparison: (granularity: ComparisonGranularity) =>
      call(() => {
        if (!COMPARISON_GRANULARITIES.includes(granularity)) {
          throw new ApiError('VALIDATION', 'The comparison period is not valid.')
        }
        const { transactions, today } = state()
        return comparisonSeries(transactions, today, granularity)
      }),

    getSavingsGoal: (month: YearMonth) =>
      call((): SavingsGoal => {
        const valid = validYearMonth(month)
        if (!valid) throw new ApiError('VALIDATION', 'The month is not valid.')
        const goal = state().savingsGoals.find((candidate) => candidate.month === valid)
        return goal ? structuredClone(goal) : { month: valid, targetCents: 0, achievedCents: 0 }
      }),

    updateSavingsGoal: (month: YearMonth, amounts: SavingsGoalAmounts) =>
      call((): SavingsGoal => {
        const valid = validYearMonth(month)
        if (!valid) throw new ApiError('VALIDATION', 'The month is not valid.')
        const errors: FieldErrors = {}
        const targetCents: unknown = amounts?.targetCents
        const achievedCents: unknown = amounts?.achievedCents
        if (!isCents(targetCents)) errors.targetCents = 'Enter a target of zero or more.'
        if (!isCents(achievedCents)) errors.achievedCents = 'Enter a present amount of zero or more.'
        throwIfInvalid(errors)
        const goal: SavingsGoal = {
          month: valid,
          targetCents: targetCents as number,
          achievedCents: achievedCents as number,
        }
        const prev = state()
        const exists = prev.savingsGoals.some((candidate) => candidate.month === valid)
        const next: MockState = {
          ...prev,
          savingsGoals: exists
            ? prev.savingsGoals.map((candidate) => (candidate.month === valid ? goal : candidate))
            : [...prev.savingsGoals, goal],
        }
        // Write first: a failed write leaves both memory and storage unchanged.
        writeItem(storage, MOCK_STORAGE_KEY, JSON.stringify(next))
        current = next
        return structuredClone(goal)
      }),

    getSavingSummary: (month: YearMonth) =>
      call((): SavingSummaryPoint[] => {
        const valid = validYearMonth(month)
        if (!valid) throw new ApiError('VALIDATION', 'The month is not valid.')
        const { savingsGoals, today } = state()
        return savingSummarySeries(savingsGoals, today, valid)
      }),

    listCategoryLimits: () => call((): CategoryLimit[] => structuredClone(state().categoryLimits)),

    updateCategoryLimit: (category: ExpenseCategoryId, limitCents: number) =>
      call((): CategoryLimit => {
        if (!EXPENSE_CATEGORIES.includes(category)) {
          throw new ApiError('VALIDATION', 'The category is not valid.')
        }
        const errors: FieldErrors = {}
        if (!isCents(limitCents)) errors.limitCents = 'Enter a limit of zero or more.'
        throwIfInvalid(errors)
        const limit: CategoryLimit = { category, limitCents }
        const prev = state()
        const next: MockState = {
          ...prev,
          categoryLimits: prev.categoryLimits.map((candidate) => (candidate.category === category ? limit : candidate)),
        }
        // Write first: a failed write leaves both memory and storage unchanged.
        writeItem(storage, MOCK_STORAGE_KEY, JSON.stringify(next))
        current = next
        return structuredClone(limit)
      }),
  }
}
