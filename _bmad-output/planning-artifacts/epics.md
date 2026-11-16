---
status: final
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Finbank-2026-11-16/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Finbank-2026-11-16/addendum.md
  - _bmad-output/planning-artifacts/prds/prd-Finbank-2026-11-16/extract-auth-design-system.md
  - _bmad-output/planning-artifacts/prds/prd-Finbank-2026-11-16/extract-overview-accounts-bills.md
  - _bmad-output/planning-artifacts/prds/prd-Finbank-2026-11-16/extract-expenses-goals-settings.md
  - _bmad-output/planning-artifacts/architecture/architecture-Finbank-2026-11-16/ARCHITECTURE-SPINE.md
  - design-reference/ (screens, components, design-system)
---

# Finbank - Epic Breakdown

## Overview

This document breaks the Finbank frontend down into epics and stories. It draws on three sources:
- the PRD
- the Figma design references, used as the UX source together with the PRD design extracts and addendum
- the architecture spine

## Requirements Inventory

### Functional Requirements

**Authentication**
- FR1: Log in with email and password [scr 101].
  - The form has a show/hide password toggle and a "Keep me signed in" checkbox, checked by default.
  - When checked, the session persists across reloads. When unchecked, the session lasts for the tab only.
  - Login success goes to Overview.
  - The page links to Forgot Password and Signup.
- FR2: Sign up with Name, Email and Password [scr 102].
  - Success goes to Overview.
  - "Sign in here" goes to Login.
  - The "terms of service." link is inert.
- FR3: Request a password reset by email [scr 103]. An inline confirmation appears after submit. "Back to login" goes to Login.
- FR4: "Continue with Google" on Login and Signup performs a mock login.
- FR5: All forms validate required fields and email format, and show inline errors in #E73D1C.

**App shell**
- FR6: The sidebar has seven nav items: Overview, Balances, Transactions, Bills, Expenses, Goals and Settings.
  - Each item has active, default and hover states.
  - Account Details highlights Balances.
- FR7: Logout ends the session and goes to Login. Authenticated routes redirect to Login when there is no session.
- FR8: The user block shows the avatar, full name and "View profile", which opens Settings → Account. The kebab menu is shown but inert.
- FR9: The top bar has a decorative ">>" icon, mock today ("May 19, 2023"), a bell with an unread dot (inert) and a search input (inert). Overview also shows "Hello {firstName}".

**Overview** [scr 104, 104.1]
- FR10: Total Balance card.
  - The total is assets minus liabilities, with the "All Accounts" label.
  - A carousel of account cards shows type, masked number (last 4 digits), balance and network logo.
  - Prev/Next controls and dots. Prev is disabled on the first slide.
  - The ↗ button opens Account Details.
- FR11: Goals widget. It shows the month, target, achieved amount and gauge. The pencil opens the Adjust Savings Goal modal.
- FR12: Upcoming Bill widget. The next two bills by due date, each with a date badge, vendor, title, last charge and amount. "View All" goes to Bills.
- FR13: Recent Transaction widget. All/Revenue/Expenses tabs filter the five most recent transactions, each with icon, item, shop, amount and date. "View All" goes to Transactions.
- FR14: Statistics grouped bar chart comparing This week and Last week, Sun–Sat (14 Sun to 20 Sat).
  - Days after mock today have no This-week bar.
  - The y axis uses the bar scale.
  - The dropdown offers Weekly or Monthly.
- FR15: Expenses Breakdown tiles. Six categories, each with amount and % change (red ↑ / green ↓). The → arrow goes to Expenses. The values equal the Expenses totals.

**Balances & Account Details** [scr 105, 106]
- FR16: The account card grid shows type, bank, network logo, masked number and total.
  - Each card has "Remove" and "Details >", which goes to Account Details.
  - The last card has "Add Accounts" and "Edit Accounts", both inert.
- FR17: Remove account. It asks for confirmation, then removes the account from the mock data. Removing from Account Details returns to Balances.
- FR18: Account Details shows Bank Name, Account Type, Balance, Branch Name and Account Number.
  - "Edit Details" is inert. "Remove" works.
  - The Transactions History table has Date, Status, Type, Receipt and Amount columns, for this account only.
  - "Load More" adds 10 rows.

**Transactions & Bills** [scr 107, 108]
- FR19: Transactions page ("Recent Transaction").
  - All/Revenue/Expenses tabs.
  - Columns: Items, Shop Name, Date, Payment Method and Amount.
  - "Load More" adds 10 rows at a time and is hidden when no rows remain.
  - There is no sorting or filtering. The records are the same as on Overview.
- FR20: Upcoming Bills table.
  - Columns: Due Date badge, Logo, Item Description (title and description), Last Charge and boxed Amount.
  - There are no pay or add actions. The records are the same as on Overview.

**Expenses** [scr 109]
- FR21: Expenses Comparison grouped bar chart, Jan–Dec, This Year vs Last Year.
  - The "Monthly Comparison" dropdown offers Monthly or Weekly. Weekly shows the same data as Overview.
  - The y axis has evenly spaced ticks at $0, $2k, $10k, $50k and $250k, with linear interpolation between them. Values above the top are clamped.
- FR22: Six category cards in a 3×2 grid, in a fixed order.
  - The header shows the icon, name, total, % change with an arrow, and "Compare to last month".
  - The body shows the two most recent items, each with name, amount and date. The total covers the whole month.
  - Empty state: "No expenses this month".
  - The cards are not interactive.

**Goals** [scr 110, 110.1, 110.2]
- FR23: Savings Goal card.
  - The period selector lists calendar months ("01 May ~ 31 May") and defaults to the current month.
  - It shows Target Achieved and This month Target.
  - The half-donut gauge has a needle. Its range is $0 to the target, its fill is achieved ÷ target capped at 100%, the centre shows "12K", and the caption reads "Target vs Achievement".
  - It has an outlined "Adjust Goal" button with a pencil icon.
- FR24: Saving Summary line chart comparing This month (teal line with gradient) and Same period last month (grey dashed line).
  - The x ticks fall on day 1 and every 5th day, with vertical gridlines.
  - The y ticks are $0, $500, $2000 and $5000.
  - The month selector defaults to May 2023, and the axis follows the selected month.
- FR25: Adjust Savings Goal modal.
  - It has Target Amounts and Present Amounts inputs, a Save button, an X close button and no title.
  - It opens from "Adjust Goal" and from the Overview pencil, prefilled with the current values.
  - The overlay dims only the content area.
  - Save updates the goal and refreshes the card, the gauge and the Overview widget.
  - X, Esc and overlay click discard changes.
  - The placeholder typo is fixed.
- FR26: Category Goals grid. Six cards, each with icon, name, monthly spending limit and an outlined "Adjust" button with a pencil icon. There is no over-limit indicator.
- FR27: Adjust Category Limit modal.
  - It has a single Target Amounts input, prefilled with the current limit.
  - It uses the same overlay and close behaviour as FR25.
  - Save updates that category only.
- FR28: Money inputs accept non-negative amounts up to two decimals.
  - "$" and commas are allowed.
  - An empty or invalid value blocks Save and shows an error.
  - Present may be greater than Target.

**Settings** [scr 111, 112]
- FR29: Account and Security tabs.
  - The active tab has teal text and an underline.
  - Account is the default.
  - The tab is reflected in the URL.
