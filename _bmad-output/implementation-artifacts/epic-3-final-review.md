# Epic 3 final review

- **Date:** 2026-11-17
- **Target:** `feat/epic-3` vs `main` (`fcc537f..1835516`, stories 3.1–3.4), `src/` only. 49 files, +2,620 / −38 lines.
- **Mode:** full, against `epic-3-context.md` and the four story specs, including each frozen block and every human decision.
- **Chunks:**
  1. `src/api`, `src/lib` and `src/styles` (55 kB diff).
  2. `src/ui`, `src/app` and `src/features` (95 kB diff).
- **Layers:**
  - Blind Hunter, Edge Case Hunter and Verification Gap on each chunk.
  - One Acceptance Auditor across the whole epic.
  - 7 runs in total; no layer failed.

## Verification

| Check | At review time (`1835516`) | After fixes |
|---|---|---|
| `npm run lint` (oxlint `--deny-warnings`) | pass | pass |
| `npx tsc -b` | pass | pass |
| `npm test` | 76 files; 2274 passed, 6 skipped | 76 files; 2278 passed, 6 skipped |
| `npm run test:tz` | 20 files; 1281 passed, 4 skipped | 20 files; 1281 passed, 4 skipped |
| `npm run build` | pass. The JS chunk is 922 kB (281 kB gzip), up from 578 kB at Epic 2 because of recharts (deferred, see below) | pass, same |

## Cross-screen consistency (1440×1024, fresh seed, headless Chrome)

Every screen reads one mock state through the shared hooks. No screen holds its own copy of an amount.

- **Overview tiles and Expenses cards:** identical totals and % changes for all six categories, read from one `useCategorySummaries()` cache entry. For example: Housing $2,023.00, 11% ↓; Entertainment $549.99, 409% ↑; Others $3,702.40, 10% ↓.
- **Monthly chart and category cards:** the May "This Year" bar is $7,428, equal to the sum of the six cards ($7,428.09). Both come from the adapter's single `categorizedExpenses` filter.
- **Weekly chart and Transactions:**
  - 17 Wed = $267, the sum of the seven 17 May rows on `/transactions` ($160 + $20 + $12 + $15 + $10 + $20 + $30).
  - 15 Mon = $45 (Groceries, $45.20).
  - 14 Sun = $68 (Electricity bill).
  - `mockApi.test.ts` pins this for every day against `listTransactions`.
- **Credit Card account:** the Account Details history (`/balances/acc_1`) matches the Credit Card rows on Transactions. The history rows added in 3.2 are dated 2022 to Mar 2023, so they sit behind every existing row and leave the `txn_` ids, the Overview Recent Transaction top 5 and the Balances amounts unchanged.
- **Overview Monthly and Expenses Monthly:** both show the same points, ticks and bar heights; a real-route test pins this.
- **Removal:** removing an account updates the tiles, cards and both chart series. `removeAccount` invalidates `categorySummaries` and `comparison`, and real-route and hook tests pin it.

## Figma comparison

| Screen | Reference | Result |
|---|---|---|
| `/expenses` | 109 | Section titles, the chart card (y 152–410), gridlines 36px apart, bar pairs 80px apart, and the Breakdown cards (y 490, 352px wide, 78px header). Matches within 1–2px. |
| `/` Statistics | 104 | Title, card (680–1408 × 448–706), dropdown, legend and bars. Matches within 1–2px. |
| `/` Expenses Breakdown | 104 | Card (680–1408 × 778–990), dividers and caption. Matches within 2px. Tile side padding is 4–12px tighter so the seed's wider totals clear the arrow. |

Intentional differences:
- Values come from the seed, not the Figma placeholders.
- Axis tops follow the data-fitted ladder ($25k, not $250k), by the human decision in Story 3.3.
- Month labels read "Jul", not the design's "July".
- The Goals slot stays empty until Epic 4.

## Review Findings

### Patch (applied)
- [x] [Review][Patch] `changePct` rounded negative half-percents toward zero: −49.5 gave −49, while +49.5 gave +50. It now rounds half away from zero, with a test for both signs. [src/api/mock/mockApi.ts changePercent]
- [x] [Review][Patch] `ComparisonBarChart` silently defaulted `ticksCents` to the superseded fixed `BAR_TICKS`. The prop is now required, so a future caller (Epic 4) cannot get the old $250k scale by accident. The stale `BAR_TICKS` and chart docstrings are corrected. [src/ui/charts/ComparisonBarChart.tsx, src/lib/chartScale.ts]
- [x] [Review][Patch] The sr-only trend direction was glued to the percent ("409%increase"). It now reads "409% increase". [src/ui/TrendIndicator.tsx]
- [x] [Review][Patch] The three new `AsyncSection`s set an `emptyMessage` but no `isEmpty`, so an empty response rendered an empty grid or chart. They now pass `isEmpty`, like the sibling Epic 2 sections, with tests. [ExpensesPage.tsx, ComparisonChartCard.tsx, ExpensesBreakdownCard.tsx]
- [x] [Review][Patch] Nothing tested opening the Dropdown from its trigger with ArrowUp. A test is now added. [src/ui/Dropdown.test.tsx]
- [x] [Review][Patch] Stale planning docs:
  - `epic-3-context.md` still described the fixed $250k Y axis and said "Neither is invalidated by any current mutation". It is aligned with the Story 3.1–3.3 decisions.
  - Story 3.2's AC in `epics.md` is annotated as superseded by 3.3.

### Deferred (logged in `deferred-work.md`)
- [ ] The production JS chunk grew to 922 kB (281 kB gzip) with recharts. Overview renders a chart on first load, so a route split alone doesn't help. Revisit with a lighter chart import or `manualChunks` before release.
- [ ] `comparisonSeries` and the seed history build `YYYY-MM` and `YYYY-MM-DD` strings with template literals. Each one is validated through `toYearMonth`/`toIsoDate`, but a `dates.ts` helper (the months of a year, the first day of a month) would keep all date construction in one module (AD-9).

### Rejected or dismissed (verified)
- **Migrating v1 state on the version bump:** the 3.2 frozen block reseeds by design, and `loadState` documents "wrong versions are reseeded, not migrated".
- **Formatted `label` on `ComparisonPoint`:** this is the port contract in the spine and the AC.
- **`placeholderData` on period switch:** a short first-load skeleton for each granularity, cached after that. Keeping the previous data would show the old series under the new legend.
- **Colours read once at mount:** tokens load before render and there is no theme switching. The build-output test pins the variables.
- **Future-dated rows in the current month:** none exist in the seed. The intent defines whole months.
- **Safe-integer cap in `fitLadderTicks`:** only reachable above about $25 trillion.
- **Focus visibility on the tile arrows and the dropdown:** the global `:focus-visible` outline applies to both.
- **"View {Category} expenses" goes to bare `/expenses`:** the 3.4 frozen decision.
- **The fixed 3×2 divider layout and `-m-6` coupling:** the adapter always returns six categories, and the app is a fixed 1440 layout.
- **Ladder and label casing ("This Year" / "This week"):** as the AC specifies.
- **Seed history affecting Epic 2 screens:** checked above. The ids, top-5 rows, paging and payment methods are unchanged or derived.
- **"Mounted chart refetches after removal" untested in the UI:** covered at the hook level in `hooks.test.tsx`, where mounted queries refetch with concrete post-removal values.
