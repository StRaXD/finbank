---
title: 'Story 2.6: Overview page with greeting and Total Balance carousel'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: 'e51dc9672b9516571387e9756e40570d7d20dcac'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-1-balances-page-with-account-cards.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/` is a placeholder. Users need a dashboard that greets them and shows their Total Balance and their accounts. Those values must be the same shared account data the Balances page shows, never duplicated or hard-coded (FR-9, FR-10, FR-33, AD-4, AD-5).

**Approach:**
- **Greeting:** on Overview only, the top bar shows "Hello {firstName}" from `useProfile()`.
- **Page:** build `features/overview` with `OverviewPage`: the 3-column 104 grid and the Total Balance card.
- **Data:** the card reads `useBalanceSummary()` for the total and `useAccounts()` for a new `Carousel` (`src/ui`) of teal account cards, rendered by the balances-owned `AccountCard` in a new `carousel` variant.

## Boundaries & Constraints

**Always:**
- **Single source of truth:**
  - The total is `useBalanceSummary().data.totalBalanceCents`, calculated by the adapter from the stored accounts (AD-5). The carousel lists `useAccounts().data`, the exact query and key Balances uses (AD-4).
  - No component sums balances, filters accounts, or holds a literal amount, account number or name.
  - Removing an account anywhere updates both through the existing `removeAccount` invalidation (`accounts`, `balanceSummary`). There are no new keys and no new port methods.
- **Greeting:**
  - `TopBar` shows a bold "Hello {firstName}" before the ">>" and the date, only when the location is `routes.overview`.
  - `firstName` is the first whitespace-separated word of `profile.fullName`, trimmed. While the profile is loading or empty, no greeting renders.
  - Other routes are unchanged.
- **`OverviewPage`:**
  - **Props:** `{ accountDetailsPath: AccountDetailsPath }` (features may not import `src/app`), passed from `routeObjects` as `routes.accountDetails`.
  - **Headings:** a visually hidden `h1` "Overview" keeps the page's heading structure and the existing router and login tests.
  - **Grid:** the 3-column grid of 104 at 1440×1024. Total Balance is in row 1, column 1. The Goals and Upcoming Bill slots (row 1, columns 2–3) and the Recent Transaction, Statistics and Expenses Breakdown slots stay empty, with no placeholder UI, until their stories.
- **Total Balance card:**
  - A `Card` titled "Total Balance".
  - Header: the total in `formatMoney(…,'whole')`, bold, with "All Accounts" right-aligned, then a divider.
  - Below that, the `Carousel` of account slides, with Previous / dots / Next.
  - The total and the carousel each render through `AsyncSection`, with the empty message "No accounts yet."; the total shows "$0" when there are no accounts.
- **`AccountCard` `carousel` variant (in balances):**
  - A teal (`bg-primary`) rounded card: "Account Type" (muted white) over the type label (bold white).
  - `maskAccountNumber(n,'tail4')` and `formatMoney(balanceCents,'whole')` (bold), with the network logo top-right.
  - A white circular ↗ link to `detailsHref`, labelled "Open {Type} account details".
  - The default `grid` variant is unchanged. Exported through `features/balances/index.ts`.
- **`Carousel` (`src/ui`, generic, no `className` props):**
  - **Props:** `{ items, getKey, renderItem, label }`. One slide is visible at a time.
  - **Controls:** a "Previous" text button with a left chevron, one dot per item, and a "Next" button with a right chevron. Previous is disabled on the first slide and Next on the last.
  - **Dots:** each dot is a button labelled "Show slide n of N", with `aria-current` on the active one.
  - **Semantics:** the region has `role="region"` with `aria-roledescription="carousel"` and `aria-label`. The slide has `aria-roledescription="slide"` and `aria-label="n of N"`. Left and Right arrow keys move between slides while focus is inside.
  - **Index:** when `items` shrinks (an account removed), the index is clamped to the last item.
  - **Icons:** any needed chevron or arrow icons are added to `src/ui/icons.ts`.
- **Design:** measured from `design-reference/screens/104. Overview.png` (1440×1024 @2x): the greeting, card, teal slide, controls and dot colours (active teal, inactive grey), using tokens only. Amounts use the shared whole format ("$25,056"), not the design's "$25000".

**Never:**
- No Goals, Upcoming Bill, Recent Transaction, Statistics or Expenses Breakdown widgets (2.7 and Epics 3–4).
- No account selector behind "All Accounts", no autoplay or swipe, and no new data methods.
- No hard-coded amounts or account data.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seed | `/` signed in | "Hello Tanzir"; total "$240,399"; slide 1 is the Credit Card (`**** **** **** 2598`, "$12,000", Mastercard); 5 dots; Previous disabled | N/A |
| Next / Previous | click Next ×4 | slides advance to Loan; the active dot moves; Next is disabled on slide 5, Previous enabled | N/A |
| Keyboard | focus in the carousel, ArrowRight / ArrowLeft | same as Next / Previous | N/A |
| ↗ | click ↗ on the Checking slide | `/balances/acc_2` | N/A |
| Removed account | remove Checking on Balances, then open `/` | total "$215,343"; 4 dots; no Checking slide | N/A |
| Index clamp | on slide 5, the account list shrinks to 4 | shows slide 4 | N/A |
| No accounts | `listAccounts` → `[]`, summary 0 | total "$0"; "No accounts yet." | N/A |
| Other routes | `/balances` | no greeting | N/A |
| Load error | `getBalanceSummary` or `listAccounts` rejects | the AsyncSection alert with Retry in that part | ApiError message |

</frozen-after-approval>

## Code Map

- `src/app/AppShell/TopBar.tsx` -- add the greeting (`useProfile` from `api/hooks`, plus `useLocation` and `routes`). `UserBlock.tsx` already reads the profile and is a reference.
- `src/app/routeObjects.tsx:61` -- replace the Overview placeholder with `<OverviewPage accountDetailsPath={routes.accountDetails} />`.
- `src/app/shell.test.tsx` -- add greeting cases (shown on `/`, absent on `/balances`).
- `src/features/balances/components/AccountCard.tsx` -- add the `variant` prop. `NetworkLogo`, `accountTypeLabels`, `buttonClassName` and `icons` are reusable.
- `src/api/hooks/useAccounts.ts`, `useBalanceSummary.ts`, `useProfile.ts` -- the existing hooks. Do not add new ones.
- `src/ui/Card.tsx`, `AsyncSection.tsx`, `Button.tsx` -- reuse them. `Tabs.tsx` is the reference for keyboard handling and ARIA in a new primitive.
- `src/features/bills/`, `src/features/transactions/` -- the feature folder and test layout to mirror (`OverviewPage.test.tsx` with a hand-built api).

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/Carousel.tsx`, `Carousel.test.tsx`, `icons.ts` -- the primitive, with tests for the controls, dots, arrow keys, disabled ends, ARIA and the index clamp.
- [x] `src/features/balances/components/AccountCard.tsx` (+ a `BalancesPage.test.tsx` or new test case) -- the `carousel` variant.
- [x] `src/features/overview/OverviewPage.tsx`, `components/TotalBalanceCard.tsx`, `index.ts`, `OverviewPage.test.tsx` -- the page and the card, covering every page-level row of the matrix.
- [x] `src/app/AppShell/TopBar.tsx`, `shell.test.tsx` -- the greeting.
- [x] `src/app/routeObjects.tsx`, `router.test.tsx` -- the route, plus a real-route test: remove Checking on Balances, open `/`, and see the total "$215,343" and 4 slides.

