---
title: 'Story 2.7: Overview Upcoming Bill and Recent Transaction widgets'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: '71498d4908a5118a0096b21ca9d20ac8fa5a72ed'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-6-overview-page-with-greeting-and-total-balance-carousel.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Overview has no Upcoming Bill or Recent Transaction widgets. Their records must be the exact ones on `/bills` and `/transactions`, read through the same hooks, with no copies. The compact Adobe vendor name, first shown here, fails WCAG AA contrast (FR-12, FR-13, FR-33, AD-4, deferred item from 2.5).

**Approach:**
- **Widgets:** fill the two Overview slots with the existing compact variants. `BillList` compact uses `useBills({ limit: 2 })`; `TransactionList` compact uses `useTransactions({ kind, limit: 5 })` under the shared `Tabs`. Each sits in a titled `Card` with a "View All >" link.
- **Adobe contrast:** move `--color-brand-adobe` to Adobe's official brand red `#EB1000`. It is 4.56:1 on white, which passes AA at every size and is visually almost identical to the 104/108 red.

## Boundaries & Constraints

**Always:**
- **Same sources as the full pages:**
  - The widgets render the bills feature's exported `BillList` and the transactions feature's exported `TransactionList` (compact variants). They therefore call the same `useBills` and `useTransactions` hooks and the same adapter methods.
  - The `qk` keys differ only in their `limit` and `kind` filter, which is by design (AD-7).
  - `features/overview` holds no bill or transaction data, does no sorting or filtering of its own, and contains no literal amounts, dates, vendors or items.
  - The same bill or transaction shows identical amounts and dates on Overview and on its page (shared `formatMoney` and `formatDate` modes).
- **`OverviewPage` props:**
  - It gains `billsPath: string` and `transactionsPath: string`; `routeObjects` passes `routes.bills` and `routes.transactions`.
  - In the 104 grid, Upcoming Bill goes in row 1, column 3. Recent Transaction goes in column 1 from row 2, spanning the rows the Statistics and Breakdown slots will use.
  - The Goals, Statistics and Expenses Breakdown slots stay empty (Epics 3–4).
- **"View All >" link:** each widget's `Card` gets `actions`: a router `Link` "View All" with a right chevron, in the 104 style (measured: grey small text, not the teal button).
- **Upcoming Bill:**
  - `<Card title="Upcoming Bill">` containing `<BillList variant="compact" limit={2} />`.
  - With the seed, that shows Figma (May 25) then Adobe (Jun 16).
  - The compact rows are adjusted to 104 if measurement needs it: badge, vendor mark and name, title, "Last Charge - {row date}", boxed whole amount.
- **Recent Transaction:**
  - `<Card title="Recent Transaction">` with the shared `Tabs` (All / Revenue / Expenses) inside the card. Tab state is local.
  - Below them, `<TransactionList key={tab} variant="compact" kind={…} limit={5} />`. There is no Load More on Overview.
  - With the seed on All, that shows GTR 5, Polo shirt, Biriyani, Movie ticket and Taxi fare. These are the newest five, the same as the first rows on `/transactions`. The design omits two of them; the data wins (FR-33).
- **Adobe colour:**
  - `--color-brand-adobe` becomes `#EB1000`. The token test is updated, with a comment stating the ratio (4.56:1 on `#FFFFFF`) and the reason.
  - A unit test asserts that the token's contrast against white is at least 4.5. A tiny luminance helper in the test is fine.
  - It applies to both the 108 table (24px) and the compact name (16px). No per-size colour split.
- **States:** both widgets render through their lists' existing `AsyncSection` (skeleton, "No upcoming bills." / "No transactions yet.", error with Retry).
- **Design:** measured from `design-reference/screens/104. Overview.png` (1440×1024 @2x): titles, the View All links, card heights (row-1 cards equal height), the tabs, row spacing, and the badge and box sizes. Dates use the shared row format ("17 May 2023"), not "14 May, 2022".

