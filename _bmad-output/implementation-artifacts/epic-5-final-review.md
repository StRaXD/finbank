# Epic 5 final review

- **Date:** 2026-11-18
- **Target:** `feat/epic-5` vs `main` (`dfb7559..81e965b`, stories 5.1–5.3), `src/` only. 37 files, +2,586 / −26 lines.
- **Mode:** full. Checked against:
  - `epic-5-context.md` and the three story specs, including each frozen block and every human decision;
  - PRD FR-29 to FR-33 and NFR-1;
  - the architecture spine (AD-5 to AD-8);
  - Figma screens 111 and 112.
- **Chunks:**
  1. `src/api`, `src/lib` and `src/styles` (42 kB diff).
  2. `src/ui`, `src/app` and `src/features` (99 kB diff).
- **Layers:**
  - Blind Hunter, Edge Case Hunter and Verification Gap on each chunk.
  - One Acceptance Auditor across the whole epic.
  - 7 runs in total; no layer failed.
- **Focus areas requested:**
  - profile persistence;
  - avatar upload, validation, processing and storage failures;
  - password validation, errors and session preservation;
  - consistency between Settings, the sidebar and Overview;
  - accessibility, keyboard and modals;
  - password security;
  - no regressions in Epics 1–4.

## Verification

| Check | At review time (`81e965b`) | After fixes |
|---|---|---|
| `npm run lint` (oxlint `--deny-warnings`) | pass | pass |
| `npx tsc -b` | pass | pass |
| `npm test` | 87 files; 2657 passed, 6 skipped | 87 files; 2660 passed, 6 skipped |
| `npm run test:tz` | 20 files; 1341 passed, 4 skipped | 20 files; 1341 passed, 4 skipped |
| `npm run build` | pass. The JS chunk is 999 kB (300 kB gzip), up from 986 kB at Epic 4 (the existing bundle-size deferral) | pass, same |

## Acceptance audit

Every acceptance criterion of stories 5.1–5.3 is met, superseded by a recorded human decision, or a recorded, accepted deviation. The Acceptance Auditor ran the Settings, PhoneInput, ImageUpload and avatar test files (85 tests) and found no blocking violations. A grep finds no `console.` call in non-test code under `src`.

- **Human decisions:**
  - 5.1: profile edits never affect the session or login.
  - 5.2: JPEG, PNG, WebP or GIF of at most 5 MB.
  - 5.3: no stored-credential check in the mock; the eye toggle is kept.
- **Accepted deviations:**
  - 5.2: the hidden file input sits beside the `<button>`, not inside it (HTML does not allow an input inside a button).
  - 5.3: there is no `SecurityPanel` wrapper; the form renders without waiting for the profile (a 5.3 review fix).
  - 5.3: the eye icons appear on the password fields, unlike the 112 PNG.
- **Planning docs:** behind on these decisions; fixed below.

## Cross-screen consistency (1440×1024, Chrome, real `vite` dev server, real image downscaler)

One browser session on a fresh seed:

| Step | Settings | Sidebar user block | Overview greeting |
|---|---|---|---|
| Seed | Tanzir Rahman, no photo | "Tanzir Rahman", placeholder avatar | Hello Tanzir |
| Save "Jane Doe" with a 400×400 JPEG | fields and box show the saved values | "Jane Doe" and the new avatar, before the save settled | Hello Jane |
| After a real page reload | same | same | Hello Jane |
| Logout, then login with a different email | same | same | Hello Jane |

- **One source:** the sidebar, the greeting and the Account form all read `useProfile()`, a single `qk.profile()` entry. `updateProfile` invalidates `profile` through `invalidationMap`, and the mutation stays pending until the active profile query has refetched.
- **Avatar:**
  - The real encoder stored 2000×1000 → 256×128 JPEG (about 2.3 KB) in Story 5.2. Here, 400×400 → 256×256.
  - A PDF, a file over 5 MB and a garbage `.png` each showed the right inline error, and the stored avatar was kept.
  - A forced `STORAGE_FULL` kept the old avatar in storage and in the sidebar, with the preview kept.
- **Password:**
  - Every validation message appeared on its field.
  - A successful change cleared the fields and kept the session record and the mock state byte-identical.
  - No typed password appeared in browser storage, and the user was still signed in after a reload.
- **Epics 1–4 smoke check:** Overview, Balances, Transactions, Bills, Expenses and Goals all render after the profile changes. The full suite, including the Epic 1–4 tests and the 20-file timezone run, is green.

## Accessibility and keyboard (real key presses)

- **Tabs:** ArrowRight and ArrowLeft move between the tabs and update `?tab=`.
- **Focus order and outline:** Tab walks Full name → Email → Username → phone code → phone number → photo box ("Change your photo" / "Upload your photo") → "Update Profile". Each shows the global 2px `:focus-visible` outline, including the borderless fields.
- **Upload box:** Enter and Space open the file picker (checked in Story 5.2).
- **Pick errors:** a rejected pick is now announced as an alert (fix below).
- **Modals:** Epic 5 adds none. The Epic 2/4 modal tests (focus, Esc, overlay, pending guards) still pass.

## Figma comparison

| Screen | Reference | Result |
|---|---|---|
| `/settings` Account | 111 | Card 304,104 to 1408,752. Tabs 336–425 with a 2px underline at 182–184. Labels at 216/320/424/528. Values at x 360. Phone: code 361, divider about 411, number 426. "Your Profile Picture" at 1020,216 (`muted`). Box 1023–1165 × 272–402. Icon 1076,296 (36px). Prompt text ink at about 349.5. Button 336,656 to 528,704. All within 1px. |
| `/settings?tab=security` | 112 | Same grid: labels at 216/320/424/528, phone row identical, button 336,656 to 528,704. The Security underline is about 2.5px wider than the PNG (font rendering). |

