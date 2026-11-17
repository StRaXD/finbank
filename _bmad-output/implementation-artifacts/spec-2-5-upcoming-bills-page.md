---
title: 'Story 2.5: Upcoming Bills page'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '55070f31d07da92bb7939fd9caacc023bb57e062'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-3-transactions-page-with-tabs-and-load-more.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There are no bills in the data layer, and `/bills` is a placeholder. The Overview Upcoming Bill widget (2.7) needs the same bill records (FR-20, FR-33, AD-4).

**Approach:**
- **Data:** add `Bill` to the types and a seed of at least three bills. Add `listBills({ limit? })` across the port, mock, http stub, `qk` and a `useBills` hook.
- **UI:** add the `DateBadge` primitive and `features/bills` (`BillsPage` and `BillList` with `table` and `compact` variants), and route `/bills` to it.

## Boundaries & Constraints

**Always:**
- **`Bill` type:**
  - `{ id ('bill_N'), vendor, logo: BillLogo, title, description, billingCycle: 'monthly'|'yearly', dueDate: IsoDate, lastChargeDate: IsoDate, amountCents (positive integer) }`.
  - `BillLogo` = `'figma'|'adobe'|'google'`, which are the brand SVGs already in `src/assets/brands/`.
- **Seed** (consistent with mock today, 2023-05-19):
  - **Three bills, in this order:**
    - Figma, "Figma - Yearly Plan", $150, yearly, due 2023-05-25, last charge 2022-05-25.
    - Adobe, "Adobe Inc - Yearly Plan", $559, yearly, due 2023-06-16, last charge 2022-06-16.
    - Google, "Google Workspace - Monthly Plan", $72, monthly, due 2023-06-18, last charge 2023-05-18.
  - **Rules:**
    - Every due date is after mock today, so all bills are genuinely upcoming. The design's "May 15" is already past on May 19.
    - `lastChargeDate` is one cycle before `dueDate`, and on or before mock today.
    - Descriptions are short plan blurbs in the style of 108.
  - **Sorted order:** sorting by due date gives Figma, Adobe, Google, so the Overview widget's "next two" in 2.7 are the design's Figma and Adobe.
- **`listBills({ limit? })`:**
  - Returns copies sorted by `dueDate` ascending, stable for equal dates, truncated to `limit` when given.
  - A `limit` that is not an integer from 1 to 50 rejects with `ApiError('VALIDATION', …)`.
  - The mock state gains `bills`. A non-array value falls back to the seed; invalid or duplicate entries are dropped (the 2.3 normalization pattern); `MOCK_STATE_VERSION` stays 1.
- **Query key and hook:**
  - `qk.bills(limit?)` = `['finbank','bills']`, plus `{ limit }` when one is given.
  - `useBills({ limit? })` is a `useQuery`. No mutation touches bills, so `invalidationMap` is unchanged.
- **`DateBadge` (`src/ui`):**
  - Props `{ date: IsoDate }`: a light-grey rounded box with the month (`MMM`) above the day number, labelled for assistive tech (e.g. `aria-label` "Due May 25").
  - Sized and coloured from 108: a muted month and a large bold day. Use tokens only; formatting goes through `lib/format` or `lib/dates` (no `Date`).
- **`BillList`:**
  - Props `{ variant: 'table'|'compact', limit? }`. It owns `useBills` and renders through `AsyncSection`, with the empty message "No upcoming bills."
  - **`table` (108):** the columns are:
    - Due Date: `DateBadge`.
    - Logo: the brand SVG plus the vendor name in the brand style of 108. The Figma name is in ink; the Adobe name is red, through a new brand token in `tokens.css` (no raw hex in components); Google is in ink.
    - Item Description: the bold title over the muted description, wrapping as in 108.
    - Last Charge: `formatDate(…,'row')`, muted, centred.
    - Amount: `formatMoney(…,'whole')`, bold, inside an outlined rounded box, right-aligned.
  - **`compact` (104, for 2.7):** rows with the badge, the vendor logo and name, the title, "Last Charge - {row date}" and the boxed amount.
  - Exported from `features/bills/index.ts`.
