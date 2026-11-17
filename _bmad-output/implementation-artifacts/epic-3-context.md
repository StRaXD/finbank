# Epic 3 Context: Spending insights

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let users see what they spent and how it compares with earlier periods. When this epic is done, the Expenses page shows a Monthly/Weekly comparison bar chart and six per-category breakdown cards. Overview fills its Statistics slot with the same chart (weekly by default) and its Expenses Breakdown slot with six tiles that link to Expenses. The epic adds category tagging of expense transactions, the derived category summaries and comparison series to the port and mock adapter, and the first chart infrastructure (`chartScale`, `chartColors`, `ComparisonBarChart`, `Dropdown`, `CategoryIcon`, `TrendIndicator`). Epic 4 reuses all of these, so they must be built as general primitives.

## Stories

- Story 3.1: Expenses Breakdown category cards
- Story 3.2: Expenses Comparison bar chart with the Monthly/Weekly selector
- Story 3.3: Overview Statistics chart
- Story 3.4: Overview Expenses Breakdown tiles

## Requirements & Constraints

- **Read-only screen.** Expenses has no editing actions: no adding expenses, no creating or deleting categories. Category cards are not interactive.
- **Categories:** six fixed categories, always in this order: Housing, Food, Transportation, Entertainment, Shopping, Others. Revenue transactions have no category.
- **Category totals:** the sum of all expense-kind transactions of that category dated in the month that contains mock today (May 2023). `% change` is against the previous month (April 2023). A card lists only the two most recent items, but its total covers the whole month. A category with no items this month shows "No expenses this month".
- **Same numbers everywhere:** Overview tiles and Expenses cards show identical totals and % changes. The Overview Monthly view shows exactly the same series as the Expenses Monthly view, and the Expenses Weekly view the same as Overview Statistics.
- **Comparison chart:**
  - Monthly: Jan–Dec, legend "This Year" / "Last Year". The design's "This Week / Last Week" legend on Expenses is a copy error.
  - Weekly: Sun–Sat of the week containing mock today, labelled "14 Sun" to "20 Sat", legend "This week" / "Last week". The design's "17 Sun" start is a copy error. Days after mock today (20 May) have no current-period bar.
  - The dropdown offers Monthly and Weekly comparison. Expenses defaults to Monthly ("Monthly Comparison"), Overview to Weekly ("Weekly Comparison").
  - Y axis (Story 3.3 decision, superseding the fixed $250k scale): five evenly spaced ticks from the design's 5× ladder {0, 2, 10, 50, 250} × 10^k dollars. Each chart uses the smallest k whose top tick covers the largest value it shows, with linear interpolation between ticks. With the seed, both views get $0/$200/$1k/$5k/$25k.
- **Formatting:** category totals and item amounts use two decimals (`exact`). Axis labels are compact ("$2k"). Percent is two-digit ("08%"). Item dates use the row style ("17 May 2023").
- **States:** every query-backed card shows a skeleton while loading, a muted empty line when empty, and an inline error with retry.
- **Accessibility:** every chart takes a required `summary` text alternative that summarises the series. Overview tiles and their → arrow are keyboard-reachable with a visible focus state.
- **Fidelity:** both screens match their designs at 1440×1024. Figma placeholder values (for example Others $50 vs $650 between screens) don't have to be matched; the seed decides the numbers.

## Technical Decisions

- **Charting library:** recharts 3.10.1, already pinned. Charts plot `toPlot(v)` values from the tick scale and use recharts `ticks` and `tickFormatter` (with `formatCompact(…, 'axis')`) for labels. Do not use a log scale.
- **Chart scale (`src/lib/chartScale.ts`):** a pure `createTickScale(ticksCents)` returning `{ toPlot(v), ticks }`, plus `fitLadderTicks(maxCents)` (the fitted comparison ladder used by every comparison chart, Story 3.3) and the constants `BAR_TICKS = [0, 2_000_00, 10_000_00, 50_000_00, 250_000_00]` (ladder rung k = 3) and `SAVING_TICKS = [0, 500_00, 2_000_00, 5_000_00]` (for Epic 4). `ComparisonBarChart` requires `ticksCents`. Ticks are in cents. Unit-test the tick values, midpoints and clamping.
- **Chart colours:** `chartColors` in `src/ui/charts/` reads CSS variables declared under `@theme static` in `tokens.css`. Current period is teal (primary), previous period light grey. A unit test asserts every entry is non-empty. No hex literals outside `tokens.css`.
- **Port additions:**
  - `listCategorySummaries(): Promise<CategorySummary[]>`: six summaries in fixed order for the month containing today, each with `totalCents`, `changePct` (signed integer percent) and the two most recent items.
  - `getComparison(granularity: 'week' | 'year'): Promise<ComparisonPoint[]>`: points of `{ label, currentCents, previousCents }`. Current-period points after today are `null`.
  - Each gets one hook (`useCategorySummaries()`, `useComparison(granularity)`), a `qk` key and an http stub that throws `NOT_IMPLEMENTED`. `removeAccount` invalidates both (Stories 3.1 and 3.2), because removing an account removes its transactions.
