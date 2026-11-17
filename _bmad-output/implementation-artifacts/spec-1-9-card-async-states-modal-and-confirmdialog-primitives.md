---
title: 'Story 1.9: Card, async states, Modal and ConfirmDialog primitives'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '1e6837d38701e7911d9d9352ad5565866d4248d7'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-8-app-shell-sidebar-top-bar-user-block-and-logout.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epics 2–5 need one shared card shell, one way to show loading, empty and error states, and one dialog. Without them, every screen invents its own spinner, error text and overlay (AD-13, AD-17, FR35, UX-DR10, UX-DR13, UX-DR21).

**Approach:** Add the `Card`, `Skeleton`, `EmptyState`, `AsyncSection`, `Modal` and `ConfirmDialog` primitives to `src/ui`. They build on the existing tokens, `Button` and Story 1.8's `overlayHost`. Make the shell's `#content-overlay-root` a viewport-bounded layer, and show every primitive on the dev specimen.

## Boundaries & Constraints

**Always:**
- **`Card`** (UX-DR10, measured from `104. Overview.png`):
  - Optional `title`, a large grey section title rendered as `h2` above the card.
  - Optional `actions` (ReactNode), right-aligned on the title row.
  - `children` inside a white `rounded-card shadow-card` box with the measured padding.
  - No `className` prop, like the other primitives.
- **`Skeleton`:** `aria-hidden` pulsing token-coloured bars, with a `lines` prop (default 3).
- **`EmptyState`:** a single muted `text-16` line holding `message`.
- **`AsyncSection<T>`:**
  - Props: `query` (a structural type — `status`, `data`, `error: { message } | null`, `isFetching`, `refetch` — so `ui` never imports TanStack or the hooks), `isEmpty?: (data: T) => boolean`, `emptyMessage`, and `children: (data: T) => ReactNode`.
  - **Loading**: when data is undefined and the query is not in error, render a `Skeleton` in an `aria-busy` region with sr-only "Loading…".
  - **Error with no data**: show `role="alert"` danger text holding `error.message` (fallback "Something went wrong. Please try again.") and a Retry `Button` that calls `refetch()`. Retry is disabled while fetching.
  - **Data present**: show `EmptyState` when `isEmpty(data)` is true, otherwise `children(data)`. A failed background refetch keeps showing the data.
- **`Modal`** (UX-DR13, measured from `110.1. Goals.png` / `110.2. Goals.png`):
  - Props: `open`, `onClose`, `title?`, `children`.
  - **Rendering**: when open, it portals into `useOverlayHost().container`, falling back to `document.body` outside a host. It renders a dim layer (black at about 13.5%, a new `--color-overlay` token) over the content area only.
  - **Panel**: white, the measured width (about 488px) and radius (new token if no existing one fits), horizontally centred in the column, and top-anchored at the measured offset below the top bar (not vertically centred). A close X sits top-right, labelled "Close".
  - **Accessibility**: `role="dialog"`, `aria-modal="true"`, labelled by `title` when given.
  - **Inert shell**: while open, it holds `acquireInert()` so the sidebar and top bar are `inert`, and releases it on close or unmount.
  - **Focus**:
    - On open, focus moves to the first focusable element in the panel.
    - Tab and Shift+Tab cycle inside the panel.
    - Esc, the X and a click on the dim layer (not the panel) call `onClose`.
    - On close, focus returns to the element that had focus when it opened.
- **`ConfirmDialog`**:
  - Props: `open`, `title`, `message`, `confirmLabel` (default "Confirm"), `cancelLabel` (default "Cancel"), `onConfirm`, `onCancel`, `pending?`.
  - Built on `Modal`, with the message, then Cancel (`outline`) and Confirm side by side and centred.
  - Confirm calls `onConfirm` only. Cancel, Esc, the X and an overlay click call `onCancel` and never `onConfirm`.
  - While `pending`, both buttons are disabled and closing is ignored.
- **Overlay root** (`AppShell`): `#content-overlay-root` becomes a `fixed` layer covering exactly the content area (right of the 280px sidebar, below the 88px top bar). It is `pointer-events-none` when empty, so it never blocks the page, and the modal layer re-enables pointer events. The dim therefore stays on screen on tall, scrolled pages.
- **Specimen:** `App.tsx` (dev-only `/__specimen`) shows `Card` with and without title and actions, the three `AsyncSection` states, and buttons that open a `Modal` and a `ConfirmDialog`.

