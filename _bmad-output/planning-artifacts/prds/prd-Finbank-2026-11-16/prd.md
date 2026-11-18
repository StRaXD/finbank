---
title: Finbank
status: final
created: 2026-11-16
updated: 2026-11-16
---

# PRD: Finbank

## 0. Document Purpose

This PRD covers the frontend for Finbank, a personal-finance dashboard. The product reproduces the Figma designs in `design-reference/` as a working single-page web app that runs on mock data. The PRD is intentionally light and covers only what the designs show. Behaviour the designs leave out is either marked `[ASSUMPTION]` or listed in §8 Open Questions. Detail on the stack and data layer is in `addendum.md`. Per-screen visual extracts are in this folder (`extract-*.md`).

## 1. Vision

The product is a clean desktop dashboard. Users can sign in and see in one place:

- their accounts and balances
- their transactions and upcoming bills
- their spending by category
- their savings goals

The first release is frontend only. It is pixel-faithful to the designs and runs on mock data. The data layer can be swapped for a real API later without rewriting the screens.

## 2. Target User

Product name: **Finbank**. The UI keeps the Figma wordmark "FINEbank.IO" for visual fidelity.

A single persona: an individual managing personal finances across several bank accounts and cards. The designs show the sample user "Tanzir Rahman". There are no roles or multi-user features.

### 2.1 Jobs To Be Done
- See where my money is: total balance and balance per account.
- See what I spent, and how it compares with the previous period.
- Know which bills are coming up.
- Set savings and spending targets, and track my progress against them.
- Keep my profile and password up to date.

## 3. Glossary

- **App shell:** the dark left sidebar (logo, seven nav items, Logout, user block) plus the top bar (date, notification bell, search). It appears on every authenticated screen.
- **User:** the signed-in person. The user has a profile (full name, email, username, phone and avatar) and a password.
- **Account:** a bank product of one of five types: Credit Card, Checking, Savings, Investment or Loan.
- **Transaction:** a single money movement. Its kind is Revenue or Expense. It also has a payment method, a status and a type (Credit or Debit), and belongs to one account.
- **Expense category:** one of six fixed categories: Housing, Food, Transportation, Entertainment, Shopping, Others.
- **Expense item:** an Expense-kind Transaction tagged with an expense category. Category totals sum the expense items dated in the month that contains mock today. Revenue transactions have no expense category.
- **Bill:** an upcoming recurring charge. It has a vendor, a title, a billing cycle (Monthly or Yearly), a due date, a last-charge date and an amount.
- **Savings Goal:** a target amount and an achieved ("present") amount for a period. It is shown as a gauge.
- **Category Goal (spending limit):** the monthly spending limit for one expense category, set on the Goals page.
- **Mock provider:** the in-app data source. It returns typed data in place of a backend.
- **Mock today:** the fixed "current date" of the mock dataset, May 19, 2023. Every date, period and "this/last" comparison is calculated from it.

## 4. Features

FRs are numbered globally. Each FR cites its source screen as `[scr NNN]`, or inherits the screens listed in its section heading.

### 4.1 Authentication (101–103)

**Description:** Centred single-column forms on a light background. These screens sit outside the app shell. Because there is no backend, auth is simulated by the mock provider. `[ASSUMPTION: any well-formed credentials succeed]`

#### FR-1: Log in [scr 101]
A user can sign in with email and password. The screen also has a "Keep me signed in" checkbox and a show/hide password toggle.
- When the user submits valid input, the app goes to Overview.
- "Forgot Password?" opens screen 103. "Create an account" opens screen 102.
- "Keep me signed in" is checked by default, as designed. When checked, the session survives browser reloads. When unchecked, it lasts only until the tab closes. `[ASSUMPTION]`