**Acceptance Criteria:**
- Given `/` at 1440×1024, when compared with `104. Overview.png`, then the greeting, the Total Balance title, the card, the teal slide and the controls match in layout, typography and colour (apart from the seed values, the whole-amount format and the empty later-story slots).
- Given the Overview page source, when inspected, then no amount, account number or account name appears as a literal. Every value comes from `useBalanceSummary` or `useAccounts`.

## Implementation Notes

- **Carousel index:** clamped while rendering and the stored index follows (a render-time state update), so a list that shrinks then grows again does not jump forward.
- **Carousel focus:** when the focused Previous/Next becomes disabled at an end, focus moves to the other control after render (a disabled button would otherwise drop focus to `<body>`).
- **Carousel semantics:** the slide wrapper is `role="group"` inside an `aria-live="polite"` container. Inactive dots are `bg-faint/50` (sampled ~#D0D0D0 from 104; no grey token is that light).
- **Measured from 104:** greeting `text-24 font-bold text-ink`, 28px (`mr-7`) before ">>"; total `text-22 font-extrabold`; "All Accounts" `text-14 font-medium text-ink-2`; header `min-h-10 pb-2` then divider; slide `min-h-24 rounded-card bg-primary px-4 py-3`; ↗ a 24px white circle; controls `text-16` ink, disabled `text-faint`, 8px dots. Screenshot at 1440×1024 lands within ~2px of 104 on the card edges.
- **AccountCard:** `variant` dispatches to `GridAccountCard` (unchanged markup) or `CarouselAccountCard`; the slide title is an `h3` under the card's `h2`. `AccountCardProps` is now also exported from the balances index.
- **Icons:** `chevronLeft` and `arrowUpRight` added to `src/ui/icons.ts`.

## Spec Change Log

## Review Triage Log

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | blind, edge-case | Arrowing from a slide's ↗ link remounts the slide and drops focus to `<body>` | medium | Confirmed: the slide wrapper is keyed by item, so the focused link unmounts. patch: keep focus inside the carousel, with a test that follows `document.activeElement`. |
| 2 | edge-case | The arrow-key test fires its second key on an unfocused dot | medium | Same root cause as #1: the test cannot see the focus loss. Fixed by the same patch. |
| 3 | blind, edge-case | Modified arrows (Alt+Left and others) are swallowed by `preventDefault` | low | Confirmed. patch: return early on any modifier, plus a test. |
| 4 | blind | No single-slide test | low | Reachable after removing all but one account. patch: test. |
| 5 | blind | Router test `for (;;)` can hang instead of failing | low | Confirmed. patch: cap the loop. |
| 6 | blind | `gap-x-6 gap-y-6` and a no-op wrapper | low | Direct cleanup. patch. |
| 7 | blind | 8px dots are below the 24px target size | false | WCAG 2.5.8 "equivalent" exception: Previous and Next do the same job at full size. |
| 8 | blind | Two "Retry" buttons when both queries fail | low | Needs both mock reads to fail at once. Rejected. |
| 9 | blind | The greeting appears after the profile loads and nudges the date | low | One brief layout shift on first load. Rejected. |
| 10 | blind | Exact pathname match for the greeting | false | `/` is the only Overview route; the router never produces another path for it. |
| 11 | blind | The whole slide is re-announced through `aria-live="polite"` | low | Matches the WAI-ARIA carousel pattern for user-driven, non-rotating carousels. Rejected. |
| 12 | blind | `emptyMessage` on the summary is unused; a non-zero total with no accounts is unhandled | false | `AsyncSection` requires the prop. The total is derived from the same accounts, so it is 0 when they are empty. |
| 13 | blind | Unused `AccountCardProps` export; the carousel markup lives in balances | false | AD-12 makes `AccountCard` balances-owned, with variants rather than copies. |
| 14 | edge-case | Removing an earlier item while a later slide is shown switches accounts | false | Accounts cannot be removed from Overview. Navigating back remounts the carousel at slide 1. |
| 15 | edge-case | Focus lost when a clamp disables a focused Next or unmounts a focused dot | low | Same unreachable list change as #14 while on the page. Rejected. |
| 16 | edge-case | `pendingFocus` target could be disabled or detached | low | Only the opposite enabled control is ever targeted. Rejected. |
| 17 | edge-case | Duplicate keys from `getKey` | false | Account ids are unique: the mock normalizer drops duplicates. |
| 18 | edge-case | `carousel` variant silently ignores `onRemove` | low | No caller passes it. Rejected. |

## Verification

**Commands:**
- `npm run typecheck` -- no errors
- `npm run lint` -- no errors
- `npm test` -- all suites pass
- `npm run build` -- succeeds

**Manual checks:**
- With the dev server running, screenshot `/` at 1440×1024 and compare it with 104.
