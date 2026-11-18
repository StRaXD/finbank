import { SavingsGoalCard } from './components/SavingsGoalCard.tsx'

/**
 * Goals (110. Goals.png): the visible "Goals" title above a row of the Savings Goal card and,
 * in the wider second column, the Saving Summary chart (Story 4.3; empty for now).
 */
export function GoalsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-22 font-normal text-subtle">Goals</h1>
      <div className="grid grid-cols-[368fr_712fr] gap-6">
        <SavingsGoalCard />
        <div data-testid="saving-summary-slot" />
      </div>
    </div>
  )
}
