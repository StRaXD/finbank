- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-the-project-with-the-agreed-starter-and-tooling.md`
  summary: Lint-enforce the AD-1 sub-rule that features import other features only through their `index.ts`.
  evidence: With relative imports and no path alias, oxlint `no-restricted-imports` cannot tell cross-feature deep imports apart from in-feature imports by import string; needs an alias or a custom check.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-app-shell-sidebar-top-bar-user-block-and-logout.md`
  summary: After logout, `RequireSession`'s still-mounted `useToday` refetches today while signed out, so `today` stays cached. The fix gates it on the session.
  evidence: A probe in Story 1.8 review counted one `getToday` call after logout. Harmless with the mock; a real http adapter would get an unauthenticated request.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-app-shell-sidebar-top-bar-user-block-and-logout.md`
  summary: Story 1.9's Modal overlay must stay viewport-bounded (sticky or fixed within the content column), not `absolute inset-0` over the full scroll height of `<main>`.
  evidence: Unverified (medium if true). `#content-overlay-root` is an unpositioned child of `relative` `<main>`. Settle it by rendering a Modal on a page taller than the viewport.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-9-card-async-states-modal-and-confirmdialog-primitives.md`
  summary: `Modal` without a `title` has no accessible name. Add an `aria-label`-style prop when Epic 4 builds the untitled form modals (Adjust Savings Goal, Adjust Category Limit).
  evidence: `aria-labelledby` is set only when `title` is given. The design's form modals (110.1/110.2) show no visible heading.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-remove-an-account-from-balances.md`
  summary: `ConfirmDialog` disables the focused Confirm button while `pending`, so keyboard focus drops to `<body>`. Keep focus inside the dialog (e.g. `aria-disabled` instead of `disabled`, or refocus Confirm or the error when pending ends).
  evidence: A disabled focused element loses focus in browsers. Story 2.2's remove flow is the first real pending caller, and after a failed removal the alert appears with focus outside the modal.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-5-upcoming-bills-page.md`
  summary: The Adobe brand red `--color-brand-adobe` (#E73D1C) is about 4.1:1 on white, below WCAG AA for the 16px vendor name in `BillList`'s compact variant. Decide in Story 2.7, which first renders it, whether to darken the token for small text or render the compact name in ink.
  evidence: 4.1:1 passes only as large text. The 108 table name is 24px, but the compact row uses `text-16 font-medium`.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-5-upcoming-bills-page.md`
  summary: The mock adapter rewrites `finbank:mock:v1` on every load, because `normalizeAccount` (Story 2.1) emits `network` after `balanceCents` while the seed stores it before `accountNumber`, so the normalized JSON never equals the stored JSON.
  evidence: A clean seed should round-trip with `dirty: false`. The 2.5 "does not rewrite clean stored bills" test has to trim the accounts that carry a network to avoid it. Fix by emitting the keys in seed order.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-7-overview-upcoming-bill-and-recent-transaction-widgets.md`
  summary: The `--color-faint` text token (#9F9F9F) is about 2.6:1 on white, below WCAG AA, and is used for secondary text on Bills (Last Charge, descriptions), Transactions and elsewhere. Story 2.7 moved only its own compact "Last Charge" line to `text-muted`. Decide design-wide whether to darken the token or switch those uses, and add a contrast test for text tokens on white.
  evidence: Computed contrast of #9F9F9F on #FFFFFF is about 2.6:1. Story 2.7 resolved the earlier Adobe red item (now #EB1000, 4.56:1, tested).

## Deferred from: code review of epic-2-context.md (Epic 2 final review, 2026-11-17)
- source_spec: `_bmad-output/implementation-artifacts/epic-2-final-review.md`
  summary: The Load More fallback message "Could not load more transactions." for an empty error message is untested (`TransactionList.tsx:172`).
  evidence: The only failure test uses a non-empty `ApiError` message. Adapters always send copy today.
- source_spec: `_bmad-output/implementation-artifacts/epic-2-final-review.md`
  summary: No page sets `document.title` (WCAG 2.4.2 Page Titled). Every screen is announced under the same static title.
  evidence: Pre-existing from the Epic 1 routing. None of Overview, Balances, Account Details, Transactions or Bills updates the title.
- source_spec: `_bmad-output/implementation-artifacts/epic-2-final-review.md`
  summary: Stored expenses without a `category` pass `normalizeTransaction`. Epic 3 must decide whether category totals require a category.
  evidence: The Epic 2 contract makes `category` optional. The seed tags every expense.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-expenses-comparison-bar-chart-with-the-monthly-weekly-selector.md`
  summary: Weekly comparison bars are only a few pixels tall, because the seed's daily spending in 7–20 May 2023 ($0–$300) sits far below the first $2k tick of the shared bar scale.
  evidence: Seen in the 3.2 visual check (expenses-weekly.png). FR-14 mandates the same scale, so the fix is seed data for those two weeks, which also changes Story 3.1's approved May/April totals. Decide this in Story 3.3, where Weekly is the Overview default, against 104. Overview.png.