#### FR-2: Sign up [scr 102]
A user can create an account with Name, Email and Password.
- When the user submits valid input, the app goes to Overview. `[ASSUMPTION: no email verification step]`
- "Sign in here" opens screen 101.
- "terms of service." is a link. Its target page is not designed (§8.2 #1).

#### FR-3: Request password reset [scr 103]
A user can enter an email address to request a reset link.
- "Back to login" opens screen 101.
- After submission, the app shows a confirmation. `[ASSUMPTION: simple inline confirmation message; no screen is designed]`

#### FR-4: Google sign-in button [scr 101, 102]
"Continue with Google" appears on both Login and Signup. In v1 it signs the user in the same way as a mock login. `[ASSUMPTION]` Real OAuth is out of scope.

#### FR-5: Form validation
Every form validates required fields and email format before submitting, and shows inline errors. `[ASSUMPTION: no validation is designed]`
- No error styling is designed. Error text uses the danger colour #E73D1C. `[ASSUMPTION]`

### 4.2 App Shell (all authenticated screens)

#### FR-6: Sidebar navigation
The sidebar has seven nav items in this order: Overview, Balances, Transactions, Bills, Expenses, Goals, Settings.
- Each nav item routes to its screen.
- Nav items have three states: active (teal fill), default and hover.
- Account Details highlights the Balances item.

#### FR-7: Logout
Logout ends the mock session and returns to Login. Authenticated routes redirect to Login when there is no session.

#### FR-8: User block
The user block shows the avatar, full name and a "View profile" link.
- "View profile" opens Settings → Account. `[ASSUMPTION: no separate profile page is designed]`
- The kebab menu is shown but has no defined behaviour (§8.2 #2).

#### FR-9: Top bar
The top bar shows mock today in "May 19, 2023" format, a notification bell with an unread dot, and a search input.
- The date has a ">>" icon in front of it. The icon is decorative in v1. `[ASSUMPTION]`
- Overview also shows "Hello {firstName}".
- The bell and search are visual only in v1, because no results or notification panel is designed (§8.2 #3).

### 4.3 Overview (104, 104.1)

#### FR-10: Total Balance card
The card shows:
- the aggregate balance and an "All Accounts" label. The aggregate is the asset accounts (Checking, Savings and Investment) minus the liability accounts (Credit Card and Loan). `[ASSUMPTION]`
- a carousel of account cards, each with type, masked number (last 4 digits), balance and network logo
- Previous/Next controls and dots. "Previous" is disabled on the first slide.
- an ↗ button that opens that account's Account Details. `[ASSUMPTION]`

#### FR-11: Goals widget
The widget shows the month, the target, the achieved amount and a semi-circular gauge ("Target vs Achievement").
- The pencil icon opens the Savings Goal modal (FR-25).

#### FR-12: Upcoming Bill widget
The widget shows the next two bills by due date: date badge, vendor, title, last charge and amount.
- "View All" opens Bills.

#### FR-13: Recent Transaction widget
The widget has All, Revenue and Expenses tabs. They filter a list of the five most recent transactions, each showing icon, item, shop, amount and date.
- "View All" opens Transactions.

#### FR-14: Statistics chart
A grouped bar chart compares "This week" with "Last week" for each weekday.
- The days run Sun–Sat for the week that contains mock today: 14 Sun to 20 Sat. Days after mock today have no "This week" bar. The design's "17 Sun" start is treated as a copy error, because 17 May 2023 was a Wednesday.
- The y axis uses the bar-chart scale defined in FR-21.
- The "Weekly Comparison" dropdown offers Weekly and Monthly comparison. Monthly shows the same chart as Expenses (FR-21). `[ASSUMPTION]`

#### FR-15: Expenses Breakdown tiles
Six category tiles show the amount and the % change vs last month.
- A red ↑ means spending went up. A green ↓ means it went down.
- The → arrow opens Expenses. `[ASSUMPTION]`
- Tile values are identical to the Expenses Breakdown totals (FR-22).

### 4.4 Balances & Account Details (105, 106)

#### FR-16: Account list [scr 105]
Each account is a card showing type, bank, network logo, masked account number and total amount.
- Each card has "Remove" and "Details >" actions. "Details >" opens Account Details.
- A final card holds the "Add Accounts" and "Edit Accounts" actions. They are shown but do nothing in v1, because neither flow is designed (§8.2 #4).

#### FR-17: Remove account [scr 105, 106]
"Remove" removes the account from the mock data after the user confirms. `[ASSUMPTION: a simple confirm dialog; none is designed]` After the user removes an account from Account Details, the app returns to Balances.

#### FR-18: Account Details [scr 106]
The screen shows the account's Bank Name, Account Type, Balance, Branch Name and Account Number.
- The values match the account's card on Balances.
- It has "Edit Details" and "Remove" actions. "Edit Details" is shown but does nothing in v1, because the edit form is not designed (§8.2 #4).
- Below the details is a Transactions History table with Date, Status, Transaction Type, Receipt and Amount columns. It lists only that account's transactions. A "Load More" button appends 10 rows at a time. `[ASSUMPTION]`

### 4.5 Transactions (107)

#### FR-19: Transactions table
The page is titled "Recent Transaction" and has All, Revenue and Expenses tabs.
- The table columns are Items, Shop Name, Date, Payment Method and Amount.
- A "Load More" button appends the next 10 rows. It is hidden when no rows remain. `[ASSUMPTION]`
- The table has no sorting or date filtering in v1, because neither is designed.
- Rows are the same transaction records shown in the Overview widget, with the same amounts.

### 4.6 Bills (108)

#### FR-20: Upcoming Bills table
The table columns are Due Date (badge), Logo, Item Description (title and description), Last Charge and Amount (boxed).
- The table has no pay or add-bill actions, because neither is designed.
- Rows are the same bill records shown in the Overview widget, with the same billing cycle and dates.

### 4.7 Expenses (109)

**Description:** A read-only view of spending for the period. It has a monthly comparison chart and a per-category breakdown, and no editing actions.

#### FR-21: Expenses Comparison chart [scr 109]
A grouped bar chart covers Jan–Dec, with two series per month: the current period (teal) and the previous period (grey).
- The card header shows "Monthly Comparison" with a dropdown chevron. The dropdown offers Monthly and Weekly comparison, mirroring FR-14; the Weekly option shows the same data as Overview Statistics. `[ASSUMPTION]`
- The legend reads "This Year" and "Last Year". The design's "This Week / Last Week" is treated as a copy error.
- **Bar-chart scale** (also used by FR-14): the five ticks $0, $2k, $10k, $50k and $250k are evenly spaced, and values are interpolated linearly between adjacent ticks. This reproduces the Figma bar heights. Values above $250k are clamped at the top.

#### FR-22: Expenses Breakdown cards [scr 109]
The page has six category cards in a 3×2 grid, in this order: Housing, Food, Transportation, Entertainment, Shopping, Others.
- The card header shows the category icon, name, total, % change with an arrow (red ↑ / green ↓) and the caption "Compare to last month".
- The card body lists expense items, each with name, amount and date.
- The category total equals the sum of its items in the mock data.
- Each card lists the two most recent items, as designed. The total still covers all of the category's items for the month. `[ASSUMPTION]`
- A category with no items shows "No expenses this month" in the card body. `[ASSUMPTION]`
- Cards and rows are not interactive in v1.

### 4.8 Goals (110, 110.1, 110.2)

**Description:** The page has three parts:
- a Savings Goal card with a gauge
- a Saving Summary line chart
- a grid of six "Expenses Goals by Category" cards, each with an Adjust action

Two modals edit the goals.

#### FR-23: Savings Goal card [scr 110]
The card has:
- a period selector ("01 May ~ 31 May")
- Target Achieved (trophy icon) and This month Target (target icon)
- the gauge, a half-donut with a needle, with $0 as the minimum, the target as the maximum, the achieved amount abbreviated in the centre (e.g. "12K") and the caption "Target vs Achievement"
- an outlined "Adjust Goal" button with a pencil icon

Behaviour:
- The gauge fill and the needle angle equal achieved ÷ target, capped at 100%. `[ASSUMPTION: cap; over-achievement not designed]`
- The period selector lists calendar months ("01 May ~ 31 May" format). It defaults to the month that contains mock today. Choosing a month loads that month's goal. `[ASSUMPTION]`

#### FR-24: Saving Summary chart [scr 110]
A smooth line chart compares "This month" with "Same period last month".
- "This month" is a teal line with a gradient fill. "Same period last month" is a grey dashed line.
- The x axis has ticks on day 1 and then every 5th day (May 01, May 05 … May 30), with vertical gridlines. The y axis uses $0, $500, $2000 and $5000, evenly spaced with linear interpolation between ticks, as on the bar charts.
- A month selector sits in the card header. It defaults to the month that contains mock today ("May 2023"), and the axis always shows the selected month. The design's "Mar 2022" is treated as a copy error.

#### FR-25: Adjust Savings Goal modal [scr 110.1]
"Adjust Goal" opens this modal. The Overview Goals pencil (FR-11) opens it too.
- The modal has two money inputs, "Target Amounts" and "Present Amounts", and a "Save" button. It has a close "X" and no title.
- The modal is centred over the content area. The dim overlay covers only the content area: the sidebar and top bar stay undimmed, as designed.
- The modal opens prefilled with the current values. The design's "$500000" is placeholder text. `[ASSUMPTION]`
- Save validates the inputs, updates the goal, closes the modal and refreshes the card, the gauge and the Overview widget.
- The close "X" discards changes. `[ASSUMPTION: Esc and overlay click also close]`
- The placeholder typo "Write presents amounts here" is fixed to "Write present amount here". `[ASSUMPTION]`

#### FR-26: Category Goals grid [scr 110]
The page has six cards in a 3×2 grid. Each card shows the category icon, the category name, the target amount and an outlined "Adjust" button with a pencil icon.
- The amount is the category's monthly spending limit. Mock limits vary by category. The design's uniform $250.00 is placeholder data.
- No over-limit indicator is designed. v1 shows the limit only and does not compare it with actual spending, to stay faithful to Figma. `[NON-GOAL for MVP]`

#### FR-27: Adjust Category Goal modal [scr 110.2]
A category's "Adjust" button opens this modal.
- The modal has a single "Target Amounts" input and a "Save" button.
- The modal opens prefilled with the current limit and uses the same overlay as FR-25.
- Save updates that category's spending limit only.
- Close behaviour matches FR-25.
- The modal-to-button mapping is inferred. `[ASSUMPTION: 110.1 belongs to Savings Goal and 110.2 to category Adjust, inferred from the fields; the design doesn't link them]`

#### FR-28: Money input validation (FR-25, FR-27)
The money inputs accept non-negative amounts up to two decimals. A leading "$" and thousands separators are allowed and stripped before validation, and the stored value is a plain number. `[ASSUMPTION: no validation is designed]`
- An empty value or a non-numeric value blocks Save and shows an inline error.
- Present above Target is allowed. `[ASSUMPTION]`

### 4.9 Settings (111, 112)

**Description:** A single card with two tabs, Account and Security. The page has no heading. The design shows input fields with no visible border.

#### FR-29: Settings tabs [scr 111, 112]
The Account and Security tabs switch the form in place.
- The active tab uses teal text with an underline.
- Account is the default tab. `[ASSUMPTION: the tab is also reflected in the URL so "View profile" can deep-link]`

#### FR-30: Update profile [scr 111]
The Account tab has Full name, Email, Username and Phone Number fields. Phone Number is split into a country code ("+880") and the number.
- The fields are prefilled from the current user.
- "Update Profile" validates required fields and email format, then saves the fields to mock data. `[ASSUMPTION: all four fields required]`
- The saved name and avatar then appear in the sidebar user block and the Overview greeting.
- The phone field uses the plain "+code | number" layout from screen 111, not the flag-and-dropdown variant on the component sheet. Both parts are editable. `[ASSUMPTION]`
- Profile edits never touch the session. Login does not depend on the profile's email or username: the mock signs in with any well-formed email, including both the old and the new one. The edits survive a reload and a logout followed by a login. *(Decided in Story 5.1, 2026-11-18.)*

#### FR-31: Profile picture upload [scr 111]
The "Your Profile Picture" dashed box ("Upload your photo") opens a file picker for images.
- The chosen image shows as a preview and is saved with "Update Profile". `[ASSUMPTION]`
- In v1, the image is stored only on the client.
- *(Decided in Story 5.2, 2026-11-18)* Accepted files are JPEG, PNG, WebP or GIF of at most 5 MB. They are checked on pick and again before storage.
  - Invalid type: "Choose a JPEG, PNG, WebP or GIF image."
  - Too large: "Choose an image under 5 MB."
  - Unreadable image: "We couldn't read that image."
  - A full store: the storage-full message.
  - Each error shows inline and keeps the existing photo; the picked preview is kept so the user can retry.
  - The stored photo is a JPEG of at most 256px (GIFs keep their first frame, and transparent areas become white).
  - There is no remove-photo control in v1.

#### FR-32: Change password [scr 112]
The Security tab has Old Password, New Password and Retype Password fields. All three are masked.
- "Update Password" requires all three fields, and New Password must match Retype Password.
- On success, the form clears and a confirmation appears. `[ASSUMPTION: no success state is designed]`
- No password-strength rules are designed. v1 enforces only a minimum length of 8. `[ASSUMPTION]`
- The Phone Number field appears on this tab as designed. It shows the profile phone number read-only, and "Update Password" does not save it. `[ASSUMPTION]`
- *(Decided in Story 5.3, 2026-11-18)* The v1 mock does not check Old Password against a stored credential, because mock login and signup never store one. Old Password is still required.
  - No password or hash is stored, logged or put in an error message.
  - The change keeps the session: the user stays signed in on the Security tab.
  - The three fields keep the show/hide eye toggle. Screen 112 shows none; this deviation is accepted.

### 4.10 Cross-cutting Requirements

#### FR-33: Consistent mock dataset
All screens read one seeded mock dataset through the provider.
- Aggregates are calculated, never hard-coded. Total Balance is derived from the accounts (FR-10). Each category total is the sum of its expense items. The Goals "Target Achieved" value is shared by Overview and Goals.
- The same record (account, transaction or bill) shows the same values on every screen.
- Mock values may differ from the Figma placeholders. Layout, typography and formatting must still match.
- Changes made by the user persist in `localStorage` across reloads: removed accounts, goal and limit edits, profile edits, the photo and the session. Clearing browser storage restores the seed data. `[ASSUMPTION]`

#### FR-34: Currency and date formatting
- Amounts use USD with thousands separators. Exception: the Saving Summary y-axis ticks read "$500", "$2000", "$5000" as designed (FR-24), via an ungrouped whole-dollar format.
- These amounts show no decimals ("$240,399", "$25,000", "$150"):
  - Total Balance
  - account card totals (carousel and Balances)
  - bill amounts
  - Savings Goal amounts
- All other amounts show two decimals ("$25,056.00", "$160.00"): transactions, expense items, category totals and limits, and Account Details balance.
- Revenue and Expense amounts have the same styling, with no sign or colour, as designed.
- Account numbers stay masked in the style each screen shows.
- Dates on rows use "17 May 2023". Badge dates use "May 15". The top bar uses "May 19, 2023".
- Abbreviated values (gauge centre, chart axes) use "12K" and "$2k" style.

#### FR-35: Empty, loading and error states
None of these states are designed, so v1 uses minimal defaults built from design-system tokens:
- A list or table with no rows shows a single muted line, such as "No transactions yet".
- While mock data loads, the card shows a skeleton block.
- A form error appears as inline text in #E73D1C under the field.
- A success message appears as a short inline confirmation next to the submit button.

### 4.11 Non-Functional Requirements

- **NFR-1 Fidelity:** At 1440×1024, every screen matches its Figma export when the export is overlaid at 1× scale:
  - Layout and spacing are within 2px.
  - Colours are exact design tokens.
  - The type scale matches.
  - Interactive states (hover, active, focus, outlined and disabled buttons, input states) follow `design-reference/components/*`. Tokens follow `design-reference/design-system/Typography-color.png` (see `addendum.md`).
  - Font: Inter. `[ASSUMPTION: the designs don't name it]`
- **NFR-2 Viewport:** The layout targets desktop widths of 1280px and above. Narrower viewports may scroll horizontally. No responsive redesign is required.
- **NFR-3 Accessibility baseline:** Every interactive element is keyboard-reachable and has a visible focus state. Modals trap focus and close on Esc. Form inputs have associated labels. Chart cards carry a text alternative that summarises the series.
- **NFR-4 Swappable data:** Components never import mock data directly. They use only the provider interface.

## 5. Non-Goals (Explicit)

- No real backend, persistence, banking integration or real authentication in v1.
- No mobile or tablet layouts. Only a 1440-wide desktop frame is designed.
- No features the designs don't show, including:
  - creating or deleting expense categories
  - adding expenses
  - paying bills
  - notifications content
  - search results
- The Welcome Page is not part of the product. It is a Figma cover frame.

## 6. MVP Scope

### 6.1 In Scope
- All 15 design frames: the 12 numbered screens (101–112) plus the 104.1, 110.1 and 110.2 modal states.
- The app shell.
- Mock data provider.
- Client-side validation.
- Simulated auth session.

### 6.2 Out of Scope for MVP
These flows are not designed:
- Add Account, Edit Accounts and Edit Details (§8.2 #4).
- The reset-password completion screen (§8.2 #5).
- The Terms of Service page (§8.2 #1).
- The notifications panel and search results (§8.2 #3).
- The user kebab menu (§8.2 #2).
- Real Google OAuth (FR-4, §8.2 #5).

## 7. Success Metrics

- **SM-1:** Visual fidelity. All 15 frames pass the NFR-1 overlay check. Validates FR-1 to FR-35 and NFR-1.
- **SM-2:** Swappability. Replacing the mock provider with an API client needs no changes to screen components. Validates NFR-4.
- **SM-C1 (counter-metric):** Do not chase pixel-perfection by hard-coding mock values in components. Data must flow through the provider. Counterbalances SM-1. Enforced by FR-33 and NFR-4.

## 8. Open Questions

### 8.1 Resolved during finalization (2026-11-16)
- **Brand:** the product is named Finbank. The UI keeps the "FINEbank.IO" wordmark.
- **Labels, dates and legends:** design inconsistencies are corrected. The Expenses legend reads This Year / Last Year, and the Saving Summary selector shows the same month as its axis. Comparison dropdowns offer Weekly and Monthly. Period selectors list calendar months anchored to mock today.
- **Bar-chart y axis:** evenly spaced design ticks with linear interpolation between them, to match Figma (FR-21).
- **Weekly axis:** shows the Sun–Sat week that contains mock today. The design's "17 Sun" is a copy error (FR-14).
- **Total Balance:** asset accounts minus liability accounts (FR-10).
- **Mock persistence:** user changes persist in `localStorage` (FR-33).
- **Mock data:** one consistent dataset across screens (FR-33). Placeholder values do not have to match Figma.
- **Category Goals:** they are monthly spending limits. No over-limit indicator in v1.
- **Phone Number on Security:** kept as designed and shown read-only.
- **Phone field style:** the plain prefix layout from screen 111.
- **Expenses cards:** show the two most recent items, plus an empty state.
- **Empty, loading and error states:** minimal defaults built from tokens (FR-35).

### 8.2 Deferred (non-blocking; owner: product/design; revisit when designs exist)
1. The Terms of Service page target. The link is inert in v1.
2. The contents of the user-block kebab menu. Shown but inert.
3. Search scope and results, and the notifications panel. Shown but inert.
4. The Add Account, Edit Accounts and Edit Details flows. Shown but inert.
5. Password reset completion (setting a new password) and real Google OAuth.
6. Over-limit indicators for category spending limits.

## 9. Assumptions Index

- FR-1: mock login accepts any well-formed credentials. "Keep me signed in" is checked by default and keeps the session across reloads.
- FR-2: no email verification.
- FR-3: the reset confirmation is an inline message.
- FR-4: the Google button performs a mock login.
- FR-5 and FR-28: the validation rules are inferred, because none are designed. Error text uses #E73D1C.
- FR-8: "View profile" opens Settings → Account.
- FR-9: the ">>" icon is decorative.
- FR-10: ↗ opens Account Details. Total Balance is asset accounts minus liability accounts.
- FR-14 and FR-21: comparison dropdowns offer Weekly and Monthly.
- FR-15: the tile arrow opens Expenses.
- FR-17: remove asks for confirmation through a simple dialog, then returns to Balances when started from Account Details.
- FR-18 and FR-19: "Load More" adds 10 rows at a time.
- FR-22: Expenses cards show the two most recent items and have an empty-state message.
- FR-23: the gauge is capped at 100%, and the period selector lists calendar months.
- FR-25: the modal is prefilled with current values, and "$500000" is placeholder text. Esc and overlay click close it. The placeholder typo is fixed.
- FR-27: modal 110.2 belongs to the category Adjust button.
- FR-28: Present may exceed Target.
- FR-29: the active tab is reflected in the URL.
- FR-30: all profile fields are required. The phone field uses the plain prefix layout, and both parts are editable.
- FR-31: the photo is saved with "Update Profile" and stored on the client only. It must be a JPEG, PNG, WebP or GIF of at most 5 MB, and is stored as a JPEG of at most 256px.
- FR-32: success clears the form, and the minimum password length is 8. The Security-tab phone field is read-only. The mock does not check Old Password, stores no password, and keeps the session.
- FR-33: user changes persist in `localStorage`.
- NFR-1: the font is Inter.
