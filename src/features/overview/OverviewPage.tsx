import type { AccountDetailsPath } from '../balances/index.ts'
import { TotalBalanceCard } from './components/TotalBalanceCard.tsx'

export type OverviewPageProps = {
  /** Builds an account's Account Details URL (owned by the app's route table). */
  accountDetailsPath: AccountDetailsPath
}

/**
 * Overview (104. Overview.png): a 3-column grid. Total Balance fills row 1, column 1; the Goals
 * and Upcoming Bill slots (row 1) and the Recent Transaction, Statistics and Expenses Breakdown
 * slots (row 2 on) stay empty until their stories. The greeting lives in the top bar, so the
 * page's `h1` is visually hidden.
 */
export function OverviewPage({ accountDetailsPath }: OverviewPageProps) {
  return (
    <>
      <h1 className="sr-only">Overview</h1>
      <div data-testid="overview-grid" className="grid grid-cols-3 gap-6">
        <div className="col-start-1 row-start-1">
          <TotalBalanceCard accountDetailsPath={accountDetailsPath} />
        </div>
      </div>
    </>
  )
}
