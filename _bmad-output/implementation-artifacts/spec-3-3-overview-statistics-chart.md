---
title: 'Story 3.3: Overview Statistics chart'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: 'bb90efa364bc678809bdc2ff300683117bcb51cf'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-2-expenses-comparison-bar-chart-with-the-monthly-weekly-selector.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:**
- Overview's Statistics slot is empty.
- On the fixed $0/$2k/$10k/$50k/$250k scale, the weekly comparison's real daily amounts ($0–$3k) draw bars only a few pixels tall. This was deferred from 3.2.

**Approach:**
- Fill the Statistics slot with the shared `ComparisonChartCard`, defaulting to Weekly.
- Replace the fixed bar scale with a scale fitted to the shared transaction data: the design's 5× ladder, scaled by powers of ten to the series' largest value. No transaction amount changes.

## Boundaries & Constraints

**Always:**
- Human decision (2026-11-17), superseding the fixed scale of FR-14, FR-21 and AD-16 for comparison charts:
  - Every comparison chart, Weekly and Monthly, on Overview and Expenses, uses the fitted ladder.
  - Ladder k has ticks {0, 2, 10, 50, 250} × 10^k dollars, so k = 3 is the design's `BAR_TICKS`. The chart uses the smallest k ≥ 0 whose top tick is at least the largest value among both series of the shown points, ignoring nulls. An all-zero series uses k = 0.
  - Geometry is unchanged: five evenly spaced ticks with linear interpolation.
