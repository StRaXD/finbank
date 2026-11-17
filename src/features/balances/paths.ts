/**
 * The Balances screen's link targets. Paths are owned by `src/app/routes.ts`, which features may
 * not import, so the route table passes them in.
 */
export type AccountDetailsPath = (accountId: string) => string

/** Router state for arriving on Balances: `focusHeading` focuses the page title on arrival. */
export type BalancesLocationState = { focusHeading?: boolean }
