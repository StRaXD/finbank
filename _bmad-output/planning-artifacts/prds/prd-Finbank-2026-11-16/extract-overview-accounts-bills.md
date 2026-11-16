# Design Extract: Overview, Balances, Account Details, Transactions, Bills

Source: `design-reference/screens/` — 104. Overview, 104.1. Overview, 105. Balances, 106. Account Details, 107. Transactions, 108. Bills.
Only what's visible in the images is recorded here. `(?)` marks a reading I'm not sure of.

## 1. Layout / breakpoint

- The exported PNGs are 2880x2048, which is a **1440x1024 desktop frame at @2x**. These six screens show no tablet or mobile variants.
- The sidebar is fixed on the left, about 270px wide at 1x, with a dark (near-black) background. The content area sits on a light grey background and uses white rounded cards with soft shadows.
- The primary accent colour is teal (about #299D91). It's used for the active nav item, primary buttons, the active tab and the chart's "This week" series.
- Content uses a 3-column card grid: Overview, Balances.

## 2. App shell (same on all screens)

### Sidebar (top to bottom)
1. Logo: **"FINEbank.IO"**. The project is named "Finbank", but the UI wordmark reads "FINEbank.IO".
2. Nav items, in this order, each with an icon:
   1. Overview (grid icon)
   2. Balances (wallet icon)
   3. Transactions (two-way arrows icon)
   4. Bills (receipt/$ icon)
   5. Expenses ($ document icon)
   6. Goals (crosshair/target icon)
   7. Settings (gear icon)
   - Active item: a teal filled pill with white bold text. Inactive items: light grey text on dark.
   - Active item per screen: Overview (104, 104.1), **Balances (105 and 106)**, so Account Details is a child of Balances. Transactions (107), Bills (108).
3. **Logout** button: a dark grey filled bar with an arrow-into-door icon, near the bottom.
4. A divider, then the **user block**: circular avatar photo, name "Tanzir Rahman", sub-link "View profile", and a vertical kebab (three-dot) icon. The kebab probably opens a user menu (?). Its contents are not shown.

### Header (top bar)
- **Overview only:** the greeting **"Hello Tanzir"** (the user's first name) appears on the left, followed by a ">>" double-chevron icon and the date "May 19, 2023".
- **All other screens:** no greeting. Only the ">>" icon and the date "May 19, 2023" show. The ">>" may be a breadcrumb separator, a decoration or a sidebar toggle (?).
- Right side: a **notification bell** with a small teal dot (unread indicator), and a **search input** with the placeholder "Search here" and a magnifier icon. Nothing shows the search scope (?).
- There's no avatar in the header. The avatar appears only in the sidebar footer.
- A thin divider line separates the header from the content.

## 3. Screen 104 – Overview (dashboard)

The grid has 3 columns. Row 1: Total Balance | Goals | Upcoming Bill. Below it, Recent Transaction (left column, tall) sits beside Statistics (spans 2 columns), with Expenses Breakdown (spans 2 columns) under Statistics.

### 3.1 Total Balance (section title above the card)
- Total amount **$240,399**, with the label "All Accounts" on the right. The label could be a scope label or an account selector (?). No dropdown chevron is visible.
- **Account carousel card** (teal):
  - "Account Type": **Credit Card**
  - Masked number **"\*\*\*\* \*\*\*\* \*\*\*\* 2598"**, showing the last 4 digits
  - Balance **$25000**
  - Mastercard logo
  - A circular arrow button (↗) that probably opens that account's details (?)
- Carousel controls: "< Previous" (greyed out/disabled on the first slide), 3 pagination dots with the first one active, and "Next >". This suggests one slide per account.

### 3.2 Goals
- Goal amount **$20,000**, with an **edit (pencil) icon button** next to it. That button opens the 104.1 modal. The period "May, 2023" sits on the right.
- "Target Achieved" (trophy icon): **$12,500**
- "This month Target" (target icon): **$20,000**
- **Semi-circular gauge chart**: the min label is "$0", the max label is "$20k", the centre value reads **"12K"**, and the caption is "Target vs Achievement". The teal arc shows progress against a grey remainder, with a needle.

### 3.3 Upcoming Bill (section title + "View All >" link, probably to Bills, 108)
Each row has:
- Date badge: month + day ("May / 15", "Jun / 16")
- Vendor: "Figma" (text) / Adobe logo + "Adobe" (red)
- Bill title: **"Figma - Monthly"**, **"Adobe - Yearly"**
- "Last Charge - 14 May, 2022" / "Last Charge - 17 Jun, 2023"
- Amount in an outlined box: **$150**, **$559**

Two rows are shown.

### 3.4 Recent Transaction (section title + "View All >" link, probably to Transactions, 107)
- Tabs: **All** (active, teal with underline) | **Revenue** | **Expenses**
- Each list item has a category icon in a grey square, the item name (bold), the shop/merchant below it, and the amount and date right-aligned.

| Item | Shop | Amount | Date |
|---|---|---|---|
| GTR 5 | Gadget & Gear | $160.00 | 17 May 2023 |
| Polo Shirt | XL fashions | $20.00 | 17 May 2023 |
| Biriyani | Hajir Biriyani | $10.00 | 17 May 2023 |
| Taxi Fare | Uber | $12.00 | 17 May 2023 |
| Keyboard | Gadget & Gear | $22.00 | 17 May 2023 |

- The icons map to categories: gamepad = gadget, shopping bag = shopping, house with fork = food, building/vehicle = transport.
- Amounts have no +/- sign or colour coding, so revenue and expense can't be told apart.

### 3.5 Statistics
- Card title "**Weekly Comparison**" with a dropdown chevron. This is probably a period/comparison selector (?). The options aren't shown.
- Legend: **This week** (teal) and **Last week** (light grey).
- **Grouped vertical bar chart**:
  - X axis: "17 Sun, 18 Mon, 19 Tue, 20 Wed, 21 Thu, 22 Fri, 23 Sat", with 2 bars per day.
  - Y axis labels: $0, $2k, $10k, $50k, $250k. The ticks are evenly spaced, which suggests a non-linear (log-like) scale (?).
- No tooltip or hover state is shown.

### 3.6 Expenses Breakdown (section title + note "\*Compare to last month")
A 3x2 grid of category tiles. Each tile has an icon, the category name, the amount, a percentage with an asterisk, an up or down arrow, and a right arrow "→". The right arrow probably drills into the Expenses page for that category (?). The Housing "→" is teal and the others are grey, which may be a hover or active state (?).

| Category | Amount | % vs last month | Direction |
|---|---|---|---|
| Housing | $250.00 | 15%* | ↑ red |
| Food | $350.00 | 08%* | ↓ green |
| Transportation | $50.00 | 12%* | ↓ green |
| Entertainment | $80.00 | 15%* | ↓ green |
| Shopping | $420.00 | 25%* | ↑ red |
| Others | $650.00 | 23%* | ↑ red |

Colour semantics: red ↑ means spending increased, green ↓ means spending decreased.

## 4. Screen 104.1 – Overview with the Goal edit modal

- The page content is identical to 104, but the content area is dimmed by a grey overlay. The sidebar and header are **not** dimmed.
- A **centred modal** (white, rounded) appears. It opens from the Goals card's pencil icon.
  - A close "X" in the top-right corner.
  - The field **"Target Amounts"**: a text input showing "$500000". This could be a value or a placeholder (?). It differs from the $20,000 on the card.
  - The field **"Present Amounts"**: a text input with the placeholder "Write presents amounts here". The copy has a typo: "presents".
  - Primary button **"Save"** (teal).
- This means the user can set the goal's target amount and the present (achieved) amount by hand. The modal shows no validation, month selector or currency selector.
- This is the only difference from 104. It's a modal-open state, not a hover state.

## 5. Screen 105 – Balances (active nav: Balances)

- Page title "Balances". There's no greeting in the header.
- A 3-column grid: 5 account cards plus 1 action card.

Each account card shows:
- **Account type** (top-left)
- **Bank/issuer and network** (top-right)
- **Masked account number** with the label "Account Number"
- **Total amount**

| Type | Bank / network | Account number | Total amount |
|---|---|---|---|
| Credit Card | "Master Card" + Mastercard logo | 3388 4556 8860 8*** | $25000 |
| Checking | AB Bank Ltd + VISA logo | 693 456 69 9**** | $25000 |
| Savings | Brac Bank Ltd. | 133 456 886 8**** | $25000 |
| Investment | AB Bank Ltd | 698 456 866 2**** | $25000 |
| Loan | City Bank Ltd. | 363 456 896 6**** | $25000 |

- Every card shows $25000. That's placeholder data.
- Actions on each card: the text link **"Remove"** (teal) and the primary button **"Details >"**, which goes to Account Details (106).
- 6th card (action): the primary button **"Add Accounts"** and the secondary text link **"Edit Accounts"**. Neither flow is shown.
- No pagination.

## 6. Screen 106 – Account Details (active nav: Balances)

- Page title "Account Details". There's no breadcrumb or back button.
- **Details card** (label above value):
  - Bank Name: **AB Bank Ltd.**
  - Account Type: **Checking**
  - Balance: **$25,056.00**
  - Branch Name: **Park Street Branch**
  - Account Number: **133 456 886 8\*\*\*\***
  - Buttons: **"Edit Details"** (primary) and **"Remove"** (text link). Neither the edit form nor the remove confirmation is shown.
- **Transactions History** (section title) is a table:

| Date | Status | Transaction Type | Receipt | Amount |
|---|---|---|---|---|
| 17 Apr, 2023 | Complete | Credit | 8C52d5DKDJ5 | $160.00 |

  The table has 4 identical rows. Receipt is an alphanumeric ID. It's unclear whether it links to a receipt document (?).
- Pagination: a **"Load More"** button (load-more pattern, not numbered pages).
- Inconsistency: the account number 133 456 886 8**** matches the **Savings / Brac Bank** card on 105, but this screen shows AB Bank / Checking.

## 7. Screen 107 – Transactions (active nav: Transactions)

- Page title **"Recent Transaction"**. It's the same title as the Overview widget.
- Tabs: **All** (active) | **Revenue** | **Expenses**
- Table:

| Items (icon + name) | Shop Name | Date | Payment Method | Amount |
|---|---|---|---|---|
| GTR 5 | Gadget & Gear | 17 May, 2023 | Credit Card | $160.00 |
| Polo shirt | XL fashions | 17 May, 2023 | Credit Card | $20.00 |
| Biriyani | Hajir Biriyani | 17 May, 2023 | Credit Card | $12.00 |
| Movie ticket | Inox | 17 May, 2023 | Credit Card | $15.00 |
| Taxi fare | Uber | 17 May, 2023 | Credit Card | $10.00 |
| Pizza | Pizza Hit | 17 May, 2023 | Credit Card | $20.00 |
| Keyboard | Gadget & Gear | 17 May, 2023 | Credit Card | $30.00 |

- Row icons: gamepad, bag, food, clapperboard (entertainment), transport, food, bag.
- Pagination: a **"Load More"** button.
- There are no sorting indicators, date filters or row-click affordances.
- Data mismatches with Overview: Biriyani is $10 there and $12 here; Taxi is $12 there and $10 here; Keyboard is $22 there and $30 here.

## 8. Screen 108 – Bills (active nav: Bills)

- Page title **"Upcoming Bills"**.
- Table columns: **Due Date | Logo | Item Description | Last Charge | Amount**

| Due Date (badge) | Logo | Title | Description | Last Charge | Amount |
|---|---|---|---|---|---|
| May 15 | Figma logo + wordmark | Figma - Yearly Plan | "For advanced security and more flexible controls, the Professional plan helps you scale design processes company-wide." | 14 May, 2022 | $150 |
| Jun 16 | Adobe logo + wordmark | Adobe Inc - Yearly Plan | (same description text) | 17 Jun, 2022 | $559 |

- The amount sits in an outlined box. It could be a button, such as pay (?).
- There's no pagination, add-bill button or pay action.
- Inconsistencies with Overview: the Figma bill is "Monthly" there and "Yearly Plan" here. Adobe's last charge is 17 Jun **2023** on Overview and 17 Jun **2022** here.

## 9. Inferred data entities

- **User**: firstName ("Tanzir"), fullName ("Tanzir Rahman"), avatarUrl; has a profile page (via "View profile").
- **Account**:
  - id
  - type: CreditCard | Checking | Savings | Investment | Loan
  - bankName ("AB Bank Ltd.")
  - branchName ("Park Street Branch")
  - accountNumber (stored in full and displayed masked)
  - cardNetwork (Mastercard/VISA, optional)
  - balance (USD)
- **Total balance**: the aggregate across accounts ($240,399). The mock data doesn't add up: 5 × $25,000 ≠ $240,399.
- **Transaction**:
  - id
  - itemName ("GTR 5")
  - shopName/merchant ("Gadget & Gear")
  - category (drives the icon: gadget, shopping, food, entertainment, transport)
  - date
  - paymentMethod ("Credit Card")
  - amount
  - kind: Revenue | Expense (drives the tabs)
  - accountId (Account Details shows history per account)
  - status ("Complete")
  - transactionType ("Credit", presumably Credit/Debit)
  - receiptId ("8C52d5DKDJ5")
- **Bill**:
  - id
  - vendorName ("Figma", "Adobe Inc")
  - logo
  - title/planName ("Figma - Yearly Plan")
  - billingCycle (Monthly/Yearly)
  - description
  - dueDate (May 15)
  - lastChargeDate (14 May, 2022)
  - amount ($150)
- **Goal (monthly)**:
  - period ("May, 2023")
  - targetAmount ($20,000)
  - achievedAmount/presentAmount ($12,500)
  - Editable through the modal.
- **ExpenseCategorySummary**:
  - category (Housing, Food, Transportation, Entertainment, Shopping, Others)
  - amount (current month)
  - percentChange vs last month
  - direction (up/down)
- **WeeklyStatistics**: per day, dayLabel ("17 Sun"), thisWeekAmount and lastWeekAmount.
- **Notification**: existence only, from the unread dot. No contents are shown.

## 10. Interactions found

| Element | Screen | Likely behaviour / target |
|---|---|---|
| Sidebar nav items | all | Route to Overview / Balances / Transactions / Bills / Expenses / Goals / Settings |
| Logout | all | Sign out |
| View profile / kebab | all | Profile page / user menu (?) |
| Bell | all | Notifications (?) — not shown |
| Search "Search here" | all | Search (scope unknown) |
| Carousel Previous / Next / dots | 104 | Cycle through accounts |
| ↗ on account carousel card | 104 | Open that account (Account Details?) (?) |
| Goals pencil icon | 104 | Open the Goal edit modal (104.1) |
| Modal X / Save | 104.1 | Close / save target & present amounts |
| Upcoming Bill "View All" | 104 | Bills (108) |
| Recent Transaction "View All" | 104 | Transactions (107) |
| All / Revenue / Expenses tabs | 104, 107 | Filter transactions by kind |
| "Weekly Comparison ▾" | 104 | Change statistics period (?) |
| Expense category "→" | 104 | Drill into Expenses for that category (?) |
| Details > | 105 | Account Details (106) |
| Remove | 105, 106 | Remove account (confirmation not shown) |
| Add Accounts / Edit Accounts | 105 | Add/edit account flows (not shown) |
| Edit Details | 106 | Edit account form (not shown) |
| Load More | 106, 107 | Append the next page of transactions |

## 11. Ambiguities / open questions

1. The brand is "FINEbank.IO" in the UI and "Finbank" as the project name.
2. The ">>" icon before the date in the header could be a breadcrumb, a sidebar toggle or decoration.
3. The chart's Y-axis ($0/$2k/$10k/$50k/$250k) looks non-linear. Is that intentional?
4. The "Weekly Comparison" dropdown options aren't shown.
5. The goal modal's Target shows $500000 while the card shows $20,000, and it's unclear whether that's a placeholder or a value. The copy typo "presents amounts" also needs fixing. The gauge centre reads "12K" with a max of "$20k".
6. Account Details data (AB Bank/Checking with Savings's account number) doesn't match the Balances cards. The balance there is $25,056.00, while the Balances cards show $25000.
7. Transaction amounts differ between Overview and Transactions for the same items. Neither screen gives revenue a visual distinction (sign or colour).
8. Bill billing cycle (Monthly vs Yearly) and last-charge year are inconsistent between Overview and Bills.
9. The meaning of "Last Charge" is unclear: is it the previous payment date?
10. No empty, loading or error states are shown. There's no add-bill flow and no pay-bill action.
11. Account Details has no back/breadcrumb navigation. Its only context is the Balances nav highlight.
12. Currency formatting is inconsistent ($25000 vs $25,056.00 vs $240,399). The only currency shown is USD.
13. The page title "Recent Transaction" is reused on the full Transactions page.
