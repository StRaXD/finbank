# Design Extract: Expenses, Goals, Settings

Source: `design-reference/screens/` 109, 110, 110.1, 110.2, 111, 112 (2880x2048 exports). Readings marked (?) are uncertain.

## Shared app shell (on all 6 screens)

- **Left sidebar (dark):** logo "FINEbank.IO"; nav items with icons: Overview, Balances, Transactions, Bills, Expenses, Goals, Settings. The active item has a teal highlight.
- **Logout** button at the bottom of the sidebar.
- **User block:** avatar, "Tanzir Rahman", a "View profile" link, and a vertical kebab (3-dot) menu. Menu contents are not shown.
- **Top bar:** a ">>" icon (probably collapses or expands the sidebar (?)), the current date "May 19, 2023", a notification bell with a teal unread dot, and a search input with the placeholder "Search here" and a search icon.

---

## 109. Expenses

Active nav item: Expenses.

### Section "Expenses Comparison": chart card
- Card title / period selector: **"Monthly Comparison"** with a chevron dropdown. Other options are not shown.
- **Chart:** grouped vertical bar chart with 2 series per month.
  - X axis: Jan, Feb, Mar, Apr, May, Jun, July, Aug, Sep, Oct, Nov, Dec.
  - Y axis: $0, $2k, $10k, $50k, $250k. The scale is non-linear, either log or uneven (?).
  - Legend: **"This Week"** (teal) and **"Last Week"** (light grey). The legend says weeks but the axis shows months and the title says "Monthly Comparison". This is an inconsistency in the design.
  - Teal bars are usually taller than grey bars. Grey bars are taller in Mar, Jun, and Nov (?).

### Section "Expenses Breakdown": 6 category cards in a 3x2 grid
Each card has the same structure:
- **Header:** category icon, category name, total amount, a percentage with a direction arrow (red up arrow or green down arrow), and the caption "Compare to last month".
- **Body:** a list of 2 expense items. Each row shows the item name on the left, and the amount with the date below it on the right. No column headers.

| Category | Total | % vs last month | Items (name / amount / date) |
|---|---|---|---|
| Housing | $250.00 | 15% up (red) | House Rent $230.00 17 May 2023; Parking $20.00 17 May 2023 |
| Food | $350.00 | 08% down (green) | Grocery $230.00 17 May 2023; Restaurant bill $120.00 17 May 2023 |
| Transportation | $50.00 | 12% down (green) | Taxi Fare $30.00 17 May 2023; Metro Card bill $20.00 17 May 2023 |
| Entertainment | $80.00 | 15% down (green) | Movie ticket $30.00 17 May 2023; iTunes $50.00 17 May 2023 |
| Shopping | $420.00 | 25% up (red) | Shirt $230.00 17 May 2023; Jeans $190.00 17 May 2023 |
| Others | $50.00 | 23% up (red) | Donation $30.00 17 May 2023; Gift $20.00 17 May 2023 |

Notes:
- The item amounts in each card add up to the category total (for example, 230 + 20 = 250).
- An up arrow is red, meaning spending rose, which is bad. A down arrow is green.
- The cards have no "view all", pagination, or add-expense button.
- It is not shown whether a card or row is clickable.

---

## 110. Goals (default state)

Active nav item: Goals. Page title: "Goals".

### Card "Savings Goal"
- **Date range dropdown:** "01 May ~ 31 May" with a chevron.
- **"Target Achieved":** $12,500, with a trophy icon.
- **"This month Target":** $20,000, with a target icon.
- **Gauge (semi-circular, half donut with a needle):** min label "$0", max label "$20k", centre value "12K", caption "Target vs Achievement". The teal fill is about 60%.
- **Button:** "Adjust Goal" with a pencil icon, outlined. It opens the modal shown in 110.1 or 110.2 (?).

### Card "Saving Summary"
- **Month dropdown:** "Mar 2022". This does not match the x axis, which shows May dates.
- **Legend:** "This month" (teal) and "Same period last month" (grey).
- **Chart:** smooth line/area chart. The "This month" series is a teal line with a gradient fill. The "Same period last month" series is a grey dashed line.
  - X axis: May 01, May 05, May 10, May 15, May 20, May 25, May 30.
  - Y axis: $0, $500, $2000, $5000 (non-linear).
  - There are vertical gridlines at each x tick.

### Section "Expenses Goals by Category": 6 cards in a 3x2 grid
- Each card shows a category icon, the category name, an amount, and an outlined "Adjust" button with a pencil icon.
- Categories: Housing, Food, Transportation, Entertainment, Shopping, Others. All show **$250.00**, which looks like placeholder data.
- The amount is presumably the budget limit or goal for that category (?).

---

## 110.1. Goals: modal with Target and Present amounts

The 110 screen is shown behind a dark overlay with a centred modal on top. The page content is identical to 110.

**Modal:**
- Close "X" at the top right.
- **"Target Amounts":** text input showing "$500000". This may be a value or placeholder text (?), shown in grey.
- **"Present Amounts":** text input with the placeholder "Write presents amounts here" (sic).
- **"Save"** button: primary, solid teal.
- No modal title.

Interpretation: this is probably the "Adjust Goal" modal for the Savings Goal. It sets the target ("This month Target") and the present or achieved amount ("Target Achieved") (?).

