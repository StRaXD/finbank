---
title: 'Story 1.6: Routing, session guard and Login screen'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: '1e768e484672faef1c49a2fd9fbbefe123e5bd87'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app renders only the token specimen. It has no routes and no guard, and nobody can log in, so no later screen can be reached (FR1, FR4, FR5, FR7).

**Approach:**
- One `createBrowserRouter` table: public auth routes, plus a `RequireSession` layout over the app routes with placeholder pages.
- A pixel-faithful Login screen built from the Story 1.3 primitives, with react-hook-form and zod, wired to the Story 1.5 hooks.

## Boundaries & Constraints

**Always:**
- **Paths** live only in `src/app/routes.ts` (`routes.login`, `signup`, `forgotPassword`, `overview: '/'`, `balances`, `accountDetails(id)`, `transactions`, `bills`, `expenses`, `goals`, `settings`). No string path literal appears anywhere else.
- **Route table:** `src/app/router.tsx` holds the single table.
  - Public routes: `/login`, `/signup` and `/forgot-password`. Signup and forgot-password are placeholders until 1.7.
  - The `RequireSession` layout route covers `/`, `/balances`, `/balances/:accountId`, `/transactions`, `/bills`, `/expenses`, `/goals` and `/settings`.
  - It renders a minimal layout with an `<Outlet/>`, which 1.8 replaces with `AppShell`. Each child is a placeholder page showing its section name as an `h1`.
  - Unknown paths redirect to `/`.
- **`RequireSession`** (`src/app/RequireSession.tsx`):
  - While `useSession()` is loading, it renders nothing visible (an `aria-busy` container).
  - With no session, it renders `<Navigate to={routes.login} replace/>`.
  - With a session, it waits for `useToday()` to succeed before rendering `<Outlet/>`.
- **Signed-in redirect:** a signed-in user visiting any public auth route is redirected to `/`.
- **Login screen** (`features/auth/LoginPage.tsx`) matches `101. Login.png` at 1440×1024:
  - It uses a shared `AuthLayout`: a centred column about 385px wide on the `surface` background, with the teal wordmark on top.
  - Fields: "Email Address" (`TextInput`, placeholder `johndoe@email.com`) and "Password" (`PasswordInput`), with a teal "Forgot Password?" text link on the label row that goes to `/forgot-password`.
  - "Keep me signed in" is a `Checkbox`, checked by default.
  - "Login" is a full-width primary `Button` with `type="submit"`.
  - Then the "or sign in with" divider (`OrDivider`, reused by Signup), "Continue with Google" (`Button variant="google"`, full width) and a "Create an account" text link to `/signup`.
- **Validation:** a zod schema in `features/auth/schemas.ts` checks email required and email format, and password required. It is run through `zodResolver`. Errors show through the inputs' `error` prop, and no API call is made while the form is invalid.
- **Submit:**
  - Submit calls `useLogin({ email, password, persistent })`. Google calls `useLoginWithGoogle`.
  - On success, the app navigates to `/` with `replace`.
  - `ApiError.fieldErrors` map to `setError`. Any other `ApiError` shows its `message` as danger text above the button.
  - While pending, the submit and Google buttons are disabled.
- **Typing:** `ApiError` is registered as TanStack Query's `defaultError` (module augmentation in `src/api`), so forms read `fieldErrors` without casts.
- **Dev specimen:** the Stories 1.2/1.3 specimen (`App.tsx`) moves to a dev-only route, `routes.specimen = '/__specimen'`, which is included only when `import.meta.env.DEV`. `main.tsx` renders `<AppProviders><RouterProvider/></AppProviders>`.
- **Accessibility:** every control is reachable by keyboard in visual order. The page has one `h1`, visually hidden as "Log in", because the design shows only the wordmark.

**Never:**
- No sidebar, top bar or logout UI (1.8), and no Signup or Forgot Password forms (1.7).
- No feature imports `api/mock` or `api/http`. Features use hooks only.
- No hard-coded colours or sizes outside tokens (the literal scan stays green).

</frozen-after-approval>

## Code Map

