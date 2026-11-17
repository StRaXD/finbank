---
title: 'Story 3.4: Overview Expenses Breakdown tiles'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: 'b0bdd40f60bb4e937be7c1080d3f7139efa7ddd1'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-1-expenses-breakdown-category-cards.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Overview's Expenses Breakdown slot is empty, so the dashboard doesn't show which categories are rising.

**Approach:** Add a `CategorySummaryTile` to `features/expenses`. Overview renders six of them in an "Expenses Breakdown" card, fed by the same `useCategorySummaries()` as the Expenses page. Each tile's → arrow links to `/expenses`.

## Boundaries & Constraints

**Always:**
- Human requirement: one category data source.
  - Tiles read only `useCategorySummaries()`, the same query key and cache entry as the Expenses cards.
  - Every number and arrow comes from `CategorySummary` as given (`totalCents`, `changePct`). There are no literals and nothing is summed, compared or re-derived in components.
  - Category names and icons come from `categoryLabels` and `CategoryIcon`.
- A tile's total and % change are identical to its Expenses card (FR-15, FR-33).
- The tile shows the % as "15%*" with the trend arrow. The asterisk refers to the card's caption "*Compare to last month".
  - This is a new `TrendIndicator` variant in `src/ui` (AD-12: no local restyle).
  - The arrow colour comes from the sign, and 0 keeps 3.1's neutral `muted` "00%".
- The → arrow is a link to the route-table path for Expenses, passed in as a prop like Overview's other paths.
  - Its accessible name is "View {Category} expenses".
  - It is grey by default, and teal on hover and `focus-visible`. The design's teal Housing arrow is read as that state, not hard-coded on one tile.
- Loading, error and Retry go through `AsyncSection` inside the card.

