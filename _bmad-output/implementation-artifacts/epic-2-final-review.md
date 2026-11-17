# Epic 2 final review

- **Date:** 2026-11-17
- **Target:** `feat/epic-2` vs `main` (`330d191..ac5f40e`, stories 2.1–2.7 plus fixes `2abe8a2` and `55070f3`), excluding `.claude/`, `_bmad/`, `_bmad-output/` and `package-lock.json`. 69 files, +5,234 / −60 lines.
- **Mode:** full, against `epic-2-context.md`.
- **Chunks:**
  1. `src/api`, `src/lib`, `src/styles` and `src/assets` (2,000 diff lines).
  2. `src/ui`, `src/app` and `src/features` (4,137 diff lines).
- **Layers per chunk:** Blind Hunter, Edge Case Hunter, Verification Gap and Acceptance Auditor (8 runs). No layer failed.

## Verification at review time (HEAD `ac5f40e`)

| Check | Result |
|---|---|
| `npm run lint` (oxlint `--deny-warnings`) | pass |
| `npx tsc -b` | pass |
| `npm test` | 60 files; 1877 passed, 6 skipped (TZ-specific `skipIf`) |
| `npm run test:tz` | 15 files; 1046 passed, 4 skipped |
| `npm run build` | pass. Pre-existing >500 kB chunk warning (578 kB, 179 kB gzip). |

## Cross-screen consistency (1440×1024, fresh seed)

All five screens read one mock state through the shared hooks, and the same record shows the same values everywhere.

- **Credit Card (`acc_1`):**
  - **Balances:** `$12,000`, `338 845 568 860****`.
  - **Account Details:** `$12,000.00` and the same mask. Its history (GTR 5 $160.00 … Groceries $45.20, all "Debit") equals the Credit Card rows on Transactions ("Credit Card" payment method).
  - **Overview carousel:** `$12,000`, `**** **** **** 2598`.
- **Total Balance:** `$240,399` = 25,056 + 180,000 + 75,343 − 12,000 − 28,000, derived by the adapter.
- **Bills:** the Figma and Adobe rows are identical on `/bills` and the Overview widget (due date, last charge, amount).
- **Transactions:** the first five Overview rows (All and Revenue) equal the first rows on `/transactions`.
- **Removal:** removing Checking removes its card, its carousel slide, its transactions on every screen, and updates the total to `$215,343`. This is pinned by real-route tests in `src/app/router.test.tsx`.

## Architecture and planning updates made during this review

- **AD-13 (`ARCHITECTURE-SPINE.md`):** now states that removing from Account Details stays on the page while the mutation runs, replaces the route with `/balances` only on success, and keeps the user on the page with the error on failure. The superseded "navigate first" rule is noted.
- **Other docs:** `epic-2-context.md` and the two matching lines in `epics.md` were aligned.

## Review Findings

All decisions resolved and every patch applied (verified: lint, `tsc -b`, `npm test` 61 files 1890 passed / 6 skipped, `test:tz` 1046 passed / 4 skipped, build).

