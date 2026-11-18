---
title: 'Story 5.3: Change password'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: '5f25bfb5c8a4a89f533b184cb3a1014cd872fe83'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Settings Security tab is a placeholder, so users cannot change their password.

**Approach:** Replace the placeholder with a password form: borderless masked Old, New and Retype Password fields, a read-only Phone Number and "Update Password". It is validated with react-hook-form and zod, and saves through a new port method, `changePassword`. In mock mode the method validates and resolves. On success the fields clear and a `FormStatus` confirmation appears. The session, the profile and the phone number are untouched.

## Boundaries & Constraints

**Always:**
- **Reuse:** reuse the Settings card, the `?tab=security` routing, `PasswordInput`, `PhoneInput`, `Button`, `FormStatus` and the form patterns of `ProfileForm`. The new look goes in as a variant: `PasswordInput` gains `variant: 'borderless'`, matching `TextInput`'s borderless style (an ink-2 label, a 12px gap, `subtle` text). Login and Signup keep the default.
- **Validation** (client zod and mock adapter, the same rules and messages):
  - Old: "Old password is required."
  - New: "New password is required."; fewer than 8 characters gives "Use at least 8 characters."
  - Retype: "Retype your new password."; a mismatch with New gives "Passwords don't match."
  - Each error shows on its own field, and nothing is submitted. Passwords are never trimmed.
- **Save failures:** adapter `fieldErrors` (`oldPassword`, `newPassword`, `confirmPassword`) map to their fields. Any other `ApiError` shows its `message` as the `role="alert"` line. The typed values stay on failure.
- **Success:** all three fields reset to empty, the confirmation "Password updated." shows, and it hides once a field is edited again.
- **Phone:** read-only (`readOnly`, still focusable), showing `useProfile()`'s code and number. "Update Password" never sends it, and `updateProfile` is not called.
- **Session and data:** `changePassword` invalidates nothing (it has no `invalidationMap` entry) and never touches the session stores or `finbank:mock:v1`. The user stays signed in on `/settings?tab=security`.
- **Secrets:**
  - Passwords are never stored, by the adapter, in localStorage or in query data.
  - They are never logged, and never put in an error message, URL or `fieldErrors` value.
  - After success the mutation is reset, so `variables` doesn't keep the passwords.
- **http adapter:** `changePassword` is a `notImplemented` stub.
- (Human decision 2026-11-18) The mock does not check Old Password against any stored credential, because mock `login` and `signup` never store a password. Old Password is required, and the mock checks the length and match rules, then resolves. No password or hash is stored anywhere.
- (Human decision 2026-11-18) Keep the eye show/hide toggle on all three borderless password fields. The 112 PNG shows none; this deviation is accepted.

**Never:**
- No password-strength rules beyond length 8.
- No logout or re-login after a change.
- No placeholder asterisks; the fields start empty.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy | old `old-secret`, new and retype `new-secret-1` | `changePassword` called once with the three values; fields empty; "Password updated."; session unchanged; no redirect | N/A |
| Empty old | old blank | "Old password is required." on Old; no call | client |
| Empty new / retype | blank | the required message on that field; no call | client |
| Short new | `short7!` | "Use at least 8 characters." on New; no call | client |
| Mismatch | new `new-secret-1`, retype `new-secret-2` | "Passwords don't match." on Retype; no call | client |
| Spaces kept | new `"        "` (8 spaces) | accepted (length rule only), sent unchanged | N/A |
| Adapter VALIDATION | `fieldErrors.oldPassword` | message on Old; values kept | `setError` |
| Other error | `ApiError('UNKNOWN', …)` | alert with the message; values kept; no password text | root alert |

</frozen-after-approval>

## Code Map