- `src/app/main.tsx`, `App.tsx`, `App.test.tsx`: today `main` renders `<AppProviders><App/></AppProviders>`. `App` becomes the dev specimen route element, and its test stays.
- `src/app/providers.tsx`: unchanged. `RouterProvider` goes inside it, so the hooks work in the routes.
- `src/api/hooks/useLogin.ts` etc.: these exist and clear the cache on success. `useSession` returns `Session | null`. `useToday` returns an `IsoDate`.
- `src/api/types.ts`: `ApiError` with `code`, `message`, `fieldErrors`. Add a `src/api/queryTypes.ts` (or similar) with `declare module '@tanstack/react-query' { interface Register { defaultError: ApiError } }`.
- `src/ui/*`: `Button`, `TextInput`, `PasswordInput`, `Checkbox` and `FormStatus`, which have no `className` prop. Lay them out with wrapper elements.
- `src/assets/brands/wordmark-teal.svg`: the logo.
- `.oxlintrc.json`: `react/only-export-components` is enforced under `--deny-warnings`. Keep non-component exports (the route objects, `routes`) in `.ts` files or component-free modules. `features/auth/index.ts` exports `LoginPage`, `AuthLayout` and `OrDivider`. app imports features only via `index.ts`.
- Tests: build `createMemoryRouter` from the same exported route objects, wrapped in the real providers with `createMockApi({ delayMs: 0, … })` over cleared storage.

## Tasks & Acceptance

**Execution:**
- [x] `src/app/routes.ts` -- The path constants.
- [x] `src/app/routeObjects.tsx` (or similar) + `router.tsx` -- The single table, the placeholder pages and the unknown-path redirect.
- [x] `src/app/RequireSession.tsx`, plus the public-route redirect guard.
- [x] `src/api` query typing -- Register `ApiError` as `defaultError`.
- [x] `src/features/auth/{schemas.ts, LoginPage.tsx, components/AuthLayout.tsx, components/OrDivider.tsx, index.ts}`.
- [x] `src/app/main.tsx`, `App.tsx` -- `RouterProvider`, and the dev-only specimen route.
- [x] Tests -- Covering:
  - a guard redirect from `/goals` to `/login` with no session;
  - `/login` with a session redirecting to `/`;
  - `RequireSession` waiting for today;
  - empty submit showing both errors and making no API call;
  - invalid email showing a format error;
  - a valid login landing on `/` and showing the Overview placeholder;
  - Google landing on `/`;
  - an unchecked "Keep me signed in" storing the session in `sessionStorage` only;
  - an API `fieldErrors` response mapping to the field;
  - the links targeting `/forgot-password` and `/signup`.

**Acceptance Criteria:**
- Given no session, when any app route is opened, then the user lands on `/login`.
- Given the Login screen at 1440×1024, when compared with `101. Login.png`, then layout, spacing, type and colours match within 2px.
- Given `npm run lint`, `npx tsc -b`, `npm test` and `npm run build`, then all pass.

## Implementation Notes

- **Paths as props:** features may not import `src/app`, so `LoginPage` takes `paths: AuthPaths` (`login`, `signup`, `forgotPassword`), filled from `routes` in `app/routeObjects.tsx`. 1.7 follows the same pattern.
- **Post-login redirect:** `RedirectIfSession` is its only owner (`<Navigate to={routes.overview} replace/>`). On an identity change, `applyInvalidation(..., { session })` clears the cache but seeds `qk.session()` with the mutation's `Session` (logout seeds `null`) instead of resetting it. The session query never goes `pending`, so the form is never swapped for `PageBusy`. `LoginPage` does not navigate.
- **Auth column:** 400px (`w-100`), measured from `101. Login.png` (x 520–920 at 1440), instead of "about 385px". The wordmark gap is `mt-16.5` (66px). Measured elements land within 0.5px of the PNG.
- **Today error:** if `useToday()` fails with no cached data, `RequireSession` shows the error `message` and a Retry button that calls `refetch`. A failed background refetch keeps the cached app.
- **Dev specimen:** `routes.specimen` is `undefined` outside dev. The route lazy-loads `App.tsx` inside the `import.meta.env.DEV` branch, and `build-output.node.test.ts` asserts that the production JS contains neither the specimen text nor `__specimen`.
- **Known colour deltas:** the design background is #F4F5F7 against the `surface` token's #F3F3F3. The design's divider hairline is darker than the `border` token used by `OrDivider`. Both are left for a token review.