### Decision needed (resolved)
- [x] [Review][Decision] **Grey text tokens fail WCAG AA contrast.** Resolved: `--color-subtle` is now #707070 (4.95:1 on white, 4.54:1 on the page grey). Every text use of `faint` moved to `subtle`; `faint` is kept only for disabled states. A token contrast test and a `faint-text` usage guard test were added.
  - `--color-faint` (#9F9F9F) is 2.65:1 on white and 2.43:1 on the page grey. It is used for the top-bar date, bill descriptions and last charge, the search placeholder and auth helper text.
  - `--color-subtle` (#878787) is 3.59:1 on white and 3.29:1 on the page grey. It is used for section titles (22px, which is not "large text"), field labels and the date-badge month.
  - Both are design tokens from Epic 1. See the proposal in the chat summary.
- [x] [Review][Decision] **Code follows Figma where `epic-2-context.md` paraphrased differently.** Resolved: `epic-2-context.md` was updated to record the Figma-faithful behaviour. Either update the context file to match, or leave it as is.
  - "View All" is grey text (104), not teal.
  - The Transactions table icons have no grey square (107); only the Overview rows do (104).
  - "Edit Accounts" is grey text (105).
  - `TransactionList` has a third `history` variant for 106's different columns.

### Patch
- [x] [Review][Patch] Loading a clean seed rewrites storage on every adapter load. `normalizeAccount` emits `network` after `balanceCents`, while the seed stores it after `branchName`. Probe: one write on a clean seed load. [src/api/mock/mockApi.ts normalizeAccount]
- [x] [Review][Patch] `Tabs` swallows Alt/Ctrl/Meta/Shift+Arrow, Home and End (for example Alt+Left to go back). It needs the same modifier guard `Carousel` got in 2.6. [src/ui/Tabs.tsx onKeyDown]
- [x] [Review][Patch] Keyboard focus drops to `<body>` when Load More fetches the last page and unmounts while focused. [src/ui/LoadMore.tsx, src/features/transactions/components/TransactionList.tsx]
- [x] [Review][Patch] After removing an account from Account Details, focus lands on `<body>` on Balances. Focus the Balances heading on arrival, as the in-page removal already does. [src/features/balances/AccountDetailsPage.tsx, BalancesPage.tsx]
- [x] [Review][Patch] The router test's Load More loop is uncapped and would hang rather than fail. [src/app/router.test.tsx ~189]
- [x] [Review][Patch] `setItem` spies in `mockApi.test.ts` are restored inline, so a failing assertion leaks a throwing spy into later tests. Restore them in `afterEach`. [src/api/mock/mockApi.test.ts]
- [x] [Review][Patch] `BalanceSummary.totalBalanceCents` can be negative (liabilities above assets), but neither the type nor the port says so. [src/api/types.ts, src/api/port.ts]

### Defer
- [x] [Review][Defer] Load More's "Could not load more transactions." fallback for an empty error message is untested [src/features/transactions/components/TransactionList.tsx:172] — deferred: adapters always send copy today. The verification layer filed it as defer.
- [x] [Review][Defer] Pages never set `document.title` (WCAG 2.4.2) [src/app] — deferred: pre-existing from Epic 1 routing. It applies to every screen.
- [x] [Review][Defer] Stored expenses without a `category` pass validation [src/api/mock/mockApi.ts normalizeTransaction] — deferred: the Epic 2 contract makes `category` optional. Epic 3 must decide whether category totals require it.

### Rejected
- `false` — Account Details flashes "Account not found" or "No transactions yet." during a removal: a probe added both checks to the no-flash test and it still passed. TanStack notifies query updates on a later tick, after the success navigation has started, and `loaded ?? removing` guards it anyway.
- `false` — `type` is stored lowercase: the UI renders "Credit"/"Debit" (106 screenshot).
- `false` — The Google logo is not a brand asset: `src/assets/brands/google.svg` exists from Epic 1.
- `false` — The Adobe colour departs from 108: an intentional, user-directed AA fix (#EB1000, 4.56:1, tested).
- `false` — The receipt ids could collide: a probe found 79 of 79 unique.
- `false` — Icon, logo or network values outside their unions crash rendering, and short account numbers make the mask throw: the mock normalizers reject these values, and the http adapter is a stub.
- `false` — Offset cursors skip or repeat rows: removal invalidation refetches from page 1, and the mock is not shared across tabs mid-session.
- `false` — `useAccount('')`: the route always supplies a non-empty id.
- `false` — Inert Add/Edit/Edit Details buttons: the frozen intent requires them inert (FR-16, FR-18).
- `false` — Revenue and expense look the same: required by FR-34 and the designs.
- `false` — "Recent Transaction" as the Transactions page title: it is 107's title.
- `false` — The carousel dots are below 24px: WCAG 2.5.8's "equivalent" exception applies (Previous and Next).
- `false` — The greeting uses an exact path match: `/` is the only Overview route.
- `false` — There are no responsive breakpoints: the target is desktop-only at 1440×1024 (NFR-2).
- `false` — Raw adapter errors are shown: the adapter only emits user-facing copy.
- `low` — The `qk.account` prefix mixes entry shapes (documented in the comment), duplicated normalize/limit helpers, `network` is allowed on any account type, `accountId` is not validated, and the bill date invariants and past-due bills are not enforced: each is reachable only through hand-edited storage, or is a developer convenience whose fix adds code.
- `low` — Tab panel labelling, duplicated tab definitions, tab not in the URL, and no Overview tab keyboard test: carried over from earlier triage. `Tabs` is covered by its own tests.
- `low` — Two same-type accounts are indistinguishable to screen readers: the seed has one of each type and accounts cannot be added.
- `low` — The `text` variant has no `aria-disabled` styling, and `BUTTON_HOVER_GATE` is test-only: no text button is ever `aria-disabled`.
- `low` — `DateBadge` says "Due" and omits the year: bills are the only consumer.
- `low` — Load More has no live-region announcement, there is no success toast after a removal, and the total is unchecked for overflow: not designed, or unreachable.
- `low` — Hand-styled grey buttons and the Prettier formatting of one line: cosmetic. Prettier is not enforced.
