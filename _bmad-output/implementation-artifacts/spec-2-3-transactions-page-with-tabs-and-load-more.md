---
title: 'Story 2.3: Transactions page with tabs and Load More'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: 'df3a6af42b923cd4f0646764e106897955ae1b10'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-2-remove-an-account-from-balances.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There are no transactions in the data layer, and `/transactions` is a placeholder. Account Details (2.4), the Overview widget (2.7) and the Epic 3 category totals all need one transaction dataset that agrees with the accounts (FR-19, FR-33, AD-4, AD-6, AD-7).

**Approach:**
- **Data:** add `Transaction` to the types and a deterministic seed of transactions tied to the seeded accounts. Add `listTransactions` across the port, mock adapter, http stub, `qk` and a `useTransactions` infinite-query hook. Extend `removeAccount` to drop the removed account's transactions.
- **UI:** build the `Tabs`, `Table` and `LoadMore` primitives, plus `features/transactions` (`TransactionsPage` and `TransactionList` with `table` and `compact` variants), and route `/transactions` to it.

## Boundaries & Constraints

**Always:**

- **`Transaction` type:**
  - `{ id ('txn_N'), accountId, item, shop, kind: 'revenue'|'expense', category?: ExpenseCategoryId, paymentMethod, status: 'complete'|'pending', type: 'credit'|'debit', receiptId, amountCents (positive integer), date: IsoDate, icon: TransactionIcon }`.
  - `ExpenseCategoryId` = `'housing'|'food'|'transportation'|'entertainment'|'shopping'|'others'`.
  - `TransactionIcon` is a closed union of icon keys: gadget, shopping, food, entertainment, transport, housing, salary, transfer, other.
- **Consistency with accounts** (enforced by the seed, and by load-time normalization):
  - Every `accountId` is a seeded account. On load, the normalizer drops stored transactions whose `accountId` is not in the current `accounts`, and also invalid or duplicate entries. A non-array value falls back to the seed.
  - `paymentMethod` follows the account type: Credit Card → "Credit Card", Checking → "Debit Card", Savings, Investment and Loan → "Bank Transfer".
  - `type` follows `kind`: revenue → credit, expense → debit.
  - Only expenses carry a `category`.
  - `removeAccount` removes the account and its transactions in the same single write.
  - Account balances stay stored values (AD-5). They are not recalculated from transactions.
- **Seed:**
  - Each of the five accounts has at least 15 transactions, so every account pages.
  - Dates fall between 2023-04-01 and 2023-05-19.
  - All six categories have expenses in both April and May 2023, for Epic 3.
  - Each account has at least one revenue row.
  - The data is deterministic: written out, or built by a pure builder with no randomness and no `Date` use.
  - The newest rows are the seven 107 rows on 2023-05-17 on the Credit Card account `acc_1`, in the design's order: GTR 5 / Gadget & Gear $160.00, Polo shirt / XL fashions $20.00, Biriyani / Hajir Biriyani $12.00, Movie ticket / Inox $15.00, Taxi fare / Uber $10.00, Pizza / Pizza Hit $20.00, Keyboard / Gadget & Gear $30.00.
  - Receipt ids are 11-character alphanumeric strings like `8C52d5DKDJ5`.
  - Statuses are mostly complete, with a few pending.
- **`listTransactions({ kind?, accountId?, cursor?, limit })`:**
  - Filters, sorts by date descending, then by seed order for equal dates, and returns `{ items, nextCursor }`.
  - The cursor is an opaque string holding the offset into the filtered list. `nextCursor` is null on the last page.
  - A bad `limit` (not an integer from 1 to 50) or an unparseable cursor rejects with `ApiError('VALIDATION', …)`. An unknown `accountId` returns an empty page.
  - Items are copies.
- **Query keys and invalidation:**
  - `qk.transactions(filter?)` is `['finbank','transactions']`, or with `{ kind, accountId, limit }` appended. The cursor is never part of the key.
  - `invalidationMap.removeAccount` gains `qk.transactions()`. Remove the "Story 2.3" comments.
