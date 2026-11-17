import type { AccountType } from '../../api/types.ts'

/** Display label of each account type, shared by every screen that names an account. */
export const accountTypeLabels: Record<AccountType, string> = {
  creditCard: 'Credit Card',
  checking: 'Checking',
  savings: 'Savings',
  investment: 'Investment',
  loan: 'Loan',
}
