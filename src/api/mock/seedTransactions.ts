// The seeded transactions: a pure, deterministic builder (no randomness, no `Date`).
import { toIsoDate } from '../../lib/dates.ts'
import type { Account, AccountType, ExpenseCategoryId, Transaction, TransactionIcon } from '../types.ts'

/** The payment method each account type pays with. */
export const PAYMENT_METHOD_BY_ACCOUNT_TYPE: Record<AccountType, string> = {
  creditCard: 'Credit Card',
  checking: 'Debit Card',
  savings: 'Bank Transfer',
  investment: 'Bank Transfer',
  loan: 'Bank Transfer',
}

const CATEGORY_ICON: Record<ExpenseCategoryId, TransactionIcon> = {
  housing: 'housing',
  food: 'food',
  transportation: 'transport',
  entertainment: 'entertainment',
  shopping: 'shopping',
  others: 'other',
}

type Row = {
  accountId: string
  date: string
  item: string
  shop: string
  amountCents: number
  category?: ExpenseCategoryId
  icon: TransactionIcon
  pending?: boolean
}

type Extra = { icon?: TransactionIcon; pending?: boolean }

/** An expense row; the icon defaults to the category's. */
function expense(
  accountId: string,
  date: string,
  item: string,
  shop: string,
  category: ExpenseCategoryId,
  amountCents: number,
  extra: Extra = {},
): Row {
  return { accountId, date, item, shop, amountCents, category, icon: extra.icon ?? CATEGORY_ICON[category], pending: extra.pending }
}

/** A revenue row. */
function revenue(
  accountId: string,
  date: string,
  item: string,
  shop: string,
  amountCents: number,
  extra: Extra = {},
): Row {
  return { accountId, date, item, shop, amountCents, icon: extra.icon ?? 'transfer', pending: extra.pending }
}