- Human decision: the scale adapts to the data. Seed transaction amounts are not changed to match Figma.
- Data stays one source. Overview and Expenses read the same `useComparison` keys and the same `useCategorySummaries`. The chart's daily totals equal the categorized expenses that Transactions and Account Details list for those days.
- Axis labels stay exact. `formatCompact(…, 'axis')` keeps one truncated decimal for non-whole thousands or millions ("$2.5k", "$12.5k"). Whole values keep the current output ("$2k", "$250k"). `'gauge'` is unchanged.
- On Overview, the card has the title "Statistics" (Overview's `Card` title style) and defaults to "Weekly Comparison". Switching to Monthly shows exactly the Expenses Monthly series and scale.

**Never:**
- No change to seed amounts or `MOCK_STATE_VERSION`.
- No Expenses Breakdown tiles (3.4) and no Goals widget (Epic 4).
- No per-component re-derivation of series values. Picking the axis ladder is presentation only.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Weekly seed | Today is 2023-05-19 and the max is the previous Fri, about $2,995 | Ladder k = 2: $0/$200/$1k/$5k/$25k. 20 Sat has no current bar. | N/A |
| Monthly seed | The max is $14,800 | Ladder k = 2. The bars sit between about 55% and 90% of the plot height. | N/A |
| Small data | The max is $40 | k = 0: $0/$2/$10/$50/$250 | N/A |
| All zero or nulls | Every value is 0 or null | k = 0 | N/A |
| Boundary | The max is exactly $25,000; or $25,000.01 | k = 2; k = 3 | N/A |
| Label | Ladder k = 1 | "$0", "$20", "$100", "$500", "$2.5k" | N/A |
| Consistency | The seed week | Each weekly `currentCents` equals the sum of that day's categorized expenses from `listTransactions({ kind: 'expense' })` | N/A |
| Overview Monthly | The user switches Overview to Monthly | The same points, ticks and summary as Expenses Monthly | N/A |

</frozen-after-approval>

## Code Map

- `src/lib/chartScale.ts` -- `createTickScale` and `BAR_TICKS` (the k = 3 ladder). Add `fitLadderTicks(maxCents)` next to them.
- `src/lib/format.ts:54` -- `formatCompact`. `format.test.ts:79` pins `[1250000, 'axis', '$12k']`; this becomes "$12.5k".
- `src/ui/charts/ComparisonBarChart.tsx` -- already takes a `ticksCents` prop, which defaults to `BAR_TICKS`. Labels come from `formatCompact`.
- `src/features/expenses/components/ComparisonChartCard.tsx` -- computes the max over the shown points and passes `fitLadderTicks(max)`. Add an optional `title`, passed through to `Card`.
- `src/features/overview/OverviewPage.tsx` -- add the Statistics slot at `col-span-2 col-start-2 row-start-2`. Import only through `features/expenses/index.ts`.
- `src/features/overview/OverviewPage.test.tsx:184` -- the "slots stay empty" assertion of 3 children becomes 4. The `renderPage` stubs need `getComparison`.
- `src/api/mock/mockApi.test.ts` -- the `getComparison` describe block, for the consistency row.
- `design-reference/screens/104. Overview.png` -- 2× export:
  - the Statistics title centre at y≈424
  - the card from x=680 to 1408 and y=448 to ≈706
  - an 84px weekly pitch and 16px bars

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/chartScale.ts` (+ test) -- `fitLadderTicks`, per the frozen rule and the matrix rows Small, All-zero and Boundary.
- [x] `src/lib/format.ts` (+ test) -- the axis decimal rule. Update the pinned row and add $2.5k, $2.5m and $1,250 → "$1.2k".
- [x] `src/features/expenses/components/ComparisonChartCard.tsx` (+ test) -- fitted ticks for each shown series, and the optional `title`. Tests: the weekly seed-like fixture gives the k = 2 labels, and switching granularity refits.
- [x] `src/features/overview/OverviewPage.tsx` (+ test) -- the Statistics slot. Tests: the "Weekly Comparison" default, the "14 Sun" … "20 Sat" labels, and the Monthly switch matching Expenses (the router-level test with the mock adapter).
- [x] `src/api/mock/mockApi.test.ts` -- the consistency row.

**Acceptance Criteria:**
- Given `/` at 1440×1024, when it loads, then Statistics matches 104 (NFR-1) for the title, card box, dropdown, legend, gridlines (36px apart) and bar geometry. Tick labels show the fitted ladder, and Figma's $250k is intentionally not matched.
- Given `/expenses`, when it loads, then the Monthly chart shows the k = 2 ladder and nothing else on the page changes.
- Given `npm run typecheck`, `lint` and `test`, when they run, then all pass, including the TZ matrix.

## Implementation Notes

- `fitLadderTicks(maxCents)` uses integer comparisons against the exact top tick (no logarithm). A max of 0 or less gives k = 0, and a non-finite max throws.
- `ComparisonChartCard` takes the max of `previousCents` and non-null `currentCents` over the shown points in a small inner `FittedComparisonChart`, memoised on the points, so the scale is rebuilt only when the series changes.
- `formatCompact(…, 'axis')`: tenths are truncated with integer arithmetic, and a zero tenth is dropped ($12,050 → "$12k"). `'gauge'` output is unchanged.
- In jsdom, recharts portals tick labels into z-index layers, so tests select them with `.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value` (not under `.recharts-yAxis`).
- Visual check in headless Chrome at 1440x1024, signed-in mock:
  - `/` Weekly: title centre y=425; card 680..1408 x 449..707; trigger at 704,473; legend right edge 1384; gridlines 513..657, 36px apart; 16px bars at a ~83.5px pitch; Y ticks $0/$200/$1k/$5k/$25k; 20 Sat has no current bar.
  - `/` Monthly: the same Y ticks, and the bar heights equal Expenses Monthly.
  - `/expenses`: unchanged geometry from 3.2 (card 304..1408 x 152..410, gridlines 216..360, first pair at x=412, 80px pitch), now on the k = 2 ladder.

- Deferred item from 3.2 ("weekly bars a few px tall") is resolved here by the fitted ladder, with no seed change. The `deferred-work.md` entry is left as written (append-only) and is closed by this note.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | verification-gap | No test where the current series decides the ladder | medium | In every fixture the previous series sets k. Dropping `currentCents` from `fittedTicks` would clip current bars and pass. Patch: add a test with current in a higher bucket. |
| 2 | blind | No chart-level test of the k = 1 ladder, the only one that needs the "$2.5k" axis decimal | low | `format.test` covers the formatter but not the rendered axis. The user asked for accurate labels in both views. Patch: add a test. |
| 3 | blind | `formatCompact` docstring says "tick labels stay exact" | low | That only holds for ladder ticks; arbitrary values truncate ($12,999 → "$12.9k"). A direct comment correction. Patch. |
| 4 | blind, edge (×2) | `fitLadderTicks` silently caps below the max past the safe-integer limit | low | Only reachable above 2.5e15 cents (about $25 trillion). A guard adds a branch. Rejected. |
| 5 | blind | Overview's loading test doesn't override `getComparison` | low | The Statistics skeleton is covered by the shared `AsyncSection` and card tests. Rejected. |
| 6 | blind | A stale ladder can show during a granularity switch | false | `useComparison` has no `placeholderData`; a new key shows the skeleton, then the refitted chart. |
| 7 | blind | No empty-series test on Overview | false | The adapter always returns 7 or 12 points, so `[]` is unreachable. |
| 8 | blind | Unneeded conditional spread in a test helper | false | Test-only style with no named harm. |
| 9 | blind | Overview imports from `features/expenses` without a record | false | AD-12 assigns `ComparisonChartCard` to expenses and requires the index import. The docstring notes the Overview reuse. |
| 10 | blind | The router test compares raw bar heights | low | Both renders use the same fixed `initialWidth` in jsdom, so it is deterministic. Rejected. |
| 11 | blind | The week-equality test hard-codes 14–20 May | false | Mock today is a fixed seed constant (AD-6), and the matrix row is defined on the seed week. |
| 12 | blind | The spec isn't part of the reviewed diff | false | By design, the spec goes only to the edge-case layer. |
| 13 | edge | An empty-string `title` renders an empty h2 | false | The only callers pass "Statistics" or nothing. |

## Verification

**Commands:**
- `npm run typecheck && npm run lint && npm test` -- expected: all pass.

**Manual checks:**
- In headless Chrome at 1440×1024, screenshot `/` (Weekly, then Monthly) and `/expenses`. Compare `/` with `design-reference/screens/104. Overview.png`. Check that the weekly bars are readable and that Overview Monthly equals Expenses Monthly.
