---
title: 'Story 3.2: Expenses Comparison bar chart with the Monthly/Weekly selector'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '0853cd61e818d245e0e972819858b14d7f191d81'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-1-expenses-breakdown-category-cards.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/expenses` shows the category cards, but the user cannot compare this year's spending with last year's, or this week's with last week's.

**Approach:**
- Add `getComparison('year' | 'week')` to the port. The mock adapter derives each series from the same expense transactions, with the same expense filter, as `listCategorySummaries`. No series value is stored or hard-coded anywhere.
- Extend the shared transaction seed with expense history for Jan 2022 to Mar 2023, so the yearly series has real data.
- Render an "Expenses Comparison" `ComparisonChartCard` above the breakdown. It contains a Monthly/Weekly `Dropdown`, a legend and a `ComparisonBarChart` on the shared `chartScale`.

## Boundaries & Constraints

**Always:**
- Human requirement: the chart and the category cards read one shared expense source.
  - Both use the same selection helper in `mockApi.ts`: expense kind, has a category, every status.
  - A month's bar equals the sum of that month's category totals. A test asserts that the May 2023 `currentCents` equals the sum of the six `listCategorySummaries()` totals.
- `'year'` returns 12 points, Jan–Dec of today's year. `currentCents` is that month's total, and `null` for months after today's month. `previousCents` is the same month a year earlier.
- `'week'` returns 7 points, Sun–Sat of `weekOf(today)` (14–20 May). `currentCents` is that day's total, and `null` after today. `previousCents` is the same weekday 7 days earlier.
- Labels come from `formatDate`: `'month'` gives "Jan" … "Dec" (the design's "July" is a copy quirk), and `'weekday'` gives "14 Sun".
- History rows are ordinary seed transactions, visible on Transactions and Account Details like any other.
  - They are dated before 2023-04-01, so 3.1's April/May numbers and the existing `txn_` ids do not change.
  - They are deterministic, spread over all six categories, and on existing accounts. None is pending.
  - They are sized so monthly totals vary between about $3k and $15k.
  - Bump `MOCK_STATE_VERSION` so stored state reseeds.
- `removeAccount` invalidates the comparison key prefix.
- Colours come from tokens only; `chartColors` reads CSS variables. Money labels go through `format.ts`. The dropdown selection is component-local state.

**Never:**
- No tooltip or hover state (none is designed). No Overview changes (story 3.3). No new chart library.
- No summing, scaling or null-filling inside components, apart from `toPlot` and formatting.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Year | Today is 2023-05-19 | 12 points. Jan–May `currentCents` are numbers; Jun–Dec are `null`. Every `previousCents` is a number from 2022. | N/A |
| Shared data | The same seed | `year` May `currentCents` equals the sum of the summary totals. April equals the April category sum. | N/A |
| Week | Today is 2023-05-19 | Labels "14 Sun" … "20 Sat". 20 Sat `currentCents` is `null`; 19 Fri is 0 (a number). `previousCents` covers 7–13 May. | N/A |
| Removal | `removeAccount('acc_5')` | The next `getComparison` drops acc_5's rows, and the mounted chart refetches. | N/A |
| Scale | `toPlot` with 0, $1k, $2k, $6k, $250k, $300k, −1 | 0, 0.5, 1, 1.5, 4, 4 (clamped), 0 (clamped) | N/A |
| Toggle | The user picks "Weekly Comparison" | The weekly series renders with the legend "This week" / "Last week". The trigger reads "Weekly Comparison". | N/A |
| Load fails | `getComparison` rejects | An inline error with Retry inside the card. The dropdown stays usable. | Retry refetches |

</frozen-after-approval>

## Code Map

- `src/api/mock/mockApi.ts` -- `summarizeCategories`, from 3.1. Extract its expense filter into one shared helper and reuse it for `comparisonSeries`. Reuse the `call()` wrapper and `state().today`.
- `src/api/mock/seedTransactions.ts` -- the `ROWS`/`expense()`/`revenue()` builders. Add a pure history generator that `buildSeedTransactions` concatenates. Ids follow the newest-first order.
- `src/api/mock/seed.ts:5` -- `MOCK_STATE_VERSION`.
- `src/api/mock/mockApi.test.ts` -- "seed transactions" pins dates to `2023-04-01..05-19`; widen that to `2022-01-01`. The 3.1 summary tests must stay green unchanged.
- `src/api/types.ts`, `port.ts`, `http/httpApi.ts`, `queryKeys.ts`, `hooks/useCategorySummaries.ts` -- the same additions as 3.1.
  - Types: `ComparisonGranularity`, and `ComparisonPoint { label; currentCents: number | null; previousCents: number }`.
  - Query key: `qk.comparison(granularity?)`.
- `src/lib/dates.ts` -- `weekOf`, `addMonths`, `toYearMonth`. Add `addDays(iso, n)`, which runs in the TZ-matrix tests.
- `src/lib/format.ts` -- `formatCompact(…, 'axis')` gives "$2k" and "$0"; `formatMoney(…, 'whole')`; `formatDate`.
- `src/ui/icons.ts` -- add `chevronDown`.
- `src/ui/Card.tsx` -- use it without `title`. Expenses titles are 16px above the card in 109, where `Card` gives 8px.
- `src/features/expenses/ExpensesPage.tsx` -- add the Comparison section above Breakdown. Change both section title gaps to 16px.
- `src/styles/tokens.css`, `tokens.node.test.ts` -- the `@theme static` block is where JS-read colours belong (AD-11).
- `design-reference/screens/109. Expenses.png` -- 2× export.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/chartScale.ts` (+ test):
  - `createTickScale(ticksCents)` returns `{ toPlot(cents), ticks }`, where `ticks` are `{ plot: i, cents }` evenly spaced at 0…n−1.
  - Interpolate linearly between ticks and clamp to [0, n−1].
  - Export `BAR_TICKS` and `SAVING_TICKS` (AD-16).
