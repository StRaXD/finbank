---
title: 'Story 5.2: Profile picture upload'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: 'be903f4dbc6b3ce3158d01a8e6f6707e09c22983'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Account tab has no way to set a profile photo, so the sidebar avatar is always the placeholder.

**Approach:** Add the "Your Profile Picture" column with a dashed upload box to the Story 5.1 profile form. A picked image previews in the box and is sent with "Update Profile" through the existing `updateProfile`. The mock adapter validates the image, downscales it to a JPEG data URL of at most 256px, and stores it in the profile inside `finbank:mock:v1`. The existing `profile` invalidation then refreshes the sidebar avatar.

## Boundaries & Constraints

**Always:**
- **One save path:** reuse `updateProfile`, `useUpdateProfile` and the `profile` invalidation. There is no new port method or query.
- **Avatar consumers:** every avatar reads `useProfile().data.avatarUrl`. Today that is only the sidebar `UserBlock`; the header has no avatar, by design.
- **Box contents:** the box shows the pending pick's preview if there is one, otherwise the saved avatar, otherwise the empty prompt (image-plus icon and "Upload your photo").
- **Activation:** the box is a native `<button>`, so click, Enter and Space all open the picker. Its accessible name is "Upload your photo", or "Change your photo" once an image shows.
- **Picking an invalid file:** an invalid pick (wrong type or too large) shows an inline error under the box. The previous preview or saved avatar stays, and nothing is sent.
- **Picking a valid file:** a valid pick clears that error. The photo is saved only by "Update Profile", together with the fields, and only if the fields pass validation.
- **Save failure:** a failed save (`STORAGE_FULL`, VALIDATION on `avatar`, a decode failure) leaves the stored profile and avatar unchanged and keeps the pending preview so the user can retry. The error shows inline: `fieldErrors.avatar` under the box, anything else as the existing alert.
- **After a successful save:** the pending pick is cleared and the box shows the saved avatar.
- **Persistence:** the photo survives a reload and a logout followed by a login. Logout never touches the mock profile.
- **Object URLs:** preview URLs are revoked when replaced and on unmount.
- (Human decision 2026-11-18) Accepted files are JPEG, PNG, WebP and GIF (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) of at most 5 MB (5 × 1024 × 1024 bytes). They are checked on pick, and again in the mock adapter before decoding.

**Never:**
- No remove-photo control, no drag and drop, no cropping UI.
- No avatar in `Session` or in context.
- No full-size image in storage.
- No hex literals and no `text-faint` text.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pick valid | 2000×1000 PNG | Preview fills the box; nothing is stored yet | N/A |
| Save valid | picked PNG plus valid fields | Stored as a JPEG data URL of at most 256×128, and the sidebar image src updates without a reload | N/A |
| Non-image | `notes.pdf` | Inline "Choose a JPEG, PNG, WebP or GIF image." and the previous box contents stay | client |
| Too large | 6 MB JPEG | Inline "Choose an image under 5 MB." and the previous box contents stay | client |
| Undecodable | `.png` with garbage bytes | VALIDATION `fieldErrors.avatar` "We couldn't read that image." and the old avatar is kept | adapter |
| Storage full | quota error on write | `STORAGE_FULL` alert, the old avatar is kept in storage and the sidebar, and the preview stays | adapter |
| Fields only | no pick | `avatarUrl` unchanged (Story 5.1 behaviour) | N/A |
| Reload / re-login | saved avatar | Sidebar and box show the stored avatar | N/A |

</frozen-after-approval>

## Code Map

