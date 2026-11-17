import { BillList } from '../../bills/index.ts'
import { Card } from '../../../ui/Card.tsx'
import { ViewAllLink } from './ViewAllLink.tsx'

export type UpcomingBillCardProps = {
  /** The Upcoming Bills page URL (owned by the app's route table). */
  billsPath: string
}

/**
 * Upcoming Bill (104. Overview.png): the bills feature's own compact list of the next two bills,
 * read through the same `useBills` hook and data source as the Upcoming Bills page. The card matches the height of
 * its row, with the rows centred in it.
 */
export function UpcomingBillCard({ billsPath }: UpcomingBillCardProps) {
  return (
    <Card title="Upcoming Bill" actions={<ViewAllLink to={billsPath} what="bills" />} fill>
      <div className="my-auto">
        <BillList variant="compact" limit={2} />
      </div>
    </Card>
  )
}