- **`useTransactions({ kind?, accountId?, limit })`:** a `useInfiniteQuery` that passes `pageParam` as `cursor`. `getNextPageParam` returns `nextCursor ?? undefined`. The page size is 10 on the full pages and 5 on Overview.
- **`src/ui` primitives** (no `className` props, tokens only):
  - **`Tabs`:** controlled `{ tabs: {id,label}[], value, onChange, label }`. Uses WAI-ARIA tablist / tab with `aria-selected`, roving tabindex, and Left/Right/Home/End keys. The active tab is teal with a 2px teal underline; inactive tabs are ink-2 semibold.
  - **`Table<T>`:** `{ columns: { key, header, align?, render(row) }[], rows, rowKey, caption }`. Semantic `table`, a visually hidden `caption`, a bold header row, and divider rows.
  - **`LoadMore`:** `{ hasMore, loading, onClick, error? }`. A centred primary "Load More" button, rendered only when `hasMore` and disabled while loading. When `error` is set it shows a danger `role="alert"` line, and the button retries.
- **`TransactionList`:**
  - Props: `{ variant: 'table'|'compact', kind?, accountId?, limit, loadMore?: boolean }`.
  - Owns `useTransactions` and renders through `AsyncSection`, with the empty message "No transactions yet." and the pages flattened.
  - **`table`:** the columns Items (icon in a grey square, plus the bold name), Shop Name, Date (`formatDate(…,'row')`), Payment Method and Amount (`formatMoney(…,'exact')`, right-aligned, no sign or colour), plus `LoadMore` when `loadMore`.
  - **`compact`** (for 2.7): rows with the icon, the name over the shop, and the amount over the date, right-aligned (104 widget).
  - The icon map for `TransactionIcon` lives in `src/ui/icons.ts`.
- **`TransactionsPage`:** an `h1` "Recent Transaction" in the Balances title style, then the `Tabs` (All, Revenue, Expenses) in local state, outside the card. Below them, a white card holding `<TransactionList variant="table" kind={…} limit={10} loadMore />`. Switching tabs starts that filter's first page. Exports go through `features/transactions/index.ts`.
- **Design:** measured from `design-reference/screens/107. Transactions.png` (1440×1024 @2x). The design shows dates as "17 May, 2023"; keep the shared `row` format ("17 May 2023"), which is the Epic 1 decision.

**Never:** No sorting, date filters, row clicks, Account Details history columns (2.4), Overview widget wiring (2.7) or category summaries (3.1). Never recalculate account balances from transactions.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First page | `{limit:10}` on seed | 10 newest; first is GTR 5 on 2023-05-17; nextCursor set | N/A |
| Last page | follow cursors | pages concatenate to every transaction exactly once; final nextCursor null | N/A |
| Filter kind | `{kind:'revenue'}` | only revenue rows, newest first | N/A |
| Filter account | `{accountId:'acc_2'}` | only acc_2 rows (≥15) | N/A |
| Unknown account | `{accountId:'nope'}` | `{items:[], nextCursor:null}` | N/A |
| Bad input | `limit:0`, `limit:51` or cursor `'x'` | rejects | `ApiError VALIDATION` |
| Remove account | `removeAccount('acc_1')` | acc_1 transactions gone from storage and lists | N/A |
| Orphans in storage | stored txn with accountId not in accounts | dropped on load and written back | N/A |
| Old v1 state | no `transactions` key | backfilled from the seed, minus orphans of removed accounts | N/A |
| Seed consistency | seed | every accountId exists; paymentMethod and type follow the rules; ≥15 per account; six categories in both April and May | N/A |

</frozen-after-approval>

## Code Map

