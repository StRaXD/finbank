---
title: 'Story 1.8: App shell: sidebar, top bar, user block and logout'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '59f4faee34bd5ee6dcfa7707ba6bb531e1df61d5'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-6-routing-session-guard-and-login-screen.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Signed-in routes render inside a bare `AppLayout`, so users can't navigate between sections, see who they are, or log out (FR6–FR9). Story 1.9's `Modal` also has no `#content-overlay-root` or inert hook to build on (AD-13).

**Approach:** Replace `AppLayout` with `app/AppShell/`: a dark sidebar, a top bar and a content column. Data comes from `useProfile`, `useToday` and `useLogout`. A small overlay-host context in `ui` gives 1.9's `Modal` the portal target and the inert switch.

## Boundaries & Constraints

**Always:**
- **Layout at 1440×1024:** matches the shell in `104`–`111` PNGs (2× exports).
  - Sidebar: fixed, 280px wide, full height, `bg-sidebar`. The page background is `surface`.
  - Top bar: about 88px tall, with a 1px `border` bottom divider.
  - Content column: holds the `<Outlet/>`, then `<div id="content-overlay-root">`, positioned so a later overlay covers only this column.
- **Sidebar, top to bottom:**
  - White wordmark (`wordmark-white.svg`).
  - Seven `NavLink`s in this order, each an icon plus label: Overview `/`, Balances, Transactions, Bills, Expenses, Goals, Settings.
  - Logout button (`on-dark-hover` background, icon plus "Logout").
  - A divider (`on-dark-divider`), then the user block.
- **Nav state:**
  - Active means the first path segment matches. `/balances/acc_1` activates Balances, and `/` activates only Overview.
  - Active: teal pill (`bg-primary`), bold white text, `aria-current="page"`.
  - Inactive: `on-dark-muted` text, `on-dark-hover` background on hover.
- **User block:**
  - Avatar: `profile.avatarUrl` when set, otherwise `src/assets/avatar-placeholder.svg`, as a round image with `alt=""`.
  - Full name from `useProfile()`.
  - "View profile": a link to `routes.viewProfile` = `/settings?tab=account`, defined in `routes.ts`.
  - Kebab icon button, labelled "More options".
  - While the profile is loading or has failed, the name area is empty at its reserved height and the placeholder avatar shows.
- **Top bar, left to right:**
  - Decorative `>>` icon (`aria-hidden`), then today as `formatDate(today, 'header')` ("May 19, 2023"), on the left.
  - On the right: the bell button ("Notifications") with a teal unread dot, and the white "Search here" pill with a magnifier icon. The pill is a labelled text input ("Search").
- **Inert controls:** the bell, kebab and search do nothing.
  - Bell and kebab are focusable `<button type="button" aria-disabled="true">`, the 1.7 terms-link pattern.
  - Search accepts typing, but Enter and submit have no effect.
- **Logout:**
  - Calls `useLogout`. The button is disabled while pending.
  - On success, the existing `RequireSession` → `<Navigate to=login>` path lands the user on `/login`, with the cache cleared and the session seeded `null`. AppShell does not navigate itself.
  - On failure, the user stays signed in and the button re-enables.
- **Overlay host:**
  - `src/ui/overlayHost.ts` exports a context `{ container: HTMLElement | null; acquireInert(): () => void }` and a `useOverlayHost()` hook. Outside a provider, the hook returns `{ container: null, acquireInert: () => () => {} }`.
  - AppShell provides it. While any acquisition is outstanding (ref-counted), the sidebar and top bar get the `inert` attribute.
  - No `Modal` yet.
- **Icons:** every icon comes through `ui/icons.ts`, using the closest lucide match to the PNG glyphs.
- **Accessibility:**
  - Sidebar `<nav aria-label="Main">` and `<header>` landmarks; the content column is `<main>`.
  - Every control is keyboard-reachable in visual order with the `focus-ring` visible. Focus on the dark sidebar must stay visible.

**Never:**
- No "Hello {firstName}" greeting or page titles. Story 2.6 and the page epics own those, and placeholder pages stay.
- No `Modal`, `Card` or `Skeleton` (1.9).
- No new colour literals outside `tokens.css`, and no `Date`/`Intl` (lint).
- The shell never reads the name from the session.

**Decision (human, 2026-11-17):**
- Change the `surface` token to `#F4F5F7`, the background every screen PNG samples, including the auth screens.
- Update any token tests or specimen expectations that pin `#F3F3F3`.
- This replaces the "known `surface` delta" noted in Stories 1.6 and 1.7.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Deep route | `/balances/acc_1` | Balances active, Account Details placeholder shown | N/A |
| Root | `/` | Only Overview active | N/A |
| View profile | click | URL `/settings?tab=account`, Settings active | N/A |
| Logout ok | click | `/login`, session storage keys gone, cache holds no profile | N/A |
| Logout fails | `logout` rejects | Still in shell, button enabled again | no crash |
| Profile fails | `getProfile` rejects | Placeholder avatar, empty name, rest of shell works | N/A |
| Overlay acquired | `acquireInert()` ×2, release ×1 | Sidebar and top bar still `inert`; both released → not inert | N/A |