- `src/api/types.ts` -- `ProfileInput`. Add an optional `avatar?: Blob` (a picked file; omitted means keep the current avatar).
- `src/api/port.ts:36-43` -- `updateProfile` doc. Extend it with the avatar rules.
- `src/api/mock/mockApi.ts` -- `MockApiOptions` (:55): add `encodeAvatar?: (image: Blob) => Promise<string>`, defaulting to the browser downscaler. `call` (:721) takes only a sync `fn`; let it await an async `fn`. `updateProfile` (:782): validate the fields, then the avatar (type and size), then encode, then write first and commit. `writeItem` (:124) already maps quota errors to `STORAGE_FULL`.
- `src/api/mock/avatar.ts` (new) -- `fitWithin(w, h, max=256)` (never upscales) and `downscaleToJpegDataUrl(blob)`: `createImageBitmap`, canvas filled white first (for PNG transparency), `toDataURL('image/jpeg', 0.85)`. A decode failure throws.
- `src/app/test-utils.tsx:13` -- `createTestApi`: pass a stub `encodeAvatar`, because jsdom has no image decoding.
- `src/ui/icons.ts` -- add `imagePlus: ImagePlus`, the only lucide entry point.
- `src/ui/ImageUpload.tsx` (new) -- presentational dashed box: `label`, `imageUrl`, `onSelect(file)`, `error`, `accept`. It wraps a hidden file input in a `<button>`, and the error goes through `aria-describedby`.
- `src/features/settings/components/ProfileForm.tsx` -- holds the pending `File` and object URL in local state, validates on pick, sends `avatar` on submit, and maps `fieldErrors.avatar`. The right column is `lg:ml-auto lg:w-89`.
- `src/app/AppShell/UserBlock.tsx:18` -- already reads `avatarUrl`; no change expected.
- **Design (111. Settings.png, at 1440):** label "Your Profile Picture" is 16px medium `muted`, at x 1020, top 216 (the same row as Full name). The box is at 1023.5 to 1165 × 272 to 402.5 (about 142×130): a 1px dashed `faint` border, 7px dashes, rounded. Icon: 36px, `subtle`, top 296. Text: 12px with a 16px line, `subtle` (the PNG grey is too light for AA), two lines "Upload your / photo", top 350.

## Tasks & Acceptance

**Execution:**
- [x] `src/api/types.ts`, `port.ts` -- add `avatar?: Blob` and document the rules.
- [x] `src/api/mock/avatar.ts` + test -- `fitWithin` table (landscape, portrait, small not upscaled) and the downscaler with stubbed `createImageBitmap` and canvas (white fill, JPEG at 0.85, a rejection on decode failure).
- [x] `src/api/mock/mockApi.ts` + test -- async `call`; avatar validation, encode and store. Cover: stored as the encoder output, persisting for a fresh adapter; type, size and decode failures as VALIDATION `fieldErrors.avatar` with nothing written; `STORAGE_FULL` keeping the old avatar; no avatar keeping `avatarUrl`; logout keeping the avatar.
- [x] `src/app/test-utils.tsx` -- stub encoder.
- [x] `src/ui/icons.ts`, `src/ui/ImageUpload.tsx` + test -- empty prompt, preview, button activation opening the input, `onSelect`, and error wiring.
- [x] `src/features/settings/components/ProfileForm.tsx`, `SettingsPage.test.tsx` -- the column, the pick validation, and the matrix rows at form level.
- [x] `src/app/settings.test.tsx` -- full app: pick, save, then the sidebar `img` src becomes the stored data URL; it persists over a remount and over logout plus login; `STORAGE_FULL` keeps the old sidebar src.

**Acceptance Criteria:**
- Given the Account tab at 1440×1024, when compared with `111. Settings.png`, then the label and box are within about 1px.
- Given the box is focused, when Enter or Space is pressed, then the file picker opens.
- Given lint, type-check, the full suite and `npm run build`, when run, then all pass.

## Implementation Notes

- **Shared rules:** the avatar MIME list, the 5 MB limit and both error messages live once in `api/types.ts`, and the picker (`schemas.ts`) and the adapter both use them.
- **`call` is async:** `call` in the mock adapter now awaits async functions. `updateProfile` checks the fields, then the avatar, then encodes, and only then reads state, writes first and commits.
- **Downscaler:** `api/mock/avatar.ts` uses `createImageBitmap` with `imageOrientation: 'from-image'`, a white fill, `imageSmoothingQuality: 'high'` and JPEG at 0.85. Tests inject `stubEncodeAvatar` through `createTestApi`.
- **`ImageUpload` (new ui primitive):**
  - The hidden input sits beside the `<button>`; HTML doesn't allow an input inside a button.
  - The dashed border is an SVG rect with `stroke-faint` and a `6 4` dash, measured from the PNG.
  - The label is a `<p>` that names the group, so the button can keep the name "Upload your photo".
