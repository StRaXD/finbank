import { toIsoDate, toYearMonth } from '../../lib/dates.ts'
import type { Account, Bill, CategoryLimit, IsoDate, SavingsGoal, Transaction, UserProfile } from '../types.ts'
import { buildSeedTransactions } from './seedTransactions.ts'

export const MOCK_STATE_VERSION = 2

/** Everything the mock adapter persists under `finbank:mock:v1`. Later epics add top-level keys. */
export type MockState = {
  version: typeof MOCK_STATE_VERSION
  today: IsoDate
  profile: UserProfile
  /** In display order. May be empty: the user can remove every account. */
  accounts: Account[]
  /** Every `accountId` is in `accounts`; removing an account removes its transactions. */
  transactions: Transaction[]
  /** Stored in any order; `listBills` sorts them by due date. */
  bills: Bill[]
  /** At most one goal per month, in any order. A month without one reads as a zero goal. */
  savingsGoals: SavingsGoal[]
  /** Exactly one limit per expense category, in the fixed category order. */
  categoryLimits: CategoryLimit[]
  /**
   * The `<n>` of the next `acc_<n>` id `createAccount` assigns. Only ever grows, so an id is never
   * reused; on load it is at least the highest stored account number plus one.
   */
  nextAccountNumber: number
}

/** The single signed-in user of the mock (single-user decision, 2026-11-16). */
export const MOCK_USER_ID = 'usr_1'

// Banks, networks and number prefixes follow 105. Balances.png. Balances are chosen so the
// derived Total Balance is $240,399 (104. Overview.png): 25,056 + 180,000 + 75,343 - 12,000 - 28,000.
const seedAccounts = Object.freeze([
  Object.freeze({
    id: 'acc_1',
    type: 'creditCard',
    bankName: 'AB Bank Ltd.',
    branchName: 'Gulshan Avenue Branch',
    network: 'mastercard',
    accountNumber: '3388455688602598',
    balanceCents: 1_200_000,
  }),
  Object.freeze({
    id: 'acc_2',
    type: 'checking',
    bankName: 'AB Bank Ltd.',
    branchName: 'Park Street Branch',
    network: 'visa',
    accountNumber: '6934566991234',
    balanceCents: 2_505_600,
  }),
  Object.freeze({
    id: 'acc_3',
    type: 'savings',
    bankName: 'Brac Bank Ltd.',
    branchName: 'Banani Branch',
    accountNumber: '13345688681234',
    balanceCents: 18_000_000,
  }),
  Object.freeze({
    id: 'acc_4',
    type: 'investment',
    bankName: 'AB Bank Ltd.',
    branchName: 'Motijheel Branch',
    accountNumber: '69845686624471',
    balanceCents: 7_534_300,
  }),
  Object.freeze({
    id: 'acc_5',
    type: 'loan',
    bankName: 'City Bank Ltd.',
    branchName: 'Dhanmondi Branch',
    accountNumber: '36345689663390',
    balanceCents: 2_800_000,
  }),
] satisfies Account[])

// The bills of 108. Bills.png, every one due after mock today (2023-05-19), and each last charged
// one billing cycle before its due date. Sorted by due date they are Figma, Adobe, Google, so the
// Overview widget's "next two" are the design's Figma and Adobe.
const seedBills = Object.freeze([
  Object.freeze({
    id: 'bill_1',
    vendor: 'Figma',
    logo: 'figma',
    title: 'Figma - Yearly Plan',
    description:
      'For advanced security and more flexible controls, the Professional plan helps you scale design processes company-wide.',
    billingCycle: 'yearly',
    dueDate: toIsoDate('2023-05-25'),
    lastChargeDate: toIsoDate('2022-05-25'),
    amountCents: 15_000,
  }),
  Object.freeze({
    id: 'bill_2',
    vendor: 'Adobe',
    logo: 'adobe',
    title: 'Adobe Inc - Yearly Plan',
    description:
      'For creative teams, the full Creative Cloud suite with shared libraries, cloud storage and admin controls.',
    billingCycle: 'yearly',
    dueDate: toIsoDate('2023-06-16'),
    lastChargeDate: toIsoDate('2022-06-16'),
    amountCents: 55_900,
  }),
  Object.freeze({
    id: 'bill_3',
    vendor: 'Google',
    logo: 'google',
    title: 'Google Workspace - Monthly Plan',
    description:
      'Business email, video meetings and shared drives for the whole team, with security and admin controls.',
    billingCycle: 'monthly',
    dueDate: toIsoDate('2023-06-18'),
    lastChargeDate: toIsoDate('2023-05-18'),
    amountCents: 7_200,
  }),
] satisfies Bill[])

// One savings goal per month, January to May 2023 (110. Goals.png shows May: $12,500 of $20,000).
// February's achieved amount is over its target, which exercises the gauge's 100% cap.
const seedSavingsGoals = Object.freeze([
  Object.freeze({ month: toYearMonth('2023-01'), targetCents: 1_500_000, achievedCents: 1_420_000 }),
  Object.freeze({ month: toYearMonth('2023-02'), targetCents: 1_500_000, achievedCents: 1_560_000 }),
  Object.freeze({ month: toYearMonth('2023-03'), targetCents: 1_800_000, achievedCents: 1_630_000 }),
  Object.freeze({ month: toYearMonth('2023-04'), targetCents: 1_800_000, achievedCents: 1_710_000 }),
  Object.freeze({ month: toYearMonth('2023-05'), targetCents: 2_000_000, achievedCents: 1_250_000 }),
] satisfies SavingsGoal[])

// One monthly spending limit per category, in the fixed category order. The values vary on
// purpose: 110. Goals.png's uniform $250.00 is placeholder copy.
const seedCategoryLimits = Object.freeze([
  Object.freeze({ category: 'housing', limitCents: 100_000 }),
  Object.freeze({ category: 'food', limitCents: 50_000 }),
  Object.freeze({ category: 'transportation', limitCents: 30_000 }),
  Object.freeze({ category: 'entertainment', limitCents: 25_000 }),
  Object.freeze({ category: 'shopping', limitCents: 40_000 }),
  Object.freeze({ category: 'others', limitCents: 20_000 }),
] satisfies CategoryLimit[])

export const seed: Readonly<
  Omit<MockState, 'accounts' | 'transactions' | 'bills' | 'savingsGoals' | 'categoryLimits'>
> & {
  readonly accounts: readonly Readonly<Account>[]
  readonly transactions: readonly Readonly<Transaction>[]
  readonly bills: readonly Readonly<Bill>[]
  readonly savingsGoals: readonly Readonly<SavingsGoal>[]
  readonly categoryLimits: readonly Readonly<CategoryLimit>[]
} = Object.freeze({
  version: MOCK_STATE_VERSION,
  today: toIsoDate('2023-05-19'),
  profile: Object.freeze({
    fullName: 'Tanzir Rahman',
    email: 'tanzir.rahman@email.com',
    username: 'tanzir.rahman',
    phoneCountryCode: '+880',
    phoneNumber: '51547 58868',
    avatarUrl: null,
  }),
  accounts: seedAccounts,
  transactions: Object.freeze(buildSeedTransactions(seedAccounts).map((t) => Object.freeze(t))),
  bills: seedBills,
  savingsGoals: seedSavingsGoals,
  categoryLimits: seedCategoryLimits,
  nextAccountNumber: seedAccounts.length + 1,
})

/** A deep, mutable copy of the seed. */
export function seedState(): MockState {
  return structuredClone(seed) as MockState
}