## Spec Change Log

## Review Triage Log

Pass 1 (blind, edge-case, verification-gap):

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | Post-login: the session reset unmounts LoginPage, so `goHome` is dead and a `PageBusy` flash shows (blind + edge-case, incl. claim) | medium | `resetQueries` sets the session to pending, and `RedirectIfSession` swaps in `PageBusy`. The redirect works only through the guard. | patch |
| 2 | Google errors go through the field mapper; stale root/field errors persist (blind + edge-case) | low | `onGoogle` uses `showApiError`. No `clearErrors` anywhere. | patch |
| 3 | `fieldErrors` with unmapped keys give an empty highlight or dropped messages (edge-case) | low | Only email/password keys are mapped. | patch |
| 4 | Double submit before `isPending` flips (edge-case) | low | Async `zodResolver` leaves a gap. Direct disable fix. | patch |
| 5 | A failed background refetch of today replaces the whole app (edge-case) | low | `today.isError` is checked without the cached data. | patch |
| 6 | Dev specimen imported statically; no proof it is absent from production (blind + verification-gap) | medium | A static import of `App.tsx`. The build test checks only CSS. | patch |
| 7 | Today error + Retry untested (verification-gap + blind) | medium | Gap demonstrated: deleting the branch keeps the suite green. | patch |
| 8 | Google failure and Google pending untested (verification-gap + blind) | medium | All failure and pending tests override `login` only. | patch |
| 9 | No test that a signed-in user at `/login` never sees the form (verification-gap, deferred there) | low | End-state assertions only. A cheap synchronous assertion. | patch |
| 10 | `queryTypes.ts` augmentation relies on tsconfig include (blind) | low | Not imported anywhere. Direct side-effect import. | patch |
| 11 | `accountDetails('')` yields `/balances/` (edge-case) | low | Direct guard. | patch |
| 12 | Implementation Notes empty (blind) | low | Notes appended; no spec change. | patch |
| 13 | Deep link lost after login (blind) | low | The frozen spec requires navigating to `/` on success (FR1). Changing it edits the spec. | reject (raised with human) |
| 14 | Column 400px vs spec "about 385px" (all three, incl. claim) | false | Measured from `101. Login.png`: 520–920 at 1440. The orchestrator screenshot matches. "About" was an estimate. | reject |
| 15 | `useToday` runs while signed out (edge-case) | low | Mock returns a constant. The http adapter is a stub. A gate changes the hook signature. | reject |
| 16 | `getSession` error is treated as signed out (edge-case) | low | Mock rejects only on `UNKNOWN`. Landing on Login is acceptable. | reject |
| 17 | Tab-order test checks DOM order, not real tabbing (blind) | low | `user-event` is not in the stack. DOM order equals tab order with no `tabIndex` overrides. | reject |
| 18 | "Forgot Password?" absolute placement and reading order (blind) | low | Required on the label row by the frozen spec. Pixel-verified. | reject |
| 19 | `PageBusy` has no timeout (blind) | low | No hang path exists in the mock. Today errors now have Retry. | reject |
| 20 | Test stack does not reuse `AppProviders` (verification-gap + edge-case claim) | low | The stacks are identical today. `AppProviders` composes at module load. | reject |
| 21 | Fixed width overflows on narrow screens (blind) | false | The PRD is desktop-only at ≥ 1280px. | reject |
| 22 | Spec/sprint status mismatch (blind + verification-gap) | false | Sprint status syncs to `review` at completion. | reject |

## Verification

**Commands:**
- `npm run lint`, `npx tsc -b`, `npm test`, `npm run build` -- expected: all pass

**Manual checks:**
- Screenshot `/login` at 1440×1024 and compare it with `design-reference/screens/101. Login.png` (2× export).