- **No flash after saving:** `ProfileForm` keeps a saved pick until the refetched profile shows the stored URL, so the previous photo never flashes back.
- **Visual check (2026-11-18, Chrome at 1440×1024 via the iframe, real downscaler):**
  - Everything measured within 1px of the PNG: label 1020,216 in `muted`; box 1023–1165 × 272–402; icon 1076–1112 × 296–332; card 304,104 to 1408,752; button 336,656 to 528,704.
  - The prompt text sat about 3.5px low, so `mt-4.5` became `mt-3.5`.
  - End to end: a 2000×1000 PNG was stored as a 256×128 JPEG of about 2.3 KB. The sidebar and the box updated without a reload, and the photo survived a reload and a logout followed by a login.
  - Errors: a PDF, a file over 5 MB and a garbage `.png` each showed the right inline error and kept the stored avatar. A forced `STORAGE_FULL` kept the old avatar in storage and in the sidebar, with the preview kept.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | blind | avatar type and size messages duplicated in the adapter and `schemas.ts` | low | Real drift risk between the picker and the adapter copy. Patch: shared constants in `types.ts`. |
| 2 | blind | "under 5 MB" while exactly 5 MB is accepted | low | The wording is fixed by the frozen matrix, and the rule ("at most 5 MB") is a human decision. A boundary case nobody meets in practice. Rejected. |
| 3 | blind | `createImageBitmap` without `imageOrientation: 'from-image'` | low | Older engines may store phone photos sideways. A one-option correction. Patch. |
| 4 | blind + edge | single-step downscale with no `imageSmoothingQuality`; full-size decode memory | low | The quality part is a one-line correction. Patch. The memory spike needs a pixel cap and a branch, and is rare (5 MB cap). Rejected. |
| 5 | blind + edge | undecodable pick shows a broken preview, and retry resends the same file; no `img` `onError` | low | Real, but rare (a corrupt file with an image MIME type). The adapter returns "We couldn't read that image." and the old avatar is kept. The frozen block chose to keep the pending pick on any failure. The fix adds state and branches. Rejected. |
| 6 | blind + edge + verif-gap | the saved pick never clears if the refetch fails or brings another avatar | low | Needs a failed refetch or a second writer (single-user mock, `refetchOnWindowFocus: false`). The fix adds tracking state. Rejected. |
| 7 | blind | no remove or undo of a photo | false | Excluded by the frozen Never list ("no remove-photo control"). |
| 8 | blind + verif-gap | a pick during an in-flight save; the `current === avatar` guard is untested | medium | Pre-verified gap; removing the guard would silently lose the second pick. Patch: add the test. |
| 9 | blind | the no-flash test only starts from a null avatar | low | A real gap for the replace-existing case the comment describes. Patch: add the test. |
| 10 | blind | adapter `fieldErrors` carry user-facing copy | false | The house pattern for every adapter (`checkRequired` and `checkEmail` predate this story); the UI shows `message` by design (AD-5). |
| 11 | blind + edge | overlapping `updateProfile` calls are ordered by encode completion | low | The form disables submit while busy, so overlap needs two tabs on one adapter instance, which is impossible because each tab has its own instance. Rejected. |
| 12 | verif-gap | the re-read of `state()` after the async encode is untested | medium (unverified reach) | Pre-verified gap with a filed disposition of defer. It is only reachable with another writer on the same adapter during an encode. Deferred. |
| 13 | blind | animated GIF flattened to one JPEG frame | false | Expected under AD-6 (avatar stored as JPEG). |
| 14 | blind | duplicate `MutationObserver` helper and an observer leak; the class-based sidebar selector | low | Test-only, with no user impact and no named breakage today. Rejected. |
| 15 | blind | spec and sprint status not in the diff | false | Planning artifacts were deliberately excluded from the reviewed source diff. |
| 16 | edge | missing `createImageBitmap` reported as "couldn't read" | low | Every supported evergreen browser has it. Rejected. |

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run build` -- expected: all pass

**Manual checks:**
- In Chrome at 1440×1024 (use the iframe method), pick a real photo, save, and check the sidebar. Reload, log out and log in, and confirm the photo is still shown. Measure the box against the PNG.
