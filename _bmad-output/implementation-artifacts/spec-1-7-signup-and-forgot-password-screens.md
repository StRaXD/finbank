---
title: 'Story 1.7: Signup and Forgot Password screens'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: 'ae7b172512ff3a44746264d619fc55fe3ccbb01d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-6-routing-session-guard-and-login-screen.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/signup` and `/forgot-password` are placeholders, so new users can't create an account and locked-out users can't request a reset (FR2, FR3, FR4, FR5).

**Approach:** Build both screens in `features/auth`, reusing Story 1.6's `AuthLayout`, `OrDivider`, the paths-as-props pattern and the error-handling pattern. Validate with zod and react-hook-form, then wire them to `useSignup`, `useLoginWithGoogle` and `useRequestPasswordReset`.

## Boundaries & Constraints

**Always:**
- **Signup** (`features/auth/SignupPage.tsx`) matches `102. Signup.png` at 1440×1024:
  - Below the wordmark sits the "Create an account" heading, the page's visible `h1`, in bold ink.
  - "Name" uses `TextInput` with placeholder `Tanzir Rahman`. "Email Address" uses `TextInput` with placeholder `hello@example.com`. "Password" uses `PasswordInput`.
  - Next comes the terms line: "By continuing, you agree to our " in `ink-2`, then "terms of service." in teal. That link is inert: an inline `<button type="button">` styled as a link, which does nothing when activated.
  - Then a full-width "Sign up" submit button, the "or sign up with" `OrDivider`, and full-width "Continue with Google".
  - Last is "Already have an account? " in muted text, followed by a teal "Sign in here" link to `/login`.
- **Signup schema** (`schemas.ts`): name required (after trimming), email required and well-formed, password required.
- **Signup submit and Google:**
  - Submit calls `useSignup({ name, email, password })`, and Google calls `useLoginWithGoogle`.
  - On success, `RedirectIfSession` sends the user to `/`, the same mechanism as Login.
  - Errors follow the Login pattern: `clearErrors` on each attempt, and `name`/`email`/`password` field errors go to their inputs. Any other message goes to the root alert. Google errors appear only in the alert.
  - Both buttons are disabled while anything is in flight.
- **Forgot Password** (`features/auth/ForgotPasswordPage.tsx`) matches `103. Forgot Password.png`:
  - The column sits lower on the page than Login's, as in the PNG.
  - Content in order: the "Forgot Password?" `h1` in bold ink, centred; the centred subtext "Enter your email address to get the password reset link." in `muted`; "Email Address" (`TextInput`, placeholder `hello@example.com`); the full-width "Password Reset" submit button; and a centred grey (`subtle`, semibold) "Back to login" link to `/login`.
- **Forgot Password schema and submit:**
  - Email required and well-formed.
  - Submit calls `useRequestPasswordReset(email)`. On success, it shows `FormStatus` next to or below the button with "Check your email for a password reset link." and keeps the form in place. Validation and API errors follow the Login pattern.
  - The button is disabled while the request is pending.
- **Paths:** pages receive paths through `AuthPaths` props, filled in from `routes` in `routeObjects.tsx`. The placeholder routes for `/signup` and `/forgot-password` are replaced.
- **Accessibility:** every control is keyboard-reachable in visual order, with labels linked to their inputs.

**Never:**
- Signup never changes the profile. The mock stays single-user (Story 1.5 decision).
- No new primitives or tokens unless a design value cannot be expressed with existing ones. If one is needed, add it to `tokens.css` and keep the literal scan green.
- No changes to Login behaviour.

</frozen-after-approval>

## Code Map

- `src/features/auth/LoginPage.tsx`: the reference for form wiring, `clearErrors`, field-vs-root error mapping, the in-flight guard and the inert-on-pending buttons. Extract a small shared helper (e.g. `useAuthFormErrors` or `applyApiError`) only if it removes real duplication. Keep Login's tests green.
- `src/features/auth/components/AuthLayout.tsx`: the 400px column (measured), wordmark and hidden h1. It needs a prop for the visible heading/subtext and for the Forgot page's vertical offset. Signup and Forgot have a visible `h1`, so the hidden "Log in" h1 must only render on Login.
- `src/features/auth/paths.ts` (`AuthPaths`) and `index.ts`: export the new pages.
- `src/app/routeObjects.tsx`: replace the signup and forgot-password placeholders with the pages.
- `src/api/hooks/useSignup.ts`, `useLoginWithGoogle.ts`, `useRequestPasswordReset.ts`: these exist, and the login-type hooks seed the session.
- `src/ui/FormStatus.tsx`: an always-mounted live region.
- Tests: extend `src/app/login.test.tsx` or add `signup.test.tsx` and `forgot-password.test.tsx` using `test-utils.tsx` (`renderAt`, `watchDom`).

## Tasks & Acceptance

