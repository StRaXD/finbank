import { Card } from '../../ui/Card.tsx'
import { BillList } from './components/BillList.tsx'

/** Upcoming Bills (108. Bills.png): the title, then every bill in a white card, earliest due first. */
export function BillsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-22 font-normal text-subtle">Upcoming Bills</h1>
      <Card>
        <BillList variant="table" />
      </Card>
    </div>
  )
}