**Never:**
- No new dependencies (no focus-trap or dialog libraries) and no native `<dialog>`/`showModal`: its top-layer backdrop would dim the whole viewport, against AD-13.
- No colour or size literals outside `tokens.css`. No changes to shell layout or behaviour beyond the overlay root.
- No feature or screen usage yet (Epics 2–5).

**Decision (human, 2026-11-17):** ConfirmDialog's Confirm button uses the teal `primary` variant. No danger variant.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Loading | pending, no data | Skeleton, `aria-busy`, no children | N/A |
| Empty | data `[]`, `isEmpty` true | EmptyState message only | N/A |
| Error | error, no data | Alert with message + Retry; Retry calls `refetch` once | Empty message → fallback text |
| Background error | error, cached data | Children with data, no alert | N/A |
| Modal open | click opener | Dialog in `#content-overlay-root`; chrome `inert`; focus inside | N/A |
| Focus trap | Tab on last / Shift+Tab on first | Focus wraps within panel | N/A |
| Close paths | Esc / X / dim click | `onClose` once; focus back on opener; chrome not inert | Panel click does not close |
| Confirm | click Confirm | `onConfirm` once, `onCancel` not called | N/A |
| Cancel | Cancel / Esc / X / dim | `onCancel` once, `onConfirm` never | N/A |
| Pending | `pending` true | Both buttons disabled; Esc and dim click ignored | N/A |

</frozen-after-approval>

## Code Map

- `src/ui/overlayHost.ts`: `useOverlayHost()` returns `{ container, acquireInert }`. Use it unchanged.
- `src/app/AppShell/AppShell.tsx`: `#content-overlay-root` is currently an unpositioned last child of `relative` `<main>`. Change only its classes, keeping it inside `<main>`, with the `id` and the `ref={setContainer}`. Update the `shell.test.tsx` overlay assertions only if needed.
- `src/ui/Button.tsx`: variants `primary`, `outline` and `text`, sizes `md`/`sm`, and icons via `ui/icons.ts`. Add `close: X` to `icons.ts` for the modal X.
- `src/ui/FormStatus.tsx`, `TextInput.tsx`: the pattern for primitives (no `className`, token classes only).
- `src/styles/tokens.css`: `radius-card`, `shadow-card`, `card`, `border`, `muted`, `subtle` and `danger` exist. Add `--color-overlay` (and a modal radius only if measured ≠ 8px), and pin new tokens in `tokens.node.test.ts`.
- `src/app/App.tsx` + `App.test.tsx`: the dev specimen. Add a section without breaking the existing assertions.
- `.oxlintrc.json`: `ui` may not import `api` (except `import type` from `api/types`) or `@/app`. `react/only-export-components` means types and helpers go in `.ts` files.
- `src/app/test-utils.tsx` `renderAt(path, api, routes)`: use it for an in-shell Modal test (probe route under `RequireSession` → `AppShell`), as `shell.test.tsx` does.

## Tasks & Acceptance

**Execution:**
- [x] `src/styles/tokens.css` + `tokens.node.test.ts` -- `--color-overlay` (plus a modal radius if needed).
- [x] `src/ui/Card.tsx` + test -- Title as `h2`, actions, and children.
- [x] `src/ui/Skeleton.tsx`, `src/ui/EmptyState.tsx` -- As specified.
- [x] `src/ui/AsyncSection.tsx` (structural query type in a `.ts` file if needed) + test -- The Loading, Empty, Error and Background error matrix rows.
- [x] `src/ui/Modal.tsx` + test -- Portal, labelling, focus trap, close paths, return focus, inert acquisition and release (including on unmount), and the `document.body` fallback.
- [x] `src/ui/ConfirmDialog.tsx` + test -- The Confirm, Cancel and Pending matrix rows.
- [x] `src/app/AppShell/AppShell.tsx` -- The overlay root as a fixed, pointer-transparent layer over the content area.
- [x] `src/app/shell.test.tsx` or a new `src/app/modal.test.tsx` -- A Modal opened inside the real shell: inside `#content-overlay-root`, the sidebar and header `inert`, and both not inert after Esc with focus back on the opener.
- [x] `src/app/App.tsx` -- The specimen section.

