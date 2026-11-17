# Epic 1 final review

- **Date:** 2026-11-17
- **Target:** `feat/epic-1-foundation` vs `origin/main`, excluding `.claude/`, `_bmad/`, `_bmad-output/` and `package-lock.json`. 122 files, +7,309 lines.
- **Mode:** full, against `epic-1-context.md`.
- **Chunks:**
  1. `src/lib`, `src/api`, `src/styles`, `src/assets` and root config.
  2. `src/ui`, `src/app` and `src/features`.
- **Layers per chunk:** Blind Hunter, Edge Case Hunter, Verification Gap and Acceptance Auditor (8 runs). No layer failed.

## Verification at review time (HEAD `73c74a8`)

| Check | Result |
|---|---|
| `npm run lint` (oxlint `--deny-warnings`) | pass |
| `npx tsc -b` | pass |
| `npm test` | 49 files; 1646 passed, 6 skipped (TZ-specific `skipIf`) |
| `npm run test:tz` | 15 files; 1031 passed, 4 skipped (UTC, LA, Kiritimati, Santiago, Kolkata) |
| `npm run build` | pass. Pre-existing >500 kB chunk warning (528 kB, 165 kB gzip). |

## Review Findings

### Decision needed (resolved)
- [x] [Review][Decision] **"Continue with Google" ignores "Keep me signed in".** Resolved: fixed. The port is now `loginWithGoogle({ persistent })` (`GoogleLoginInput` in `api/types.ts`); Login passes the checkbox value and Signup (no checkbox) passes `persistent: true`.
- [x] [Review][Decision] **Deep link lost at sign-in.** Resolved: kept as is per human decision. Sign-in always goes to Overview (frozen FR1 text).
- [x] [Review][Decision] **No route error screen.** Resolved: added `src/app/RouteError.tsx` ("Something went wrong", a muted reload hint and a primary "Reload" button) as the `errorElement` of every top-level route.

### Patch
- [x] [Review][Patch] Add a test that a failed background refetch of today keeps the app and the top-bar date [src/app/router.test.tsx]. A verification gap: reordering the guard to check `isError` first would blank the app with no test failing.
- [x] [Review][Patch] Add `.ts`-suffixed `api/types` probes for `ui` (one type import that passes, one value import that fails) [src/lint-boundaries.node.test.ts]. A verification gap: every repo import uses `.ts`, and the probes test only extensionless specifiers.
- [x] [Review][Patch] `useRequestPasswordReset` keeps the email in the mutation cache. Set `gcTime: 0` like the other credential hooks and add it to the test table [src/api/hooks/useRequestPasswordReset.ts].
- [x] [Review][Patch] Forgot Password: editing the email while the request is pending still shows "Check your email…" afterwards. Also reset on edit while pending [src/features/auth/ForgotPasswordPage.tsx:70].
- [x] [Review][Patch] The today-failure screen shows an empty alert for a blank message, and Retry is not disabled while refetching. Add the shared fallback and `disabled={today.isFetching}` [src/app/RequireSession.tsx:21].
- [x] [Review][Patch] The `maskAccountNumber` error message echoes the raw input, for example a hyphenated full account number. Drop the value from the message [src/lib/format.ts:109].
- [x] [Review][Patch] The `tokens.css` header names `src/design-literals.test.ts`. The file is `design-literals.node.test.ts` [src/styles/tokens.css:4].

### Defer
- [x] [Review][Defer] `Modal` without `title` has no accessible name [src/ui/Modal.tsx]. Already deferred from Story 1.9, for Epic 4's untitled form modals.
- [x] [Review][Defer] Features importing other features only through `index.ts` is not lint-enforced [.oxlintrc.json]. Already deferred from Story 1.1; needs a path alias or a custom check.
- [x] [Review][Defer] Today is refetched once after logout [src/app/RequireSession.tsx]. Already deferred from Story 1.8.

### Rejected

**Human-approved or measured deviations from `epic-1-context.md`:**
- `surface` is #F4F5F7, not #F3F3F3. Human decision, 2026-11-17.
- The on-dark hover and divider values, and `on-dark-soft`, follow the PNG measurements. Human decision, 2026-11-17.
- Sidebar 280px and auth column 400px. Measured from the PNGs ("about 270/385" were estimates).
- Forgot Password subtitle `leading-6.5`. Measured from the PNG; recorded in 1.7.
- `IsoDate`/`YearMonth` live in `lib/dates.ts` and are re-exported from `api/types.ts`. Frozen in 1.4, because AD-1 forbids `lib` importing `api`.
- `@fontsource-variable/inter` dependency. Human decision in 1.2 (self-host).
- oxlint `^1.90.0`. The context doc itself specifies the caret. Node engines vs `.nvmrc` are as specified.

