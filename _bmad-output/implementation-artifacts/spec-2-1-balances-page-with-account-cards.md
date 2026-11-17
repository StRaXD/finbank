---
title: 'Story 2.1: Balances page with account cards'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '6db0df45990555616e42cabdba58f20fadad416a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/balances` is a placeholder and the data layer has no accounts. Epic 2 (remove account, Account Details, the Overview carousel and total) needs accounts in the seed, the port and the hooks, plus a single `AccountCard` (FR-10, FR-16, FR-33, FR-35, AD-4, AD-5).

**Approach:** Add the `Account` type, five seeded accounts, and `listAccounts` / `getBalanceSummary` across the port, mock adapter, http stub, `qk` and hooks. Build `features/balances` with `BalancesPage` and `AccountCard`, and wire it to `/balances`.

## Boundaries & Constraints

**Always:**
- `Account` = `{ id, type: 'creditCard'|'checking'|'savings'|'investment'|'loan', bankName, branchName, network?: 'mastercard'|'visa', accountNumber (digits), balanceCents (non-negative) }`. Type labels: "Credit Card", "Checking", "Savings", "Investment", "Loan".
- The seed has five accounts in this order: Credit Card, Checking, Savings, Investment, Loan (`acc_1`…`acc_5`). Banks, networks and number prefixes follow the 105 design. Credit Card is Mastercard, its number ends in `2598` (the carousel), and its `bankName` is a real bank, "AB Bank Ltd.", shown like every other card (human decision: data consistency over the 105 "Master Card" header text). Checking is VISA, AB Bank Ltd., Park Street Branch, $25,056.00. Balances are chosen so the derived total is **$240,399** (the Overview design): Checking $25,056.00, Savings $180,000, Investment $75,343, Credit Card $12,000, Loan $28,000.
- `getBalanceSummary()` returns `{ totalBalanceCents }`, which is checking + savings + investment − credit card − loan, calculated from the current state. `listAccounts()` returns copies in stored order.
- The mock state gains an `accounts` key. Stored accounts that are not an array are replaced by the seed. Invalid entries are dropped. An empty array is kept, because the user may remove every account. `MOCK_STATE_VERSION` stays 1.
- `features/*` may not import `src/app`, so `BalancesPage` takes an `accountDetailsPath: (id) => string` prop (the same pattern as `AuthPaths`). `routeObjects` passes `routes.accountDetails`.
- Page: an `h1` "Balances" (page-title style, like the placeholder), then `AsyncSection` over `useAccounts()` (empty message "No accounts yet.") wrapping a 3-column grid. The grid holds one `AccountCard` per account, then the action card.
- `AccountCard` is a white card. Header row: the type (bold, subtle colour) on the left; on the right the bank name, plus the network logo from `assets/brands` when set. A divider follows. Then `maskAccountNumber(n,'groups')` above the label "Account Number", and `formatMoney(cents,'whole')` above the label "Total amount". The footer has a "Remove" text button (an inert no-op until 2.2, which supplies `onRemove`) and a primary sm "Details" link styled as a button with a `chevronRight`, linking to the details path. `AccountCard` is exported from `features/balances/index.ts`.
- The action card centres a primary "Add Accounts" button and an "Edit Accounts" text button. Both are inert.
- Measure spacing and typography from `design-reference/screens/105. Balances.png` (2880×2048 = 1440×1024 @2x), using existing tokens only.

**Never:** No remove dialog or mutation (2.2), Account Details content (2.4), carousel or total UI (2.6), `getAccount`/`removeAccount` (later stories), sign-coloured amounts, or hard-coded totals in components.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh seed | no stored state | 5 cards in seed order; summary 24039900 | N/A |
| Old v1 state without `accounts` | stored state lacking the key | backfilled from the seed and written back | N/A |
| All accounts removed | `accounts: []` stored | "No accounts yet." line; summary 0 | N/A |
| Corrupt accounts | `accounts: "x"` or entries missing fields | non-array → seed; bad entries dropped | N/A |
| Load failure | `listAccounts` rejects | AsyncSection alert + Retry | ApiError message |

</frozen-after-approval>

## Code Map

- `src/api/types.ts` -- add `AccountType`, `Account`, `BalanceSummary`.
- `src/api/port.ts` -- add both methods to `FinbankApi` and `FINBANK_API_METHODS` (the compile-time guard enforces this).
- `src/api/mock/seed.ts` -- `MockState.accounts` and the five seed accounts (frozen like `profile`).
- `src/api/mock/mockApi.ts` -- `normalizeAccounts` in `loadState` (pattern: `normalizeProfile`); the methods use `call(() => ...)` and return `structuredClone`.
- `src/api/http/httpApi.ts` -- `notImplemented` stubs. `httpApi.test.ts` iterates the method list automatically.
- `src/api/queryKeys.ts` -- `qk.accounts()`, `qk.balanceSummary()`. `invalidationMap` is unchanged (removeAccount arrives in 2.2).
- `src/api/hooks/useProfile.ts` -- template for `useAccounts.ts` / `useBalanceSummary.ts`.
- `src/ui/Card.tsx` -- its `p-6 rounded-card shadow-card` box is reusable via `<Card>` with no title. `Button`, `AsyncSection`, `icons.chevronRight` are reusable too.
- `src/lib/format.ts` -- `formatMoney`, `maskAccountNumber`. Do not reimplement them.
- `src/features/auth/index.ts` + `paths.ts` -- the pattern for the feature index and the path-props.
- `src/app/routeObjects.tsx:59` -- replace the Balances placeholder. Keep the Account Details placeholder.
- `src/app/router.test.tsx:44` -- expects an `h1` "Balances" on `/balances`. It must keep passing.

## Tasks & Acceptance