**Execution:**
- [x] `src/features/auth/schemas.ts` -- Signup and forgot-password schemas.
- [x] `src/features/auth/components/AuthLayout.tsx` -- Heading, subtext and offset support.
- [x] `src/features/auth/SignupPage.tsx`, `ForgotPasswordPage.tsx`, `index.ts`, `paths.ts`.
- [x] `src/app/routeObjects.tsx` -- Wire up the pages.
- [x] Tests:
  - **Signup:** an empty submit shows three errors and makes no call; a bad email shows a format error; a valid submit lands on `/`; Google lands on `/`; API `fieldErrors.name` maps to the Name field; the terms link does not navigate; "Sign in here" goes to `/login`.
  - **Forgot Password:** an empty or invalid email shows an error and makes no call; a valid submit calls `requestPasswordReset` with the email and shows the confirmation in `role="status"`; the button is disabled while pending; "Back to login" goes to `/login`.

**Acceptance Criteria:**
- Given 1440×1024, when `/signup` and `/forgot-password` are compared with their PNGs, then layout, type and colours match within 2px, apart from the known `surface` background delta.
- Given `npm run lint`, `npx tsc -b`, `npm test` and `npm run build`, then all pass.

## Implementation Notes

- **Shared error mapping:** `features/auth/applyApiError.ts` replaces Login's inline mapper; Login, Signup and Forgot pass their field list. `linkClass.ts` holds the shared teal link class.
- **AuthLayout:** new props `showTitle` (visible centred `h1`; the sr-only one renders only when false), `subtitle` and `placement`. Measured from the PNGs at 1440: wordmark top Signup 112px (`high`), Login 160px (`default`), Forgot 230px (`low`); heading gap 38px (Signup) vs 44px (Forgot). The subtitle is `text-18` with `leading-6.5` (26px line pitch in the PNG; no new token) and `max-w-80` so it wraps after "the" as in the design.
- **Fidelity:** headless Chrome at 1440×1024; every measured element lands within 1px of the PNGs (Login unchanged). The terms line renders about 3px wider than the PNG, the same text-width drift Login already shows.
- **Colour deviation:** "Already have an account?" uses `faint`, not `muted`: the PNG samples about #999DA3 there, which matches `faint` (#9F9F9F); `muted` (#666666) is visibly darker.

## Spec Change Log

## Review Triage Log

Pass 1 (blind, edge-case, verification-gap):

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | Stale reset confirmation after the email is edited (blind + edge-case) | low | Cleared only on the next submit, so the confirmation sits under a different address. | patch |
| 2 | Empty-string field or alert messages render empty errors (edge-case) | low | `applyApiError` and the Google handlers pass `message` through unchecked. | patch |
| 3 | `applyApiError` has no direct tests; Signup email/password/unknown-key mapping untested (verification-gap + blind) | medium | Gap demonstrated: dropping `'password'` from `signupFields` keeps the suite green. | patch |
| 4 | Login's hidden h1 not pinned after `AuthLayout.showTitle` (verification-gap) | medium | Flipping the default makes "Log in" visible with every test still green. This would violate "no Login changes". | patch |
| 5 | Email with surrounding spaces fails the format check; trimmed name untested (blind) | low | No trim on email. The name trim is unasserted. | patch |
| 6 | "Signup never changes the profile" untested (blind) | low | A key single-user rule with no guard. | patch |
| 7 | Inert terms button gives assistive tech no hint (blind) | low | A focusable dead control. `aria-disabled` is a direct fix. | patch |
| 8 | `subtitle` silently dropped without `showTitle`; unused placement values (blind + edge-case) | low | Direct typing and cleanup. | patch |
| 9 | "Already have an account?" uses `faint`, frozen text says `muted` (blind) | low | The PNG samples about #999DA3, which is `faint`. The frozen colour AC conflicts with the frozen wording. Kept `faint`, pending the human. | reject (raised with human) |
| 10 | Forgot Password reveals whether accounts exist via field errors (blind) | false | The mock `requestPasswordReset` rejects only malformed emails and never "unknown email", so no existence signal exists. | reject |
| 11 | No signup password rules (blind) | low | FR5 requires only required/format checks. No rule is designed. | reject |
| 12 | Confirmation clears even when the new submit fails validation (edge-case) | low | Intended: a new attempt supersedes the old one. Tested. | reject |
| 13 | `paths.ts` ticked but untouched (blind + edge-case claim) | false | `AuthPaths` already had every needed key, so no change was required. | reject |
| 14 | Spec/sprint status mismatch; empty sections (blind) | false | Sprint status syncs at completion. Triage and notes are now filled. | reject |

## Verification

**Commands:**
- `npm run lint`, `npx tsc -b`, `npm test`, `npm run build` -- expected: all pass

**Manual checks:**
- Screenshot `/signup` and `/forgot-password` at 1440×1024 and compare them with `102. Signup.png` and `103. Forgot Password.png` (2× exports).