**False:**
- `text-white`/`bg-white` bypass tokens. False: `--color-white` is a token in `tokens.css`.
- The `mockApi` write-back comment promises a non-existent retry. False: every mock-state write persists the whole state, so the next write does retry.
- `error.message` non-string crashes `AsyncSection`. False: it is typed, and adapters throw only `ApiError`.

**Low and unlikely, or the fix adds complexity:**
- Already triaged in their stories:
  - nested-modal Esc;
  - focus return to inert-chrome openers;
  - page content not inert for AT;
  - loose focusable selector;
  - X enabled while pending;
  - scroll under the dim;
  - avatar `onError`;
  - logout failure feedback;
  - session read failure treated as signed out;
  - cross-tab session sync;
  - storage `removeItem` throwing;
  - profile and today readable without a session (no `UNAUTHORIZED`);
  - signup password rules;
  - whitespace-only password (the mock rejects it as a field error);
  - `formatCompact` ≥ $1B;
  - rounding near `MAX_SAFE_INTEGER`;
  - year 0001/9999 overflow in `dates`;
  - `tail4` on 4-digit input;
  - a disabled or paused query shows the skeleton forever;
  - `Skeleton` NaN and empty Card/Modal titles.
- `ApiError` has no `cause` (adds API surface). `VITE_API_MODE` typing and whitespace or case tolerance.
- Root-absolute or alias imports bypass the boundary regexes (no alias configured).
- `applyInvalidation` key-list branch untested (unreachable in Epic 1). `options.session` ignored for key-list targets (unreachable).
- Login waits for the refetch of mounted queries (about 200 ms with the mock).
- `build-output` test restores `NODE_ENV` as `'undefined'` (vitest always sets it). The build runs on every `npm test` (about 1s, intended).
- Import-extension style, feature-folder layout and one-component-per-file nits (`OpenModal`, `OverlaySpecimen`).
- `AsyncSection` requires `emptyMessage` without `isEmpty`. `aria-busy` with no live region.
- `ui`/`features` import from `assets/brands` (not banned by AD-1 lint; assets are a layer).
- SVG wordmark and avatar colours not scanned (measured assets).
- Lint exemption covers `format.ts` for `Date`.
- Search accepts typing (decided in 1.8). Terms link cursor.
- `Button` has no loading state. No `document.title` per route. Fixed desktop widths (PRD desktop ≥ 1280px).
- No favicon. `accountDetails('.')`.

## Fixes applied (2026-11-17)

All seven patches and the two code-changing decisions are applied on `feat/epic-1-foundation` (uncommitted).

- Google honours "Keep me signed in": `src/api/types.ts`, `src/api/port.ts`, `src/api/mock/mockApi.ts`, `src/api/hooks/useLoginWithGoogle.ts`, `src/features/auth/LoginPage.tsx`, `src/features/auth/SignupPage.tsx`. The http stub needed no change (its stubs take any arguments).
- Route error screen: `src/app/RouteError.tsx` (new), `src/app/routeObjects.tsx`.
- Patches: `src/api/hooks/useRequestPasswordReset.ts`, `src/features/auth/ForgotPasswordPage.tsx`, `src/app/RequireSession.tsx`, `src/lib/format.ts`, `src/styles/tokens.css`.
- Tests: `src/app/router.test.tsx`, `src/lint-boundaries.node.test.ts`, `src/api/hooks/hooks.test.tsx`, `src/api/mock/mockApi.test.ts`, `src/app/login.test.tsx`, `src/app/signup.test.tsx`, `src/app/forgot-password.test.tsx`, `src/lib/format.test.ts`.
- Note: `disabled={today.isFetching}` on the today Retry is defensive. TanStack Query returns a data-less query to `pending` while it refetches, so the busy screen replaces the alert; the test asserts no enabled Retry is offered during the refetch.
- Verification: `npm run lint` pass; `npx tsc -b` pass; `npm test` 49 files, 1662 passed, 6 skipped; `npm run test:tz` 15 files, 1036 passed, 4 skipped; `npm run build` pass (same pre-existing 528 kB chunk warning).
