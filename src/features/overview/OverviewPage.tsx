import type { AccountDetailsPath } from '../balances/index.ts'
import { RecentTransactionCard } from './components/RecentTransactionCard.tsx'
import { TotalBalanceCard } from './components/TotalBalanceCard.tsx'
import { UpcomingBillCard } from './components/UpcomingBillCard.tsx'

export type OverviewPageProps = {
  /** Builds an account's Account Details URL (owned by the app's route table). */
  accountDetailsPath: AccountDetailsPath
  /** The Upcoming Bills page URL, for the Upcoming Bill "View All" link. */
  billsPath: string
  /** The Transactions page URL, for the Recent Transaction "View All" link. */
  transactionsPath: string
}

/**
 * Overview (104. Overview.png): a 3-column grid. Row 1 holds Total Balance (column 1) and Upcoming
 * Bill (column 3) at equal height; Recent Transaction fills column 1 from row 2, spanning the rows
 * Statistics and Expenses Breakdown will use. The Goals, Statistics and Expenses Breakdown slots
 * stay empty until Epics 3–4. The greeting lives in the top bar, so the page's `h1` is visually
 * hidden.
 */
export function OverviewPage({ accountDetailsPath, billsPath, transactionsPath }: OverviewPageProps) {
  return (
    <>
      <h1 className="sr-only">Overview</h1>
      <div data-testid="overview-grid" className="grid grid-cols-3 gap-x-6 gap-y-8">
        <div data-testid="slot-total-balance" className="col-start-1 row-start-1">
          <TotalBalanceCard accountDetailsPath={accountDetailsPath} />
        </div>
        <div data-testid="slot-upcoming-bill" className="col-start-3 row-start-1">
          <UpcomingBillCard billsPath={billsPath} />
        </div>
        <div data-testid="slot-recent-transaction" className="col-start-1 row-span-2 row-start-2">
          <RecentTransactionCard transactionsPath={transactionsPath} />
        </div>
      </div>
    </>
  )
}
