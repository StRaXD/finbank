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

- source_spec: `_bmad-output/implementation-artifacts/epic-3-final-review.md`
  summary: The production JS chunk grew from 578 kB to 922 kB (281 kB gzip), mostly recharts. Reduce it before release with a lighter chart import or a `manualChunks` vendor split.
  evidence: `npm run build` at 1835516. Overview renders the chart on first load, so lazy route splitting alone would not shrink the initial download.

- source_spec: `_bmad-output/implementation-artifacts/epic-3-final-review.md`
  summary: Move the `YYYY-MM` and `YYYY-MM-DD` string construction in `comparisonSeries` (mockApi.ts) and the seed history (seedTransactions.ts) into `lib/dates.ts` helpers, such as the months of a year and the first day of a month.
  evidence: The Acceptance Auditor flagged template-literal date building outside `dates.ts`, against AD-9. The values are already validated by `toYearMonth`/`toIsoDate`, so behaviour is correct.

- source_spec: `_bmad-output/implementation-artifacts/epic-4-final-review.md`
  summary: The Goals Adjust modals (`GoalModalForm`) disable the focused Save button while a save is pending, so keyboard focus drops to `<body>`. This is the same pattern as the ConfirmDialog item above (spec 2.2); fix both together (`aria-disabled` instead of `disabled`, or refocus Save or the alert when pending ends).
  evidence: Acceptance Auditor D10. `goalModalForm.tsx` renders `<Button disabled={pending}>`. Each save is pending for about 200ms with the mock.

- source_spec: `_bmad-output/implementation-artifacts/epic-4-final-review.md`
  summary: The production JS chunk is now 986 kB (296 kB gzip), up from 922 kB at Epic 3, after Epic 4's area chart and Goals screens. This adds to the bundle-size item above.
  evidence: `npm run build` at 96c1570.

- source_spec: `_bmad-output/implementation-artifacts/epic-4-final-review.md`
  summary: `showSubmitError` in `features/goals/components/goalModalForm.tsx` duplicates the logic of `features/auth/applyApiError.ts` (map `ApiError.fieldErrors` onto form fields, otherwise one root message). Move one shared helper to a layer both features may import, and test it once.
  evidence: Verification Gap reviewer (chunk 2). Features may not import each other's internals (AD-1), so the goals copy was written locally. Only the mapped keys are reachable today.

- source_spec: `_bmad-output/implementation-artifacts/epic-4-final-review.md`
  summary: Resolved: the spec-1-9 item above ("`Modal` without a `title` has no accessible name") was fixed by Story 4.2's `Modal` `label` prop (rendered as `aria-label`). Both Adjust modals are named, e.g. "Adjust savings goal" and "Adjust Food limit".
  evidence: `src/ui/Modal.tsx` `label`; `Modal.test.tsx` "takes its accessible name from label when there is no title".
- source_spec: `_bmad-output/implementation-artifacts/spec-5-1-settings-tabs-and-the-profile-form.md`
  summary: Consolidate the three copies of the ApiError fieldErrors → setError mapping (auth `applyApiError`, goals `showSubmitError`, settings `ProfileForm`) into one tested shared helper, and cover the unmapped/mixed-key branch for the settings form.
  evidence: The verification-gap review found the unmapped/mixed `fieldErrors` branch in `ProfileForm.showSubmitError` is untested, and only the auth copy has tests. It is unreachable today, because the mock emits only the five known keys and the http adapter is `notImplemented`. The copies can drift once a real adapter arrives.

- source_spec: `_bmad-output/implementation-artifacts/spec-5-2-profile-picture-upload.md`
  summary: Add a mock adapter test, or a write queue, proving `updateProfile` re-reads state after the async avatar encode, so a write committed during the encode is not overwritten.
  evidence: The verification-gap review found that moving `const prev = state()` above the encode would bring back a lost update, and no test would fail. It is only reachable when another mutation hits the same adapter instance during a real-browser encode. The cost is unverified, but would be medium.