Intentional differences:
- The design's light greys for values, the inactive tab and the upload prompt (#878787, #9F9F9F) use `subtle`, because `faint` text is reserved for disabled states (contrast).
- The eye toggles on the password fields are kept (human decision).
- The password fields start empty, with no placeholder asterisks.

## Review Findings

### Patch (applied)
- [x] [Review][Patch] `useUpdateProfile` kept settled mutations, with personal data and a photo `Blob` of up to 5 MB, in the MutationCache for the default 5 minutes after unmount. It now uses `gcTime: 0` like `useChangePassword`, and the hook test covers it. [src/api/hooks/useUpdateProfile.ts, hooks.test.tsx]
- [x] [Review][Patch] Nothing tested that `updateProfile` reads state after the async avatar encode. A test now runs `updateCategoryLimit` during a held encode and checks that both writes survive, in memory, in storage and in a fresh adapter. It fails if `state()` is read before the encode. [src/api/mock/mockApi.test.ts]
- [x] [Review][Patch] Photo-pick errors appear after the OS file picker closes but were not announced. The `ImageUpload` error is now `role="alert"`, still linked by `aria-describedby`. [src/ui/ImageUpload.tsx, ImageUpload.test.tsx, SettingsPage.test.tsx]
- [x] [Review][Patch] The password purge from the mutation cache was tested only after a success. A failure case is added. [SettingsPage.test.tsx]
- [x] [Review][Patch] The `PasswordForm` `onSettled` comment credited `reset()` alone. It now names `gcTime: 0` as what drops the passwords. [PasswordForm.tsx]
- [x] [Review][Patch] Planning docs were behind on the Epic 5 human decisions:
  - PRD FR-30/31/32 and the assumptions list: session independence, the avatar types, size, errors and storage, and the password mock behaviour and eye toggle.
  - Architecture spine AD-6: the avatar pipeline and `changePassword` storing nothing.
  - `epics.md` 5.2/5.3: decision notes.
  - `epic-5-context.md`: the open Old Password question is resolved, and the avatar limits are added.

### Deferred (logged in `deferred-work.md`)
- [ ] ProfileForm's "ignore submit while busy" guard has no test (PasswordForm has one). Low exposure: the disabled button blocks normal submits.
- [ ] Cap the decoded pixel area of a picked avatar. A small, highly compressed image with huge dimensions decodes at full size before the downscale.
- [ ] The `fieldErrors` → `setError` mapping now exists in four copies (auth, goals, ProfileForm, PasswordForm), and the unknown-key branch is tested only in auth. This adds to the 5.1 and 5.3 deferrals of one shared helper.
- [ ] Bundle size: 999 kB (300 kB gzip). This adds to the existing item.
- Carried from the story reviews: the 5.2 concurrent-write test is now done (patch above), so that deferral is resolved.

### Rejected or dismissed (verified)
- **New password may equal the old one; no maximum length; no strength rules; profile fields only checked as required (no phone or username format, no max length):** the approved requirements set only required fields, a valid email and a minimum length of 8 (the 5.3 frozen rules exclude other strength rules). These would be new product rules.
- **"Password updated." from a no-op mock; the re-login test proves nothing:** a human decision (5.3). No stored credential exists, matching login and signup. The tests pin that the session and login keep working.
- **No remove-photo control; `ProfileInput` cannot clear the avatar:** excluded by the 5.2 Never list.
- **GIF flattened, transparency filled white:** expected under AD-6 (the avatar is stored as JPEG). Now documented in PRD FR-31.
- **Size message "under 5 MB" while exactly 5 MB is accepted:** the wording is fixed by the 5.2 frozen matrix, and the rule ("at most 5 MB") is a human decision. A boundary nobody meets.
- **Astral or emoji characters counted as two toward the 8-character minimum:** rare in practice, and the fix needs a custom zod refinement plus an adapter change.
- **Input object mutated during the encode; cross-realm `Blob`; injected encoder returning non-JPEG:** none is reachable. react-query passes a fresh values object, the app has no iframes, and the encoder is injected only by tests.
- **Overlapping avatar saves finish out of order; edits typed during a save are overwritten by `reset`; a saved pick sticks if the refetch fails; the form ignores external profile changes:** each needs a second writer, a failed refetch or typing inside the ~200ms mock delay. `refetchOnWindowFocus` is off and each tab has its own adapter. Rejected in the story reviews and re-checked here.
- **Switching tabs discards unsaved edits; a password result is lost if the tab changes mid-request:** standard tab behaviour. `gcTime: 0` still purges the passwords.
- **The borderless fields have no focus style:** false. The global `:focus-visible` outline (2px) was measured on every field with real Tab presses.
- **`PhoneInput` uses `disabled:text-faint`:** allowed by the project rule (`faint-text.node.test.ts` permits faint text only behind `disabled:`), the same as `fieldBase`.
- **Canvas `fillStyle = 'white'`:** a canvas fill, not CSS styling. The design-literal test passes.
- **"Profile updated." returns when an edit is reverted to the saved value:** cosmetic; the shown values do equal the saved profile.
- **Shared decode message:** the form never produces that error itself, only shows the adapter's.
- **Full-size decode quality in Firefox, the `getContext` null branch and `fitWithin(0)` untested, a failed `useUpdateProfile` hook test:** test or quality niceties with no reachable user harm.
- **Phone accessible names ("Phone Number number"), tab panel `aria-label`, `?tab=bogus` left in the URL, `AsyncSection` `emptyMessage=""`, duplicated `MutationObserver` helpers, a class-based sidebar selector, the type-level `PhoneInput` label test rendering at runtime:** spec-mandated naming, or test-robustness and cosmetic items with no user impact. Rejected in the story reviews.