- `src/api/types.ts` -- add `ExpenseCategoryId`, `TransactionKind`, `TransactionIcon`, `Transaction`, `TransactionPage`, `ListTransactionsInput`.
- `src/api/port.ts`, `http/httpApi.ts` -- the method, the list entry and the stub (the pattern from 2.1 and 2.2).
- `src/api/mock/seed.ts` -- `MockState.transactions`. Keep the frozen-seed typing like `accounts`, or put the rows in a sibling `seedTransactions.ts` if long.
- `src/api/mock/mockApi.ts` -- `normalizeAccounts` and `loadState` show the pattern. Normalize transactions after accounts so orphans can be dropped. `removeAccount` already writes `next` before assigning `current`; extend `next`.
- `src/api/queryKeys.ts` (+ test) -- `qk.transactions` and the `removeAccount` entry. The test pins the exact map.
- `src/api/hooks/useAccounts.ts` -- hook style. `useInfiniteQuery` comes from `@tanstack/react-query`.
- `src/ui/AsyncSection.tsx` -- its structural `AsyncQuery` fits an infinite-query result, with `data` as `InfiniteData`.
- `src/ui/icons.ts` -- add the `TransactionIcon` glyphs, using lucide matches for 107: Gamepad2, ShoppingBag, Utensils or Store, Clapperboard, CarTaxiFront, House, Wallet or Banknote, ArrowLeftRight, Circle.
- `src/ui/Button.tsx` -- `LoadMore` uses the primary `md` Button.
- `src/features/balances/*` -- the folder and test layout to mirror. `BalancesPage.test.tsx` shows the hand-built `api` approach.
- `src/app/routeObjects.tsx` -- route `/transactions` to `TransactionsPage`. `router.test.tsx` expects an `h1` "Transactions" for `/transactions`; change it to "Recent Transaction".
- `src/lib/format.ts` -- `formatDate(…,'row')` and `formatMoney(…,'exact')`.

## Tasks & Acceptance

**Execution:**
- [x] `src/api/types.ts`, `port.ts`, `http/httpApi.ts`, `queryKeys.ts` (+ test) -- the contract.
- [x] `src/api/mock/seed.ts` (/`seedTransactions.ts`), `mockApi.ts`, `mockApi.test.ts` -- seed, normalization, `listTransactions`, and the extended `removeAccount`, with tests for every matrix row.
- [x] `src/api/hooks/useTransactions.ts` (+ `hooks.test.tsx` case) -- the pages chain through `nextCursor`.
- [x] `src/ui/Tabs.tsx`, `Table.tsx`, `LoadMore.tsx`, `icons.ts`, with RTL tests for Tabs (keyboard and aria) and LoadMore (hidden, pending, error).
- [x] `src/features/transactions/TransactionsPage.tsx`, `components/TransactionList.tsx`, `index.ts`, and `TransactionsPage.test.tsx` -- columns and formatting, tab filtering, Load More appending 10 and disappearing at the end, empty, error, and the compact variant render.
- [x] `src/app/routeObjects.tsx`, `router.test.tsx` -- the route and the updated title expectation.

**Acceptance Criteria:**
- Given `/transactions` signed in, when it loads, then it shows "Recent Transaction", All selected, and the 10 newest rows starting with the seven 107 rows. Clicking Load More appends 10 more.
- Given the Revenue tab, when selected, then only revenue rows show. Back on All, the list restarts at the newest rows.
- Given an account removed on Balances, when the user opens `/transactions`, then none of its transactions appear.
- Given 1440×1024, when compared with `107. Transactions.png`, then the title, tabs, table and button match in layout, typography and colour (apart from the documented date-format difference).

## Implementation Notes

