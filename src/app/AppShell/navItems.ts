import type { IconName } from '../../ui/icons.ts'
import { routes } from '../routes.ts'

export type NavItem = { label: string; to: string; icon: IconName }

/** The sidebar's seven sections, in design order. */
export const navItems: readonly NavItem[] = [
  { label: 'Overview', to: routes.overview, icon: 'overview' },
  { label: 'Balances', to: routes.balances, icon: 'balances' },
  { label: 'Transactions', to: routes.transactions, icon: 'transactions' },
  { label: 'Bills', to: routes.bills, icon: 'bills' },
  { label: 'Expenses', to: routes.expenses, icon: 'expenses' },
  { label: 'Goals', to: routes.goals, icon: 'goals' },
  { label: 'Settings', to: routes.settings, icon: 'settings' },
]