- `src/api/types.ts` (~:84) -- add `PasswordInput = { oldPassword: string; newPassword: string; confirmPassword: string }`, plus shared `PASSWORD_MIN_LENGTH = 8` and the message constants (the `AVATAR_*` pattern).
- `src/api/port.ts` -- add `changePassword(input: PasswordInput): Promise<void>`, document it, and add it to `FINBANK_API_METHODS`.
- `src/api/http/httpApi.ts` -- add the `notImplemented('changePassword')` stub.
- `src/api/mock/mockApi.ts` -- `changePassword`: validate with `FieldErrors`/`throwIfInvalid` (by length, no trim), then return. No `state()` write and no session access.
- `src/api/hooks/useChangePassword.ts` (new) -- a `useMutation` with no invalidation. Copy `useUpdateProfile` and drop the `onSuccess` invalidation.
- `src/ui/PasswordInput.tsx` -- add `variant`, using the `fieldText(variant)`, `labelTone` and `labelGap` mechanism of `TextInput.tsx`. Borderless gets a transparent border with `px-6`, keeping the eye button's `pr-14`.
- `src/features/settings/schemas.ts` -- `passwordSchema`, using `superRefine` for the mismatch on `confirmPassword`.
- `src/features/settings/components/PasswordForm.tsx` (new) -- mirror `ProfileForm`: `showSubmitError`, the busy guard, `isDirty`-aware status and the button `mt-11 w-48`. The fields are `gap-5 lg:w-2/5`. Phone uses `PhoneInput` with `readOnly` `codeProps`/`numberProps`, and `useProfile` data passed as a prop through `AsyncSection`.
- `src/features/settings/SettingsPage.tsx:61` -- swap the placeholder `<p>` for a `SecurityPanel`.
- **Design (112. Settings.png):** the same grid as 111. Labels are at top 216, 320, 424 and 528; the button is 336,656 to 528,704; there is no right column.

## Tasks & Acceptance

**Execution:**
- [x] `types.ts`, `port.ts`, `httpApi.ts`, `mockApi.ts` + `mockApi.test.ts` -- the type, the method, the stub and the mock. Tests: each rule maps to the right `fieldErrors` key; valid input resolves; no storage key is written or removed; `getSession` and `getProfile` are unchanged afterwards; error messages and `fieldErrors` never contain the password values.
- [x] `src/api/hooks/useChangePassword.ts` + `hooks.test.tsx` -- the mutation, which does not invalidate `profile` or `session`.
- [x] `src/ui/PasswordInput.tsx` + test -- the borderless variant; the default stays unchanged.
- [x] `schemas.ts`, `components/PasswordForm.tsx`, `SettingsPage.tsx` + `SettingsPage.test.tsx` -- every matrix row, the read-only phone with profile values, and `updateProfile` never called.
- [x] `src/app/settings.test.tsx` -- full app: change the password, then the session is unchanged, the user is still on `/settings?tab=security` and the profile is unchanged; then logout and login still work.

**Acceptance Criteria:**
- Given `/settings?tab=security` at 1440×1024, when compared with `112. Settings.png`, then labels, fields, phone and button are within about 1px.
- Given the whole change, when searching `src` for `console.` in non-test code and for password values written to storage, then none are found.
- Given lint, type-check, the full suite and `npm run build`, when run, then all pass.

## Implementation Notes