- [x] `src/lib/dates.ts` (+ test) -- add `addDays`.
- [x] Seed and adapter files (+ tests) -- history generator, version bump, `getComparison`, and the matrix rows (Year, Shared data, Week, Removal).
- [x] `src/api/types.ts`, `port.ts`, `httpApi.ts`, `queryKeys.ts`, `hooks/useComparison.ts` (+ key and hook tests) -- the port plumbing.
- [x] `src/styles/tokens.css` -- add `--color-chart-current` (primary), `--color-chart-previous` (#E8E8E8) and `--color-chart-grid` (#F3F3F3) under `@theme static`.
- [x] `src/ui/charts/chartColors.ts` (+ tests):
  - Export the var-name map and `readChartColors()`, which uses `getComputedStyle`.
  - A node test asserts every var is declared non-empty in the static block.
  - A jsdom test asserts the read-back values.
- [x] `src/ui/Dropdown.tsx` (+ test):
  - A generic `{ label, options, value, onChange, variant: 'plain' }` (Epic 4 adds `'filled'`).
  - The trigger shows the selected option and a chevron, styled `text-16 font-bold text-ink`.
  - The popup is a listbox with keyboard support: Enter, Space and ArrowDown open it; the arrow keys move; Enter selects; Escape closes and refocuses the trigger. An outside click closes it.
- [x] `src/ui/charts/ComparisonBarChart.tsx`, `ChartLegend.tsx` (+ tests):
  - The chart is a recharts `BarChart` of `toPlot` values: 16px bars, an 8px gap within a pair, rounded tops, and no bar for `null`.
  - It has horizontal `chart-grid` lines only. Y labels are `formatCompact(cents, 'axis')` and X labels are the point labels, both `text-14 text-subtle`.
  - The `summary` prop is required and rendered as sr-only text, and the SVG is `aria-hidden`.
  - The legend has 16×8 swatches with `text-12` labels.
  - Make it render in jsdom, for example with a fixed-size test wrapper or `initialDimension`.
- [x] `src/features/expenses/components/ComparisonChartCard.tsx` (+ test), `index.ts`, `ExpensesPage.tsx`:
  - `ComparisonChartCard({ defaultGranularity })` holds the dropdown state and calls `useComparison`.
  - It shows the legend for the current granularity and wraps the chart in `AsyncSection`.
  - It builds the `summary` from the points as given: per label, this period and last period in whole dollars, or "no data yet". Export the card.

**Acceptance Criteria:**
- Given `/expenses` at 1440×1024, when it loads, then it matches 109 (NFR-1):
  - the "Expenses Comparison" title centre at y≈120
  - the white chart card spanning the content width from y=152 to y≈410
  - the dropdown at the top left and the legend at the top right
  - five gridlines 36px apart (y 215–359)
  - pairs at an 80px pitch starting about 110px inside the card
  - the Breakdown cards' top at y≈490
- Given the dropdown, when it is operated by keyboard only, then the user can open it, pick Weekly and return to Monthly, and focus is always visible.
- Given `npm run typecheck`, `lint` and `test`, when they run, then all pass.

## Implementation Notes

- `chartColorVars` lives in `src/ui/charts/chartColorVars.ts` and `chartColors.ts` re-exports it. The node token test (`chartColors.node.test.ts`) runs under `tsconfig.node.json`, which has no DOM lib, so it cannot import a module that calls `getComputedStyle`.
- `--color-chart-current` is `var(--color-primary)`; the two greys are literals, as listed.
- History seed: one row per category per month, Jan 2022 to Mar 2023, with fixed monthly totals from $3,100 to $14,800 split by fixed shares (housing 45%, food 15%, shopping 15%, transportation 8%, entertainment 7%, others the rest). Housing is on acc_3, food acc_2, transportation and shopping acc_1, entertainment acc_5, others acc_4. All rows are complete, so the pending share drops but stays above 0.
- Seed series for 2023: Jan $5,200, Feb $9,100, Mar $6,400, Apr $8,979.59, May $7,428.09 (equal to the six May category totals). Week of 14 May: $68, $45.20, $0, $267, $0, $0, null.
- The X axis has a 32px right padding, so at the 1440 layout the monthly bands are 80px wide, as in 109 (whose last pair ends about 25px before the gridlines end).
- Visual check in headless Chrome at 1440x1024: title centre y=120; card 304..1408 x 152..410; gridlines at 216, 252, 288, 324, 360; first pair starts at x=412 (108px inside the card), 80px pitch; dropdown at 328,176; legend right edge 1384; Breakdown cards top at 490. Keyboard only (focus trigger, ArrowDown, ArrowDown, Enter) switches to Weekly, the trigger keeps a visible focus ring, the legend reads This week / Last week and 20 Sat has no current bar.
- The chart summary reads, for example, "Monthly expenses, this year compared with last year. Jan: this year $5,200, last year $4,200. ... Jun: this year no data yet, last year $5,600."

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | verification-gap | `build-output.node.test` does not assert that the three chart colour vars are emitted | medium | They are only read from JS. A build that drops them would make bars invisible while every test passes. Patch: extend the `it.each` list. |
| 2 | blind | Tab inside the open listbox doesn't return focus to the trigger | low | `Dropdown.tsx:107` closes without refocusing; the focused listbox unmounts before the default Tab move. Direct correction. Patch. |
| 3 | blind | The weekly view uses the $250k bar ticks, so daily bars are a few px tall | medium | Real, and seen in the visual check. FR-14 requires the same scale, and the bars correctly reflect the seed's $0–$300 days. The fix means raising the seed's May week amounts, which changes 3.1's approved totals, and the weekly view is the default only on Overview. Deferred to 3.3 (`deferred-work.md`). |
| 4 | blind | The version bump wipes stored mock state without migrating it | false | The frozen block asks for reseeding by version bump, and `loadState` documents "wrong versions are reseeded, not migrated". |
| 5 | blind | The storage key still says `v1` while the version is 2 | false | The key name is a stable identifier and the comment still describes the key correctly. The version lives inside the payload by design. |
| 6 | blind | Switching period blanks the card for one load | low | This is `AsyncSection`'s standard first-load skeleton, for about 200ms per granularity, once (cached after). `keepPreviousData` would briefly show the old series under the new legend. Rejected. |
| 7 | blind | The adapter produces display labels | false | The port contract (spine and AC) specifies `label` on the points. Labels come from `format.ts`. |
| 8 | blind, edge | `emptyMessage` can't show; an all-zero series renders gridlines only | false | The adapter always returns 12 or 7 points, so `[]` is unreachable. A zero spend correctly draws no bar. |
| 9 | blind | `null` and `$0` look the same | false | The design has no bar for days after today (FR-14) and no tooltip. The sr-only summary separates "no data yet" from $0. |
| 10 | blind, edge | Colours are read once at mount and could be empty | false | `index.css` is imported in `main.tsx` before render, and there is no theme switching. Emptiness is now guarded by finding 1. |
| 11 | blind | Legend casing differs between Year and Week | false | The AC specifies exactly "This Year / Last Year" and "This week / Last week". |
| 12 | blind, edge | Dropdown with an unknown value, empty options or duplicate values; ChartLegend duplicate tones | low | These are caller bugs with no reachable path; the only callers pass fixed constants. Guards add complexity. Rejected. |
| 13 | blind | The effect of the history rows on other features is untested | false | The seed test checks payment method and type for every row. Pagination and tab tests are relative to the seed. Verification-gap cleared this. |
| 14 | blind | `ComparisonChartCard` belongs in a shared place | false | AD-12 assigns it to `features/expenses`, and Overview imports it through that index. |
| 15 | edge | The listbox stays open when focus leaves without a pointer or Tab event | low | This is screen-reader virtual navigation only. Adding a blur handler is a new branch. Rejected. |
| 16 | edge | An outside pointerdown on a non-focusable area drops focus to body | false | That is the standard listbox behaviour when the user clicks elsewhere. |

## Verification

**Commands:**
- `npm run typecheck && npm run lint && npm test` -- expected: all pass, including the TZ matrix.

**Manual checks:**
- In headless Chrome at 1440×1024, compare `/expenses` with `design-reference/screens/109. Expenses.png`: card and section offsets, gridline spacing and bar geometry. Toggle Weekly and check its legend and its null 20 Sat bar.