- **`BillsPage`:** an `h1` "Upcoming Bills" (the Balances title style), then a white card holding `<BillList variant="table" />`. There are no pay or add actions, and no pagination.
- **Design:** measured from `design-reference/screens/108. Bills.png` (1440×1024 @2x). Use the shared `Table` with per-column widths. Keep the shared `row` date format ("25 May 2022") rather than "14 May, 2022", as in 2.3 and 2.4.

**Never:** No pay or add-bill actions, no Overview wiring (2.7), no bill mutations, and no new raw colour literals in components.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| All bills | `listBills({})` on seed | 3 bills ordered Figma (May 25), Adobe (Jun 16), Google (Jun 18) | N/A |
| Limit | `{limit:2}` | Figma, Adobe | N/A |
| Bad limit | `limit:0`, `limit:51` or `limit:1.5` | rejects | `ApiError VALIDATION` |
| Unsorted storage | stored bills in shuffled order | still returned by due date ascending | N/A |
| Old v1 state | no `bills` key | backfilled from the seed and written back | N/A |
| Corrupt bills | non-array, or entries with a bad logo, date or amount | non-array → seed; bad entries dropped | N/A |
| Seed consistency | seed | every `dueDate` is after 2023-05-19; `lastChargeDate` is one cycle before `dueDate` and on or before 2023-05-19 | N/A |
| Page | `/bills` | title, 3 rows with badge, logo and name, title and description, last charge, boxed whole amount | N/A |
| Empty / error | `listBills` → `[]` / rejects | "No upcoming bills." / alert with Retry | ApiError message |

</frozen-after-approval>

## Code Map

- `src/api/types.ts`, `port.ts`, `http/httpApi.ts` -- the `Bill`/`BillLogo` types, the method, the list entry and the stub.
- `src/api/mock/seed.ts`, `mockApi.ts` -- `MockState.bills` and the frozen seed. `normalizeTransactions` and `pageTransactions` show the normalization and validation patterns. `validIsoDate` already exists.
- `src/api/queryKeys.ts` (+ test) -- `qk.bills`. The test pins the `qk` shapes.
- `src/api/hooks/useAccounts.ts` -- hook template.
- `src/lib/format.ts` -- the `month` date mode gives "Jan"-style months. The day number needs a helper in `lib/format` (for example a `day` mode, "25"), because only `lib/dates` and `lib/format` may touch `Date`.
- `src/styles/tokens.css` (+ `tokens.node.test.ts`) -- add the Adobe brand-red token.
- `src/assets/brands/{figma,adobe,google}.svg` -- the logos. They carry their own brand colours.
- `src/ui/Table.tsx` -- the per-column `width` and `density` options. Bills rows are tall (about 156px in 108); pick the density or padding by measurement, and add a `density` value only if needed.
- `src/features/transactions/*` -- the feature layout, the `TransactionList` variant pattern and the hand-built-api test style to mirror.
- `src/app/routeObjects.tsx` -- route `/bills`. `router.test.tsx:49` expects the `h1` "Bills"; change it to "Upcoming Bills".

## Tasks & Acceptance

**Execution:**
- [x] `src/api/types.ts`, `port.ts`, `http/httpApi.ts`, `queryKeys.ts` (+ test) -- the contract.
- [x] `src/api/mock/seed.ts`, `mockApi.ts`, `mockApi.test.ts` -- seed, normalization and `listBills`, with tests for every adapter row of the matrix.
- [x] `src/api/hooks/useBills.ts` (+ a `hooks.test.tsx` case).
- [x] `src/lib/format.ts` (+ test) -- the day helper. `src/ui/DateBadge.tsx` (+ test) and `src/styles/tokens.css` (+ test) -- the badge and the token.
- [x] `src/features/bills/BillsPage.tsx`, `components/BillList.tsx`, `components/VendorLogo.tsx`, `index.ts`, `BillsPage.test.tsx` -- the page, both variants, empty and error states.
- [x] `src/app/routeObjects.tsx`, `router.test.tsx` -- the route and the title expectation.

