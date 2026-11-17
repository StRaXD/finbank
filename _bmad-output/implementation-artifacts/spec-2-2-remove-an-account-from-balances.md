---
title: 'Story 2.2: Remove an account from Balances'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '330d191058ce1466b68298c98bf78cda0e87328b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-1-balances-page-with-account-cards.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** "Remove" on a Balances card does nothing. Users need a confirmed way to remove an account, and the removal must persist and update every screen that reads accounts or the Total Balance (FR-17, FR-33, AD-6, AD-7).

**Approach:**
- **Data:** add `removeAccount(id)` to the port, the mock adapter and the http stub, plus a `useRemoveAccount` mutation hook that invalidates through `invalidationMap`.
- **UI:** a reusable `RemoveAccountDialog` in `features/balances` opens from the card's Remove and confirms through `ConfirmDialog`. Story 2.4 reuses it from Account Details.

## Boundaries & Constraints

**Always:**
- **`removeAccount(id: string): Promise<void>`:**
  - Builds the next state without the account and writes it through to storage. Only after the write succeeds does it replace the in-memory state, so a failed write (`STORAGE_FULL` / `UNKNOWN`) leaves both the memory and storage state unchanged.
  - An id that doesn't exist resolves as a no-op. Removal is idempotent, e.g. after a double click or a stale tab.
  - The adapter has no transactions yet. Story 2.3 extends this method to also drop the account's transactions (AD-6). Leave a one-line comment at that spot.
- **`invalidationMap.removeAccount = [qk.accounts(), qk.balanceSummary()]`:** `qk.transactions` does not exist yet, and 2.3 adds it to this entry. `useRemoveAccount` invalidates only through `applyInvalidation(queryClient, 'removeAccount')`, in `onSuccess`, returning the promise. The mutation therefore stays pending until the active queries have refetched.
- **Dialog:** `ConfirmDialog` with the title "Remove account?" and the confirm label "Remove". Its message names the account: "Your {Type} account at {bankName} ({groups-masked number}) will be removed." While the mutation runs, `pending` is set. On success the dialog closes. On failure the dialog stays open and shows the `ApiError` message as an inline danger line with `role="alert"`, and Confirm can be retried.
- **`ConfirmDialog` error prop:** `ConfirmDialog` gains an optional `error?: string` prop, rendered as that danger line under the message. This is an additive `ui` variant (AD-12), and existing callers are unchanged.
- **`RemoveAccountDialog`:**
  - Props: `{ account: Account | null, onClose, onRemoved? }`. It is open while `account` is non-null.
  - It owns the `useRemoveAccount()` call and resets the mutation's error each time it opens.
  - It is exported from `features/balances/index.ts`.
- **`BalancesPage`:** holds the account being removed in state, passes `onRemove` to each `AccountCard`, and renders a single `RemoveAccountDialog`. The `AccountCard` doc comment drops the "until 2.2" note.
- **Focus:** after a successful removal the opener (the Remove button) is gone, so focus moves to the page's `h1` (`tabIndex={-1}`) instead of being lost to `body`. Cancel returns focus to the Remove button, which `Modal` already does.

**Never:** No undo, no toast, no Account Details removal flow (2.4), no transaction removal (2.3), no new qk keys, and no direct `invalidateQueries` calls outside `applyInvalidation`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Confirm | seed, remove `acc_2` | 4 cards remain; summary 24039900 − 2505600 = 21534300; storage holds no `acc_2` | N/A |
| Reload after remove | new adapter over the same storage | `acc_2` stays absent | N/A |
| Cancel / Esc / X | dialog open | no call to `removeAccount`; 5 cards | N/A |
| Unknown id | `removeAccount('nope')` | resolves; state unchanged | N/A |
| Write fails | storage `setItem` throws quota | rejects `STORAGE_FULL`; memory + storage still hold the account; dialog shows the message | inline alert, retry possible |
| Last account | remove the only account | "No accounts yet."; summary 0 | N/A |

</frozen-after-approval>

## Code Map

- `src/api/port.ts` -- add `removeAccount` to `FinbankApi` and `FINBANK_API_METHODS`.
- `src/api/http/httpApi.ts` -- add a `notImplemented('removeAccount')` stub. `httpApi.test.ts` iterates the method list automatically.
- `src/api/mock/mockApi.ts` -- `state()` / `current` cache plus `writeItem(storage, MOCK_STORAGE_KEY, …)`. Write first, then assign `current`. Follow the `call(() => …)` pattern.
- `src/api/queryKeys.ts` -- `invalidationMap` (all entries are `'all'` today); add the key-list entry. `applyInvalidation` already handles key lists in its last line. Update the "Widened on purpose" comment.
- `src/api/queryKeys.test.ts:20` -- this test pins the exact map, so update it. Add an `applyInvalidation(client,'removeAccount')` case that shows `accounts` and `balanceSummary` invalidated and `profile` untouched.
- `src/api/hooks/useLogout.ts` -- the mutation-hook template for `useRemoveAccount.ts`.
- `src/ui/ConfirmDialog.tsx` (+ `ConfirmDialog.test.tsx`) -- add the `error` prop and a test for it.
- `src/features/balances/components/AccountCard.tsx` -- `onRemove` is already wired to the Remove button. Change only the comment.
- `src/features/balances/BalancesPage.tsx` / `BalancesPage.test.tsx` -- add the dialog state. The page test uses a hand-built `api` object, so extend it with `removeAccount`.
- `src/features/balances/index.ts` -- export `RemoveAccountDialog`.

