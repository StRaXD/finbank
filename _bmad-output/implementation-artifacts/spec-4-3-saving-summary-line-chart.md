---
title: 'Saving Summary line chart'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '750fea12544c130e270e72d6a77a5cb2b9eb90b0'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-2-adjust-savings-goal-modal.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The right two-thirds of the Goals top row is empty. Users can't compare how they are saving this month with the same period last month (FR24, screen 110).

**Approach:** Add `getSavingSummary(month)`. The mock adapter derives it from the same stored `savingsGoals` the card reads, never from chart literals. Render it in a new `ComparisonAreaChart` (`src/ui`) inside a "Saving Summary" card next to the Savings Goal card. Saving a goal invalidates the summary, so the chart and the card change together.

**Decisions (human, 2026-11-18):**
- **Series = Present split by day.**
  - Current month: the selected month's stored `achievedCents` is split over days 1 → min(today, month end). Days after today are `null`, and a past month uses all its days.
  - Previous month: the previous month's `achievedCents` is split over every one of its days.
  - The split: each day gets a deterministic weight in [0.4, 1.6] derived from its `IsoDate` (no randomness). It is an exact integer-cent split, so each series sums to its `achievedCents` exactly.
  - Editing Present rescales the series; `targetCents` doesn't affect the chart.
- **Month selectors linked.** `GoalsPage` owns one selected `YearMonth`, defaulting to `currentMonth(today)`. The Savings Goal card's "01 May ~ 31 May" dropdown and the Saving Summary's "May 2023" dropdown both read and set it, so the two cards always show the same month.

## Boundaries & Constraints

**Always:**
- **Derived in the adapter only:** the series is integer cents derived by the mock adapter from stored goals. Components never compute, scale or invent series values.
- **Shared invalidation:** `invalidationMap.updateSavingsGoal` becomes `[qk.savingsGoal(), qk.savingSummary()]`.
- **Y scale:** `createTickScale(SAVING_TICKS)` ($0/$500/$2000/$5000, evenly spaced, linear between ticks, clamped at the top). `SAVING_TICKS` already exists.
- **X axis:** ticks on day 1 and every 5th day ("May 01", "May 05" … "May 30"), labelled with `formatDate(…, 'axisDay')`, with vertical gridlines at those ticks.
- **Series styles:** the current series is a smooth teal line with a gradient fill; the previous series is a grey dashed line. Colours come only from `chartColors` / CSS-variable roles, never hex literals.
- **Legend:** "This month" (teal) and "Same period last month" (grey), via `ChartLegend`.
- **Accessibility and states:** `ComparisonAreaChart` requires `summary` and renders it `sr-only`. The card body goes through `AsyncSection`.
- **Month labels:** the month dropdown labels read "May 2023". The axis always shows the selected month.

