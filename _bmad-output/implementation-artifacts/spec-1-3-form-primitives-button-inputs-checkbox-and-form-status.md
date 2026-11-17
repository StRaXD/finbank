---
title: 'Story 1.3: Form primitives: Button, inputs, checkbox and form status'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: '512782d37c9b4287d24e35b5e38d5f471ce16112'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Auth (1.6/1.7), Settings and Goals forms all need the same accessible buttons and inputs. Built per screen, they would drift from the component sheets and miss label/error wiring.

**Approach:** Build `Button`, `TextInput`, `PasswordInput`, `Checkbox` and `FormStatus` once in `src/ui/`, styled only with design tokens. Each is accessible by construction: a required label, an error linked with `aria-describedby`, and a visible focus ring. Add a single icon map, `ui/icons.ts`. Cover the behaviour with React Testing Library.

## Boundaries & Constraints

**Always:**
- **`Button` variants**:
  - `primary`: teal fill, white bold 16 text, 4px radius.
  - `outline`: 1px teal border, teal text, optional leading or trailing icon.
  - `text`: teal link-style, no padding box.
  - `google`: light-grey fill, ink-2 text, Google logo from `assets/brands/google.svg`.
- **`Button` props**: `fullWidth`, `size: 'md' | 'sm'` (sm is for the later "Details >" use), `type` defaulting to `"button"`, and all native button attributes.
- **`Button` states**: hover visibly darkens or tints, focus shows the global focus ring, and `disabled` uses a grey fill with muted text plus `cursor-not-allowed`, matching the grey "Login" in `Components-1.png`.
- **Inputs** (`TextInput`, `PasswordInput`, `Checkbox`):
  - `label: string` is required by type. A `<label htmlFor>` is linked to the field through `useId()`.
  - An optional `error?: string` renders below the field in `text-danger` with an `id`. The field gets `aria-describedby` pointing at it, plus `aria-invalid`.
  - Each component forwards `ref` and spreads native input props, so react-hook-form's `register()` works unchanged.
- **Field look**:
  - The label is 16/24 medium ink, 8px above the field.
  - The field is 48px tall with an 8px radius and a 1px `border` token by default. Filled or focused it is `ink-2`, and with an error it is `danger`.
  - Text is 16 ink-2. The placeholder is `faint`.
- **`borderless` variant**: `TextInput` takes `variant="borderless"`, with no border and a `border`-coloured underline or none, as on the Settings screen.
- **`PasswordInput`**: a trailing toggle button with `aria-label` "Show password" or "Hide password" and `aria-pressed`. It switches `type` between `password` and `text` and swaps the eye and eye-off icons.
- **`Checkbox`**: a native checkbox, visually a teal-filled square with a white check when checked, and the label to its right. It stays keyboard-operable.
- **`FormStatus`**: `{ message?: string }` renders an inline `role="status"` element in `text-positive`, or nothing when `message` is empty. It sits next to the submit button.
- **Icons**: they come only from `src/ui/icons.ts`, a single map of named lucide-react icons (`eye`, `eyeOff`, `check`, `chevronRight`, `pencil`). Components never import `lucide-react` directly.
- **Tokens**: new visual values (the Google button fill, control radii) go into `tokens.css` as tokens. The literal-scan test must stay green.

**Never:**
- No `MoneyInput`, `PhoneInput`, search, tabs or dropdowns. Their own stories build them.
- No feature, api or app imports from `ui` (AD-1 lint).
- No local restyles via `className` overrides as the documented API. Variants only.

</frozen-after-approval>

## Code Map