**Acceptance Criteria:**
- Given the specimen modal at 1440×1024 inside the shell, when compared with `110.2. Goals.png`, then the panel position, size, radius, X placement and dim colour match within 2px. The dim leaves the sidebar and top bar undimmed.
- Given a long page scrolled down, when a modal opens, then the dim still covers the visible content area and the panel is on screen.
- Given `npm run lint`, `npx tsc -b`, `npm test` and `npm run build`, then all pass.

## Implementation Notes

- **Measured (110.2. Goals.png, 2x):** dim is #F4F5F7 -> #D3D4D6 and white -> #DDDDDD, so `--color-overlay` is black at 13.5%. Panel is 488px wide (`w-122`) at x 604-1092, top at viewport y 276 (188px below the 88px top bar; `pt-69` from the full-height overlay root), with a 16px corner (new `--radius-modal`; 8px did not fit). No panel shadow. The X glyph is 18.5px (lucide `X` at size 32 in a `size-8` button, `top-6 right-6`, `text-ink-2`). Content padding: 64px sides (`px-16`), 64px top, 48px bottom.
- **Horizontal centring:** the PNG panel is 12px left of the column's centre. The layer centres the panel in a padded box `pl-6 pr-12` so it lands exactly at x 604. This is the one place the layout is tuned to the PNG rather than being strictly symmetric.
- **Card (104. Overview.png):** title `text-22 font-normal text-subtle` (#878787 measured), 8px gap to the card, 24px padding (`p-6`). The card is a `<section>` labelled by its `h2` when titled. A `data-testid="card-body"` marks the box.
- **AsyncSection:** `AsyncQuery<T>` is exported as a type from `AsyncSection.tsx` (types are allowed by `only-export-components`). Loading is "data undefined and status not error"; error-with-data renders children. The Retry is an `outline` `sm` Button.
- **Modal:** renders nothing when closed; an inner `OpenModal` owns the effects, so inert acquisition, focus-in, the key listener and focus return all tie to open/unmount. Esc and Tab are handled by a `document` keydown listener (so Esc works even if focus fell to `body`); Esc is ignored during IME composition (`isComposing`) or when a child already called `preventDefault`. A dim click closes only when the mousedown also started on the dim layer, so a drag that begins in the panel (e.g. selecting input text) and ends on the dim does not close it; Tab wraps at the ends and pulls escaped focus back in. First focusable is the X (it is first in DOM and visual order). Outside an overlay host the layer is `fixed inset-0 z-50` on `document.body`. `onClose` is read through a ref, so the latest callback is always used.
- **Overlay root:** `pointer-events-none fixed top-0 right-0 bottom-0 left-70 z-40`, still the last child of `<main>`. It covers the full viewport height because the top bar scrolls away with the document; a `top-22` root left an undimmed, clickable 88px strip after scrolling. The `<header>` is `relative z-50 bg-surface` (no layout change), so while on screen it stacks above the dim and stays undimmed. The modal layer is `absolute inset-0 pointer-events-auto`.
- **Specimen:** new "Cards, async states and dialogs" section (`data-testid="specimen-cards"`); the specimen modal mirrors 110.2 (Target Amounts input + Save).
- **Manual check (before the full-height overlay-root fix; the panel's viewport position is unchanged by it) (headless Edge 2x, 1440x1024, temporary dev route rendering the specimen modal inside `AppShell`, since reverted):** panel x/y/width, corner profile, X box and dim colour match 110.2 pixel-for-pixel at 2x; the top bar and sidebar are undimmed. Panel height differs only because of the child input's height (caller content). After scrolling a 3000px page by 2000px, the overlay root and layer stayed at viewport (280,88)-(right,bottom) (now (280,0)), the dialog stays at y 276, and `elementFromPoint` in the content area hits the dim layer.
- **Known limitation:** if a Modal is already open on the very first render of `AppShell` (before its overlay-root ref is set), it first portals to `document.body` and then re-mounts its subtree into the root. The focus effect has empty deps and does not rerun, so focus is lost to `body` (Tab and Esc still work through the document listener, and Tab pulls focus back into the panel). No screen does this.
- **Build:** the >500 kB chunk warning is pre-existing (527.82 kB at baseline vs 528.04 kB now).

## Spec Change Log

## Review Triage Log

Pass 1 (blind, edge-case, verification-gap):

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | After scrolling, the top bar scrolls away but the overlay root still starts at `top-22`, leaving an undimmed, clickable 88px strip (edge-case claim) | medium | The content column scrolls with the document. Only the sidebar is `fixed`. Fix: root `top-0`, header stacked above it with its own background, panel offset kept. | patch |
| 2 | Shift+Tab with focus outside the panel is untested (verification-gap) | medium | Gap demonstrated: dropping `outside ||` keeps the suite green. | patch |
| 3 | A drag that starts in the panel and ends on the dim closes the modal (blind + edge-case + verification-gap other) | low | `click` fires on the common ancestor (the layer). A likely path when selecting amount text. Direct mousedown-origin check. | patch |
| 4 | Esc during IME composition, or Esc already handled by a child, closes the modal (blind + edge-case) | low | No `isComposing`/`defaultPrevented` guard. One-line fix. | patch |
| 5 | `Card` `actions={cond && <X/>}` (false/null) renders an empty header row (edge-case) | low | `actions !== undefined` treats `false`/`null` as present. A common JSX pattern. Direct fix. | patch |
| 6 | Implementation note understates first-render remount: focus is lost, not moved (verification-gap other) | low | The empty-deps focus effect does not rerun after the portal target changes. Note correction only. | patch |
| 7 | Untitled modals (the specimen and design form modals) have no accessible name (blind) | medium | `aria-labelledby` only with `title`. The design's form modals have no visible title. The fix adds a prop (`aria-label`) and is better done with Epic 4's first consumer. | defer |
| 8 | Focus return fails for openers in the inert sidebar/top bar (edge-case) | low | Openers are content-area buttons by design. Fixing it needs deferred focus. | reject |
| 9 | Nested modals: one Esc closes all; competing traps (blind + edge-case) | low | No nested dialog is planned (Epic 2 confirms from pages). A modal stack adds complexity. | reject |
| 10 | Focusable selector matches hidden/inert/negative-tabindex nodes (blind + edge-case) | low | Panels hold simple forms. Extra filtering adds complexity. | reject |
| 11 | The page scrolls under the dim (blind + edge-case) | low | Cosmetic. A scroll lock adds side effects. | reject |
| 12 | `error.message` non-string crashes `.trim()` (blind + edge-case) | false | Typed `{ message: string }`, and adapters throw only `ApiError` (AD-2). | reject |
| 13 | Disabled query (`enabled:false`) shows the skeleton forever (all three) | low | No caller disables queries. The structural type documents loading semantics. | reject |
| 14 | `Skeleton lines` NaN/Infinity (edge-case) | low | Internal callers pass literals. | reject |
| 15 | Empty-string `title` on Card/Modal (edge-case) | low | No caller passes `''`. | reject |
| 16 | ConfirmDialog lacks `aria-describedby`/`alertdialog`; initial focus on X (blind) | low | Dialog content is read in full. Initial focus follows the frozen "first focusable" rule. | reject |
| 17 | Pending: X looks clickable; focus drops when Confirm disables (blind) | low | Close is ignored while pending, per spec. Brief state. | reject |
| 18 | Page content behind the modal is not inert for AT (blind) | low | `aria-modal` is set, and AD-13 specifies chrome inert only. Making the outlet inert breaks return focus to content openers. | reject |
| 19 | Overlay root repeats the shell sizes `top-22`/`left-70` (blind) | low | The same values live in `AppShell` next to `Sidebar` and `TopBar`. No named divergence. | reject |
| 20 | Spec `in-review` vs sprint `in-progress` (blind) | false | Sprint syncs to `review` at completion. | reject |
| 21 | `emptyMessage` required without `isEmpty`; `aria-busy` with no live region; fixed `h2` level; untested no-focusable branch (blind) | low | API ergonomics and minor coverage, with no named failure. | reject |

## Verification

**Commands:**
- `npm run lint`, `npx tsc -b`, `npm test`, `npm run build` -- expected: all pass

**Manual checks:**
- Signed in, open the specimen modal inside the shell. One way: temporarily render it from a placeholder page, or route `/__specimen` under the shell in dev if trivial. Screenshot it at 1440×1024 and compare it with `110.2. Goals.png`.