- **Seed:** `src/api/mock/seedTransactions.ts` holds 78 rows written out per account and a pure builder (`buildSeedTransactions`) that sorts them newest first (stable), numbers them `txn_1`…, derives `paymentMethod`, `type` and `status`, and builds receipt ids from a fixed 32-bit LCG over the row number. Nothing is dated after 2023-05-17, so the seven 107 rows are `txn_1`–`txn_7`.
- **Cursor:** `"o{offset}"`. Anything else (including a negative or non-numeric value) rejects with `VALIDATION`; an unknown `kind` also rejects.
- **First page on tab switch:** `useTransactions` sets `gcTime: 0`, and `TransactionsPage` keys `TransactionList` by tab, so a filter nobody shows is dropped and returning to it starts at page one.
- **Load More failure:** `TransactionList` passes the infinite query's error to `LoadMore` only when `isFetchNextPageError`; the loaded rows stay.
- **Pre-existing, not changed:** `normalizeAccount` appends `network` last, so stored accounts with a network differ in key order from the seed and the state is rewritten once per adapter load. Harmless; the clean-load test uses network-less accounts.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | verification-gap | The newest-first sort is untested because storage is always pre-sorted | medium | Pre-verified: removing `.sort` passes every test. patch: a shuffled-storage paging test. |
| 2 | blind | `paymentMethod` is not checked against the account type on load | medium | Confirmed: `normalizeTransactions` checks orphans and `type`/`kind` only, while the frozen consistency rules list `paymentMethod`. patch: drop mismatched rows on load. |
| 3 | blind | `LoadMore` native `disabled` drops keyboard focus | medium | Confirmed: browsers blur a focused element when it is disabled. `LoadMore` is new in this story. patch: `aria-disabled` plus a click guard. |
| 4 | blind | Focus is lost when Load More unmounts after the last page | low | Real, but fixing it adds focus-management logic. Rejected (related to the 2.2 deferred `ConfirmDialog` focus item). |
| 5 | blind, edge-case | An expense without a category passes validation | false | The frozen type makes `category` optional, matching the epic ("an optional expense category"). Epic 3 decides how uncategorized expenses count. |
| 6 | blind, edge-case | `accountId` input is not validated | low | Callers are typed hooks. Rejected: unreachable, and the fix adds a branch. |
| 7 | blind | Offset cursor skips or repeats rows when data changes between pages | false | Removal invalidation refetches the infinite query from its first page. The mock caches state in memory, so other-tab writes are not read mid-session. |
| 8 | edge-case | An unknown icon key crashes `TransactionList` | false | The mock normalizer rejects icons outside the union, and the http adapter is a stub. |
| 9 | edge-case | Tabs `value` matching no tab removes every tab from the tab order | low | `TransactionsPage` passes a typed `TabId`. Rejected. |
| 10 | edge-case | Duplicate tab ids break the refs | low | Ids are static literals. Rejected. |
| 11 | blind | Tab panel uses `aria-label` rather than `aria-labelledby` | low | `aria-label` gives a valid accessible name. Rejected. |
| 12 | blind | Table overflows on narrow screens | false | Desktop-only 1440×1024 target. |
| 13 | blind | `Table` has no direct test | low | Its contract is exercised through `TransactionsPage.test.tsx`. Rejected. |
| 14 | blind | Every tab switch flashes the skeleton | low | About 200 ms of mock latency, a side effect of the required restart at the first page. Rejected: avoiding it needs a different cache strategy. |
| 15 | blind | Empty message and caption ignore the filter | low | Copy only. Rejected. |
| 16 | blind | Pending status is not shown | false | 107 has no status column; status is shown on Account Details (2.4). |
| 17 | blind | Receipt id uniqueness is not tested | low | The generator is deterministic. Rejected. |
| 18 | verification-gap (other) | Router test does not independently cover the transactions invalidation | false | Pinned in `queryKeys.test.ts`, as the reviewer notes. |

## Verification

**Commands:**
- `npm run typecheck` -- no errors
- `npm run lint` -- no errors
- `npm test` -- all suites pass
- `npm run build` -- succeeds

**Manual checks:**
- `npm run dev`: compare `/transactions` with 107, switch tabs, page to the end, remove an account on Balances and check that its rows disappear.