- `src/styles/tokens.css`: add `--color-google` (sampled from the Login/Components PNGs, about #E4E7EB) and radius tokens `--radius-button: 4px` and `--radius-input: 8px`. Update `tokens.node.test.ts` to assert them.
- `src/assets/brands/google.svg`: exists (Story 1.2). Import it as a URL in `Button`.
- `src/ui/`: empty apart from `.gitkeep`. Delete `.gitkeep`.
- `.oxlintrc.json`: the `src/ui/**` override already forbids app, features and api imports. `ui → lib` is allowed, though `lib` is still empty.
- `src/app/App.tsx` (the specimen from 1.2): add a "Components" section rendering every variant and state, for a manual comparison with `Components-1.png`.
- `vitest.config.ts` / `src/test-setup.ts`: jsdom with RTL cleanup is in place. `@testing-library/user-event` is not installed and not in the Stack table. Use `fireEvent` plus `element.focus()`/`toHaveFocus()` for interaction and keyboard-focus tests rather than adding a dependency.

## Tasks & Acceptance

**Execution:**
- [x] `src/styles/tokens.css`, `src/styles/tokens.node.test.ts` -- Add the Google-fill and radius tokens and assert them.
- [x] `src/ui/icons.ts` -- The named icon map.
- [x] `src/ui/Button.tsx` + `Button.test.tsx` -- Variants, sizes, `fullWidth`, the icon slot and the Google logo. Tests: the default `type="button"`, disabled prevents click, each variant renders, and it is focusable with Tab-equivalent `.focus()`.
- [x] `src/ui/Field.tsx` (internal) -- Shared label, error and describedby wiring used by the inputs. Not exported from an index.
- [x] `src/ui/TextInput.tsx` + test -- The label link (`getByLabelText`), error text plus `aria-describedby` plus `aria-invalid`, the borderless variant, and ref forwarding.
- [x] `src/ui/PasswordInput.tsx` + test -- Clicking the toggle flips `type`, the toggle's `aria-label`/`aria-pressed`, and the icon swap. The error and label wiring are as for TextInput.
- [x] `src/ui/Checkbox.tsx` + test -- The label link, toggles on click, `defaultChecked` respected, and the error wiring.
- [x] `src/ui/FormStatus.tsx` + test -- `role="status"` with the message, and nothing rendered when empty.
- [x] `src/app/App.tsx` (+ smoke test tweak if needed) -- The Components specimen section.

**Acceptance Criteria:**
- Given each input with a `label`, when queried by `getByLabelText(label)`, then the field is returned. TypeScript rejects omitting `label`.
- Given an `error` prop, when rendered, then the message appears below the field in `text-danger`, and the field's `aria-describedby` contains the message element's id.
- Given a `PasswordInput`, when its toggle is clicked twice, then `type` goes `password → text → password`, and the icon and `aria-label` swap each time.
- Given the specimen at 1440px, when compared with `Components-1.png` and `101. Login.png`, then the Button variants, field borders, placeholder colour, checkbox and Google button match within 2px.
- Given `npm run lint`, `npx tsc -b`, `npm test` and `npm run build`, then all pass, including the literal-scan test.

## Implementation Notes

- Added a third control-radius token, `--radius-checkbox: 2px`, for the checkbox square (Login PNG), alongside `--radius-button` and `--radius-input`.
- Shared field classes live in internal `src/ui/fieldStyles.ts` (not `Field.tsx`) so component files only export components (`react/only-export-components`).
- Refs use React 19 ref-as-prop (`ComponentPropsWithRef`) rather than `forwardRef`; `className` is omitted from every primitive's props so variants are the only styling API.
- Hover uses `enabled:hover:` (brightness for filled variants, `primary/10` tint for outline, underline for text) so disabled buttons never react.
- Icons carry `data-icon="<name>"` so tests can assert the eye / eye-off swap without depending on lucide class names.
- Borderless `TextInput` keeps a transparent border (same 48px box) with 24px inset text, matching the Settings screen; it turns `danger` with an error.

## Spec Change Log

## Review Triage Log

Pass 1 (blind, edge-case, verification-gap):

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | A field with no placeholder always shows the filled `ink-2` border (all three, incl. claim) | medium | `:placeholder-shown` needs a placeholder attribute, so `:not()` always matches. The specimen "Password (error)" has none. | patch |
| 2 | Checked + disabled checkbox renders a near-invisible check (blind + edge-case) | medium | `disabled:bg-google` sorts after `checked:bg-primary`. | patch |
| 3 | `FormStatus` live region mounts with its content, so it may not be announced; whitespace renders (all three) | medium | NVDA/JAWS skip live regions inserted already filled. Interpreted "nothing when empty" as no visible content and kept an empty region mounted. | patch |
| 4 | Password toggle stays active on a disabled field (all three) | medium | `disabled` is spread only onto the `<input>`. The toggle reveals the value. | patch |
| 5 | `--color-google` doubles as the disabled fill (blind) | medium | Changing the Google colour would recolour every disabled control. | patch |
| 6 | `id=""` bypasses the `useId` fallback (edge-case) | low | `??` passes an empty string through. One-character fix. | patch |
| 7 | Filled/focus/error border classes are unasserted (verification-gap) | medium | The gap was demonstrated: dropping the classes keeps the suite green. | patch |
| 8 | New radius and fill utilities are not checked in built CSS (verification-gap) | medium | A token rename would drop the rules silently. | patch |
| 9 | Specimen is missing disabled and borderless-error states (blind) | low | The manual PNG check cannot catch #2 or #4 without them. | patch |
| 10 | Toggle uses both `aria-pressed` and a changing `aria-label` (blind) | low | Redundant announcement. Prescribed by the frozen Always rule; the fix edits the spec. | reject (raised with human) |
| 11 | Disabled inputs have no disabled border or background (blind) | low | No screen uses a disabled input yet. Adds styling surface. | reject |
| 12 | No focus-ring test (blind) | false | No `outline-none`/`outline-0` anywhere in `src/`. The global `:focus-visible` rule (asserted in the build-output test) applies to every control. | reject |
| 13 | `sm` text sizes differ between text and boxed buttons; the Google logo does not scale (blind) | low | Deliberate per the PNG sizes. No `sm` google use is planned. | reject |
| 14 | Button tests assert class names, not behaviour (blind) | low | Consistent with the suite's jsdom limits. No defect named. | reject |
| 15 | Spec/sprint status mismatch (blind) | false | Sprint status syncs to `review` at completion. | reject |
| 16 | Checkbox label is `font-normal`, not medium (edge-case claim) | false | The Login PNG "Keep me signed in" is regular weight. The 16/24 medium rule covers stacked labels. | reject |

## Verification

**Commands:**
- `npm run lint` -- expected: exit 0
- `npx tsc -b` -- expected: exit 0
- `npm test` -- expected: all suites pass, including the new ui tests
- `npm run build` -- expected: success

**Manual checks:**
- `npm run dev`: Tab through the specimen. Every control shows the focus ring. Compare against `Components-1.png` and the Login PNG.