**Never:**
- No hardcoded series values, wave literals or random numbers at render time.
- No chart-side date arithmetic outside `lib/dates.ts`.
- No category limits (Story 4.4) and no Overview widget (Story 4.5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Current month | `getSavingSummary('2023-05')`, today 2023-05-19 | 31 points. Days 1–19 have `currentCents` and days 20–31 `null` | N/A |
| Past month | `'2023-04'` | 30 points, every `currentCents` non-null | N/A |
| Unequal lengths | May (31 days) vs April (30) | May 31's `previousCents` is `null` | N/A |
| No goal stored | a month or its previous month has no goal | that series is all 0 (current days after today stay `null`) | N/A |
| Bad month | `'2023-13'` | rejects | `ApiError('VALIDATION')` |
| Month switched | pick Apr in either dropdown | both dropdowns show April; the card shows April's goal and the chart shows April vs March | N/A |
| Goal edited | Save new amounts for May in the modal | the summary refetches and the chart redraws from the new stored goal, with no reload | N/A |
| Above $5000/day | a series value > 500000 | drawn at the top tick (clamped by the scale); the summary text states the true amount | N/A |

</frozen-after-approval>

## Code Map

- `src/api/types.ts`, `port.ts`, `http/httpApi.ts` -- add `SavingSummaryPoint = { date: IsoDate; currentCents: number | null; previousCents: number | null }` and `getSavingSummary(month): Promise<SavingSummaryPoint[]>`. `ComparisonPoint` can't express a missing previous day, and the architecture's `ComparisonPoint` return is amended here.
- `src/api/mock/mockApi.ts` -- add a pure `savingSummarySeries(goals, today, month)` next to `comparisonSeries` (~line 403). Reuse `validYearMonth`, `addMonths`, `monthRange`, `addDays` and `toIsoDate`.
- `src/api/queryKeys.ts` -- add `qk.savingSummary(month?)` (the prefix without a month) and widen the `updateSavingsGoal` entry. `src/api/hooks/useSavingSummary.ts` follows the pattern of `useSavingsGoal.ts`.
- `src/lib/chartScale.ts` -- reuse `SAVING_TICKS` and `createTickScale`. `src/lib/format.ts`: add `DateMode` `'monthYear'` (`'MMM yyyy'` → "May 2023") for the dropdown.
- `src/ui/charts/ComparisonBarChart.tsx` -- the template for `ComparisonAreaChart.tsx`: recharts `ResponsiveContainer`, `readChartColors`, a plot-space `toPlot` y axis with `ticks`/`tickFormatter`, `TICK_CLASS`, `accessibilityLayer={false}`, `isAnimationActive={false}`, an `aria-hidden` SVG and an `sr-only` summary. Use `AreaChart` with a `monotone` current `Area` (gradient `linearGradient` from the `current` role), a dashed previous `Line` (`strokeDasharray`), and `CartesianGrid horizontal={false}`.
- `src/ui/charts/chartColorVars.ts`, `styles/tokens.css` -- add a role only if 110's dashed grey differs from `--color-chart-previous`. Measure first.
- `src/ui/charts/ChartLegend.tsx`, `ui/Dropdown.tsx` (`plain`), `ui/Card.tsx`, `ui/AsyncSection.tsx` -- reuse them.
- `src/features/goals/GoalsPage.tsx` -- the `saving-summary-slot` div is column 2 (`368fr_712fr`). Replace it with `SavingSummaryCard`. Lift month state here: `GoalsPage` reads `useToday()` (through `AsyncSection`) and passes `month`/`onMonthChange` to both cards. `SavingsGoalCard` (`SavingsGoalContent` owns `useState(month)` today) becomes controlled. The Overview reuse in Story 4.5 keeps working as long as the props are optional or the widget passes its own month.
- `design-reference/screens/110. Goals.png` -- the fidelity reference (2× export).

## Tasks & Acceptance

**Execution:**
- [x] `src/api/types.ts`, `port.ts`, `http/httpApi.ts`, `queryKeys.ts`, `hooks/useSavingSummary.ts` -- the contract, key, invalidation and hook.
- [x] `src/api/mock/mockApi.ts` (+ test) -- the derivation and method. Tests cover every matrix row and that the series follows `updateSavingsGoal`.
- [x] `src/lib/format.ts` (+ test) -- the `monthYear` mode.
- [x] `src/ui/charts/ComparisonAreaChart.tsx` (+ test) -- the chart. Tests cover the required summary, `null` gaps not drawn as 0, and the tick labels.
- [x] `src/features/goals/components/SavingsGoalCard.tsx` (+ `GoalsPage.test.tsx`) -- make the month controlled by `GoalsPage`. Existing 4.1/4.2 tests must still pass.
- [x] `src/features/goals/components/SavingSummaryCard.tsx`, `GoalsPage.tsx` (+ tests) -- the card: a bold "Saving Summary" title, a month `Dropdown`, the legend and the chart. A test edits the goal through the modal and asserts that the chart summary and the card both change.

**Acceptance Criteria:**
- Given `/goals`, when it loads, then the Saving Summary card shows "May 2023", the legend, and an area chart whose x labels run "May 01" … "May 30" and whose y labels are $0/$500/$2000/$5000.
- Given another month is picked in either card's dropdown, when the page updates, then both dropdowns, the goal card and the chart (axis labels and series) show that month.
- Given the goal is saved in the modal, when the modal closes, then the card and the chart reflect the new stored goal without a reload.
- Given screen 110 at 1440×1024, when compared in headless Chrome, then the Saving Summary card matches within 2px.

## Implementation Notes

- **Adapter:** `savingSummarySeries(goals, today, month)` and `savingDayWeight(date)` are exported pure functions in `mockApi.ts`. The weight is `round(100 + 40·sin(day·0.55 + a) + 20·sin(day·1.3 + b))` in hundredths (40…160), with phases `a`/`b` from an FNV-1a hash of the date's `YYYY-MM`, so the curve is smooth and differs per month. The split is largest-remainder in BigInt, so each split sums exactly to `achievedCents` (including `MAX_SAFE_INTEGER`).
- **Previous series with a longer previous month:** the previous month is split over all of its days, but only the days the selected month has are shown. April vs March drops March 31's share, so April's "previous" series sums to less than March's Present. This follows the frozen decision; the tests pin that the shown values equal March's own chart values.
- **Y labels are "$0/$500/$2000/$5000"** (AC and 110), not the compact "$5k". `formatMoney` gained a `'ungrouped'` mode (whole dollars, no separators) for these ticks.
- **Deviations from the Code Map, for fidelity:**
  - `Dropdown` gained a `'subtle'` variant (`text-12 text-ink-2`, 16px chevron). 110's month label is 12px regular grey; `plain` is 16px bold ink.
  - `ChartLegend` gained `spacing="wide"` (34px between items; 109 keeps 24px).
- **Month state:** `GoalsPage` reads `useToday()` through `AsyncSection` and owns one `YearMonth`. `SavingsGoalCard` takes optional `month`/`onMonthChange` and keeps its own state when they're absent, so Story 4.5's Overview widget can still use it standalone.
- **Summary text:** `SavingSummaryCard` writes the `sr-only` summary from the points, with each series' total and highest day in whole dollars, so values above the $5000 tick are stated unclamped.
- **Visual check (2026-11-18, headless Chrome over CDP, `vite preview`, 1440×1024, seeded mock):**
  - Card body 696,152, 712×293. Design 696,152, 712×~291.6. The row height comes from the Savings Goal card (also 293); this card's content ends at 419.
  - Title at 720,176. The dropdown text starts at x 884.6 (design 886).
  - Legend swatches at 1102.5 and 1223.8 (design 1102 and 1223.3).
  - Y labels end at x 767.2 (design 766.5), centred on y 241.5 ($5000) and 391.5 ($0), as in the design.
  - "May 01" is centred on 826 and "May 30" on 1329.7 (design 826 and 1329.75). The gridlines run 242–392.
- **Known differences from 110, kept on purpose:**
  - 110's x ticks are evenly spaced (84px) even though day 1→5 is 4 days and the other steps are 5. The chart is linear in days, so the inner ticks are up to ~15px off (May 05 at 895.5 vs 910).
  - 110's decorative curve runs from x 792 to 1384. The real series runs from day 1 (826) to day 31 (1347).
  - Vertical gridlines use the existing `--color-chart-grid` (#F3F3F3). 110 samples #E8E8E8 for them. The dashed series samples #E8E8E8, the same as `--color-chart-previous`, so no role was added.
- **Behaviour check (same session):** picking "Apr 2023" in the Saving Summary switched the goal card to "01 Apr ~ 30 Apr" ($17,100/$18,000) and the axis to "Apr 01…". Picking "01 May ~ 31 May" in the goal card switched both back. Saving Present 16,000 in the modal closed it with the card at $16,000 and the chart summary at "$16,000 in total", with no reload.
- Verified: `npm run typecheck`, `npm run lint`, `npm test` (81 files, 2428 passed, 6 skipped), `npm run test:tz` (1311 passed, 4 skipped), `npm run build`.

- Review patches (pass 1):
  - The `getSavingSummary` JSDoc now states that the previous series may sum to less (it shows only the selected month's days).
  - Chart-level y-placement tests: $500 lands on its tick, and $1,250 lands midway between $500 and $2000, for the area and the line.
  - A no-goal month's summary reads "no savings"; `isEmpty` makes the empty message reachable.
  - Axis labels are `fill-subtle` (readable-text rule), slightly darker than 110's #9F9F9F.
  - Test whitespace tidied.
- Orchestrator browser check (headless Chrome, 1440×1024), run after the patches:
  - May: the chart's this-month total is $12,500, the same as the card's Present.
  - Picking Apr 2023 in the chart dropdown moved both dropdowns, the card ($17,100 / $18,000) and the chart ($17,100) to April.
  - Saving April's Present as $9,000 updated the card and the chart ($9,000) together, without a reload.
  - The dashed line samples #E8E8E8 in 110, matching `chart-previous`.
- Verified: typecheck, lint, `npm test` (81 files, 2431 passed, 6 skipped), `test:tz` (1311 passed, 4 skipped), build.

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter, edge-case-hunter, verification-gap; plus the orchestrator's browser check):

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | blind, verification-gap | Port JSDoc says each series sums exactly to `achievedCents`; the previous series drops days the selected month lacks | low | `previous[i] ?? null` truncates (April shows March minus Mar 31: $15,680 of $16,300, observed in the browser). The behaviour follows the frozen decision; the contract text is wrong | patch |
| 2 | verification-gap | No chart-level test that an in-range value lands at its `toPlot` y | medium | Pre-verified: current tests check only gaps, clamping and the sr-only text | patch |
| 3 | blind, edge-case | No-goal months: the summary reads "$0 in total, highest $0 on day 1"; `emptyMessage` can never show | low | `describeSeries` treats all-zero as data. Reachable by picking Jun 2022–Dec 2022. `AsyncSection` gets no `isEmpty` | patch |
| 4 | orchestrator | Axis labels use `fill-faint` | low | The faint-text guard misses SVG `fill-*`, but the system reserves `faint` for disabled states. `ComparisonBarChart` uses `fill-subtle` | patch |
| 5 | blind | Double blank line in `GoalsPage.test.tsx` | low | Cosmetic; direct deletion | patch |
| 6 | blind | "Same period last month" compares 19 days of May with all of April | false | Frozen decision: the previous month's Present is split over all its days | reject |
| 7 | blind | Skeleton on every month switch | false | Spec requires `AsyncSection`; same behaviour as the 4.1 card and the Expenses chart | reject |
| 8 | edge-case, blind | `month` without `onMonthChange` silently does nothing | low | No caller passes one without the other; a discriminated union adds type machinery | reject |
| 9 | blind, verification-gap | Uncontrolled `SavingsGoalCard` path has no caller or test | low | Kept optional by the spec; no user-facing effect | reject |
| 10 | blind | `today` loaded twice; the row waits on it | false | `RequireSession` loads today before any page renders; `useToday` is one cached query | reject |
| 11 | blind | `savingDayWeight` untested on days 29–31 | false | Bounded by construction: 100 ± 40 ± 20 is always in [40, 160] | reject |
| 12 | blind, edge-case | Chart colours read once; no theme refresh | false | The app has no theme switching; same pattern as `ComparisonBarChart` | reject |
| 13 | blind, edge-case | `points=[]`, a short month, or a series not starting on day 1 untested | false | The adapter always returns 28–31 points starting on day 1; February gives ticks 1, 5 … 25 | reject |
| 14 | blind | Gradient `stopOpacity` untested | low | Cosmetic; no behaviour at risk | reject |
| 15 | blind | Diff omits the spec and sprint status | false | By design; both are committed with the story | reject |
| 16 | edge-case | `today` moving into a new month leaves the selection outside the options | false | Mock today is fixed; the previous month stays within the 12 options | reject |
| 17 | edge-case | Summary query key leaves out `today` | false | Mock today is fixed for the session | reject |

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:tz`, `npm run build` -- expected: all pass

**Manual checks:**
- Compare `/goals` with `110. Goals.png` at 1440×1024 in headless Chrome. Switch months, save a new goal, and confirm that both cards update together.
