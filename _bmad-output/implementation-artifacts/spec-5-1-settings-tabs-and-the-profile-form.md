---
title: 'Story 5.1: Settings tabs and the profile form'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: 'dfb7559f68c3e6b21da2fac17a3d10e7bfafdb90'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/settings` is still a `PlaceholderPage`. Users cannot see or edit their full name, email, username or phone number.

**Approach:** Build a `features/settings` Settings page: one white card with Account and Security `Tabs`, with the active tab kept in `?tab=`. The Account tab holds a react-hook-form and zod profile form with borderless inputs and a new `PhoneInput`. Saving calls a new port method, `updateProfile`. It invalidates `profile` through `invalidationMap`, so the sidebar and the Overview greeting refresh.

## Boundaries & Constraints

**Always:**
- Tab state lives only in the URL. A missing or unknown `tab` value shows Account.
- Clicking a tab sets `?tab=<id>` as a normal history push, so Back returns to the previous tab.
- Form defaults come from `useProfile()`. The form mounts only after the profile has loaded.
- All four fields are required, and both phone parts are required. Email must be a valid format. Errors show inline through each primitive's `error` prop, in `text-danger`.
- `ApiError.fieldErrors` map to `setError`. Any other error shows as a `role="alert"` paragraph in `text-danger`. Success shows `FormStatus` with "Profile updated."
- `updateProfile` trims its inputs, validates them in the mock adapter (VALIDATION with `fieldErrors`), writes first and then commits, and keeps `avatarUrl` unchanged. The http adapter stubs it with `notImplemented`.
- Respect the AD-1 layering: the feature does not import `app/routes`. Use no hex or arbitrary colour literals.
- (Human decision 2026-11-18) Profile edits must not affect auth:
  - `Session` stays `{ userId, persistent }`, and `updateProfile` never touches the session stores.
  - Login stays decoupled from the profile's email and username: any well-formed credentials still sign in, including both the old and the new email.
  - Logout leaves the mock profile intact.
  - The edited profile survives a reload and a logout followed by a login, and the sidebar and greeting stay consistent throughout.

**Never:**
- No upload box, avatar handling or `changePassword` here; those come in Stories 5.2 and 5.3.
- The Security tab panel is a short placeholder only.
- No page heading.
- Do not copy the profile into context or global state.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default tab | `/settings` or `?tab=bogus` | Account tab is selected and the form is prefilled | N/A |
| Deep link | `?tab=security` | Security tab is selected with the placeholder panel | N/A |
| Valid save | edited name "Jane Doe" | Mock persists it, `FormStatus` shows, the sidebar shows "Jane Doe" and the greeting shows "Hello Jane" | N/A |
| Empty field | Username cleared | Inline "Username is required." and no `updateProfile` call | client zod |
| Bad email | `foo@` | Inline "Enter a valid email address." and no call | client zod |
| Adapter rejects | VALIDATION with `fieldErrors.email` | Error appears on the Email field | `setError` |
| Storage full | write throws quota | `STORAGE_FULL` with the profile unchanged and the alert message shown | root error |
| Session intact | email/username changed while signed in | `getSession()` is unchanged and the user stays on `/settings` without a redirect | N/A |
| Reload | fresh adapter on the same storage | `getProfile()` returns the edited values | N/A |
| Logout → login | logout, then log in with the new or the old email | login succeeds and the sidebar and greeting show the edited profile | N/A |

</frozen-after-approval>

## Code Map

- `src/api/types.ts:28` -- `UserProfile`. Add `ProfileInput = Omit<UserProfile, 'avatarUrl'>`. Story 5.2 extends it.
- `src/api/port.ts:26-136` -- `FinbankApi`. Add `updateProfile(input: ProfileInput): Promise<UserProfile>` and add it to `FINBANK_API_METHODS`; the guard at :134 fails `tsc` otherwise.
- `src/api/http/httpApi.ts:14,27` -- stub pattern `notImplemented('getProfile')`.
- `src/api/mock/mockApi.ts` -- copy `updateCategoryLimit` (:878). Helpers: `checkRequired`, `checkEmail`, `throwIfInvalid` (~:92-105), `writeItem` (:124), `getProfile` (:779). Tests are in `mockApi.test.ts`; the `updateCategoryLimit` block (:1324) covers VALIDATION and STORAGE_FULL.
- `src/api/queryKeys.ts:52-60` -- `invalidationMap`. Add `updateProfile: [qk.profile()]`. Tests are in `queryKeys.test.ts`.
- `src/api/hooks/useUpdateCategoryLimit.ts` -- mutation hook to copy. Tests are in `hooks.test.tsx`.
- `src/ui/TextInput.tsx` -- already has `variant: 'borderless'`; reuse it.
- `src/ui/Field.tsx` and `src/ui/fieldStyles.ts` -- label, error and aria wiring and the shared class strings for `PhoneInput`.
- `src/ui/Tabs.tsx` -- controlled tablist with props `tabs/value/onChange/label/panelId`.
- `src/features/goals/components/goalModalForm.tsx:20,108` and `src/features/auth/ForgotPasswordPage.tsx` -- `applyApiError`/`setError` mapping, the `root.server` alert, and `FormStatus` driven by `isSuccess`.
- `src/app/routeObjects.tsx:81` -- swap `PlaceholderPage` for `SettingsPage`. `routes.viewProfile` (routes.ts:20) already deep-links to `?tab=account`.
- `design-reference/screens/111. Settings.png` -- design reference. The card is about 44px padded. The tabs sit about 60px above the fields. The fields are in the left column, about 40% of the width; the right column belongs to 5.2. The button is about 190px wide.

## Tasks & Acceptance

**Execution:**
- [x] `src/api/types.ts`, `port.ts`, `http/httpApi.ts` -- add `ProfileInput` and `updateProfile` with its http stub.
- [x] `src/api/mock/mockApi.ts` + test -- implement `updateProfile`: trim, validate (required ×5, email), write and then commit, return a clone. Test the happy path with persistence across a fresh adapter, VALIDATION `fieldErrors`, STORAGE_FULL keeping the old profile, and `avatarUrl` being preserved.
- [x] `src/api/queryKeys.ts` + test, `src/api/hooks/useUpdateProfile.ts` (+ hooks index export) + test -- add the invalidation entry and the hook.
- [x] `src/ui/PhoneInput.tsx` + test, plus the ui index export if there is one -- one `label` over two inputs (code and number) separated by a `|` divider. Props: `label`, `codeProps`, `numberProps` (input props with refs for RHF `register`), `error`, `variant`. The code input gets the visible label; the number input gets `aria-label` "{label} number". Errors are wired through `Field`.
- [x] `src/features/settings/schemas.ts`, `SettingsPage.tsx`, `components/ProfileForm.tsx`, `index.ts` + tests -- tabs from `useSearchParams`, `Card` content, `AsyncSection`/loading for the profile, and the form.
- [x] `src/app/routeObjects.tsx` -- route `/settings` to `SettingsPage`. Update the router or shell tests if they assert the placeholder.
- [x] `src/app/settings.test.tsx` (new, using `test-utils.tsx`) -- full-app flow on a shared mock storage:
  - edit the name, email and username, then save; the sidebar name and greeting update with no reload, and the session is unchanged;
  - remount the app on the same storage (reload) and check the values persist;
  - log out and then log in with the new email (and separately with the old email); the profile is still the edited one.
  - The mock test also asserts that `updateProfile` writes nothing to the session stores.

**Acceptance Criteria:**
- Given `/settings`, when it loads, then one card shows the Account and Security tabs and no page heading.
- Given the Account tab, when a tab is clicked or arrow-keyed, then the URL `tab` param updates and the matching panel shows.
- Given a successful save, when the profile query refetches, then the sidebar user block and the Overview greeting show the new name without a reload.
- Given `tsc -b`, `oxlint` and the boundary and literal node tests, when run, then they all pass.

## Implementation Notes

- **Files touched:**
  - API: `types.ts`, `port.ts`, `http/httpApi.ts`, `mock/mockApi.ts` and `queryKeys.ts`, plus the new hook `hooks/useUpdateProfile.ts`.
  - UI: the new `ui/PhoneInput.tsx`.
  - Feature: the new `features/settings/` folder (`schemas.ts`, `SettingsPage.tsx`, `components/ProfileForm.tsx`, `index.ts`).
  - App: `routeObjects.tsx`; `PlaceholderPage.tsx` was deleted after review.
  - Tests: new `ui/PhoneInput.test.tsx`, `features/settings/SettingsPage.test.tsx` and `app/settings.test.tsx`. `mockApi`, `queryKeys` and `hooks` tests were extended, and the router and shell tests were updated (they asserted the placeholder heading).
- **Card inset:** the card inset is 24px + 8px (`p-2`). The design measures about 32px, not the planned 44px. The tab-to-fields gap is 44px, and the button is `w-48`.
- **Phone errors:** both parts share one error line, so a missing code and a missing number show as one joined message.
- **Error mapping:** the `fieldErrors` → `setError` mapping is copied locally, because `applyApiError` belongs to `features/auth` and features may not import each other.
- **Login decoupling:** login stays decoupled from the profile. No auth code was changed, and the guarantee is pinned by tests.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | edge | `reset(saved)` overwrites keystrokes typed during an in-flight save | low | Real, but the mock delay is 200ms and the button is disabled while busy, so typing in that window is unlikely. The fix (`keepDirtyValues`) changes the trimmed-baseline behaviour. Rejected. |
| 2 | edge + blind | "Profile updated." stays visible after further edits | medium | Real: `status` derives only from `update.isSuccess`. Patch: hide the status once the form is dirty. |
| 3 | edge | stale `root.server` alert stays while the user edits | low | Real. It is the same house pattern as Login and the goal modals, and it clears on the next submit. The fix adds a watch subscription. Rejected. |
| 4 | edge + blind | switching tab or pressing Back unmounts the form and loses unsaved edits; per-call callbacks are skipped mid-save | low | Real, but this is standard tab behaviour. A mid-save unmount still runs the hook-level invalidation, so the data saves and the shell refreshes. The fix (keep mounted, or block navigation) adds complexity. Rejected. |
| 5 | edge + blind | the form does not resync on an external profile refetch | low | `refetchOnWindowFocus: false` in `queryClient.ts:9`, the mock is single-user, and the avatar is not a form field. Hard to reach. Rejected. |
| 6 | verif-gap | no test submits after a success (stale confirmation) | medium | Pre-verified gap. Patch: add the test. |
| 7 | verif-gap | unmapped or mixed `fieldErrors` branch untested; a third copy of the mapping helper | medium | Pre-verified. The mock emits only known keys and the http adapter is `notImplemented`; the duplication predates this story (auth and goals). Deferred. |
| 8 | blind | `PlaceholderPage.tsx` is dead code | low | Confirmed: grep finds no importer. Patch: delete it (a direct deletion). |
| 9 | blind | the old/new-email login tests prove nothing | false | They pin the human decision that login stays decoupled. Coupling login to `profile.email` would fail the old-email case. |
| 10 | blind | no error/retry test for the profile load; `emptyMessage=""` | low | `AsyncSection`'s error path is shared and tested in ui. `emptyMessage` is unused without `isEmpty`. Rejected. |
| 11 | blind | "Update Profile" is enabled when the form is clean | false | Saving identical values is harmless and idempotent, and the design shows the button always enabled. |
| 12 | blind | one phone error flags both inputs | low | The spec chose a shared error. The fix adds new props. Rejected. |
| 13 | blind | the phone input's accessible names ("Phone Number number") | low | Spec-mandated naming; the fix would edit the spec. Rejected. |
| 14 | blind | phone and username formats are barely validated | false | The intent requires only non-blank fields and a valid email. |
| 15 | blind | zod `z.email()` vs the mock `EMAIL` regex | low | The client check runs first and is the stricter of the two, so the adapter never sees an email the form rejects. No reachable divergence. Rejected. |
| 16 | blind | `?tab=bogus` stays in the URL | low | The intent requires only that Account shows. Harmless. Rejected. |
| 17 | blind | the panel uses `aria-label` instead of `aria-labelledby` to the tab | low | The panel is still named correctly. The fix adds public surface to `Tabs`. Rejected. |
| 18 | blind | the hook test waits with a fixed `setTimeout(0)` | low | Real flakiness risk. Patch: use `waitFor` (a direct correction). |

## Verification

**Commands:**
- `npx tsc -b` -- expected: no errors
- `npx oxlint --deny-warnings` -- expected: clean
- `npx vitest run` -- expected: all pass

**Manual checks (if no CLI):**
- Compare `/settings` at 1440×1024 against `111. Settings.png`: tab underline, borderless fields, the "+880 | 51547 58868" phone row and the button.