</frozen-after-approval>

## Code Map

- `src/app/AppLayout.tsx`: delete it. `routeObjects.tsx` uses `AppShell` in its place, and the route table is otherwise unchanged.
- `src/app/routes.ts` + `routes.test.ts`: add `viewProfile: '/settings?tab=account'`. The nav list maps labels and icons to `routes.*`, with no literals.
- `src/app/RequireSession.tsx`: already redirects to `/login` when the session is `null`. Do not change it.
- `src/api/hooks/useLogout.ts`, `useProfile.ts`, `useToday.ts`: use them as they are. `useToday` data is an `IsoDate`.
- `src/lib/format.ts` `formatDate(d,'header')`: produces "May 19, 2023".
- `src/ui/icons.ts`: add the nav, logout, bell, search, kebab and chevrons-right icons. Check that the names exist in lucide-react 1.73.0.
- `src/assets/brands/wordmark-white.svg`, `src/assets/avatar-placeholder.svg`: both already exist.
- `src/styles/tokens.css`: set `--color-surface: #F4F5F7` (Decision). Grep tests and `App.tsx` for `F3F3F3`. Also has `sidebar`, `on-dark-*` and `focus-ring`. The PNG measures logout and hover fills at about `#262626` and the divider at about `#2B2B2B`. Keep the token values and record any deltas in Implementation Notes.
- `src/app/test-utils.tsx`: `renderAt(path, api)` over the real route table. Use `createTestApi({ logout: … })` for failure cases.
- Tests that assert the old `AppLayout` markup (`router.test.tsx`, `login.test.tsx`): update them only where the shell changes the markup they target.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/overlayHost.ts` + test -- The context, ref-counted `acquireInert`, and no-op default.
- [x] `src/ui/icons.ts` -- The new icons.
- [x] `src/app/routes.ts` + test -- `viewProfile`.
- [x] `src/app/AppShell/{AppShell,Sidebar,TopBar,UserBlock}.tsx` -- The shell per the constraints. Add `navItems.ts` if it keeps `.tsx` files component-only.
- [x] `src/app/routeObjects.tsx` -- Swap in `AppShell` and delete `AppLayout.tsx`.
- [x] `src/app/shell.test.tsx` -- Cover every I/O matrix row, plus:
  - all seven links in order, each with its `href`;
  - clicking Goals shows the Goals placeholder;
  - the bell, kebab and search do not navigate or call the API;
  - the date reads "May 19, 2023" and the profile name shows;
  - `#content-overlay-root` sits inside `<main>`.

**Acceptance Criteria:**
- Given 1440×1024 at `/balances`, when compared with `105. Balances.png`, then the sidebar, top bar and divider positions, type and colours match within 2px. Known delta: the placeholder avatar.
- Given keyboard-only use, when tabbing from the top of the page, then focus visits the nav, Logout, View profile, kebab, bell and search, each with a visible ring.
- Given `npm run lint`, `npx tsc -b`, `npm test` and `npm run build`, then all pass.

## Implementation Notes

- **Measured layout (105. Balances.png, 2x):** sidebar 280px; wordmark 162.6x18 centred at y 54; nav items 224x48 from y 120 with 16px gaps, `rounded-button`, 24px icon at +16px, label at +52px, `text-16`; Logout 780–828; divider at 872; user block is a 40px row with a 32px avatar at y 908, name `text-16` semibold, "View profile" `text-12`; kebab dots at x 248–252. Top bar is 88px including the 1px `border` divider; `>>` + date `text-14 text-faint` at x 304; bell (`text-muted`, filled) with a 7px teal dot; search pill 352x48 at x 1056 (`rounded-input`, `shadow-card`), placeholder `text-16 text-faint`, magnifier `text-ink-2`. A 2x headless-Edge screenshot of `/balances` matches every measured box within 0.5px.
- **Colour deltas (tokens kept):** the Logout fill renders #2B2B2B (`on-dark-hover`) vs #262626 in the PNG; the sidebar divider renders #484848 (`on-dark-divider`) vs #2B2B2B; Logout text renders about #C0C0C0 (`on-dark-muted`) vs #C5C5C5. The placeholder avatar vs the photo is the known delta.
- **Icons:** overview LayoutGrid, balances Wallet, transactions ArrowLeftRight, bills Receipt, expenses BanknoteArrowUp (lucide 1.73 has no SquareDollarSign), goals Crosshair, settings Settings, logout LogIn (the PNG glyph is an arrow entering a bracket), bell Bell (filled), search Search, kebab EllipsisVertical, chevronsRight ChevronsRight.
- **Overlay host:** `ui/overlayHost.ts` also exports `useInertCount()` (the ref-counted state; each release function counts once). `<main>` is `relative` and `#content-overlay-root` is its empty, unpositioned last child, so 1.9's Modal should render an `absolute inset-0` layer into it to cover only the content column. The top bar sits outside `<main>` (banner landmark) and is made `inert`, not dimmed.
- **Logout cache (outside the Code Map):** `applyInvalidation` reset-and-refetched every mounted query, so the still-mounted shell re-read the profile after logout and the cache kept it. When the seeded session is `null` it now removes every non-session query instead (`src/api/queryKeys.ts`, new test in `queryKeys.test.ts`). Hooks are unchanged; login and signup behaviour is unchanged.
- **Search focus:** the input hides its own outline; the pill shows the `focus-ring` via `focus-within`.
- **test-utils:** `renderAt` now also returns `queryClient` and takes an optional route table (used by the overlay probe test).
- **Surface token:** `--color-surface` is #F4F5F7 per the Decision; `tokens.node.test.ts` updated. No other test pinned #F3F3F3.

