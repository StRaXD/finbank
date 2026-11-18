# Epic 5 Context: Profile and security settings

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let users keep their account details, photo and password up to date from `/settings`. When this epic is done, Settings shows one white card with Account and Security tabs, and the URL tracks the active tab. The Account tab edits full name, email, username, phone and profile picture. The Security tab changes the password. Profile edits show up right away in the sidebar user block (name and avatar) and the Overview "Hello {firstName}" greeting, with no reload. This epic adds the last two input primitives, `PhoneInput` and the borderless input style. It also adds the dashed photo upload box and the mock adapter's avatar downscaling and `STORAGE_FULL` handling.

## Stories

- Story 5.1: Settings tabs and the profile form
- Story 5.2: Profile picture upload
- Story 5.3: Change password

## Requirements & Constraints

- **Tabs:** Account and Security. The active tab has teal text and a 2px teal underline. Account is the default. `/settings` and `/settings?tab=account` show Account, and `?tab=security` shows Security. Switching tabs updates the URL, so "View profile" in the sidebar can deep-link to Settings → Account. The page has no page heading, unlike the other pages.
- **Profile fields:** Full name, Email, Username and Phone Number, prefilled from the current profile. All four are required, and email must be a valid format. An invalid form shows inline errors in #E73D1C and saves nothing. The seeded user is Tanzir Rahman / tanzir.rahman@email.com / tanzir.rahman / +880 | 51547 58868.
- **Phone:** uses the plain "+code | number" layout (country code, divider, number), not the flag-and-dropdown variant on the component sheet. Both parts are editable on the Account tab.
- **Profile save:** "Update Profile" persists the fields and any picked photo, then shows a `FormStatus` confirmation. The sidebar name and avatar and the Overview greeting update without a reload.
- **Profile picture:** the dashed box opens an image file picker and can be activated by click or keyboard. Accepted files are JPEG, PNG, WebP or GIF of at most 5 MB (human decision, Story 5.2), checked on pick and again in the adapter. A picked image replaces the box contents with a preview. A non-image file shows an inline error. The photo is saved only by "Update Profile", is stored on the client, and survives a reload.
- **Storage full:** if saving fails with `STORAGE_FULL`, show an inline error and keep the existing profile data.
- **Password change:** Old, New and Retype are masked. All are required, New must be at least 8 characters, and Retype must match New. Each error appears on the field it concerns, and nothing is submitted. On success, `changePassword` resolves in mock mode, the three fields clear and a `FormStatus` confirmation appears. The mock does not check Old Password against a stored credential (human decision, Story 5.3): mock login and signup store none, so no password or hash is ever stored. The session is kept, and the eye toggle stays on all three fields (an accepted deviation from 112).
- **Phone on Security:** shown read-only with the profile's value. "Update Password" never changes it.
- **Persistence:** profile edits and the photo persist in localStorage. Clearing storage restores the seed.
- **Accessibility:** every input has a label, everything is keyboard-reachable with a visible focus state, and the upload box works from the keyboard.
- **Fidelity:** both tabs match the design at 1440×1024.

## Technical Decisions

- **Port:** `getProfile(): Promise<UserProfile>` → `useProfile()`. `updateProfile(i: ProfileInput): Promise<UserProfile>`, `changePassword(i: PasswordInput): Promise<void>`. Both need an http stub that throws `NOT_IMPLEMENTED`. `UserProfile` holds the full name, email, username, phone country code, phone number and profile picture.
- **Invalidation:** `updateProfile` → `profile` in the single `invalidationMap`. `changePassword` invalidates nothing. Mutation hooks invalidate only through the map.
- **Shell identity:** `Session` stays `{ userId, persistent }`. The shell reads the name and avatar only through `useProfile()`, so the profile invalidation is what refreshes the sidebar and greeting. Never copy the profile into context or state, except as form default values.
- **Tab state:** lives in the URL search param (`?tab=account|security`), not in component state. Use the `routes` constants. Do not add a global store.
- **Avatar storage:** only the mock adapter writes state. Before storing, it downscales the image to a JPEG data URL of at most 256px. It writes through to `finbank:mock:v1`. A full store throws `ApiError{code:'STORAGE_FULL'}`, and the adapter keeps the previous profile. Adapters throw only `ApiError { code, message, fieldErrors? }`, and UI copy comes from `message`.
- **Forms:** react-hook-form with zod. Schemas live in `features/settings/schemas.ts`. Field errors go through each input primitive's `error` prop, and `ApiError.fieldErrors` map to `setError`. Success uses `FormStatus`.
- **Ownership:** `PhoneInput` (requires `label`) and the borderless input variant live in `src/ui`. Add looks as variants, never as local restyles. `Tabs` already exists in `src/ui`. Settings screens and forms are owned by `features/settings`.
- **Colours:** no hex literals outside `tokens.css`.
- **Tests:** unit tests for the avatar downscale and the `STORAGE_FULL` path. React Testing Library tests for each password validation rule and the success path.

## UX & Interaction Patterns

- **Layout:** a single white card with the tab bar at the top. On Account, the form fields are in the left column, and "Your Profile Picture" with the upload box is in the right column. Security has no picture column.
- **Inputs:** Settings uses borderless labelled inputs, as designed, rather than the bordered auth style.
- **Upload box:** dashed border with an image-plus icon and the text "Upload your photo". After a file is picked, the preview fills the box.
- **Buttons:** primary teal "Update Profile" on Account and "Update Password" on Security.
- **Feedback:** inline errors in #E73D1C under the relevant field, and a short inline `FormStatus` success message.

## Cross-Story Dependencies

- Builds on Epic 1: `TextInput`, `PasswordInput` (eye toggle), `Button` primary, `Card`, `FormStatus`, the sidebar user block and "View profile" link, the Overview greeting, `useProfile()`, `routes`, and the mock store. It also reuses `Tabs` from Epic 2.
- 5.1 creates the Settings page, the URL-driven tabs, `PhoneInput`, the borderless input style, `updateProfile` and the `profile` invalidation. Security is a placeholder until 5.3.
- 5.2 adds the upload box to 5.1's Account tab and extends 5.1's profile save to include the photo, with downscaling and `STORAGE_FULL` handled in the adapter.
- 5.3 fills the Security tab, reuses `PhoneInput` read-only with the profile's phone, and adds `changePassword`.