## 110.2. Goals: modal with Target amount only

The overlay and position are the same as 110.1, but the modal is shorter:
- Close "X".
- **"Target Amounts":** input showing "$500000".
- **"Save"** button.
- The "Present Amounts" field is absent.

Interpretation: this is probably the per-category "Adjust" modal under Expenses Goals by Category. It sets only the category's target or limit amount (?). The design does not show which button opens which modal.

**Difference between 110.1 and 110.2:** only the presence of the "Present Amounts" field. Everything else is identical.

---

## 111. Settings: Account tab

Active nav item: Settings. There is no page heading. The page has a single white card with tabs **Account** (active, teal underline) and **Security**.

**Left column (form):**

| Label | Value |
|---|---|
| Full name | Tanzir Rahman |
| Email | tanzir.rahman@email.com |
| Username | tanzir.rahman |
| Phone Number | +880, then a divider, then 51547 58868 |

- The phone field has a separate country-code part (+880) (?).
- The inputs are drawn without visible borders. They read as editable fields with values or placeholders (?).

**Right column:** "Your Profile Picture", a dashed upload box with an image-plus icon and the text "Upload your photo".

**Button:** "Update Profile" (primary teal). It saves the profile fields and probably the photo.

## 112. Settings: Security tab

- The Security tab is active. The Account tab is inactive.
- **Fields:**
  - "Old Password": masked "************".
  - "New Password": masked.
  - "Retype Password": masked.
  - "Phone Number": +880 | 51547 58868. It is unclear why the phone number appears here. It might be for 2FA or recovery, or might be a design copy-over (?).
- **Button:** "Update Password" (primary teal).
- There is no profile picture column.

**Difference between 111 and 112:** the active tab differs. The form changes from profile fields plus photo upload to password-change fields. Phone Number appears in both. The button label changes from "Update Profile" to "Update Password".

---

## Inferred data entities

- **ExpenseCategory**
  - Fields: id, name (Housing, Food, Transportation, Entertainment, Shopping, Others), icon.
  - Computed for a period: totalSpent and changePctVsLastMonth (with direction).
- **Expense** (likely a Transaction tagged with a category)
  - Fields: id, categoryId, name/description (for example "House Rent"), amount, date.
- **ExpenseComparisonSeries**
  - Spending totals per month, current period vs previous period. The legend says weeks.
- **SavingsGoal**
  - Fields: periodStart, periodEnd (01 May to 31 May), targetAmount ($20,000), achievedAmount or presentAmount ($12,500).
  - Derived: progress percentage for the gauge.
- **SavingSummary series**
  - Daily or periodic savings values for the selected month, and the same period of the previous month.
- **CategoryGoal / Budget**
  - Fields: categoryId, targetAmount ($250.00), and possibly a period (?).
- **UserProfile**
  - Fields: fullName, email, username, phoneCountryCode (+880), phoneNumber, profilePictureUrl.
- **Credentials**
  - Password change requires oldPassword, newPassword, and retypePassword, which must match newPassword.
- **Global elements**
  - Notification entity, implied by the bell with an unread dot.
  - Global search.
  - Current date display.
  - Logout session action.

## Interactions and mutations

| Trigger | Result | Mutates |
|---|---|---|
| Expenses "Monthly Comparison" dropdown | Changes the comparison granularity (?) | View only |
| Goals "01 May ~ 31 May" dropdown | Selects the savings-goal period | View only |
| Goals "Mar 2022" dropdown | Selects the month for Saving Summary | View only |
| "Adjust Goal" | Opens modal (110.1?) | SavingsGoal.targetAmount and presentAmount on Save |
| Category "Adjust" | Opens modal (110.2?) | CategoryGoal.targetAmount on Save |
| Modal "X" | Closes without saving | None |
| "Update Profile" | Saves the profile | UserProfile fields and photo |
| "Upload your photo" | File picker | UserProfile.profilePicture |
| "Update Password" | Changes the password | Credentials (validates old password and that new matches retype) |
| Sidebar nav, Logout, View profile, kebab, bell, search | Navigation and global actions | Logout ends the session |

## Ambiguities

1. Expenses chart: the legend says "This Week / Last Week" but the axis and title are monthly.
2. Both charts use non-linear y axes.
3. Saving Summary: the selector says "Mar 2022" but the axis shows May dates. The app date is May 19, 2023.
4. Gauge centre "12K" is a rounded display of the $12,500 achieved amount.
5. The modal value "$500000" does not match the $20,000 target. It is unclear whether it is placeholder or prefilled text.
6. The design does not show which button opens modal 110.1 vs 110.2. Neither modal has a title.
7. "Present Amounts" may mean amount saved so far. Its placeholder has a typo: "presents".
8. All category goals show $250.00. It is unclear whether they are budgets (spending caps) or savings targets, and their relation to Expenses totals is not shown. For example, Food spent $350 against a $250 goal, but no over-budget indicator is shown.
9. The Phone Number field appears on the Security tab. Its purpose is unclear.
10. Not shown in any of these screens: validation, error, success, empty, and loading states. Also not shown: ways to create or delete categories or goals, or to add an expense.
11. Settings has no page title, unlike the other pages.
