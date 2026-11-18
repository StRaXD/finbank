# Epic 4 Context: Savings goals and spending limits

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let users set and track a monthly savings goal and a monthly spending limit per expense category. When this epic is done, `/goals` shows the Savings Goal card (month selector, Target Achieved, This month Target, half-donut `GoalGauge`, "Adjust Goal"), the Saving Summary line chart (this month vs same period last month), and the "Expenses Goals by Category" grid with per-category Adjust. Two modals edit the stored values: `AdjustSavingsGoalModal` (target and present) and `AdjustCategoryLimitModal` (limit only). Overview's Goals widget shows the same goal and opens the same modal. This is the first epic with user-editable money values, so it introduces `MoneyInput` and the money-validation rules. It reuses Epic 3's `Dropdown`, `CategoryIcon`, `chartColors` and `lib/chartScale`.

## Stories

- Story 4.1: Savings Goal card with gauge and period selector
- Story 4.2: Adjust Savings Goal modal
- Story 4.3: Saving Summary line chart
- Story 4.4: Category spending limits with the Adjust modal
- Story 4.5: Overview Goals widget

## Requirements & Constraints

- **Savings goal:** one goal per calendar month, with stored `targetCents` and `achievedCents` ("Present"). The seed has a goal for each month from January to May 2023. May is $20,000 target and $12,500 achieved.
- **Period selector:** lists calendar months (from `selectableMonths`), labelled "01 May ~ 31 May", and defaults to the month containing mock today (May 2023). Choosing a month loads that month's goal.
- **Gauge:** fill and needle sit at achieved ÷ target, capped at 100%. A zero target renders an empty gauge without an error. End labels are "$0" and the compact target ("$20k"). The centre shows the compact achieved amount ("12K"). Caption: "Target vs Achievement".
- **Saving Summary:** daily points for the selected month and the previous month, derived from the stored goals: each month's `achievedCents` split by day (human decision, Story 4.3). Current-period points after mock today are `null`. The month dropdown defaults to "May 2023", and the axis labels follow the selected month (the design's "Mar 2022" is a copy error).
- **Category limits:** six categories in the fixed order (Housing, Food, Transportation, Entertainment, Shopping, Others), each with a stored `limitCents`. Seeded values vary by category; the design's uniform $250.00 is placeholder. There is no over-limit indicator, and limits are not compared with actual spending.
- **Money input validation:** accepts non-negative amounts with up to two decimals. A leading "$" and thousands separators are allowed and stripped. Empty, negative or non-numeric input blocks Save and shows an inline error in #E73D1C. Present may be greater than Target.
- **Modals:** no title, an X button, a primary "Save". Prefilled with current values. The Present placeholder is "Write present amount here" (design typo fixed). X, Esc and overlay click discard changes. Save persists, closes and refreshes every view of the value.
- **Same values everywhere:** Overview and Goals show the same target, achieved amount and gauge after an edit made on either page. Edits persist in localStorage; clearing storage restores the seed.
- **Formatting:** Savings Goal amounts use the whole style (no decimals). Category limits use the exact style (two decimals). The gauge centre and end labels are compact ("12K", "$20k"). The Saving Summary y ticks are ungrouped whole dollars ("$2000").
- **States and accessibility:** query-backed cards use `AsyncSection` (skeleton, muted empty line, inline error with retry). Every chart, including `GoalGauge`, requires a `summary` prop. Inputs require labels. Modals trap focus and close on Esc.
- **Fidelity:** all cards, the grid and both modals match the design at 1440×1024.

## Technical Decisions

- **Port additions** (each with one hook, a `qk` key, and an http stub throwing `NOT_IMPLEMENTED`):
  - `getSavingsGoal(month: YearMonth): Promise<SavingsGoal>` → `useSavingsGoal(month)`; the query key includes the `YearMonth`.
  - `updateSavingsGoal(month, { targetCents, achievedCents }): Promise<SavingsGoal>`
  - `getSavingSummary(month: YearMonth): Promise<SavingSummaryPoint[]>` (both values nullable)
  - `listCategoryLimits(): Promise<CategoryLimit[]>` and `updateCategoryLimit(id: ExpenseCategoryId, limitCents): Promise<CategoryLimit>`
