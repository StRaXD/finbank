// The only home of URL paths. Every link, redirect and route definition reads from here.

/** Concrete paths to navigate to. */
export const routes = {
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  overview: '/',
  balances: '/balances',
  accountDetails: (id: string) => {
    if (id === '') throw new Error('routes.accountDetails needs a non-empty account id.')
    return `/balances/${encodeURIComponent(id)}`
  },
  transactions: '/transactions',
  bills: '/bills',
  expenses: '/expenses',
  goals: '/goals',
  settings: '/settings',
  /** Dev-only token and component specimen (Stories 1.2/1.3); `undefined` (and absent) in production. */
  specimen: import.meta.env.DEV ? '/__specimen' : undefined,
} as const

/** Route-table patterns that are not concrete paths. */
export const routePatterns = {
  accountDetails: '/balances/:accountId',
  unknown: '*',
} as const