**Never:** No Goals, Statistics or Expenses Breakdown content. No new hooks, port methods or `qk` keys. No widget-local copies or transforms of bills or transactions. No per-size Adobe colour variants or raw colour literals.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seed bills | `/` | 2 rows: Figma "May 25", Adobe "Jun 16"; amounts "$150", "$559"; last charges match `/bills` | N/A |
| Seed transactions, All | `/` | 5 rows identical (item, shop, amount, date) to the first 5 rows of `/transactions` All | N/A |
| Revenue / Expenses tab | click a tab | the 5 newest of that kind, the same as the first 5 rows of that tab on `/transactions` | N/A |
| View All | click either link | `/bills` / `/transactions` | N/A |
| Removed account | remove Checking, open `/` | none of its transactions in Recent Transaction | N/A |
| Empty | lists return `[]` | "No upcoming bills." / "No transactions yet." | N/A |
| Error | a list rejects | that widget's alert with Retry; the other widgets unaffected | ApiError message |
| Contrast | `--color-brand-adobe` | ratio ≥ 4.5 on white | N/A |

</frozen-after-approval>

## Code Map

- `src/features/overview/OverviewPage.tsx` -- the grid. Add `UpcomingBillCard` and `RecentTransactionCard` in `components/`, beside `TotalBalanceCard`.
- `src/features/bills/index.ts`, `components/BillList.tsx`, `components/VendorLogo.tsx` -- the compact variant (from 2.5, not yet rendered anywhere). Fix its measurements here if needed.
- `src/features/transactions/index.ts`, `components/TransactionList.tsx` -- the compact variant (`CompactRows`, with a framed icon).
- `src/ui/Tabs.tsx` -- reuse it. `TransactionsPage.tsx` shows the keyed-list tab pattern.
- `src/ui/Card.tsx` -- the `actions` slot for "View All". `buttonClassName` and `icons.chevronRight` are available.
- `src/styles/tokens.css:42`, `tokens.node.test.ts:65`, `src/features/bills/BillsPage.test.tsx:100` -- the Adobe token and its tests.
- `src/app/routeObjects.tsx:62` -- pass the new path props.
- `src/app/router.test.tsx` -- the 2.6 removal test is the pattern for the cross-page consistency test.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- the 2.5 Adobe contrast entry this story resolves. Don't edit it; record the resolution in Implementation Notes.

## Tasks & Acceptance

**Execution:**
- [x] `src/styles/tokens.css`, `tokens.node.test.ts` (+ a contrast assertion) -- the Adobe token.
- [x] `src/features/overview/components/UpcomingBillCard.tsx`, `RecentTransactionCard.tsx`, `OverviewPage.tsx`, `index.ts` -- the widgets and grid placement.
- [x] `src/features/bills/components/BillList.tsx`, `VendorLogo.tsx`, `src/features/transactions/components/TransactionList.tsx` -- compact-variant measurement fixes only, if 104 requires them.
- [x] `src/features/overview/OverviewPage.test.tsx` -- every widget matrix row (seed rows, tabs, View All links, empty, error isolation).
- [x] `src/app/routeObjects.tsx`, `router.test.tsx` -- the path props, plus real-route consistency tests: the Overview bill rows equal the first two `/bills` rows (amount, due date, last charge); the Overview transaction rows equal the first five `/transactions` rows for All and for Revenue; and after removing Checking, none of its transactions appear on Overview.

**Acceptance Criteria:**
- Given `/` at 1440×1024, when compared with `104. Overview.png`, then the Upcoming Bill and Recent Transaction cards (titles, View All, badge, rows, tabs, amounts) match in layout, typography and colour, apart from the seed values and the date format.
- Given the `features/overview` source, when inspected, then it contains no literal bill or transaction values and imports the lists only from the bills and transactions feature indexes.

## Implementation Notes

