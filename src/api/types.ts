// The only home of domain types (AD-2). Later epics add their entities here.
import type { IsoDate } from '../lib/dates.ts'

export type { IsoDate, YearMonth } from '../lib/dates.ts'

export type ApiErrorCode = 'VALIDATION' | 'STORAGE_FULL' | 'NOT_IMPLEMENTED' | 'UNKNOWN'

/** The only error an adapter throws. UI copy comes from `message`; forms map `fieldErrors` to `setError`. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly fieldErrors?: Record<string, string>

  constructor(code: ApiErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    if (fieldErrors) this.fieldErrors = fieldErrors
  }
}

/** Identity only (AD-8). Name and avatar come from `UserProfile`. */
export type Session = {
  userId: string
  /** `true` when "Keep me signed in" was checked: the session survives reloads. */
  persistent: boolean
}

export type UserProfile = {
  fullName: string
  email: string
  username: string
  phoneCountryCode: string
  phoneNumber: string
  avatarUrl: string | null
}

export type AccountType = 'creditCard' | 'checking' | 'savings' | 'investment' | 'loan'

export type CardNetwork = 'mastercard' | 'visa'

/** One account. `balanceCents` is always a non-negative magnitude; the adapter signs it for totals. */
export type Account = {
  id: string
  type: AccountType
  bankName: string
  branchName: string
  network?: CardNetwork
  /** The full account number, digits only. Screens mask it with `maskAccountNumber`. */
  accountNumber: string
  balanceCents: number
}

/** Derived by the adapter: assets (checking, savings, investment) minus liabilities (credit card, loan). */
export type BalanceSummary = {
  /** Signed: negative when liabilities exceed assets (rendered as "-$…"). */
  totalBalanceCents: number
}

export type LoginInput = {
  email: string
  password: string
  persistent: boolean
}

/** Mock Google sign-in: `persistent` mirrors "Keep me signed in" (Signup, which has no box, passes `true`). */
export type GoogleLoginInput = {
  persistent: boolean
}

export type SignupInput = {
  name: string
  email: string
  password: string
}

/** Expense categories (Epic 3 sums expenses per category). Only expenses carry one. */
export type ExpenseCategoryId = 'housing' | 'food' | 'transportation' | 'entertainment' | 'shopping' | 'others'

export type TransactionKind = 'revenue' | 'expense'

/** The closed set of transaction icon keys; `ui/icons.ts` maps each to a glyph. */
export type TransactionIcon =
  | 'gadget'
  | 'shopping'
  | 'food'
  | 'entertainment'
  | 'transport'
  | 'housing'
  | 'salary'
  | 'transfer'
  | 'other'

/**
 * One transaction on one account. `amountCents` is a positive magnitude (revenue and expense look
 * the same). `paymentMethod` follows the account type and `type` follows `kind`.
 */
export type Transaction = {
  id: string
  accountId: string
  item: string
  shop: string
  kind: TransactionKind
  category?: ExpenseCategoryId
  paymentMethod: string
  status: 'complete' | 'pending'
  type: 'credit' | 'debit'
  receiptId: string
  amountCents: number
  date: IsoDate
  icon: TransactionIcon
}

/** One page of transactions. `nextCursor` is opaque, and `null` on the last page. */
export type TransactionPage = {
  items: Transaction[]
  nextCursor: string | null
}

export type ListTransactionsInput = {
  kind?: TransactionKind
  accountId?: string
  /** From the previous page's `nextCursor`; omitted for the first page. */
  cursor?: string
  /** Page size, an integer from 1 to 50. */
  limit: number
}

/** The brand mark a bill shows; each is an SVG in `src/assets/brands/`. */
export type BillLogo = 'figma' | 'adobe' | 'google'

export type BillingCycle = 'monthly' | 'yearly'

/**
 * One upcoming bill. `amountCents` is a positive magnitude; `lastChargeDate` is one billing cycle
 * before `dueDate`.
 */
export type Bill = {
  id: string
  vendor: string
  logo: BillLogo
  title: string
  description: string
  billingCycle: BillingCycle
  dueDate: IsoDate
  lastChargeDate: IsoDate
  amountCents: number
}

export type ListBillsInput = {
  /** At most this many bills, an integer from 1 to 50. Omitted: every bill. */
  limit?: number
}
