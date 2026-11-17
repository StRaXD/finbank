---
title: 'Story 2.4: Account Details with transaction history and remove'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '2abe8a201ab44f6dd2f31a2da2b7d03a6a3f5dfa'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-3-transactions-page-with-tabs-and-load-more.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/balances/:accountId` is a placeholder. Users can't see one account's details or its transaction history, and can't remove an account from there (FR-17, FR-18, AD-4, AD-13).

**Approach:**
- **Data:** add `getAccount(id)` across the port, mock, http stub, `qk` and a `useAccount` hook.
- **History list:** add a `history` variant to `TransactionList` (owned by transactions) for the account's history.
- **Page:** build `AccountDetailsPage` in `features/balances`, reusing `RemoveAccountDialog` with navigate-first removal. Route `/balances/:accountId` to it.

## Boundaries & Constraints

**Always:**
- **`getAccount(id): Promise<Account | null>`:**
  - Returns a copy of the stored account, or `null` for an unknown id. There is no new error code.
  - `qk.account(id)` = `['finbank','accounts',id]`. It sits under the `accounts` prefix, so the existing `removeAccount` invalidation covers it. `invalidationMap` is unchanged.
- **Same data as Balances:** the details read the same stored account as the Balances card. Values:
  - Bank Name = `bankName`
  - Account Type = `accountTypeLabels[type]`
  - Balance = `formatMoney(balanceCents,'exact')`
  - Branch Name = `branchName`
  - Account Number = `maskAccountNumber(accountNumber,'groups')`, the same mask as the card
- **`AccountDetailsPage`:**
  - **Props:** `{ balancesPath: string }`. It reads `accountId` with `useParams`, since features may not import `src/app`. `routeObjects` passes `routes.balances`.
  - **Layout:** an `h1` "Account Details" (Balances title style), then a white card.
  - **Details card:** a 3-column grid with labels above values. Row 1 is Bank Name, Account Type, Balance; row 2 is Branch Name, Account Number.
  - **Actions:** a primary md "Edit Details" button (inert), then "Remove". In 106 Remove is grey semibold small text, not teal, so it is a plain button in that style, like Story 2.1's "Edit Accounts".
  - **History:** below the card, a `Card` titled "Transactions History" containing `<TransactionList variant="history" accountId={id} limit={10} loadMore />`.
  - **States:** loading and error go through `AsyncSection` over `useAccount(id)`. A `null` result renders an `EmptyState`-style "Account not found" line plus a link to Balances, and no history.
- **Removing from Account Details (AD-13):**
  - `RemoveAccountDialog` gains an optional `onConfirmStart?: () => void`, called synchronously just before `mutate`. The details page passes `() => navigate(balancesPath)`, so the page never renders a missing account.
  - The mutation keeps running after the page unmounts. `useRemoveAccount`'s hook-level `onSuccess` (the invalidation) still runs; only the per-call callbacks are lost, which is acceptable.
  - If the removal fails after navigating, the account simply stays on Balances. No toast.
  - The Balances call site is unchanged: it doesn't pass `onConfirmStart`.
- **`TransactionList` `history` variant:**
  - A `Table` with the columns Date (`formatDate(…,'row')`, left), Status ("Complete"/"Pending", centre), Transaction Type ("Credit"/"Debit", centre), Receipt (`receiptId`, centre) and Amount (`exact`, bold, right).
  - Column widths are measured from 106 (about 22/21/22/23/12%). There are no icons.
  - Rows use 106's shorter row height (about 54px, measured). This needs a compact row-density option on `Table` (for example `density: 'md'|'sm'`, default `md`, so 107 is unchanged).
  - The variant is exported through the transactions index, which already exports `TransactionList`.
- **Nav:** Balances stays active on the details route (existing shell behaviour).
- **Design:** measured from `design-reference/screens/106. Account Details.png` (1440×1024 @2x). As in 2.3, keep the shared `row` date format rather than "17 Apr, 2023".

**Never:** No edit form, no receipt links, no breadcrumb or back button, no new `ApiError` codes, no toast, no changes to Balances' remove behaviour beyond the optional prop.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Known account | `/balances/acc_2` | details match the Checking card (AB Bank Ltd., Checking, $25,056.00, Park Street Branch, `693 456 699****`); history lists only acc_2 rows, newest first | N/A |
| History paging | acc_2 (≥15 rows) | 10 rows, then Load More appends the rest and hides | N/A |
| Unknown id | `/balances/nope` | "Account not found" with a link to `/balances`; no history | N/A |
| `getAccount` unknown | `getAccount('nope')` | resolves `null` | N/A |
| Remove confirm | Remove → confirm on acc_2 | URL becomes `/balances` before `removeAccount` is called; Balances shows 4 cards; acc_2's rows are gone from `/transactions` | N/A |
| Remove cancel | Cancel / Esc | stays on details; nothing removed | N/A |
| Load error | `getAccount` rejects | AsyncSection alert with Retry | ApiError message |

</frozen-after-approval>

## Code Map

- `src/api/port.ts`, `http/httpApi.ts`, `mock/mockApi.ts` -- `getAccount`, following the `listAccounts` pattern (`structuredClone` the found account).
- `src/api/queryKeys.ts` (+ test) -- `qk.account(id)`. The test pins `qk` shapes.
- `src/api/hooks/useAccounts.ts` -- template for `useAccount.ts`.
- `src/features/balances/components/RemoveAccountDialog.tsx` -- add `onConfirmStart`. It is called inside the confirm handler after the in-flight guard and before `removal.mutate`.
- `src/features/balances/BalancesPage.tsx` -- reference for the title, `AsyncSection` and dialog wiring. `AddAccountsCard.tsx` has the plain grey button precedent.
- `src/features/balances/index.ts`, `paths.ts` -- export `AccountDetailsPage`. Add a balances-path prop type if useful.
- `src/features/transactions/components/TransactionList.tsx` -- add `history` columns next to `columns`. `src/ui/Table.tsx` gets the `density` option and per-column `width` (2abe8a2).
- `src/app/routeObjects.tsx:62` -- replace the Account Details placeholder.
- `src/app/router.test.tsx:45,63` and `shell.test.tsx:76` -- they expect an `h1` "Account Details" on `/balances/acc_1`, which still holds.

## Tasks & Acceptance

**Execution:**
- [x] `src/api/port.ts`, `http/httpApi.ts`, `mock/mockApi.ts` (+ test), `queryKeys.ts` (+ test), `hooks/useAccount.ts` (+ `hooks.test.tsx` case) -- `getAccount`, the key and the hook.
- [x] `src/ui/Table.tsx` (+ a small `Table.test.tsx` for density and widths) -- the row-density option.
- [x] `src/features/transactions/components/TransactionList.tsx` (+ `TransactionsPage.test.tsx` history case) -- the `history` variant.
- [x] `src/features/balances/components/RemoveAccountDialog.tsx`, `AccountDetailsPage.tsx`, `index.ts` -- the page and navigate-first removal.
- [x] `src/features/balances/AccountDetailsPage.test.tsx` -- every matrix row except the adapter one: details values, history, not found, cancel, error. Also navigate-before-remove: assert the location is `/balances` when `removeAccount` is first called.
- [x] `src/app/routeObjects.tsx`, `router.test.tsx` -- the route, plus a real-route test: open Checking's Details, remove it, land on Balances with 4 cards, and `/transactions` has no acc_2 rows.

**Acceptance Criteria:**
- Given `/balances/acc_2` at 1440×1024, when compared with `106. Account Details.png`, then the title, details grid, buttons, "Transactions History" section and table match in layout, typography and colour (apart from the date format and the seed values).
- Given the details page, when the user tabs through it, then "Edit Details", "Remove" and "Load More" are reachable, and the dialog traps focus as on Balances.

## Implementation Notes

- **Not found:** `AsyncSection` only treats `undefined` as loading, so a `null` account reaches `children`, which renders `EmptyState` ("Account not found.") plus a teal "Back to Balances" text link. `isEmpty` is not used, since it cannot add the link.
- **Remove:** `onConfirmStart` is called after the in-flight guard and before `removal.mutate`. The details page passes `() => void navigate(balancesPath)`. The unit test records the router path inside `removeAccount` and asserts it is `/balances`.
- **Density:** `Table` `density="sm"` uses `py-3.75` (15px + 24px line + 1px divider, about 55px). `md` stays `py-6`.
- **Details card:** its own white box (`px-8 pt-8 pb-10`), with the columns at `grid-cols-[repeat(3,30.5%)]` (317px apart in 1039px). Values are `text-20 font-bold text-ink-2`, labels `text-16 text-subtle`. In a 1440×1024 screenshot, every measured position is within 2px of 106.
- **Known deviation:** the "Transactions History" card starts 8px higher than in 106, because the shared `Card` puts 8px (`gap-2`) between title and body, while 106 has about 16px. `Card` was left unchanged because Overview widgets share it.

## Spec Change Log

- **2026-11-17, human-directed change after `done`:** the user asked that removal from Account Details navigate to Balances only after the removal succeeds, and that a failure keep the user on Account Details with an error.
  - **What changed:** this supersedes the frozen "Removing from Account Details (AD-13)" rule (navigate first, silent failure) and the "Remove confirm" matrix row.
  - **Code:**
    - `RemoveAccountDialog` loses `onConfirmStart`.
    - `AccountDetailsPage` navigates in `onRemoved` with `{ replace: true }`.
    - While a confirmed removal settles, the page keeps rendering the account being removed (`loaded ?? removing`), so "Account not found" never shows behind the dialog.
    - A failure shows the `ApiError` message inline in the dialog and allows a retry.
  - **Known-bad state avoided:** a failed removal that left the user on Balances with no explanation.
  - **KEEP:**
    - the replace navigation (Back never returns to the removed account);
    - the in-flight double-confirm guard;
    - the shared dialog copy.
  - **Note:** the architecture spine's AD-13 still says navigate first; it needs updating to match.

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | edge-case | Navigate-first pushes history, so Back returns to the removed account and flashes its cached details | medium | Confirmed: `navigate(balancesPath)` without `replace`. patch: `{ replace: true }` plus a test. |
| 2 | verification-gap, edge-case, blind | A failed removal after navigating is silent | false | The frozen intent accepts it: "If the removal fails after navigating, the account simply stays on Balances. No toast." |
| 3 | verification-gap, blind | The dialog doc comment still promises an inline error on every path | low | Confirmed: it is stale for navigate-first. patch: comment only. |
| 4 | blind | No test for the failure after navigating | low | The behaviour is the accepted no-op from #2. Rejected. |
| 5 | blind | The removed card stays visible until the refetch, with no confirmation | low | About 200 ms mock delay plus a refetch; the intent rules out a toast. Rejected. |
| 6 | edge-case | Re-entering a removed account's URL within gcTime shows stale details | low | Only by typing the URL again within minutes, since #1 removes the Back path. Rejected: the fix adds cache surgery. |
| 7 | blind | `useAccount` runs with an empty id | false | The route `/balances/:accountId` always supplies a non-empty segment. |
| 8 | blind | Balances' cached list is not reused as initial data | low | Costs one extra 200 ms mock read. Rejected. |
| 9 | blind | `qk.account` under the `accounts` prefix mixes entry shapes for prefix matching | low | Developer hazard for future `setQueriesData` callers. patch: a warning comment. |
| 10 | verification-gap, blind | `emptyMessage` prop is never shown | low | `AsyncSection` requires the prop, and `null` is handled in children. Rejected: no harm. |
| 11 | blind | Empty and failed history states untested on the details page | low | The shared `TransactionList` states are covered in `TransactionsPage.test.tsx`. Rejected. |
| 12 | blind | Edit Details is inert with no feedback | false | The frozen intent requires it inert (FR-18). |
| 13 | blind | Hand-made Remove button has no focus style | false | The global `:focus-visible` outline in `src/styles/index.css` applies. It follows 2.1's grey "Edit Accounts" precedent. |
| 14 | blind | Long receipt ids could overflow | false | Receipt ids are fixed at 11 characters by the seed and the normalizer. |
| 15 | blind | Router test infers removal from the "Debit Card" text | low | Brittle against seed changes. patch: assert on acc_2's seeded receipt ids. |
| 16 | blind | Unused `seen` in the test fixture | low | Dead code. patch: delete it. |
| 17 | blind | The page or document title doesn't name the account | false | 106 shows the generic "Account Details" title. |

## Verification

**Commands:**
- `npm run typecheck` -- no errors
- `npm run lint` -- no errors
- `npm test` -- all suites pass
- `npm run build` -- succeeds

**Manual checks:**
- With the dev server running, screenshot `/balances/acc_2` at 1440×1024 and compare it with 106.
