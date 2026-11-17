---
title: 'Story 3.1: Expenses Breakdown category cards'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: 'fcc537f2b2753a410d249ad75c499b0ffcdbdd8c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/expenses` is still a placeholder. Users cannot see where their money went this month, or whether each category went up or down compared with last month.

**Approach:** Add `listCategorySummaries()` to the port. The mock adapter derives it from the transaction seed: six summaries in fixed order for the month containing mock today, each with its total, its signed % change against the previous month, and its two most recent items. `/expenses` renders these as six `CategorySummaryCard`s in a 3×2 grid under "Expenses Breakdown", using the new `CategoryIcon` and `TrendIndicator` primitives in `src/ui`.

## Boundaries & Constraints

**Always:**
- Totals, `changePct` and item selection are derived in the adapter only (AD-5). Components never sum amounts or work out the arrow from totals.
- Months come from `lib/dates.ts`, anchored to `state().today`.
- Category order is Housing, Food, Transportation, Entertainment, Shopping, Others.
- Every expense item counts, whatever its status, so pending items are included.
- `changePct = round((cur − prev) / prev × 100)`, with −0 normalised to 0.
- Decision: when `prev` is 0 and `cur` is above 0, `changePct` is 100 (a red ↑). This is a display convention, not a calculated percentage: the growth is undefined, and the code must say so in a comment. When both are 0, it is 0.
- Decision: a `changePct` of 0 renders "00%" with no arrow, in neutral grey and with no sr-only direction text.
- Decision (review, human): the zero "00%" and the TrendIndicator caption use `muted` (#666), not `subtle`, so they pass WCAG AA (about 4.7:1) on the #E8E8E8 header band.
- Formatting goes through `formatMoney(…, 'exact')`, `formatPercent` and `formatDate(…, 'row')`.
- Colours come from tokens only.
- `removeAccount` invalidates the new `categorySummaries` key, so the totals never go stale after a removal.

**Never:**
- No comparison chart, `Dropdown` or Overview tiles; those belong to stories 3.2 to 3.4.
- No interactivity on cards or rows.
- No seed rewrite: the seed already tags all six categories in April and May 2023, and `mockApi.test.ts` covers this.
- No period parameter on `listCategorySummaries`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seed | Today is 2023-05-19 | Six summaries for May 2023. For example, Food is 8 370 cents against 78 480 in April, so `changePct` is −89. Entertainment is +409. | N/A |
| Recent items | Several items share a date | The newest two, with equal dates kept in stored order. Shopping gives "GTR 5", then "Polo shirt". | N/A |
| Empty this month | A category has no May items | `totalCents` is 0 and `recentItems` is `[]`. The card body reads "No expenses this month". | N/A |
| From zero | April is 0, May is above 0 | `changePct` is 100 | N/A |
| Untagged expense | A stored expense has no `category` | Left out of every summary. | N/A |
| Account removed | `removeAccount('acc_5')` | The next call and the mounted Expenses page reflect the removal. | N/A |
| Load fails | The adapter rejects | `AsyncSection` shows an inline error with Retry. | Retry refetches |

</frozen-after-approval>

## Code Map

- `src/api/types.ts` -- add `CategorySummary { category: ExpenseCategoryId; totalCents; changePct; recentItems: Transaction[] }`.
- `src/api/port.ts` -- `FinbankApi` plus `FINBANK_API_METHODS`; a compile-time guard enforces the list.
- `src/api/mock/mockApi.ts` -- the private ordered `EXPENSE_CATEGORIES` already exists. Reuse `structuredClone` copies and the `call()` wrapper. Follow `pageTransactions`'s stable newest-first sort.
- `src/lib/dates.ts` -- `currentMonth`, `yearMonthOf`, `addMonths`, `monthRange`.
- `src/api/queryKeys.ts` -- `qk` and `invalidationMap.removeAccount`.
- `src/api/http/httpApi.ts` -- a `notImplemented` stub. `httpApi.test.ts` iterates the port list.
- `src/api/hooks/useBills.ts` -- the hook pattern to copy.
- `src/ui/icons.ts` -- the only lucide importer. `transactionIcons` is the existing category glyph set.
- `src/ui/AsyncSection.tsx`, `src/ui/Card.tsx` -- `Card`'s title style is `text-22 font-normal text-subtle`.
- `src/features/bills/` and `src/features/overview/OverviewPage.tsx` -- the feature `index.ts` pattern, and the `sr-only` h1 used when a page has no visible title.
- `src/app/routeObjects.tsx:76` -- replace the Expenses placeholder. `router.test.tsx:50` expects an h1 named "Expenses".
- `src/styles/tokens.css` -- add the header and icon-tile tokens. `design-literals.node.test.ts` forbids hex values elsewhere.
- `design-reference/screens/109. Expenses.png` -- the design, a 2× export.

## Tasks & Acceptance

**Execution:**
- [x] `src/api/types.ts`, `src/api/port.ts` -- add the type, the method and its list entry. Doc comment: "Six summaries, fixed order, month containing today".
- [x] `src/api/mock/mockApi.ts` -- implement `listCategorySummaries` per the Always rules and the matrix.
- [x] `src/api/http/httpApi.ts` -- add the stub.
- [x] `src/api/queryKeys.ts` -- add `qk.categorySummaries()` and include it in `removeAccount`.
- [x] `src/api/hooks/useCategorySummaries.ts` -- add the hook.
- [x] `src/styles/tokens.css` -- add `--color-category-header` (the `#E8E8E8` band, aliased to border) and `--color-category-tile` (`#D2D2D2`, sampled as `#D1D1D1`).
- [x] `src/ui/icons.ts` -- add `arrowUp`, `arrowDown` and `categoryIcons: Record<ExpenseCategoryId, LucideIcon>`: House, Utensils, CarTaxiFront, Clapperboard, ShoppingBag, LayoutGrid.
- [x] `src/ui/CategoryIcon.tsx` -- add the exported `categoryLabels` map and a 40×40 rounded tile with an `ink-2` glyph. Use type-only imports from `api/types`.
- [x] `src/ui/TrendIndicator.tsx` -- props `changePct` and an optional `caption`. Show the percent, then the arrow (`danger` ↑ or `positive` ↓), with sr-only "increase"/"decrease" text. Put the caption below in `text-12 text-muted`.
- [x] `src/features/expenses/components/CategorySummaryCard.tsx`, `ExpensesPage.tsx`, `index.ts` -- build the card as a non-interactive `article`, labelled by the category name. Use `AsyncSection` around a 3-column grid with a 24px gap.
- [x] `src/app/routeObjects.tsx` -- route `/expenses` to `ExpensesPage`.
- [x] Tests:
  - `mockApi.test.ts`: totals, the sign of `changePct`, order, recent items, the empty, untagged and after-removal cases.
  - `queryKeys.test.ts` and `hooks.test.tsx`: the new key and hook.
  - `TrendIndicator.test.tsx` and `CategoryIcon.test.tsx`.
  - `ExpensesPage.test.tsx`: six cards, the empty body and the error state.

**Acceptance Criteria:**
- Given `/expenses` at 1440×1024, when it loads, then it matches 109 (NFR-1):
  - an sr-only h1 "Expenses" and a visible h2 "Expenses Breakdown"
  - 352px-wide cards in a 3×2 grid with 24px gaps
  - a 78px `category-header` band with 24px padding holding the icon, the name (`text-16 ink-2`), the total (`text-20` bold ink), and the `TrendIndicator` with "Compare to last month" aligned right
  - two body rows of about 75px, separated by a `surface` divider. Each row shows the name on the left (bold `ink-2`) and, on the right, the amount (bold) above the date (`text-12 subtle`).
- Given the cards, when the user tabs through the page, then nothing inside them receives focus.
- Given `npm run lint`, `typecheck` and `test`, when they run, then all pass, including the boundary and design-literal tests.

## Implementation Notes

- `categoryLabels` lives in `src/ui/categoryLabels.ts` instead of `CategoryIcon.tsx`. Exporting a non-component from a component file trips `react/only-export-components`, and lint runs with `--deny-warnings`. It still sits next to `CategoryIcon` in `src/ui`.
- Seed totals for May 2023: Housing $2,023.00 (−11), Food $83.70 (−89), Transportation $220.00 (−62), Entertainment $549.99 (+409), Shopping $849.00 (−24), Others $3,702.40 (−10).
- The user confirmed that +100% from zero is a display convention, and the code comments say so.
- Review: the caption and the zero "00%" were switched to `muted` for AA contrast on the header band, after the human chose this.
- Visual check: headless Chrome at 1440×1024 against 109. Cards sit at x = 304, 680 and 1056, are 352px wide with 24px gaps, and have a 78px header. Adding `pb-2` to the item list brought the card height to 236px, matching the design's ~237px. The Comparison section above the cards comes in story 3.2.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | verification-gap, blind | `router.test` /expenses passes with the old placeholder | medium | The h1 "Expenses" exists in both versions. Patch: add a router case asserting six cards and seed values. |
| 2 | orchestrator (from implementer) | Caption and "00%" use `subtle` on #E8E8E8 (about 4.0:1) | medium | Below AA, while the repo enforces AA (`faint-text` test, `subtle` darkened for AA). The human chose `muted`, now recorded in the frozen block. Patch. |
| 3 | blind | Truncated item names unreadable on non-interactive cards | low | Real. A direct correction (`title` attribute, as in BillList). Patch. |
| 4 | blind | `category-tile` comment (#D1D1D1) disagrees with its value (#D2D2D2) | low | A misleading comment. A direct correction. Patch. |
| 5 | edge-case | `changePct` beyond MAX_SAFE_INTEGER when prev is 1¢ | low | Only reachable with a crafted localStorage total of at least 9e13¢. The fix adds guards. Rejected. |
| 6 | edge-case | The sum of totals overflows safe integers | low | Same: crafted storage only, and the fix adds a guard. Rejected. |
| 7 | edge-case, blind | `formatPercent` throws on a non-integer `changePct` and blanks the page | false | The port contract is a signed integer, and the adapter always rounds. A loud failure on input the program never produces is correct behaviour. |
| 8 | edge-case, blind | `emptyMessage` is dead because `isEmpty` is missing | false | The adapter maps the fixed six categories, so `[]` is unreachable. `emptyMessage` is a required `AsyncSection` prop. |
| 9 | edge-case | Header uses py-2, not 24px padding | false | The band is a 78px `min-h` with centred content, matching 109 (a 40px tile with about 19px above and below). 24px vertical would make it 88px. |
| 10 | edge-case, blind | `categoryLabels` moved out of `CategoryIcon.tsx` | low | Forced by `react/only-export-components` with `--deny-warnings`. The only fix is to edit the spec, so it is rejected and recorded in Implementation Notes. |
| 11 | blind | TrendIndicator hard-codes up = red | false | The architecture review settled that `TrendIndicator` owns arrow and colour with up meaning danger. No planned caller needs the reverse. |
| 12 | blind | Screen readers read the zero-padded "08%" | low | Cosmetic. The fix adds a parallel accessible string. Rejected. |
| 13 | blind | Transactions dated after today, in this month, count | false | The intent defines the whole month containing today, and the seed has no rows after 2023-05-17. |
| 14 | blind | Grid not responsive | false | The app is a fixed 1440 layout (AppShell), and BalancesPage uses the same `grid-cols-3`. |
| 15 | blind | Two category icon maps with different keys; Others matches the Overview glyph | low | Keys differ by design (`TransactionIcon` vs `ExpenseCategoryId`). The Others glyph matches 109's 2×2 grid. Rejected. |
| 16 | blind | `category-header` aliases `border` | false | An intentional semantic alias of the same sampled #E8E8E8, documented in a comment. |
| 17 | blind | Redundant untagged pre-filter; `recentItems` not typed as a tuple | false | No harm is named: the filter is correct, and the card renders any length. |
| 18 | blind | Minor test gaps (call count, aria-busy, more focusable selectors) | low | `aria-busy` is covered by the AsyncSection tests. The rest guard behaviour the code doesn't have. Rejected. |

## Verification

**Commands:**
- `npm run typecheck && npm run lint && npm test` -- expected: all pass.

**Manual checks:**
- Run `npm run dev`, open `/expenses` at 1440×1024 and compare it side by side with `design-reference/screens/109. Expenses.png`. The numbers come from the seed, not the Figma placeholders.