**Execution:**
- [x] `src/api/types.ts`, `port.ts`, `http/httpApi.ts`, `queryKeys.ts` -- types, port methods, stubs, keys -- the contract.
- [x] `src/api/mock/seed.ts`, `mockApi.ts` -- seed accounts, normalization, `listAccounts`, `getBalanceSummary` -- the data.
- [x] `src/api/mock/mockApi.test.ts` -- cover the I/O matrix rows (seed order, total 24039900, the assets-minus-liabilities sign rule with custom stored balances, backfill, empty, corrupt, copies not live state).
- [x] `src/api/hooks/useAccounts.ts`, `useBalanceSummary.ts` (+ a case in `hooks.test.tsx`) -- query hooks.
- [x] `src/features/balances/components/AccountCard.tsx`, `components/AddAccountsCard.tsx`, `BalancesPage.tsx`, `paths.ts`, `index.ts` -- the UI.
- [x] `src/features/balances/BalancesPage.test.tsx` -- renders 5 cards in order with type, bank, masked number, whole amount and logos. Details links go to the details path. Covers the empty and error states.
- [x] `src/app/routeObjects.tsx` -- route `/balances` to `BalancesPage` with `accountDetailsPath={routes.accountDetails}`.

**Acceptance Criteria:**
- Given a signed-in user, when they click "Details" on the Checking card, then the URL is `/balances/acc_2` and the Account Details placeholder shows, with Balances still active in the nav.
- Given `/balances` on the seed, when it renders at 1440×1024, then it matches `105. Balances.png` in layout, typography and colours, and the amounts show as "$25,056" style whole dollars.
- Given loading, when the query is pending, then a skeleton shows instead of the grid.

## Implementation Notes

- **Page title:** `text-22 font-normal text-subtle`, as measured from 105. The `text-24` placeholder style does not match the design.
- **Details link:** "Details" is a router `Link` that looks like a button. The class logic moved from `Button.tsx` into `src/ui/buttonStyles.ts` (`buttonClassName`, with an `asLink` option), and `Button`'s output is unchanged.
- **New UI files:** `NetworkLogo.tsx` and `accountTypeLabels.ts` (the labels are exported for later screens).
- **Known fidelity deltas:**
  - Details uses the `sm` size (86×32) against the design's ~110×36.
  - Add Accounts uses the `md` size (~160 wide against the design's 207).
  - Remove is semibold.
  - Masks use the shared 3-digit grouping.
  - "Edit Accounts" is a grey plain button.
- **Empty state:** with no accounts, the action card is hidden too, because the grid sits inside `AsyncSection`.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | verification-gap | `asLink` hover rewrite in `buttonStyles.ts` untested | medium | Pre-verified: no test reads the Details link's classes. patch: `buttonStyles.test.ts` covers every variant. |
| 2 | blind | `linkHover` duplicates the hover literals, so `.replace` can silently miss | low | Real drift risk for devs editing `variants`. patch: the test from #1 catches the drift. |
| 3 | edge-case | Signed total can exceed `MAX_SAFE_INTEGER` | low | Needs balances above $90 trillion in hand-edited storage; there is no edit UI. Rejected: unlikely, and the fix adds a guard. |
| 4 | edge-case | A `balanceCents` near `MAX_SAFE_INTEGER` misrounds in `formatMoney` | low | Same unreachable input as #3. Rejected. |
| 5 | edge-case | Stored `network: null` drops a valid account | low | The adapter never writes null, but a direct one-line correction exists. patch. |
| 6 | blind | Empty state hides the Add Accounts card | low | Add/Edit are inert per the intent, so no capability is lost. Rejected: it follows the frozen layout (grid inside `AsyncSection`). |
| 7 | blind | Five identical "Details"/"Remove" names for screen readers | medium | Confirmed: `AccountCard` gives no per-card context. patch: `aria-describedby={titleId}`. |
| 8 | blind | Remove/Add/Edit are clickable but inert | false | The frozen intent requires them inert until 2.2. |
| 9 | blind | Accounts and summary keys are not linked for invalidation | false | AD-7: `invalidationMap.removeAccount` lists both keys in 2.2; there is no mutation yet. |
| 10 | blind | Link keeps `disabled:` classes | false | `disabled:` variants never match an `<a>`, so there is no visual effect. |
| 11 | blind | Fixed 3-column grid is not responsive | false | Desktop-only 1440×1024 target; the design has no other breakpoints. |
| 12 | blind | `network` allowed on loan/savings; account number has no max length | low | Only reachable through hand-edited storage. Rejected: unlikely, and the fix adds validation branches. |
| 13 | blind | Whole-dollar card amounts may not add up to the total | false | FR-34 mandates whole rounding per figure, and the total is derived in cents (AD-5). |
| 14 | blind | Liabilities show no "owed" cue | false | The design and epic context say amounts carry no sign or colour. |
| 15 | blind | Round-trip test never reads the persisted accounts back | low | Confirmed: it asserts only `stored()`. patch: one assertion. |
| 16 | blind | No http stub tests for the new methods | false | `httpApi.test.ts` iterates `FINBANK_API_METHODS`, which includes both. |
| 17 | blind | No aria-busy or background-refetch test on the page | false | Covered by `AsyncSection.test.tsx`, which the page composes unchanged. |
| 18 | blind | Hand-written `seed` type exception | low | Developer-only; a `DeepReadonly` helper is more than a direct fix. Rejected. |

## Verification

**Commands:**
- `npm run typecheck` -- no errors
- `npm run lint` -- no errors (AD-1 boundaries)
- `npm test` -- all suites pass
- `npm run build` -- succeeds

**Manual checks:**
- `npm run dev`, sign in, open `/balances`, compare it side by side with `design-reference/screens/105. Balances.png`.