// Per account, newest first. The first seven are the rows of 107. Transactions.png, in its order:
// they are the newest rows of all (nothing is dated after 2023-05-17).
const ROWS: readonly Row[] = [
  // acc_1: Credit Card
  expense('acc_1', '2023-05-17', 'GTR 5', 'Gadget & Gear', 'shopping', 16_000, { icon: 'gadget' }),
  expense('acc_1', '2023-05-17', 'Polo shirt', 'XL fashions', 'shopping', 2_000),
  expense('acc_1', '2023-05-17', 'Biriyani', 'Hajir Biriyani', 'food', 1_200),
  expense('acc_1', '2023-05-17', 'Movie ticket', 'Inox', 'entertainment', 1_500),
  expense('acc_1', '2023-05-17', 'Taxi fare', 'Uber', 'transportation', 1_000),
  expense('acc_1', '2023-05-17', 'Pizza', 'Pizza Hit', 'food', 2_000),
  expense('acc_1', '2023-05-17', 'Keyboard', 'Gadget & Gear', 'shopping', 3_000),
  expense('acc_1', '2023-05-15', 'Groceries', 'Shwapno', 'food', 4_520),
  expense('acc_1', '2023-05-12', 'Netflix subscription', 'Netflix', 'entertainment', 1_499),
  expense('acc_1', '2023-05-09', 'Headphones', 'Gadget & Gear', 'shopping', 8_900, { icon: 'gadget' }),
  revenue('acc_1', '2023-05-05', 'Cashback reward', 'AB Bank Ltd.', 1_250),
  expense('acc_1', '2023-05-02', 'Bus tickets', 'Shohoz', 'transportation', 2_500),
  expense('acc_1', '2023-04-28', 'Concert ticket', 'Ticketmaster', 'entertainment', 4_500),
  expense('acc_1', '2023-04-24', 'Sneakers', 'Bata', 'shopping', 6_500),
  expense('acc_1', '2023-04-19', 'Dinner', 'Kacchi Bhai', 'food', 3_200),
  expense('acc_1', '2023-04-14', 'Phone case', 'Gadget & Gear', 'shopping', 1_800, { icon: 'gadget' }),
  expense('acc_1', '2023-04-08', 'Burger', 'Takeout', 'food', 1_450),
  revenue('acc_1', '2023-04-03', 'Refund', 'Daraz', 2_999),

  // acc_2: Checking
  revenue('acc_2', '2023-05-16', 'Monthly salary', 'Tech Solutions Ltd.', 450_000, { icon: 'salary' }),
  expense('acc_2', '2023-05-14', 'Electricity bill', 'DESCO', 'housing', 6_800),
  expense('acc_2', '2023-05-11', 'Fuel', 'Padma Oil', 'transportation', 3_500),
  expense('acc_2', '2023-05-08', 'Gym membership', "Gold's Gym", 'others', 3_000),
  expense('acc_2', '2023-05-06', 'Coffee', 'North End', 'food', 650, { pending: true }),
  expense('acc_2', '2023-05-03', 'Internet bill', 'Link3', 'housing', 2_500),
  expense('acc_2', '2023-05-01', 'Pharmacy', 'Lazz Pharma', 'others', 1_240),
  revenue('acc_2', '2023-04-29', 'Freelance payment', 'Upwork', 85_000, { icon: 'salary' }),
  expense('acc_2', '2023-04-26', 'Groceries', 'Meena Bazar', 'food', 5_230),
  expense('acc_2', '2023-04-22', 'Ride share', 'Pathao', 'transportation', 780),
  expense('acc_2', '2023-04-18', 'Water bill', 'Dhaka WASA', 'housing', 1_500),
  revenue('acc_2', '2023-04-15', 'Monthly salary', 'Tech Solutions Ltd.', 450_000, { icon: 'salary' }),
  expense('acc_2', '2023-04-11', 'Novel', 'Rokomari', 'shopping', 1_200),
  expense('acc_2', '2023-04-07', 'Music subscription', 'Spotify', 'entertainment', 999),
  expense('acc_2', '2023-04-04', 'Doctor visit', 'Square Hospital', 'others', 2_500),
  expense('acc_2', '2023-04-01', 'Donation', 'BRAC', 'others', 2_000),

  // acc_3: Savings
  revenue('acc_3', '2023-05-16', 'Interest', 'Brac Bank Ltd.', 37_500),
  revenue('acc_3', '2023-05-13', 'Transfer from Checking', 'AB Bank Ltd.', 50_000),
  expense('acc_3', '2023-05-10', 'Rent', 'Banani Properties', 'housing', 120_000),
  expense('acc_3', '2023-05-07', 'Home insurance', 'Green Delta', 'others', 8_500),
  expense('acc_3', '2023-05-04', 'Sofa', 'Hatil', 'housing', 45_000),
  expense('acc_3', '2023-05-01', 'Theme park', 'Fantasy Kingdom', 'entertainment', 4_000),
  revenue('acc_3', '2023-04-30', 'Interest', 'Brac Bank Ltd.', 36_800),
  expense('acc_3', '2023-04-27', 'Flight tickets', 'Biman', 'transportation', 32_000),
  expense('acc_3', '2023-04-23', 'Laptop', 'Star Tech', 'shopping', 95_000, { icon: 'gadget' }),
  revenue('acc_3', '2023-04-20', 'Transfer from Checking', 'AB Bank Ltd.', 50_000),
  expense('acc_3', '2023-04-12', 'Wedding gift', 'Aarong', 'shopping', 7_500),
  expense('acc_3', '2023-04-09', 'Rent', 'Banani Properties', 'housing', 120_000),
  expense('acc_3', '2023-04-06', 'Movie night', 'Star Cineplex', 'entertainment', 1_800),
  expense('acc_3', '2023-04-05', 'Family dinner', "Nando's", 'food', 6_400),
  expense('acc_3', '2023-04-02', 'Income tax', 'NBR', 'others', 15_000),

  // acc_4: Investment
  revenue('acc_4', '2023-05-15', 'Dividend', 'AB Investments', 120_000),
  expense('acc_4', '2023-05-12', 'Stock purchase', 'DSE Broker', 'others', 250_000),
  revenue('acc_4', '2023-05-08', 'Bond coupon', 'Bangladesh Bank', 45_000),
  expense('acc_4', '2023-05-04', 'Advisory fee', 'LankaBangla', 'others', 5_000),
  expense('acc_4', '2023-05-02', 'Mutual fund', 'IDLC', 'others', 100_000, { pending: true }),
  revenue('acc_4', '2023-04-28', 'Dividend', 'AB Investments', 110_000),
  expense('acc_4', '2023-04-25', 'Brokerage fee', 'DSE Broker', 'others', 1_200),
  expense('acc_4', '2023-04-21', 'Stock purchase', 'DSE Broker', 'others', 180_000),
  revenue('acc_4', '2023-04-17', 'Share sale', 'DSE Broker', 75_000),
  expense('acc_4', '2023-04-13', 'Client lunch', "Sultan's Dine", 'food', 2_200),
  expense('acc_4', '2023-04-10', 'Conference ticket', 'Eventbrite', 'entertainment', 3_500),
  expense('acc_4', '2023-04-07', 'Research subscription', 'Bloomberg', 'others', 4_900),
  revenue('acc_4', '2023-04-05', 'Dividend', 'AB Investments', 98_000),
  expense('acc_4', '2023-04-03', 'Transfer fee', 'AB Bank Ltd.', 'others', 300),
  expense('acc_4', '2023-04-01', 'Bond purchase', 'Bangladesh Bank', 'others', 200_000),

  // acc_5: Loan
  revenue('acc_5', '2023-05-14', 'Loan disbursement', 'City Bank Ltd.', 500_000),
  expense('acc_5', '2023-05-12', 'Game console', 'Star Tech', 'entertainment', 48_000, { icon: 'gadget' }),
  expense('acc_5', '2023-05-10', 'Home loan EMI', 'City Bank Ltd.', 'housing', 28_000),
  expense('acc_5', '2023-05-09', 'Refrigerator', 'Walton', 'shopping', 55_000),
  expense('acc_5', '2023-05-06', 'Car loan EMI', 'City Bank Ltd.', 'transportation', 15_000),
  expense('acc_5', '2023-05-03', 'Processing fee', 'City Bank Ltd.', 'others', 2_500),
  expense('acc_5', '2023-04-29', 'Home renovation', 'Paint Pro', 'housing', 35_000),
  expense('acc_5', '2023-04-26', 'Car service', 'Toyota Service', 'transportation', 9_500),
  expense('acc_5', '2023-04-21', 'Wedding catering', 'Star Kabab', 'food', 60_000),
  expense('acc_5', '2023-04-18', 'Late fee', 'City Bank Ltd.', 'others', 1_000, { pending: true }),
  expense('acc_5', '2023-04-15', 'Wardrobe', 'Otobi', 'housing', 42_000),
  expense('acc_5', '2023-04-11', 'Home loan EMI', 'City Bank Ltd.', 'housing', 28_000),
  expense('acc_5', '2023-04-08', 'Car loan EMI', 'City Bank Ltd.', 'transportation', 15_000),
  revenue('acc_5', '2023-04-04', 'Loan disbursement', 'City Bank Ltd.', 300_000),
  expense('acc_5', '2023-04-02', 'Insurance premium', 'MetLife', 'others', 6_000),
]