## Spec Change Log

## Review Triage Log

Pass 1 (blind, edge-case, verification-gap; verification-gap found no gaps and confirmed the logout-cache tests fail on the old reset path):

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | Signed-out refetch after logout; the `queryKeys.ts` comment overclaims (blind + edge-case, incl. claim) | low | A probe counting calls after logout shows `getProfile` is not refetched, but `getToday` is: `RequireSession`'s still-mounted `useToday` rebuilds the removed query before navigating. Pre-existing (1.6 #15). The comment's "nothing may be re-read" is inaccurate. | patch (comment) + defer |
| 2 | Sidebar clips Logout and the user block on short viewports (blind + edge-case) | medium | The `fixed inset-y-0` aside needs about 950px with no overflow, and common 1366×768 laptops have about 650px. Direct one-class fix. | patch |
| 3 | Wordmark `width={162.6}` is not a valid integer attribute (blind) | low | Direct correction. | patch |
| 4 | Inert bell and kebab keep `cursor-pointer` (blind) | low | The `aria-disabled` controls signal clickability. Direct class swap. | patch |
| 5 | Placeholder avatar for a loaded profile with `avatarUrl: null` untested (blind) | low | Only the failure path asserts the placeholder. A one-line assertion. | patch |
| 6 | `sprint-status.yaml` `last_updated` changed format (blind + edge-case) | low | `MM-DD-YYYY HH:mm` became ISO. Orchestrator fix. | patch |
| 7 | Rendered on-dark colours differ from the PNG (divider #484848 vs #2B2B2B, Logout fill and text) while the AC allows only the avatar delta (blind) | medium | Real, and the divider is visibly lighter. The Code Map says to keep the token values, so the fix edits the spec or tokens. | reject (raised with human) |
| 8 | No feedback when logout fails (blind) | low | Real, but the mock logout fails only on storage errors. The fix adds UI. | reject |
| 9 | Focus drops to body when Logout disables while pending (blind) | low | Real but rare (keyboard logout that then fails). The fix adds an `aria-disabled` guard. | reject |
| 10 | No visible focus ring on the dark sidebar (blind) | false | The global `:focus-visible` outline (`styles/index.css:13`) applies with a 2px offset, and the implementer saw it on the active pill. | reject |
| 11 | Avatar has no `onError` fallback (blind + edge-case) | low | The seed avatar is null, and uploads (Epic 5) are data URLs. Adds a handler. | reject |
| 12 | Unread dot not announced (blind) | low | The dot is decorative and the bell is inert. | reject |
| 13 | No skip link (blind) | low | Not required by NFR-3. Adds a component. | reject |
| 14 | Search ring via `focus-within` also shows on mouse focus; `type="text"` (blind) | low | Cosmetic, and the ring is still the token. | reject |
| 15 | Spec `in-review` vs sprint `in-progress` (blind) | false | Sprint syncs to `review` at completion. | reject |
| 16 | `routes.viewProfile` repeats `/settings` (blind) | low | Pinned by `routes.test.ts` against `routes.settings`. | reject |
| 17 | `queryKeys` unit test polls microtasks (blind) | low | The query function is synchronous, so the test is deterministic today. | reject |
| 18 | Overlay `absolute inset-0` spans the full scroll height of tall pages (edge-case) | maybe-false | Depends on 1.9's Modal layout (sticky or viewport-bounded). There is no Modal yet. | defer (1.9) |
| 19 | `container` null on the first render breaks `createPortal` (edge-case) | false | `OverlayHost.container` is typed nullable and documented. No consumer exists in this diff. | reject |

## Verification

**Commands:**
- `npm run lint`, `npx tsc -b`, `npm test`, `npm run build` -- expected: all pass

**Manual checks:**
- Screenshot `/` and `/balances` at 1440×1024 (sign in first). Compare them with `104. Overview.png` and `105. Balances.png`, ignoring the page content.