**Never:**
- No change to the adapter, the seed, the Expenses page or the comparison chart.
- No whole-tile link, and no per-category Expenses deep link (`/expenses` only).
- No Goals widget (Epic 4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seed | Mock adapter, today 2023-05-19 | Tiles in fixed order: Housing $2,023.00, 11% ↓; … Entertainment $549.99, 409% ↑; … Others $3,702.40, 10% ↓ | N/A |
| Parity | Overview and `/expenses` rendered with the same adapter | For every category, the tile total and % equal the card's | N/A |
| Navigate | The user clicks or presses Enter on Food's → | The route becomes `/expenses` | N/A |
| Zero change | `changePct` 0 | "00%*" in `muted`, no arrow | N/A |
| Removal | `removeAccount('acc_5')`, then Overview | The tiles show the post-removal totals (invalidated key from 3.1) | N/A |
| Load fails | `listCategorySummaries` rejects | An inline error with Retry inside the card; the title and caption stay | Retry refetches |

</frozen-after-approval>

## Code Map

- `src/features/expenses/components/CategorySummaryCard.tsx`, `index.ts` -- the 3.1 card. Mirror its data use and export the tile next to it.
- `src/api/hooks/useCategorySummaries.ts`, `qk.categorySummaries()` -- reuse them. The `removeAccount` invalidation already exists.
- `src/ui/TrendIndicator.tsx` (+ test) -- add the `variant: 'card' | 'tile'` prop, defaulting to `'card'`.
  - `'tile'` is a `text-14` percent with a "*" marker and the arrow on the same line.
  - Keep the sr-only increase or decrease text.
- `src/ui/CategoryIcon.tsx`, `src/ui/categoryLabels.ts` -- the icon and the name. The tile icon tile is `#F4F4F4` (≈ the `surface` token) with a `subtle` glyph. Add a `CategoryIcon` `tone: 'header' | 'plain'` variant if it differs from 3.1's `category-tile`.
- `src/ui/icons.ts` -- add `arrowRight` (lucide `ArrowRight`).
- `src/features/overview/OverviewPage.tsx` -- add the slot `col-span-2 col-start-2 row-start-3` and an `expensesPath` prop. `src/app/routeObjects.tsx:66` passes `routes.expenses`. `ViewAllLink.tsx` is the `Link` pattern.
- `src/ui/Card.tsx` -- `title="Expenses Breakdown"`, with `actions` holding the "*Compare to last month" caption (`text-14 text-subtle`).
- `src/features/overview/OverviewPage.test.tsx` -- the grid-children count goes from 4 to 5. The stubs need `listCategorySummaries`.
- `design-reference/screens/104. Overview.png` -- a 2× export. Measurements at 1x:
  - The title centre is at y≈754, and the caption is right-aligned on the title row.
  - The card spans x 680–1408 and y 778–990.
  - 1px `#F6F6F6` dividers sit at x 925 and 1165 and at y 883.
  - Each tile has a 40px icon tile, the name (`text-14`), the amount (bold), the "%*" row and the → at the right.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/TrendIndicator.tsx`, `src/ui/icons.ts` (+ tests) -- the tile variant and `arrowRight`.
- [x] `src/features/expenses/components/CategorySummaryTile.tsx` (+ test), `index.ts` -- `CategorySummaryTile({ summary, expensesPath })`, plus the arrow link's hover and focus states.
- [x] `src/features/overview/OverviewPage.tsx` (+ test), `src/app/routeObjects.tsx` -- the Expenses Breakdown card: `AsyncSection` around a 3×2 grid with the dividers.
- [x] `src/app/router.test.tsx` -- the Parity, Navigate and Removal rows run against the mock adapter.

**Acceptance Criteria:**
- Given `/` at 1440×1024, when it loads, then Expenses Breakdown matches 104 (NFR-1): title and caption, card box, dividers, tile layout and arrow colours. The seed values replace Figma's placeholders.
- Given only the keyboard, when the user tabs through Overview, then each of the six → links is reachable in order, with a visible focus ring.
- Given `npm run typecheck`, `lint` and `test`, when they run, then all pass.

## Implementation Notes

- The card lives in `src/features/overview/components/ExpensesBreakdownCard.tsx` (like the other Overview widgets); `OverviewPage` only places it in the `col-span-2 col-start-2 row-start-3` slot.
- The tile grid uses `-m-6` to cancel the Card's padding, so the three columns split the full 728px box. The dividers are absolutely positioned 1px `surface` lines (no `#F6F6F6` token was added; `surface` #F4F5F7 is the existing divider grey used by the 3.1 card).
- `CategoryIcon` gained `tone: 'header' | 'plain'` (default `'header'`); `'plain'` is `bg-surface text-subtle`.
- `TrendIndicator` `variant="tile"` renders the percent and "*" in `text-14 text-muted` for every value (104's grey "15%*"), so zero keeps the `muted` "00%*" and differs only by having no arrow.
- The → arrow defaults to `subtle` (#707070) rather than a lighter grey, so the only visual of the link meets 3:1 non-text contrast; it turns `primary` on hover and `focus-visible`, with the global focus ring.
- Visual check (headless Chrome, 1440×1024): card box 680–1408 × 779–991, dividers at x 923/1165 and y 885, title centre y 755, caption right-aligned on the title row; no horizontal scroll. The seed's wider totals ("$3,702.40" vs Figma's "$250.00") collided with the → at 104's ~36px side padding, so the tile uses 32px left, 24px right and 12px gaps. Tab order reaches the six → links consecutively, Housing to Others. Tile values equal the `/expenses` cards.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | verification-gap | The card-variant `TrendIndicator` styling (`text-ink-2`, `items-end`) moved into ternaries and is unpinned | medium | Expenses cards (3.1) consume it. Swapping the alignment or colour branch passes every test. Patch: add class assertions. |
| 2 | blind | The tile's literal "*" is read aloud as "star" | low | A direct correction: an `aria-hidden` span with no visual change. Patch. |
| 3 | blind | `CategoryIcon`'s docstring describes only the grey tile | low | Stale after adding the `plain` tone. A comment correction. Patch. |
| 4 | blind | Arrow-link focus is shown only by colour | false | The global `:focus-visible` outline (`index.css:13`) draws the 2px ring. The implementer saw it in the keyboard check. |
| 5 | blind | "View Housing expenses" goes to bare `/expenses` | false | The frozen block sets this accessible name and the `/expenses`-only target. Distinct names keep the six links distinguishable. |
| 6 | blind, edge | Empty or partial summaries: `emptyMessage` is dead, and the fixed 3×2 dividers cross empty cells | false | The adapter always returns the six fixed categories. This matches the 3.1 Expenses grid. |
| 7 | blind | `-m-6` is coupled to `Card`'s `p-6`; there is no narrow-width fallback | low | The app uses a fixed 1440 layout. The coupling is local and commented. Rejected. |
| 8 | blind | Long totals could overflow into the arrow | low | The largest seed total is $3,702.40, and removals only lower totals. Fits at 1440. Rejected. |
| 9 | edge | Non-integer `changePct` or an unknown category crashes | false | The port contract is integer `changePct` and the `ExpenseCategoryId` union. A loud failure is correct. |
| 10 | blind, edge | Router-test brittleness: `!` lookups, index matching, an unescaped RegExp | low | Failures still fail loudly. The order is fixed by the adapter, and the formatted values contain no regex metacharacters. Rejected. |
| 11 | blind | The tile percent is muted even when non-zero | false | 104 shows every "%*" in grey. The variant docstring records it. |
| 12 | blind | Test gaps: tile with caption, skeleton layout, divider `aria-hidden` | low | No caller combines the tile with a caption. The dividers are `aria-hidden` in markup. Rejected. |
| 13 | blind | The spec and sprint status are absent from the diff | false | By design, the spec goes only to the edge-case layer. Both ship in the story commit. |

## Verification

**Commands:**
- `npm run typecheck && npm run lint && npm test` -- expected: all pass.

**Manual checks:**
- In headless Chrome at 1440×1024, screenshot `/` and compare it with `design-reference/screens/104. Overview.png`. Check that the tile values equal the `/expenses` cards.