- **Invalidation:** add to the single `invalidationMap`: `updateSavingsGoal` → `savingsGoal`, `savingSummary`; `updateCategoryLimit` → `categoryLimits`.
- **Stored vs derived:** goal target/achieved and category limits are stored and user-editable. The saving-summary series is derived by the mock adapter. The gauge ratio, the 100% cap and the centre label are derived in `GoalGauge` only. No other component recalculates them.
- **Money:** all values are integer cents, including chart ticks. `MoneyInput` (in `src/ui`, requires `label`) emits cents or `null` ("$1,234.50" → 123450; empty or unparseable → `null`).
- **Forms:** react-hook-form with zod.
- **Modals:** use the existing `Modal`, which portals into `#content-overlay-root` so only the content column dims, and sets the shell `inert` while open.
- **Dates:** only `src/lib/dates.ts` does date parsing and arithmetic (`currentMonth`, `monthRange`, `selectableMonths`). Labels go through `lib/format` (`formatRange` → "01 May ~ 31 May", `formatMoney(cents, 'whole' | 'exact')`, `formatCompact(cents, 'gauge' | 'axis')`). Read today with `useToday()`; never `new Date()` in features.
- **Chart scale:** the Saving Summary chart uses `createTickScale(SAVING_TICKS)` ($0/$500/$2000/$5000, evenly spaced, linear interpolation between ticks, values clamped). `SAVING_TICKS` already exists in `lib/chartScale`. Plot `toPlot` values with recharts `ticks` and `tickFormatter`. Not a log scale.
- **Ownership:** `MoneyInput`, `GoalGauge` and `ComparisonAreaChart` live in `src/ui`. `SavingsGoalCard`, `SavingsGoalSummary`, `AdjustSavingsGoalModal` and `AdjustCategoryLimitModal` are owned by `features/goals` and exported from its `index.ts`. `features/overview` imports them only through that index. Modal open state is component-local; the Goals page owns one selected month shared by both top-row cards (human decision, Story 4.3).
- **Colours:** chart colours through `chartColors` (CSS variables in `tokens.css`). No hex literals outside `tokens.css`.
- **Tests:** unit tests for the gauge ratio, the cap and a zero target, for the saving-summary series (nulls after today) and for the adapter's goal and limit persistence. React Testing Library tests for both modals: prefill, validation, successful save and discard on close.

## UX & Interaction Patterns

- **`Dropdown` triggers:** the grey `filled` style for "01 May ~ 31 May"; the small grey `subtle` style for the Saving Summary month ("May 2023").
- **Savings Goal card:** Target Achieved with a trophy icon, This month Target with a target icon, the gauge, and an outlined "Adjust Goal" button (1px teal border, teal text, pencil icon).
- **GoalGauge:** a half-donut with a teal fill over a grey remainder, a needle, min/max labels at the ends, the centre value and the caption below.
- **ComparisonAreaChart:** the current series is a smooth teal line with a gradient fill, the comparison series a grey dashed line. Legend "This month" (teal) / "Same period last month" (grey). X ticks on day 1 and every 5th day ("May 01", "May 05" … "May 30"), with vertical gridlines.
- **Category limit card:** `CategoryIcon`, name, limit, and an outlined "Adjust" button with a pencil icon, in a 3×2 grid under the section title "Expenses Goals by Category".
- **Modal layout:** white, rounded, centred over the content area with an X at the top right. The savings modal has "Target Amounts" and "Present Amounts" fields; the category modal has only "Target Amounts". Both have a centred 192px primary "Save" (as measured from 110.2).
- **Overview Goals widget:** the target in the whole style with a pencil in a grey square button beside it, the month ("May, 2023") on the right, then Target Achieved, This month Target and the gauge. It sits in the top row of the Overview grid, between Total Balance and Upcoming Bill.

## Cross-Story Dependencies

- Builds on Epic 1 (`Modal`, `Button` outline variant, `Card`, `AsyncSection`, `FormStatus`, format and date helpers) and Epic 3 (`Dropdown` grey variant, `CategoryIcon`, `chartColors`, `chartScale`, `ComparisonPoint`, `ExpenseCategoryId`).
- 4.1 adds the goal seed, `getSavingsGoal`, `GoalGauge` and `SavingsGoalCard`. 4.2 adds `MoneyInput`, `updateSavingsGoal` and `AdjustSavingsGoalModal`, and wires up "Adjust Goal".
- 4.3 adds `getSavingSummary` and `ComparisonAreaChart`, and widens 4.2's `updateSavingsGoal` invalidation to the summary.
- 4.4 reuses `MoneyInput` and the modal pattern from 4.2 for `AdjustCategoryLimitModal`.
- 4.5 reuses `useSavingsGoal(currentMonth)`, `SavingsGoalSummary` (stats + `GoalGauge`) and `AdjustSavingsGoalModal` from 4.1 and 4.2, and fills Overview's empty Goals slot.