## Tasks & Acceptance

**Execution:**
- [x] `src/api/port.ts`, `http/httpApi.ts`, `queryKeys.ts`, `queryKeys.test.ts` -- port method, stub, invalidation entry, and its tests.
- [x] `src/api/mock/mockApi.ts`, `mockApi.test.ts` -- `removeAccount`, with tests for every adapter row of the matrix (confirm, reload, unknown id, write fails, last account).
- [x] `src/api/hooks/useRemoveAccount.ts` (+ a case in `hooks.test.tsx`) -- after success, `accounts` and `balanceSummary` refetch.
- [x] `src/ui/ConfirmDialog.tsx`, `ConfirmDialog.test.tsx` -- the `error` prop.
- [x] `src/features/balances/components/RemoveAccountDialog.tsx`, `BalancesPage.tsx`, `index.ts`, `AccountCard.tsx` -- the flow.
- [x] `src/features/balances/BalancesPage.test.tsx` -- dialog names the account; cancel leaves 5 cards and no call; confirm removes the card; failure shows the alert and keeps the dialog open; focus lands on the h1 after removal.

**Acceptance Criteria:**
- Given a signed-in user on `/balances` (real route table, `renderAt`), when they remove Checking and confirm, then its card disappears, and a fresh adapter over the same `localStorage` lists 4 accounts.
- Given the dialog is open, when it renders, then the dim covers only the content area and the sidebar and top bar are inert (existing `Modal` behaviour, unchanged).

## Implementation Notes

- **Error reset:** `RemoveAccountDialog` resets the mutation in an effect on every open, and also on Cancel, so a reopened dialog never flashes the previous error for a frame before the effect runs.
- **Focus after removal:** `onRemoved` focuses the `h1` before `onClose`. By then the refetch has already dropped the card, so `Modal`'s cleanup finds the opener disconnected and leaves focus on the title.
- **Acceptance test:** `src/app/router.test.tsx` covers the real-route removal, persistence for a fresh adapter, and the inert chrome while the dialog is open.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | verification-gap | `pending={removal.isPending}` wiring is untested | medium | Pre-verified: every fake settles at once. patch: a deferred-promise test (disabled buttons, Esc ignored, a double click makes one call). |
| 2 | blind | No pending-state test for the remove flow | medium | Same root cause as #1, fixed by the same patch. |
| 3 | blind | Double-confirm is not guarded | medium | Confirmed during patching: TanStack notifies `isPending` asynchronously, so two back-to-back clicks both reach `mutate`. A real backend could 404 on the second call. patch: a synchronous in-flight ref guard plus a back-to-back click test. |
| 4 | blind | Focus drops to `<body>` when Confirm is disabled while pending | medium | Real: a disabled focused button loses focus. This is `ConfirmDialog`'s pending behaviour from Story 1.9, first exercised here. defer. |
| 5 | edge-case | A refetch failure after a successful remove leaves the card shown | low | Mock reads never fail. Rejected: unreachable, and the fix adds an optimistic cache write. |
| 6 | edge-case | A hanging refetch leaves the dialog stuck pending | low | Mock reads resolve after the fixed delay. Rejected: unreachable. |
| 7 | edge-case | An empty error message shows no alert | false | Every `removeAccount` rejection is an `ApiError` with fixed non-empty copy (`call()` wraps the rest). |
| 8 | blind | Error resets only on open, not when the account changes while open | low | No caller swaps the account while the dialog is open. Rejected. |
| 9 | blind | Message clears before the dialog finishes closing | false | `Modal` returns null as soon as `open` is false; there is no exit transition. |
| 10 | blind | Raw or developer error text could reach users | false | The mock emits only user copy. The http stub is never composed in mock mode. |
| 11 | blind | Removing the last account hides Add Accounts | low | Carried from 2.1 triage #6. Add Accounts is inert, so no capability is lost. Rejected. |
| 12 | blind | Per-account cached data is not dropped for the removed id | false | No per-account query exists yet. 2.3 adds transactions to the map, and 2.4 navigates before removing (AD-13). |
| 13 | blind | Unknown-id test does not prove there was no write | low | Confirmed: it checks only the result. patch: assert the raw storage is unchanged. |
| 14 | blind | Invalidation and hook tests are weaker than their names | low | `profile` untouched plus the cache read right after `mutateAsync` already pin the behaviour. Rejected: more assertions add little. |

## Verification

**Commands:**
- `npm run typecheck` -- no errors
- `npm run lint` -- no errors
- `npm test` -- all suites pass
- `npm run build` -- succeeds

**Manual checks:**
- `npm run dev`: remove an account on `/balances`, reload, and confirm it stays gone. Clearing `localStorage` restores the seed.