- **Adobe contrast (resolves the 2.5 deferred-work entry):** `--color-brand-adobe` is now `#EB1000` (4.56:1 on white). The old sampled `#E73D1C` was ~4.13:1. `tokens.node.test.ts` pins the value and asserts a WCAG contrast of at least 4.5 with a small luminance helper. One token serves the 108 name (24px) and the 104 compact name (16px).
- **Equal row-1 heights:** `Card` gained `fill` (section `h-full`, box `flex flex-1 flex-col`). Total Balance and Upcoming Bill use it; the bill rows sit in a `my-auto` wrapper so they are centred, as in 104. Cards without `fill` are unchanged.
- **Grid:** Upcoming Bill is `col-start-3 row-start-1`; Recent Transaction is `col-start-1 row-start-2 row-span-2`. Slots have `data-testid`s for the placement test.
- **View All:** `overview/components/ViewAllLink.tsx`, a router `Link` "View All" plus `icons.chevronRight` (16px), `text-14 text-muted`, with hover to ink and underline.
- **Measured from 104 (compact variants):** bill badge `sm` 44×66 (`h-16.5 w-11`); bill rows `gap-3 py-5`; title `text-18 font-bold text-ink-2`; "Last Charge" does not wrap; amount box `sm` 68×40 (`h-10 min-w-17 px-3 text-18 text-ink-2`). Transaction rows: 40px framed icon (`size-10 rounded-card`, 24px glyph) and `py-5.5`, which gives an 89px row pitch (104: 88px).
- **Seed vs design:** the seed bill titles ("Figma - Yearly Plan", "Adobe Inc - Yearly Plan") are longer than 104's and wrap to two lines in the 352px card. That makes row 1 273px tall rather than 232px. The titles are not truncated (the data wins).
- **Removal test:** none of Checking's transactions are in the five newest on All. The real-route test therefore uses the Revenue tab, where Checking's "Monthly salary" comes first, and it also checks All against the remaining seed rows.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | blind | Compact "Last Charge" is `text-faint` (about 2.6:1) and now 12px | medium | Confirmed; the story made the line smaller. Within the user's "accessibility first" direction. patch: `text-muted` (#666666, about 5.7:1). |
| 2 | edge-case | Nowrap "Last Charge" can spill under the amount box | low | Same line as #1. patch: `block max-w-full truncate`. |
| 3 | blind | Two links both named "View All" | medium | Confirmed (WCAG 2.4.4/2.4.9). patch: a visually hidden suffix gives distinct names, keeping the visible text. |
| 4 | blind | Doc comments claim the "same query" as the full pages | low | The `limit` and `kind` keys differ. patch: say "same hook / data source". |
| 5 | blind | The Revenue fixture has only 4 revenue rows, so the 5-row limit is untested | low | Confirmed. patch: at least 6 revenue rows, assert 5. |
| 6 | blind | Title truncation is untested | low | patch: assert `truncate` and the `title` attribute. |
| 7 | blind | The `faint` text token is below AA wherever it is used | medium | Real and pre-existing (Epic 1 token, used on Bills, Transactions and Account Details). Design-wide. defer. |
| 8 | edge-case | `shrink-0` on the table (md) AmountBox changes `/bills` | false | It has no effect inside a table cell. A re-shot `/bills` at 1440×1024 is unchanged. |
| 9 | blind | `ViewAllLink` duplicates a "View All" style instead of using `Button` text | low | 104's View All is grey small text, not the teal text button. Rejected. |
| 10 | blind | The tabs list is duplicated from `TransactionsPage` | low | Removing it means a new cross-feature export. Rejected. |
| 11 | blind | The tab panel uses `aria-label`, not `aria-labelledby` | low | Carried from 2.3 triage #11. Rejected. |
| 12 | blind | No keyboard test for the Overview tabs | low | The shared `Tabs` keyboard behaviour is covered in `Tabs.test.tsx`. Rejected. |
| 13 | blind | Router tests hard-code seed values | low | Intentional readable expectations. Rejected. |
| 14 | blind | No responsive breakpoints | false | Desktop-only 1440×1024 target. |
| 15 | blind | `Card` leaves a trailing space in its className | low | Harmless. Rejected. |

## Verification

**Commands:**
- `npm run typecheck` -- no errors
- `npm run lint` -- no errors
- `npm test` -- all suites pass
- `npm run build` -- succeeds

**Manual checks:**
- With the dev server running, screenshot `/` at 1440×1024 and compare it with 104. Also check that `/bills` still looks right with the new Adobe red.