- **Derived, never stored:** category `totalCents`, `changePct` and all comparison series are calculated by the mock adapter from the transaction seed. Components never recalculate or re-derive them (no summing in components, no computing the arrow from totals).
- **Data model:** an expense item is an expense-kind `Transaction` tagged with `category: ExpenseCategoryId` (a union of the six). Epic 2 left `category` optional on transactions and stored expenses without one still pass normalisation; this epic must decide whether untagged expenses are excluded from category totals (or rejected), and test it.
- **Seed constraints:** tag expense transactions across all six categories, with items in both May 2023 and April 2023 so `changePct` is meaningful. The weekly and yearly series also need seeded history for the previous week and for 2022. Everything stays anchored to mock today `2023-05-19`, and `removeAccount` still cascades to transactions, so summaries must update after a removal.
- **Dates:** only `src/lib/dates.ts` parses or does date arithmetic (`weekStartsOn: 0`, `weekOf`, `currentMonth`). Read today with `useToday()`. Never call `new Date()` in features.
- **Ownership:** `Dropdown`, `CategoryIcon` (owns the category label and icon map, icons via `src/ui/icons.ts`), `TrendIndicator` and `ComparisonBarChart` live in `src/ui`. `ComparisonChartCard`, `CategorySummaryCard` and `CategorySummaryTile` are owned by `features/expenses` and exported from its `index.ts`. `features/overview` imports them only through that index. Dropdown selection stays component-local state.
- **Tests:** unit tests for category totals, `changePct` sign, the empty-category case, the comparison series (including nulls after today), `chartScale` and `chartColors`.

## UX & Interaction Patterns

- **Grouped bar chart:** teal bars for the current period, light-grey bars for the previous one, legend at the top right, horizontal gridlines. No tooltip or hover state is designed.
- **Dropdown trigger:** the plain-text style (label plus chevron), as in "Monthly Comparison" / "Weekly Comparison". Epic 4 adds the grey-background style.
- **TrendIndicator:** the percent with an arrow: red ↑ (#E73D1C) for an increase (bad), green ↓ (#4DAF6E) for a decrease (good), with an optional caption ("Compare to last month").
- **Expenses category card:** grey header with `CategoryIcon`, name, total, `TrendIndicator` and the caption. The body lists two items, each with the name on the left and the amount above the date on the right, no column headers.
- **Overview tile:** icon, name, total, % with arrow, and a → arrow that navigates to `/expenses`. The card shows the caption "*Compare to last month" (the % carries an asterisk). In the design the Housing → is teal and the others grey, probably a hover state.
- **Section titles** ("Expenses Comparison", "Expenses Breakdown", "Statistics") sit above the cards.

## Cross-Story Dependencies

- Builds on the Epic 2 transaction seed and the Epic 1 `Card`, `AsyncSection`, formatting and date helpers. Overview's Statistics and Expenses Breakdown slots were left empty by Story 2.6.
- 3.1 adds category tagging to the seed, `listCategorySummaries`, `CategoryIcon`, `TrendIndicator` and `CategorySummaryCard`. 3.4 reuses the same hook and icon pieces for `CategorySummaryTile`.
- 3.2 adds `chartScale`, `chartColors`, `Dropdown`, `ComparisonBarChart`, `getComparison` and `ComparisonChartCard`. 3.3 reuses `ComparisonChartCard` with granularity `'week'` as the default.
- Epic 4 starts after this epic and reuses `Dropdown`, `CategoryIcon`, `chartColors` and `lib/chartScale` (`SAVING_TICKS`), so keep them generic.