const RECEIPT_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/** An 11-character alphanumeric receipt id, derived from the row number only. */
function receiptId(n: number): string {
  // A 32-bit linear congruential sequence seeded by the row number: deterministic, no randomness.
  let x = (n * 2_654_435_761) >>> 0
  let id = ''
  for (let i = 0; i < 11; i++) {
    x = (Math.imul(x, 1_664_525) + 1_013_904_223) >>> 0
    id += RECEIPT_ALPHABET[x % RECEIPT_ALPHABET.length]
  }
  return id
}

/**
 * Builds the seed transactions for `accounts`, newest first (stable for equal dates), with ids
 * `txn_1`… in that order. Payment method follows the account type, `type` follows `kind`.
 */
export function buildSeedTransactions(accounts: readonly Pick<Account, 'id' | 'type'>[]): Transaction[] {
  const typeOf = new Map(accounts.map((account) => [account.id, account.type]))
  // Fixed-width ISO dates compare correctly as strings; `sort` is stable.
  const ordered = [...ROWS].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return ordered.map((row, index) => {
    const accountType = typeOf.get(row.accountId)
    if (!accountType) throw new Error(`Seed transaction for unknown account ${row.accountId}`)
    const n = index + 1
    const transaction: Transaction = {
      id: `txn_${n}`,
      accountId: row.accountId,
      item: row.item,
      shop: row.shop,
      kind: row.category ? 'expense' : 'revenue',
      paymentMethod: PAYMENT_METHOD_BY_ACCOUNT_TYPE[accountType],
      status: row.pending ? 'pending' : 'complete',
      type: row.category ? 'debit' : 'credit',
      receiptId: receiptId(n),
      amountCents: row.amountCents,
      date: toIsoDate(row.date),
      icon: row.icon,
    }
    if (row.category) transaction.category = row.category
    return transaction
  })
}
