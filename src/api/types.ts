// The only home of domain types (AD-2). Later epics add their entities here.
import type { IsoDate, YearMonth } from '../lib/dates.ts'

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

/**
 * One expense category's spending in the month that contains today, derived by the adapter.
 * Components display these numbers as given and never re-derive them.
 */
export type CategorySummary = {
  category: ExpenseCategoryId
  /** Every expense of this category dated in the month (pending ones included). */
  totalCents: number
  /**
   * Signed integer percent against the previous month: positive is an increase. 0 when both
   * months are 0; 100 by convention when the previous month is 0 and this month is not.
   */
  changePct: number
  /** The two most recent items of the month, newest first (equal dates keep stored order). */
  recentItems: Transaction[]
}

/** The comparison chart's period: `'year'` (Jan–Dec, monthly bars) or `'week'` (Sun–Sat, daily bars). */
export type ComparisonGranularity = 'year' | 'week'

/**
 * One bar pair of the comparison chart, derived by the adapter from the expense transactions.
 * Components display these numbers as given and never re-derive them.
 */
export type ComparisonPoint = {
  /** "Jan" … "Dec" for `'year'`, "14 Sun" … "20 Sat" for `'week'`. */
  label: string
  /** This period's spending, or `null` for a month or day after today. */
  currentCents: number | null
  /** The same month a year earlier, or the same weekday 7 days earlier. */
  previousCents: number
}

export type ListBillsInput = {
  /** At most this many bills, an integer from 1 to 50. Omitted: every bill. */
  limit?: number
}

/**
 * One calendar month's savings goal. Both amounts are stored and user-editable: `achievedCents` is
 * the "Present" amount, and may exceed the target. A month with no stored goal reads as a zero goal.
 */
export type SavingsGoal = {
  month: YearMonth
  targetCents: number
  achievedCents: number
}

/** The editable amounts of one month's savings goal, in integer cents. */
export type SavingsGoalAmounts = {
  targetCents: number
  achievedCents: number
}

/**
 * One day of the Saving Summary chart, derived by the adapter from the stored savings goals: the
 * selected month's day `date`, that month's share of `achievedCents` for the day, and the previous
 * month's share for the same day of the month. Components display these numbers as given.
 */
export type SavingSummaryPoint = {
  /** A day of the selected month, day 1 first. */
  date: IsoDate
  /** This month's saving on `date`, or `null` after today. */
  currentCents: number | null
  /** The previous month's saving on the same day of the month, or `null` when it has no such day. */
  previousCents: number | null
}