- **Shared rules:** `PASSWORD_MIN_LENGTH` and the five messages live in `api/types.ts`, and both `passwordSchema` and the mock's `checkPasswordChange` use them.
- **Blank New with a filled Retype:** only "New password is required." shows (no mismatch error), in both the form and the mock.
- **No stored credential:** the mock checks by length only, never trims, and touches no state, storage or session (the human decision: no stored credential).
- **Password cleanup:** `useChangePassword` uses `gcTime: 0`, and `PasswordForm` calls `change.reset()` in `onSettled`, so the passwords don't stay in the mutation cache.
- **Profile independence (review fix):** `PasswordForm` renders without waiting for the profile. Only the read-only phone reads `useProfile()`, and it stays empty until the profile loads.
- **`PasswordInput` borderless variant:** ink-2 label, 12px gap, `subtle` text, transparent border and `pl-6`. The eye toggle is kept (human decision), and Login and Signup are unchanged.
- **Visual and behaviour check (2026-11-18, Chrome at 1440×1024 via the iframe):**
  - Layout matches `112. Settings.png` to within 1px: labels at 216, 320, 424 and 528; fields 336–752; phone code at 361 and number at 426; button 336,656 to 528,704; card 304,104 to 1408,752. The Security tab underline is about 2.5px wider than the PNG (font rendering).
  - Every validation message appeared in the browser. A successful change cleared the fields, showed "Password updated." and kept the URL at `?tab=security`.
  - Afterwards the session record was identical, the mock state was identical, the typed passwords appeared nowhere in browser storage, and the user was still signed in after a reload. No non-test code under `src` calls `console`.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | blind + edge | the password form is gated on the profile query, so a failed or slow profile blocks password changes | medium | Real: `SecurityPanel` wrapped the whole form in `AsyncSection`. Patch: render the form immediately; only the read-only phone reads `useProfile()`. |
| 2 | blind | the new password can equal the old one | false | Excluded by the frozen rules ("No password-strength rules beyond length 8"). |
| 3 | blind | the full-app re-login proves nothing, and "Password updated." comes from a no-op mock | false | A human decision (2026-11-18): there is no stored credential, matching mock login and signup. The test pins that the session and login keep working. |
| 4 | blind | the "stores no password" mock test runs on empty storage | low | Real: the assertions could pass trivially. Patch: sign in and materialise state first, then compare byte for byte. The space-only loop filter is cosmetic. Rejected. |
| 5 | blind | form and adapter agreement on combined failures is untested | low | zod 4 runs object refinements after continuable issues such as `min`, and both sides apply the same per-field rules. No divergence shown. Rejected. |
| 6 | blind + edge | the double-submit guard reads `busy` from the last render | low | A discrete submit event flushes `isSubmitting` synchronously, so only a scripted double submit within one tick could get through. The same pattern as `ProfileForm`. Rejected. |
| 7 | blind | `onSettled` reset is skipped if the form unmounts mid-request | low | `gcTime: 0` still drops the mutation and its variables once unobserved, and losing feedback after leaving the tab is expected. Rejected. |
| 8 | blind | the borderless field has no focus indicator | false | The global `:focus-visible` outline in `src/styles/index.css:13` applies, the same as the borderless `TextInput` from Story 5.1. |
| 9 | blind | blank `fieldErrors` would show "highlighted fields" with nothing highlighted | low | No adapter emits blank messages. Rejected. |
| 10 | blind | no maximum password length | false | Not in the approved requirements. A future http adapter defines its own limits. |
| 11 | blind | spec and sprint status not in the diff | false | Planning artifacts were deliberately excluded from the reviewed source diff. |
| 12 | blind | the read-only phone gives no hint | low | The native `readOnly` is exposed to assistive tech, and the field appears as designed (112, frozen block). Rejected. |
| 13 | verif-gap | the non-validation alert is only tested with the fallback text | medium | Pre-verified gap. Patch: a `STORAGE_FULL` message test. |
| 14 | verif-gap | the unknown `fieldErrors` key branch is never run | medium (unverified reach) | Pre-verified, but unreachable today (the mock emits only the three keys and http is `notImplemented`). Deferred: the same root cause as the existing 5.1 deferral (the triplicated mapping helper). |
| 15 | edge | edits typed during an in-flight change are wiped by `reset` on success | low | Needs typing within the ~200ms mock delay, and the user retypes. The fix adds state or disables inputs. Rejected. |

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run build` -- expected: all pass

**Manual checks:**
- In Chrome at 1440×1024 (iframe method), measure the Security tab against `112. Settings.png`. Then run the matrix by hand: errors, success, the fields clearing, and still being signed in after a reload.
