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