- source_spec: `_bmad-output/implementation-artifacts/spec-5-3-change-password.md`
  summary: `PasswordForm.showSubmitError` is a fourth copy of the fieldErrors → setError mapping, and its unknown-key branch is untested. Fold it into the shared helper proposed under the Story 5.1 deferral.
  evidence: The verification-gap review found that deleting `unmapped.push` would not fail any test. It is unreachable today, because the mock emits only `oldPassword`, `newPassword` and `confirmPassword` and the http adapter is `notImplemented`.

- source_spec: `_bmad-output/implementation-artifacts/epic-5-final-review.md`
  summary: Add a ProfileForm test that a submit fired while `updateProfile` is pending is ignored (`updateProfile` called once), mirroring PasswordForm's "ignores a second submit while the change is in flight".
  evidence: The verification-gap review (chunk 2) found that deleting ProfileForm's `if (busy)` guard fails no test. Low exposure: the disabled submit button already blocks clicks and implicit Enter; only scripted or assistive-tech submit paths reach it.

- source_spec: `_bmad-output/implementation-artifacts/epic-5-final-review.md`
  summary: Cap the decoded pixel area of a picked avatar (or decode with `resizeWidth`/`resizeHeight`) so a small, highly compressed image with huge dimensions cannot exhaust memory in `downscaleToJpegDataUrl`.
  evidence: Raised by the edge-case and general reviewers in Story 5.2 and again in the final review. A 5 MB PNG of 20000×20000 decodes to about 1.6 GB before the 256px downscale. Rare (it needs a crafted or unusual file), but a crash rather than an inline error. Unverified in a browser.

- source_spec: `_bmad-output/implementation-artifacts/epic-5-final-review.md`
  summary: Two items carried forward. The production JS chunk is now 999 kB (300 kB gzip), up from 986 kB at Epic 4, which adds to the existing bundle-size item. The `fieldErrors` → `setError` mapping now has four copies (auth, goals, ProfileForm, PasswordForm), which adds to the shared-helper deferrals from Stories 5.1 and 5.3.
  evidence: `npm run build` output at `81e965b`. The final review's blind hunter (chunk 2) and verification-gap layers. The 5.2 deferral "re-read of state after the async encode is untested" is resolved by the final-review test "does not overwrite a write made while the avatar is being encoded".

## Updates from: Story 6.1 (Add Accounts, 2026-11-18)
- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-add-accounts.md`
  summary: Resolved: the spec-2-5 item above ("The mock adapter rewrites `finbank:mock:v1` on every load", line 20) was already fixed (`normalizeAccount` emits the keys in seed order). Story 6.1 keeps it fixed for created and updated accounts, and for the new `nextAccountNumber` key.
  evidence: `mockApi.test.ts` "does not rewrite clean stored accounts, including card accounts with a network, on load", "does not rewrite storage on a reload after a create" and "… after an update".
- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-add-accounts.md`
  summary: Resolved: the epic-4 item above ("The Goals Adjust modals (`GoalModalForm`) disable the focused Save button while a save is pending", line 50). The shared `ui/FormModal.tsx` Save is `aria-disabled` while saving, so focus stays on it inside the modal; both Goals modals and the Account modal use it. The ConfirmDialog half (spec 2.2) is still open.
  evidence: `FormModal.test.tsx` "reads "Saving…" on an aria-disabled Save that keeps focus …"; the Goals tests now assert `aria-disabled` instead of `toBeDisabled()`.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-add-accounts.md`
  summary: Partly addressed, still open: the fieldErrors → setError copies (lines 58, 65 and 73). The goals copy moved into the shared, tested `ui/mapApiFieldErrors.ts` (used by every `FormModalForm`); the non-modal copies in auth `applyApiError`, `ProfileForm` and `PasswordForm` remain and can adopt the helper later.
  evidence: `src/ui/mapApiFieldErrors.ts` (+ `mapApiFieldErrors.test.ts`, including the unmapped/mixed-key branch). `goalModalForm.tsx` was deleted.

- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-add-accounts.md`
  summary: Before Story 6.2 or 6.3 exposes edits, decide whether `updateAccount` should tolerate unchanged legacy values. Stored accounts are normalised more loosely (4+ digits, no 60-character or uniqueness check) than the create/update rules, so editing such an account would fail on a field the user didn't touch.
  evidence: Raised by the blind and edge-case reviewers in Story 6.1. The seed accounts satisfy every rule, so only corrupt or legacy local data is affected.