- FR30: The Account tab has Full name, Email, Username and Phone (+code | number) fields.
  - The fields are prefilled.
  - "Update Profile" validates them and saves.
  - The name and avatar update in the sidebar and the Overview greeting.
- FR31: The profile picture box opens an image picker. The image shows as a preview and is saved with "Update Profile". It is stored on the client.
- FR32: The Security tab has Old, New and Retype password fields.
  - All fields are required, New must match Retype, and the minimum length is 8.
  - On success the form clears and a confirmation shows.
  - The Phone field is shown read-only.

**Cross-cutting**
- FR33: One seeded mock dataset through the provider.
  - Aggregates are derived, not hard-coded.
  - The same record shows the same values on every screen.
  - User changes persist in localStorage. Clearing storage restores the seed.
- FR34: Formatting.
  - USD with thousands separators.
  - No decimals for: Total Balance, account card totals, bill amounts and Savings Goal amounts. Two decimals for everything else.
  - Revenue and expense amounts look the same, with no sign or colour.
  - Account numbers are masked in each screen's style.
  - Date styles: "17 May 2023" in rows, "May 15" in badges, "May 19, 2023" in the top bar. Compact values use "12K" and "$2k".
- FR35: Empty, loading and error states.
  - An empty list shows a muted line.
  - Loading shows a skeleton.
  - A form error shows as inline text in #E73D1C.
  - Success shows a short inline confirmation.

### NonFunctional Requirements

- NFR1 Fidelity: at 1440×1024, every screen matches its Figma export at 1× overlay.
  - Layout and spacing are within 2px.
  - Colours are exact tokens.
  - The type scale matches.
  - Interactive states follow `design-reference/components/*`.
  - The font is Inter.
- NFR2 Viewport: desktop at 1280px and wider. Narrower viewports may scroll horizontally. There are no responsive layouts.
- NFR3 Accessibility baseline:
  - Everything is keyboard-reachable and has a visible focus state.
  - Modals trap focus and close on Esc.
  - Inputs have labels.
  - Charts have a text summary.
- NFR4 Swappable data: components never import mock data directly. They use only the provider interface.

### Additional Requirements

From the architecture spine:

**Project setup**
- **Starter template:** scaffold with create-vite 9.3.4 `react-ts`, which brings TypeScript ~7.0.2 and oxlint. This is Epic 1 Story 1.
- Add the pinned stack:
  - Tailwind 4.3.5 via `@tailwindcss/vite`
  - react-router 8.5.1
  - TanStack Query 5.107.1
  - recharts 3.10.1
  - react-hook-form 7.92.0, zod 4.6.7 and @hookform/resolvers 7.0.6
  - date-fns 4.4.0
  - lucide-react 1.73.0
  - vitest 5.1.0, jsdom 31.0.1 and Testing Library (react 16.3.3, dom 10.4.2, jest-dom 7.0.1)
  - Node 22.22 or later (`.nvmrc` 24)
- Feature-sliced folders: `app/`, `features/<area>/`, `ui/`, `api/`, `lib/` and `styles/`.

**Code rules**
- Dependency rules are enforced in `.oxlintrc.json`:
  - `no-restricted-imports`
  - `import/no-cycle`
  - `react-hooks/exhaustive-deps` as an error
- `tsconfig` sets `"strict": true` explicitly (AD-1).

**Data layer**
- The `FinbankApi` port lives in `api/port.ts`, with domain types in `api/types.ts` (including `IsoDate`, `YearMonth` and `ApiError`) (AD-2).
- A single `ApiProvider` chooses the adapter from `VITE_API_MODE`, mock or http. The http stub throws `NOT_IMPLEMENTED` (AD-3).
- Each entity and series has one port method and one hook. Overview reuses the detail-screen hooks (AD-4).
- Stored values are separate from derived ones (AD-5):
  - The adapter derives the total balance, category totals, % change and series.
  - `GoalGauge` derives the gauge ratio.
  - Balances are non-negative magnitudes.
- Mock adapter (AD-6):
  - Seed in `api/mock/seed.ts`, with mock today `2023-05-19`.
  - Changes persist to localStorage key `finbank:mock:v1`, falling back to the seed.
  - Removing an account cascades to its transactions.
  - The avatar is downscaled to 256px or less.
  - A full store throws `STORAGE_FULL`.
  - Responses have about 200 ms of artificial delay.
- TanStack Query (AD-7):
  - Hierarchical `qk` keys.
  - A single `invalidationMap`.
  - `useInfiniteQuery` for paginated lists.
- `Session` is `{ userId, persistent }`, stored under the key `finbank:session`. The shell reads the profile through `useProfile()`. No global store library (AD-8).
- `lib/dates` is the only date parser (`weekStartsOn: 0`). `RequireSession` waits for `useToday()`. All money is in cents, including chart ticks (AD-9).

**UI rules**
- All formatting goes through `lib/format` (AD-10).
- Tokens live in `styles/tokens.css` under `@theme`. Tokens read from JavaScript use `@theme static`. Hex literals are not allowed outside tokens (AD-11).
- UI primitives live in `src/ui`. Inputs need a label and charts need a summary. Domain components each have one owner (AD-12).
- Modals render into `#content-overlay-root`. The shell is `inert` while a modal is open. Removing from Account Details navigates first, then mutates (AD-13).
- One route table, a `RequireSession` layout route, and a `routes` constants object (AD-14).
- Forms use react-hook-form with zod, and a shared `FormStatus` component for success messages (AD-15).
- `lib/chartScale` provides `createTickScale` and the `BAR_TICKS` and `SAVING_TICKS` constants (AD-16).
- Query-backed cards use `AsyncSection` for loading, empty and error states (AD-17).

**Testing and deployment**
- Testing: vitest unit tests for `lib/` and the mock adapter, and React Testing Library tests for forms and modals. No end-to-end tests.
- Deployment is deferred. The app is a static build, and hosts need an SPA fallback.

### UX Design Requirements

These come from the Figma `design-reference/` frames, the component sheets, `Typography-color.png`, and the PRD addendum and extracts.

**Tokens and assets**
- UX-DR1 Colour tokens:
  - Primary: #299D91.
  - Text and neutrals: #191919, #525256, #666666, #878787, #9F9F9F, #E8E8E8 and #F3F3F3.
  - Danger: #E73D1C. Positive: #4DAF6E.
  - On dark backgrounds: white at 70%, white at 8%, and #D2D2D2 at 25%.
- UX-DR2 Typography: Inter at weights 400, 500, 600, 700 and 800. Type scale (size/line height): 12/16, 14/20, 16/24, 18/24, 20/28, 22/32 and 24/28.
- UX-DR3 Surfaces:
  - Page background #F3F3F3.
  - White cards with about 8px radius and a soft shadow.
  - Sidebar #191919.
  - A focus-ring token.
- UX-DR4 Brand assets:
  - The "FINEbank.IO" wordmark in teal on light backgrounds and white on dark.
  - Logo SVGs for Google, Mastercard, VISA, Figma and Adobe.

**Components**
- UX-DR5 Button variants:
  - primary: teal fill, white text, about 4px radius, full-width on auth screens
  - outline: 1px teal border with teal text and icon (Adjust, Adjust Goal)
  - text link: teal (Remove, View All, Forgot Password?)
  - google: light grey fill with the Google logo
  - small "Details >" button with a chevron