**Acceptance Criteria:**
- Given `/bills` signed in at 1440×1024, when compared with `108. Bills.png`, then the title, header row, badge, logo and name, description wrapping, last charge and boxed amount match in layout, typography and colour (apart from the seed values and the date format).
- Given the Bills nav item, when on `/bills`, then it is the only active nav item.

## Implementation Notes

- **Seed descriptions:** Figma reuses the 108 blurb; Adobe and Google have short blurbs in the same style.
- **`lib/format`:** added the `day` date mode (`d`, "25", "5"), used with `month` by `DateBadge`.
- **`DateBadge`:** `role="img"` carries the `aria-label` "Due May 25". It also takes an optional `size` (`md` by default, 72×82 from 108; `sm` for the 2.7 compact rows). This prop goes beyond the frozen `{ date }`.
- **`Table`:** added `density="lg"` (`py-8`). With the 18px title, 8px gap and three 22px description lines (wrapped at `max-w-68`), rows are about 162px, as measured in 108.
- **Colours sampled from 108:** month `subtle`, day `ink-2`, description and Last Charge `faint`, badge `surface`, amount-box border `border`. The Adobe name is `#E73D1C`, now the token `--color-brand-adobe`.
- **Vendor name:** `text-24` medium. The 108 wordmarks are about 26px, but 24 is the largest type token.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | verification-gap | Logo→SVG mapping never asserted | medium | Pre-verified: `data-logo` comes from the prop, so swapped sources pass. patch: assert `src` per row. |
| 2 | verification-gap | md/sm horizontal and header padding not pinned after the move into maps | medium | Pre-verified: only `py-*` is asserted. patch: assert `px-2` and `pb-4` for md and sm. |
| 3 | blind | Bills limit borrows the transactions `MAX_PAGE_SIZE` | low | Coupling that silently changes the bills contract. patch: its own constant. |
| 4 | blind | Rounding comment overstates the test (only rounds down) | low | Confirmed. patch: a half-up case or a reworded comment. |
| 5 | blind | Adobe red (#E73D1C) is about 4.1:1 on white, below AA for the 16px compact name | medium | Real; the table name is 24px (large text passes). The compact variant is first used by 2.7, where design fidelity (red in 104) and contrast must be weighed. defer. |
| 6 | blind | Full seed is not clean on load (accounts with `network` are rewritten every load) | medium | Real and pre-existing from 2.1: `normalizeAccount` puts `network` last, so the JSON differs from the stored copy and a write happens on every load. defer (pre-existing). |
| 7 | edge-case, blind | Past-due bills are still listed as upcoming | low | Mock today is fixed and the seed due dates are all after it; only hand-edited storage reaches this. Rejected. |
| 8 | edge-case, blind | `lastChargeDate` after `dueDate` / not one cycle before passes validation | low | Hand-edited storage only. Rejected: the fix adds date arithmetic. |
| 9 | edge-case, blind | Empty vendor or title accepted | low | Hand-edited storage only. Rejected. |
| 10 | edge-case | Unknown logo crashes `VendorLogo` | false | The mock normalizer rejects logos outside `BillLogo`, and the http adapter is a stub. |
| 11 | blind | `DateBadge` aria-label hard-codes "Due" and omits the year | low | Bills are the only consumer. Rejected (revisit if another screen reuses it). |
| 12 | blind | Compact list has no accessible name | low | 2.7 places it under a titled `Card` section. Rejected. |
| 13 | blind | Amount header drifts when the box exceeds 108px ($10,000+) | low | Seed amounts are at most $559. Rejected. |
| 14 | blind | Compact variant has no empty or error tests; `limit: 0` reaches the key | low | Shared `AsyncSection` states are covered; the limit is validated by the adapter. Rejected. |
| 15 | blind | `BillLogo` and `BILL_LOGOS` are not derived from one source | low | Developer convenience. Rejected. |

## Verification

**Commands:**
- `npm run typecheck` -- no errors
- `npm run lint` -- no errors
- `npm test` -- all suites pass
- `npm run build` -- succeeds

**Manual checks:**
- With the dev server running, screenshot `/bills` at 1440×1024 and compare it with 108.