- UX-DR6 Inputs:
  - Labelled text input with default (#E8E8E8 border) and filled/focus (#525256 border) states, and #9F9F9F placeholder text.
  - Password input with an eye / eye-off toggle.
  - Money input.
  - Phone input in the "+code | number" style.
  - Teal checkbox.
  - The borderless input variant used on Settings.
- UX-DR7 Search input: a white pill shape with a magnifier icon and the "Search here" placeholder.
- UX-DR8 Tabs: the active tab has teal text and a 2px teal underline, used in Recent Transaction and Settings.
- UX-DR9 Dropdown trigger: label plus chevron. One style is plain text ("Weekly Comparison"); the other has a grey background ("01 May ~ 31 May").
- UX-DR10 Card shell with a section title placed above the card, plus optional header actions such as "View All >" or a dropdown.
- UX-DR11 Table / list rows with dividers. Smaller items:
  - `DateBadge`: month above day.
  - Boxed amount.
  - Category icon in a grey square.
- UX-DR12 `TrendIndicator`: the % value with a red ↑ or green ↓ arrow and an optional caption.
- UX-DR13 `Modal`:
  - White, rounded and centred over the content area.
  - An X in the top-right corner.
  - The overlay dims only the content area.
  - `ConfirmDialog` uses the same shell.
- UX-DR14 `Carousel`: Prev/Next text buttons (Prev disabled at the start) and pagination dots.

**Charts**
- UX-DR15 Grouped bar chart (Statistics and Expenses):
  - Teal bars for the current period and light-grey bars for the previous one.
  - Legend at the top right.
  - Horizontal gridlines.
- UX-DR16 Area/line chart: a teal line with a gradient fill, a grey dashed comparison line, and vertical gridlines.
- UX-DR17 Half-donut gauge with a needle, min and max labels, a centre value and a caption.

**Layout**
- UX-DR18 App shell layout:
  - Sidebar about 270px wide.
  - Nav items with an icon and label. The active item has a teal pill and bold white text; hover uses white at 8%.
  - Logout button with a white-at-8% background.
  - Divider, then the user block (avatar, name, "View profile", kebab).
  - Top bar with a bottom divider.
  - Page titles in a large grey style ("Expenses Comparison", "Goals").
- UX-DR19 Auth layout: a single centred column about 385px wide on a light background, with the logo at the top and an "or sign in with" divider.
- UX-DR20 Upload box: dashed border with an image-plus icon and the text "Upload your photo".
- UX-DR21 Default states, built from tokens: skeleton block, muted empty line, inline error text and inline success text.

### FR Coverage Map

- **Epic 1, sign-in:** FR1 Log in, FR2 Sign up, FR3 Password reset, FR4 Google button, FR5 Form validation
- **Epic 1, app shell:** FR6 Sidebar nav, FR7 Logout and route guard, FR8 User block, FR9 Top bar
- **Epic 2:** FR10 Total Balance card, FR12 Upcoming Bill widget, FR13 Recent Transaction widget, FR16 Account list, FR17 Remove account, FR18 Account Details, FR19 Transactions table, FR20 Bills table
- **Epic 3:** FR14 Statistics chart, FR15 Expenses Breakdown tiles, FR21 Expenses comparison chart, FR22 Expenses category cards
- **Epic 4:** FR11 Goals widget, FR23 Savings Goal card, FR24 Saving Summary chart, FR25 Adjust Savings Goal modal, FR26 Category limits grid, FR27 Adjust Category Limit modal, FR28 Money input validation
- **Epic 5:** FR29 Settings tabs, FR30 Update profile, FR31 Profile picture, FR32 Change password
- **Set up in Epic 1, then applied in Epics 2–5:**
  - FR33 Consistent mock dataset
  - FR34 Formatting
  - FR35 Empty, loading and error states
- **Non-functional requirements:**
  - NFR1–NFR4 are set up in Epic 1 and checked in every story's acceptance criteria.
  - UX-DR items are assigned in each epic's list.

## Epic List

### Epic 1: Foundation: design system, app shell and sign-in
Users can sign up, log in and reset a password on pixel-faithful auth screens. Once signed in, they land in the real app shell, built on shared tokens and UI components with the mock data layer underneath.
**FRs covered:** FR1–FR9, plus the shared parts of FR33, FR34 and FR35. **Also covers:** NFR1–NFR4, UX-DR1–UX-DR14, UX-DR18, UX-DR19 and UX-DR21, and the architecture setup.

### Epic 2: Accounts, transactions and bills
Users can see where their money is: Balances (with removal and Account Details), Transactions, Bills, and the Overview page with Total Balance, Upcoming Bill and Recent Transaction widgets.
**FRs covered:** FR10, FR12, FR13 and FR16–FR20.

### Epic 3: Spending insights
Users can see what they spent and how it compares: the Expenses page, plus the Overview Statistics chart and Expenses Breakdown tiles.
**FRs covered:** FR14, FR15, FR21 and FR22. **Also covers:** UX-DR12 and UX-DR15.

### Epic 4: Savings goals and spending limits
Users can set and track their savings goal and their monthly category spending limits, on the Goals page and from the Overview Goals widget.
**FRs covered:** FR11 and FR23–FR28. **Also covers:** UX-DR13, UX-DR16 and UX-DR17. Starts after Epic 3, whose dropdown, category icon and chart-scale pieces it reuses.

### Epic 5: Profile and security settings
Users can update their profile and photo and change their password. Changes show in the sidebar and greeting right away.
**FRs covered:** FR29–FR32. **Also covers:** UX-DR20.

## Epic 1: Foundation: design system, app shell and sign-in

Users can sign up, log in and reset a password on pixel-faithful auth screens. Once signed in, they land in the real app shell. Everything is built on shared tokens, UI primitives and the mock data layer, which later epics reuse.

Primitives that only one later screen needs (tables, tabs, charts and so on) are built in that screen's epic, when they are first needed.

### Story 1.1: Scaffold the project with the agreed starter and tooling

As a developer,
I want the project created from the agreed starter with the pinned stack and lint rules,
So that every later story builds on the same foundation.

**Acceptance Criteria:**

**Given** an empty repo
**When** the project is scaffolded with create-vite 9.3.4 `react-ts`
**Then** `package.json` pins the versions in the architecture Stack table:
- React 19.3.1, TypeScript ~7.0.2 and Vite 8.3.8
- Tailwind 4.3.5 with `@tailwindcss/vite`
- react-router 8.5.1, TanStack Query 5.107.1, recharts 3.10.1
- react-hook-form 7.92.0, zod 4.6.7, @hookform/resolvers 7.0.6
- date-fns 4.4.0 and lucide-react 1.73.0
- vitest 5.1.0, jsdom and Testing Library

**And** `.nvmrc` is `24`, and `engines.node` is `>=22.22`.

**Given** the scaffold
**When** the folder structure is created
**Then** `src/` contains `app/`, `features/`, `ui/`, `api/`, `lib/`, `styles/` and `assets/brands/`, as the architecture's Structural Seed shows.

**Given** the lint and type configuration
**When** `npm run lint`, `tsc -b` and `npm test` run on the scaffold
**Then** all three pass.
**And** `tsconfig` sets `"strict": true` explicitly.
**And** `.oxlintrc.json` enforces the AD-1 rules:
- `no-restricted-imports`: `ui` may not import from `features` or `api`, except `import type` from `api/types`. Nothing outside `api` may import from `api/mock` or `api/http`.
- `import/no-cycle`
- `react-hooks/exhaustive-deps` as an error

**Given** a deliberate violation, such as `ui/` importing from `features/`
**When** lint runs
**Then** it fails.

### Story 1.2: Design tokens, typography and brand assets

As a user,
I want every screen to use the exact Finbank colours, type and surfaces,
So that the app looks like the Figma designs.

**Acceptance Criteria:**

**Given** `src/styles/tokens.css`
**When** it is loaded through Tailwind v4 `@theme`
**Then** it defines the UX-DR1 colours, the UX-DR2 Inter type scale and the UX-DR3 surfaces:
- radii and card shadow
- page and sidebar backgrounds
- a focus-ring token

**And** the colours a later chart will read from JavaScript are declared under `@theme static` (AD-11).

**Given** the app is built
**When** a test page renders text at every type-scale step
**Then** sizes, line heights and weights match `Typography-color.png`.
**And** the font is Inter.

**Given** any component file
**When** lint or a grep check runs
**Then** no hex colour literals or arbitrary colour or font-size utilities appear outside `tokens.css`.

**Given** the UX-DR4 brand assets
**When** they are added
**Then** the "FINEbank.IO" wordmark (teal and white variants) and the Google, Mastercard, VISA, Figma and Adobe SVGs exist in `src/assets/brands/`.
**And** they are exported from Figma.

### Story 1.3: Form primitives: Button, inputs, checkbox and form status

As a user,
I want buttons and inputs that look and behave like the design system,
So that every form in the app is consistent and accessible.

**Acceptance Criteria:**

**Given** `src/ui/Button`
**When** it renders each variant
**Then** `primary`, `outline` (with an optional icon), `text` and `google` match UX-DR5 and the component sheets.
**And** hover, focus and disabled states are visible (NFR-3).

**Given** `TextInput`, `PasswordInput` and `Checkbox`
**When** they render
**Then** each requires a `label` prop, which is linked to the field (NFR-3).
**And** the default and filled/focus border states and the placeholder colour match UX-DR6.
**And** `TextInput` has a `borderless` variant for Settings.

**Given** a `PasswordInput`
**When** the user clicks the eye icon
**Then** the value toggles between masked and visible.
**And** the icon switches between eye and eye-off.

**Given** an input with an `error` prop
**When** it renders
**Then** the error text appears below the field in the danger token colour.
**And** the error is linked to the input with `aria-describedby`.

**Given** `FormStatus`
**When** it receives a success message
**Then** it shows a short inline confirmation next to the submit button (FR35).

**And** React Testing Library tests cover: the label link, the password toggle, error rendering and keyboard focus.

### Story 1.4: Money, date and formatting helpers

As a user,
I want amounts and dates formatted the same way on every screen,
So that the numbers I see are consistent and easy to read.

**Acceptance Criteria:**

**Given** `src/lib/dates.ts`
**When** it is used
**Then** it is the only module that parses ISO dates. It uses date-fns with `weekStartsOn: 0`.
**And** it exports:
- the `IsoDate` and `YearMonth` helpers
- `currentMonth`
- `monthRange`
- `weekOf`
- `selectableMonths`

**And** parsing `2023-05-19` yields 19 May in every time zone (AD-9).

**Given** `src/lib/format.ts`
**When** values are formatted
**Then** the outputs are:

| Call | Output |
| --- | --- |
| `formatMoney(24039900, 'whole')` | "$240,399" |
| `formatMoney(2505600, 'exact')` | "$25,056.00" |
| `formatCompact(1250000, 'gauge')` | "12K" |
| `formatCompact(200000, 'axis')` | "$2k" |
| `formatPercent(8)` | "08%" |
| `formatDate('2023-05-17', 'row')` | "17 May 2023" |
| `formatDate(…, 'badge')` | "May 15" |
| `formatDate(…, 'header')` | "May 19, 2023" |
| `formatRange('2023-05')` | "01 May ~ 31 May" |

**And** `maskAccountNumber` supports the `groups` and `tail4` styles (FR34, AD-10).

**And** vitest unit tests cover every function and mode listed above.

### Story 1.5: Data layer foundation: port, mock adapter and session

As a developer,
I want the `FinbankApi` port, the mock adapter and session handling in place,
So that every screen gets its data through one swappable provider.

**Acceptance Criteria:**

**Given** `src/api/types.ts` and `src/api/port.ts`
**When** they are reviewed
**Then** they define `ApiError { code, message, fieldErrors? }`, `Session { userId, persistent }`, `UserProfile`, `IsoDate` and `YearMonth`.
**And** they define the port methods needed so far:
- `getToday`
- `login`, `loginWithGoogle`, `signup`, `logout`
- `requestPasswordReset`
- `getSession`
- `getProfile`

Later stories add the other methods.

**Given** `src/app/providers.tsx`
**When** the app starts
**Then** exactly one adapter is created, chosen by `VITE_API_MODE` (`mock` by default).
**And** `ApiProvider`, `QueryClientProvider` and `SessionProvider` wrap the app (AD-3, AD-8).
**And** `src/api/http/httpApi.ts` implements the port with `NOT_IMPLEMENTED` errors.

**Given** the mock adapter
**When** it is first loaded
**Then** it seeds the user profile (Tanzir Rahman) from `seed.ts`, with mock today `2023-05-19`.
**And** it persists state under `finbank:mock:v1`, falling back to the seed when that value is missing or corrupt.
**And** each response waits about 200 ms (AD-6).

**Given** `login` with any well-formed email and password
**When** it is called with `persistent: true`
**Then** the session is stored under `finbank:session` in `localStorage`.
**And** with `persistent: false`, it is stored in `sessionStorage` instead.
**And** `logout` clears it.

**Given** `src/api/queryKeys.ts`
**When** it is reviewed
**Then** it exports the hierarchical `qk` factory and an `invalidationMap`. In this story the map holds only `login` and `logout`, which clear the cache (AD-7).
**And** `useToday`, `useSession` and `useProfile` hooks exist in `src/api/hooks/`.

**And** vitest tests cover:
- seeding and persistence
- falling back on corrupt storage
- `persistent: true` vs `persistent: false`
- the http stub throwing `NOT_IMPLEMENTED`

### Story 1.6: Routing, session guard and Login screen

As a user,
I want to log in with my email and password or with Google,
So that I can reach my dashboard.

**Acceptance Criteria:**

**Given** `src/app/router.tsx`
**When** the app loads
**Then** a single `createBrowserRouter` table defines:
- the public routes `/login`, `/signup` and `/forgot-password`
- a `RequireSession` layout route over `/`, `/balances`, `/balances/:accountId`, `/transactions`, `/bills`, `/expenses`, `/goals` and `/settings`

**And** paths come only from the `routes` constants (AD-14).
**And** each app route shows a placeholder page until its epic.

**Given** there is no session
**When** the user opens any app route
**Then** they are redirected to `/login` (FR7).

**Given** a session exists
**When** `RequireSession` renders
**Then** it waits for `useToday()` before rendering its children (AD-9).

**Given** the Login screen [scr 101]
**When** it renders
**Then** it matches the auth layout (UX-DR19): logo, Email Address, Password with the eye toggle and the "Forgot Password?" link, "Keep me signed in" (checked by default), the full-width Login button, the "or sign in with" divider, "Continue with Google" and "Create an account".
**And** it matches the design at 1440×1024 (NFR-1).

**Given** an empty or invalid email, or an empty password
**When** the user submits
**Then** inline errors appear and no login happens (FR5). The form uses react-hook-form with a zod schema (AD-15).

**Given** valid credentials
**When** the user submits, or clicks "Continue with Google"
**Then** they land on `/` (FR1, FR4).
**And** the "Keep me signed in" choice controls whether the session survives a reload.

**And** "Forgot Password?" goes to `/forgot-password`, and "Create an account" goes to `/signup`.

### Story 1.7: Signup and Forgot Password screens

As a new or locked-out user,
I want to create an account or request a password reset,
So that I can get into the app.

**Acceptance Criteria:**

**Given** the Signup screen [scr 102]
**When** it renders
**Then** it shows the heading "Create an account", the Name, Email Address and Password fields, and the terms text.
**And** "terms of service." is an inert link.
**And** it shows the "Sign up" button, the "or sign up with" divider, "Continue with Google", and "Already have an account? Sign in here".
**And** it matches the design (NFR-1).

**Given** valid Name, Email and Password
**When** the user submits Signup
**Then** a session is created and the user lands on `/` (FR2).
**And** invalid input shows inline errors (FR5).

**Given** the Forgot Password screen [scr 103]
**When** it renders
**Then** it shows the "Forgot Password?" heading, the subtext, the Email Address field, the "Password Reset" button and "Back to login".

**Given** a valid email
**When** the user submits Forgot Password
**Then** `requestPasswordReset` is called.
**And** an inline `FormStatus` confirmation appears (FR3).

**And** "Sign in here" and "Back to login" both go to `/login`.

### Story 1.8: App shell: sidebar, top bar, user block and logout

As a signed-in user,
I want the Finbank sidebar and top bar on every app screen,
So that I can move between sections and see who I'm signed in as.

**Acceptance Criteria:**

**Given** any app route
**When** it renders
**Then** `AppShell` shows the UX-DR18 sidebar:
- the "FINEbank.IO" wordmark
- seven nav items with icons, in the FR6 order
- the Logout button
- a divider, then the user block (avatar, full name from `useProfile()`, "View profile" and the kebab icon)

**And** the top bar shows the decorative ">>" icon, mock today as "May 19, 2023", the bell with a teal unread dot, and the "Search here" pill input (UX-DR7).
**And** the bell, search and kebab menu are inert (FR8, FR9).

**Given** the current path
**When** the sidebar renders
**Then** the nav item for the first path segment uses the active style (teal pill, bold white text).
**And** `/balances/acc_1` highlights Balances.
**And** inactive items show the hover style (white at 8%) on hover (FR6).

**Given** the user clicks a nav item
**When** the route changes
**Then** that section's page shows inside the shell.

**Given** the user clicks "View profile"
**When** the route changes
**Then** they land on `/settings?tab=account` (FR8).

**Given** the user clicks Logout
**When** the session is cleared
**Then** they land on `/login`.
**And** the query cache is cleared (FR7).

**Given** the content column
**When** the shell renders
**Then** it contains `#content-overlay-root`, which later stories use for modals (AD-13).

**And** every shell control is keyboard-reachable and has a visible focus ring (NFR-3).
**And** the shell matches the screen exports at 1440×1024 (NFR-1).

### Story 1.9: Card, async states, Modal and ConfirmDialog primitives

As a user,
I want cards, loading and empty states, and dialogs to look and behave the same everywhere,
So that the app feels consistent while data loads or when I'm asked to confirm something.

**Acceptance Criteria:**

**Given** `Card`
**When** it renders with an optional section title and header actions
**Then** it matches UX-DR10: the title sits above a white rounded card with a soft shadow.

**Given** `AsyncSection` wrapping a query
**When** the query is loading
**Then** a `Skeleton` block shows.
**And** when `isEmpty` is true, a muted `EmptyState` line shows.
**And** on error, an inline danger-colour message with a Retry button shows. Retry calls `refetch` (FR35, AD-17, UX-DR21).

**Given** `Modal`, opened from a button
**When** it is open
**Then** it portals into `#content-overlay-root`.
**And** the overlay dims only the content column.
**And** the sidebar and top bar are `inert`.
**And** focus is trapped inside the modal (AD-13, UX-DR13).

**Given** an open `Modal`
**When** the user presses Esc, clicks the X or clicks the overlay
**Then** it closes.
**And** focus returns to the button that opened it (NFR-3).

**Given** `ConfirmDialog` with a message and confirm and cancel actions
**When** the user confirms
**Then** the `onConfirm` callback fires.
**And** cancelling closes the dialog without firing it.

**And** React Testing Library tests cover: the loading, empty and error states and retry; modal focus trapping, Esc and return focus; and the inert shell.

## Epic 2: Accounts, transactions and bills

Users can see where their money is:
- Balances, with account removal and Account Details
- Transactions and Bills
- the Overview page with the Total Balance, Upcoming Bill and Recent Transaction widgets

The domain components `AccountCard`, `TransactionList` and `BillList` are built once and reused on Overview (AD-12).

### Story 2.1: Balances page with account cards

As a user,
I want to see all my accounts as cards,
So that I know what accounts I have and how much is in each.

**Acceptance Criteria:**

**Given** the mock seed
**When** this story adds accounts
**Then** the seed has five accounts, one of each type: Credit Card, Checking, Savings, Investment and Loan. Each account has:
- bank and branch name
- an optional card network
- a full account number
- `balanceCents` as a non-negative magnitude (AD-5)

**And** `listAccounts` and `getBalanceSummary` are added to the port, the mock adapter and the hooks.
**And** `totalBalanceCents` is calculated as assets minus liabilities.
**And** a unit test covers the calculation (FR10, FR33).

**Given** `/balances` [scr 105]
**When** it loads
**Then** it shows the title "Balances" and a 3-column grid of `AccountCard`s in seed order. Each card shows:
- account type
- bank name and network logo
- masked account number in the `groups` style, labelled "Account Number"
- total amount in the `whole` style, labelled "Total amount"

**And** each card has a "Remove" text link and a "Details >" button (FR16).

**Given** the grid
**When** it renders
**Then** the last card holds the primary "Add Accounts" button and the "Edit Accounts" text link. Both are inert.

**Given** the user clicks "Details >"
**When** the route changes
**Then** they land on `/balances/:accountId`. The page is a placeholder until Story 2.4.

**And** the grid renders through `AsyncSection`, which shows a skeleton while loading and an empty line when there are no accounts (FR35).
**And** the page matches the design at 1440×1024 (NFR-1).

### Story 2.2: Remove an account from Balances

As a user,
I want to remove an account after confirming,
So that accounts I no longer use disappear from my dashboard.

**Acceptance Criteria:**

**Given** the Balances page
**When** the user clicks "Remove" on a card
**Then** a `ConfirmDialog` opens that names the account (FR17).

**Given** the dialog
**When** the user cancels
**Then** nothing changes.

**Given** the dialog
**When** the user confirms
**Then** `removeAccount` deletes the account from mock state and persists the change.
**And** the card disappears.
**And** the mutation invalidates `accounts` and `balanceSummary` through `invalidationMap` (AD-7).

**Given** the account was removed
**When** the page reloads
**Then** the account stays removed (FR33).

**And** a mock-adapter unit test checks that `removeAccount` removes the account and updates the balance summary.

### Story 2.3: Transactions page with tabs and Load More

As a user,
I want to browse my transactions and filter them by revenue or expense,
So that I can see where my money came from and where it went.

**Acceptance Criteria:**

**Given** the mock seed
**When** this story adds transactions
**Then** each account has 15 or more seeded transactions, enough to show "Load More". Each transaction has:
- item name and shop
- `kind`: revenue or expense
- an optional expense category
- payment method, status and type (Credit or Debit)
- a receipt ID, `amountCents`, an `IsoDate` and `accountId`
- an icon key

**And** `listTransactions({ kind?, accountId?, cursor?, limit })` returns rows sorted newest first, as `{ items, nextCursor }`.
**And** `useTransactions` uses `useInfiniteQuery` with a page size of 10 and no cursor in the query key (AD-7).

**Given** `/transactions` [scr 107]
**When** it loads
**Then** it shows the title "Recent Transaction" and the All, Revenue and Expenses `Tabs` (UX-DR8).
**And** a `Table` shows the columns Items (icon and name), Shop Name, Date (row style), Payment Method and Amount (exact style) (FR19).

**Given** the user selects the Revenue or Expenses tab
**When** the tab changes
**Then** only that kind of transaction is listed. The tab state is local to the component.

**Given** more rows exist
**When** the user clicks "Load More"
**Then** the next 10 rows are appended.
**And** the button disappears when no rows remain.

**And** `TransactionList` is exported from `features/transactions/index.ts` with `table` and `compact` variants. The `compact` variant is for the Overview widget in Story 2.7.
**And** `Tabs`, `Table` and `LoadMore` are added to `src/ui`.
**And** the page matches the design (NFR-1).

### Story 2.4: Account Details with transaction history and remove

As a user,
I want to open one account and see its details and history,
So that I can check what happened in that account.

**Acceptance Criteria:**

**Given** `/balances/:accountId` [scr 106]
**When** it loads
**Then** it shows the title "Account Details" and a details card with:
- Bank Name and Account Type
- Balance (exact style) and Branch Name
- Account Number (masked)

**And** the details match that account's card on Balances (FR18).
**And** the Balances nav item is active.
**And** the "Edit Details" primary button is inert.

**Given** the account has transactions
**When** the page loads
**Then** "Transactions History" lists only that account's transactions, with the columns Date, Status, Transaction Type, Receipt and Amount.
**And** "Load More" adds 10 rows at a time. This reuses `useTransactions({ accountId })`.

**Given** the user clicks "Remove" and confirms
**When** the removal runs
**Then** the app navigates to `/balances` first and then fires `removeAccount` (AD-13).
**And** the account and its transactions are gone (FR17).
**And** the account no longer appears on Balances.

**Given** an unknown `accountId`
**When** the page loads
**Then** an `EmptyState` reads "Account not found" and links back to Balances.

**And** the page matches the design (NFR-1).

### Story 2.5: Upcoming Bills page

As a user,
I want to see my upcoming bills,
So that I know what will be charged and when.

**Acceptance Criteria:**

**Given** the mock seed
**When** this story adds bills
**Then** the seed has three or more bills. Each has:
- vendor, logo key, title and description
- billing cycle
- `dueDate` and `lastChargeDate`
- `amountCents`

**And** `listBills({ limit? })` returns bills sorted by due date, earliest first.

**Given** `/bills` [scr 108]
**When** it loads
**Then** it shows the title "Upcoming Bills" and a table with:
- Due Date: a `DateBadge` with the month above the day (UX-DR11)
- Logo: the brand SVG with the vendor name
- Item Description: the title and description text
- Last Charge: in row style
- Amount: in a box, whole style

**And** there are no pay or add actions (FR20).

**And** `BillList` is exported from `features/bills/index.ts` with `table` and `compact` variants.
**And** `DateBadge` is added to `src/ui`.
**And** the page matches the design (NFR-1).

### Story 2.6: Overview page with greeting and Total Balance carousel

As a user,
I want a dashboard that greets me and shows my total balance and accounts,
So that I see my overall position as soon as I log in.

**Acceptance Criteria:**

**Given** `/` [scr 104]
**When** it loads
**Then** the top bar shows "Hello {firstName}", taken from `useProfile()` (FR9).
**And** the page lays out the Overview card grid from the design. Slots for later widgets stay empty until their stories.

**Given** the Total Balance card
**When** it renders
**Then** it shows `totalBalanceCents` in the whole style and the "All Accounts" label.
**And** below them, a `Carousel` of teal account cards, one per account. Each card shows:
- account type
- masked number in the `tail4` style
- balance in the whole style
- network logo

**And** the card reuses the account data from `useAccounts()` (FR10, AD-4).

**Given** the carousel
**When** the user clicks "Next" or "Previous"
**Then** the slide and the active dot change.
**And** "Previous" is disabled on the first slide.
**And** "Next" is disabled on the last slide (UX-DR14).

**Given** the user clicks ↗ on an account card
**When** the route changes
**Then** they land on that account's Account Details.

**Given** an account was removed in Story 2.2
**When** the user returns to Overview
**Then** the carousel and the total both reflect the removal.

**And** `Carousel` is added to `src/ui` and is keyboard-operable (NFR-3).
**And** the card matches the design (NFR-1).

### Story 2.7: Overview Upcoming Bill and Recent Transaction widgets

As a user,
I want to see my next bills and latest transactions on the dashboard,
So that I can catch up at a glance without opening other pages.

**Acceptance Criteria:**

**Given** the Overview page
**When** it loads
**Then** the "Upcoming Bill" card shows the next two bills, using `BillList` compact with `useBills({ limit: 2 })`. Each row shows:
- date badge
- vendor
- title
- "Last Charge - {date}"
- boxed amount

**And** its "View All >" link goes to `/bills` (FR12).

**Given** the "Recent Transaction" card
**When** it renders
**Then** it shows the All, Revenue and Expenses tabs.
**And** under them, the five most recent transactions of the selected kind, using `TransactionList` compact with `useTransactions({ kind, limit: 5 })`. Each row shows:
- icon
- item, with the shop below it
- amount, with the date below it

**And** its "View All >" link goes to `/transactions` (FR13).

**Given** the same transaction or bill appears on Overview and on its own page
**When** both are compared
**Then** the amounts and dates are identical (FR33).

**And** both cards use `AsyncSection` for their loading and empty states.
**And** both match the design (NFR-1).

## Epic 3: Spending insights

Users can see what they spent and how it compares with earlier periods:
- the Expenses page: comparison chart and six category cards
- the Overview Statistics chart and Expenses Breakdown tiles

These reuse the same data and components (AD-4, AD-12).

### Story 3.1: Expenses Breakdown category cards

As a user,
I want my spending for the month grouped by category,
So that I can see where my money goes and whether each category went up or down.

**Acceptance Criteria:**

**Given** the mock seed
**When** this story extends it
**Then** expense-kind transactions are tagged across all six categories: Housing, Food, Transportation, Entertainment, Shopping and Others.
**And** there are items in both May 2023 and April 2023, so that the % change can be calculated.

**Given** `listCategorySummaries()`
**When** it is called
**Then** it returns six summaries in the fixed order, for the month that contains mock today. Each summary has:
- `totalCents`: the sum of all of that category's expense items in the month
- `changePct`: a signed integer, compared with the previous month
- the two most recent items

**And** unit tests check the totals, the sign of `changePct` and the empty-category case (FR22, FR33, AD-5).

**Given** `/expenses` [scr 109]
**When** it loads
**Then** the "Expenses Breakdown" section shows six `CategorySummaryCard`s in a 3×2 grid.
**And** each card has a grey header with:
- the `CategoryIcon`
- the category name
- the total, in the exact style
- a `TrendIndicator` showing the % and the arrow (red ↑ for an increase, green ↓ for a decrease) with the caption "Compare to last month" (UX-DR12)

**And** each card body lists the two most recent items, each with name, amount and date.

**Given** a category with no items this month
**When** its card renders
**Then** the body reads "No expenses this month".

**And** the cards are not interactive.
**And** `CategoryIcon` (which owns the category icon and label map) and `TrendIndicator` are added to `src/ui`.
**And** `CategorySummaryCard` is exported from `features/expenses/index.ts`.
**And** the section matches the design (NFR-1).

### Story 3.2: Expenses Comparison bar chart with the Monthly/Weekly selector

As a user,
I want to compare this year's monthly spending with last year's,
So that I can spot months where I spent more than usual.

**Acceptance Criteria:**

**Given** `src/lib/chartScale.ts`
**When** `createTickScale(BAR_TICKS)` is used
**Then** the ticks $0, $2k, $10k, $50k and $250k (stored as cents) are evenly spaced.
**And** values are interpolated linearly between adjacent ticks, and values above $250k are clamped.
**And** unit tests cover the tick values, midpoints and clamping (AD-16).

**Given** `getComparison('year' | 'week')`
**When** it is called
**Then** it returns points with `label`, `currentCents` and `previousCents` from the seeded history.
**And** `'year'` returns Jan–Dec.
**And** `'week'` returns Sun–Sat for the week that contains mock today (14–20 May).
**And** current-period points after mock today are `null` (AD-9).

**Given** `/expenses`
**When** it loads
**Then** the "Expenses Comparison" section shows `ComparisonChartCard`. The card contains:
- a `Dropdown` trigger labelled "Monthly Comparison" with a chevron (UX-DR9)
- the legend "This Year" (teal) and "Last Year" (grey), at the top right
- a `ComparisonBarChart` of grouped bars with horizontal gridlines and axis labels from `formatCompact(…, 'axis')` (UX-DR15)

**Given** the user selects "Weekly Comparison" in the dropdown
**When** the chart updates
**Then** it shows the weekly series with the "This week / Last week" legend (FR21).

**And** `ComparisonBarChart` requires a `summary` prop, which is rendered as accessible text (NFR-3).
**And** chart colours come from `chartColors`, and a unit test checks that every entry is non-empty (AD-11).
**And** `Dropdown` and the chart are added to `src/ui`.
**And** `ComparisonChartCard` is exported from `features/expenses/index.ts`.
**And** the card matches the design (NFR-1).

### Story 3.3: Overview Statistics chart

As a user,
I want to see this week's spending compared with last week's on my dashboard,
So that I notice changes without opening the Expenses page.

**Acceptance Criteria:**

**Given** the Overview page [scr 104]
**When** it loads
**Then** the Statistics slot shows `ComparisonChartCard`, imported from `features/expenses`, with the default granularity `'week'`.
**And** the dropdown reads "Weekly Comparison".
**And** the x axis shows "14 Sun" to "20 Sat", and days after mock today have no "This week" bar (FR14).

**Given** the user switches the dropdown to Monthly
**When** the chart updates
**Then** it shows exactly the same series as the Expenses page Monthly view.

**And** the card matches the design (NFR-1).

### Story 3.4: Overview Expenses Breakdown tiles

As a user,
I want each category's spending and trend on my dashboard,
So that I can quickly see which categories are rising.

**Acceptance Criteria:**

**Given** the Overview page
**When** it loads
**Then** the "Expenses Breakdown" card shows the caption "*Compare to last month".
**And** it shows six `CategorySummaryTile`s in a 3×2 grid. They are exported from `features/expenses` and fed by the same `useCategorySummaries()` as Story 3.1. Each tile shows:
- the category icon and name
- the total
- the % with its arrow
- a → arrow (FR15)

**Given** any category
**When** its tile and its Expenses card are compared
**Then** the total and the % change are identical (FR15, FR33).

**Given** the user clicks a tile's → arrow
**When** the route changes
**Then** they land on `/expenses`.

**And** the tiles are keyboard-reachable (NFR-3).
**And** the card matches the design (NFR-1).

## Epic 4: Savings goals and spending limits

Users can set and track their monthly savings goal and their spending limits per category, on the Goals page and from the Overview Goals widget.

This epic reuses `Dropdown`, `CategoryIcon`, `chartColors` and `lib/chartScale` from Epic 3, so it starts after Epic 3.

### Story 4.1: Savings Goal card with gauge and period selector

As a user,
I want to see how close I am to this month's savings target,
So that I know whether I'm on track.

**Acceptance Criteria:**

**Given** the mock seed
**When** this story adds savings goals
**Then** each month from January to May 2023 has a goal with stored `targetCents` and `achievedCents`. The May goal is $20,000 target and $12,500 achieved.
**And** `getSavingsGoal(month: YearMonth)` is added to the port, the mock adapter and `useSavingsGoal`. Its query key uses the `YearMonth` (AD-9).

**Given** `/goals` [scr 110]
**When** it loads
**Then** the page title is "Goals".
**And** the "Savings Goal" card shows:
- a grey `Dropdown` trigger reading "01 May ~ 31 May", from `formatRange`, defaulting to the current month
- Target Achieved, with a trophy icon, in the whole style
- This month Target, with a target icon, in the whole style
- a `GoalGauge`
- an outlined "Adjust Goal" button with a pencil icon (FR23)

**Given** `GoalGauge` receives a target and an achieved amount
**When** it renders
**Then** it draws a half-donut with:
- a teal fill and a needle at achieved ÷ target, capped at 100%
- "$0" and the compact target ("$20k") as the end labels
- the compact achieved amount ("12K") in the centre
- the caption "Target vs Achievement" (UX-DR17)

**And** unit tests cover the ratio, the cap and a zero target. A zero target renders an empty gauge without an error.
**And** `GoalGauge` requires a `summary` prop (NFR-3).

**Given** the user picks another month in the selector
**When** the selection changes
**Then** that month's goal loads into the card.
**And** the selector lists the months returned by `selectableMonths`.

**And** "Adjust Goal" has no action yet; Story 4.2 wires it up.
**And** the card matches the design (NFR-1).

### Story 4.2: Adjust Savings Goal modal

As a user,
I want to edit my savings target and the amount I've saved so far,
So that my goal reflects reality.

**Acceptance Criteria:**

**Given** the Savings Goal card
**When** the user clicks "Adjust Goal"
**Then** `AdjustSavingsGoalModal` opens in the content area with:
- no title
- an X button
- a "Target Amounts" `MoneyInput` and a "Present Amounts" `MoneyInput`, both prefilled with the current goal's values
- the placeholder "Write present amount here"
- a primary "Save" button (FR25, UX-DR13)

**And** the overlay dims only the content area.

**Given** `MoneyInput`
**When** the user types "$1,234.50"
**Then** the input emits 123450 cents.
**And** empty or unparseable input emits `null` (FR28).

**Given** an empty, negative or non-numeric value
**When** the user clicks Save
**Then** saving is blocked and an inline error appears.
**And** Present greater than Target is accepted (FR28).

**Given** valid values
**When** the user clicks Save
**Then** `updateSavingsGoal(month, { targetCents, achievedCents })` persists the values.
**And** the modal closes.
**And** `invalidationMap` refreshes `savingsGoal`, so the card and the gauge update (AD-7).

**Given** the modal is open with edits
**When** the user clicks X, presses Esc or clicks the overlay
**Then** it closes without saving.

**And** `AdjustSavingsGoalModal` is exported from `features/goals/index.ts` (AD-12).
**And** React Testing Library tests cover: prefill, validation, a successful save and discard on close.

### Story 4.3: Saving Summary line chart

As a user,
I want to compare my savings this month with the same period last month,
So that I can see whether I'm saving faster or slower.

**Acceptance Criteria:**

**Given** `getSavingSummary(month: YearMonth)`
**When** it is called
**Then** it returns daily points for the selected month and the previous month, from the seeded history.
**And** points after mock today are `null`.

**Given** `/goals`
**When** it loads
**Then** the "Saving Summary" card shows:
- a month `Dropdown` defaulting to "May 2023"
- the legend "This month" (teal) and "Same period last month" (grey)
- a `ComparisonAreaChart` (UX-DR16)

**And** the chart draws:
- the current series as a smooth teal line with a gradient fill
- the comparison series as a grey dashed line
- x ticks on day 1 and every 5th day ("May 01" … "May 30"), with vertical gridlines
- y ticks at $0, $500, $2000 and $5000, using `createTickScale(SAVING_TICKS)`. This story adds the `SAVING_TICKS` constant to `lib/chartScale` (FR24, AD-16)

**Given** the user picks another month
**When** the chart updates
**Then** the axis labels show the selected month.

**And** the chart requires a `summary` prop (NFR-3).
**And** the card matches the design (NFR-1).

### Story 4.4: Category spending limits with the Adjust modal

As a user,
I want to set a monthly spending limit for each category,
So that I can plan how much I allow myself to spend.

**Acceptance Criteria:**

**Given** the mock seed
**When** this story adds limits
**Then** each of the six categories has a `limitCents`, and the values vary by category.
**And** `listCategoryLimits` and `updateCategoryLimit` are added to the port, the mock adapter and the hooks.
**And** `updateCategoryLimit` invalidates `categoryLimits` (AD-7).

**Given** `/goals`
**When** it loads
**Then** "Expenses Goals by Category" shows six cards in a 3×2 grid, in the fixed category order.
**And** each card shows the `CategoryIcon`, the name, the limit in the exact style, and an outlined "Adjust" button with a pencil icon.
**And** there is no over-limit indicator (FR26).

**Given** the user clicks "Adjust" on a category
**When** the modal opens
**Then** `AdjustCategoryLimitModal` shows a single "Target Amounts" `MoneyInput` prefilled with that category's limit, and a "Save" button.
**And** it uses the same overlay and close behaviour as Story 4.2 (FR27).

**Given** a valid amount
**When** the user saves
**Then** only that category's limit changes and is persisted. The card updates.
**And** invalid input is blocked with an inline error (FR28).

**And** the grid and the modal match the design (NFR-1).

### Story 4.5: Overview Goals widget

As a user,
I want to see my savings goal on the dashboard and edit it from there,
So that I can track and adjust it without leaving Overview.

**Acceptance Criteria:**

**Given** the Overview page [scr 104]
**When** it loads
**Then** the "Goals" card shows the target in the whole style with a pencil icon button, and the month ("May, 2023").
**And** it shows Target Achieved, This month Target and `GoalGauge`, all from `useSavingsGoal(currentMonth)` (FR11).

**Given** the user clicks the pencil
**When** the modal opens
**Then** it is the same `AdjustSavingsGoalModal`, imported from `features/goals` [scr 104.1] (FR25).

**Given** the user saves new values on either the Overview or the Goals page
**When** they visit the other page
**Then** both show the same target, achieved amount and gauge (FR33).

**And** the card matches the design (NFR-1).

## Epic 5: Profile and security settings

Users can update their profile and photo and change their password. Their changes show in the sidebar and the Overview greeting right away.

### Story 5.1: Settings tabs and the profile form

As a user,
I want to edit my name, email, username and phone number,
So that my account details are correct.

**Acceptance Criteria:**

**Given** `/settings` [scr 111]
**When** it loads
**Then** a single card shows the Account and Security `Tabs`. The active tab has teal text and an underline.
**And** the page has no page heading, matching the design.

**Given** the URL
**When** it is `/settings` or `/settings?tab=account`
**Then** the Account tab is active.
**And** `?tab=security` activates the Security tab, which is a placeholder until Story 5.3.
**And** switching tabs updates the URL (FR29, AD-8).

**Given** the Account tab
**When** it renders
**Then** borderless labelled inputs show Full name, Email, Username and Phone Number, prefilled from `useProfile()`.
**And** the phone uses the `PhoneInput` "+880 | number" layout, and both parts are editable (FR30).
**And** the primary "Update Profile" button is present.
**And** `PhoneInput` is added to `src/ui`.

**Given** an empty field or an invalid email
**When** the user clicks "Update Profile"
**Then** an inline error appears and nothing is saved (FR5).

**Given** valid values
**When** the user clicks "Update Profile"
**Then** `updateProfile` persists the values.
**And** a `FormStatus` confirmation appears.
**And** `invalidationMap` refreshes `profile`, so the sidebar name and the Overview "Hello {firstName}" update without a reload (FR30, AD-7).

**And** the page matches the design at 1440×1024 (NFR-1).

### Story 5.2: Profile picture upload

As a user,
I want to upload a profile photo,
So that my avatar shows who I am.

**Acceptance Criteria:**

**Given** the Account tab
**When** it renders
**Then** the right column shows "Your Profile Picture" above a dashed upload box. The box has an image-plus icon and the text "Upload your photo" (UX-DR20).

**Given** the user activates the box with a click or the keyboard
**When** the file picker opens and the user picks an image
**Then** a preview of the image replaces the box contents.
**And** a non-image file shows an inline error.

**Given** a picked image
**When** the user clicks "Update Profile"
**Then** the mock adapter downscales the image to a JPEG data URL no larger than 256px and stores it with the profile (AD-6).
**And** the sidebar avatar updates (FR31).

**Given** storage is full
**When** saving the photo fails with `STORAGE_FULL`
**Then** an inline error appears and the existing profile data is kept.

**And** the photo survives a reload (FR33).
**And** unit tests cover the downscale and the `STORAGE_FULL` path.

### Story 5.3: Change password

As a user,
I want to change my password,
So that my account stays secure.

**Acceptance Criteria:**

**Given** `/settings?tab=security` [scr 112]
**When** it renders
**Then** borderless masked inputs show Old Password, New Password and Retype Password.
**And** Phone Number is shown read-only with the profile's value.
**And** the primary "Update Password" button is present (FR32).

**Given** any empty password field, a new password shorter than 8 characters, or a Retype that doesn't match New
**When** the user clicks "Update Password"
**Then** an inline error appears on the relevant field and nothing is submitted.

**Given** valid input
**When** the user clicks "Update Password"
**Then** `changePassword` is called and succeeds in mock mode.
**And** the three fields clear and a `FormStatus` confirmation appears.
**And** the phone number is not changed.

**And** React Testing Library tests cover each validation rule and the success path.
**And** the tab matches the design (NFR-1).
