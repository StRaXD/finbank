# Reconciliation: Design Inputs vs PRD

Date: 2026-11-16
Inputs: `extract-auth-design-system.md`, `extract-overview-accounts-bills.md`, `extract-expenses-goals-settings.md`. Spot-checked PNGs: `104.1. Overview.png`, `110.1. Goals.png`.
Target: `prd.md` and `addendum.md`. Neither was edited.

I did not flag the deliberate decisions listed in the brief: label, date and legend corrections; normalized mock data; category goals as spending limits; Phone Number on Security; fidelity over placeholder values; inert undesigned flows (§8.2); Welcome Page out of scope.

Severity: **H** means it will cause a wrong build or a wrong acceptance outcome. **M** means it is likely to cause divergence or rework. **L** is polish or clarity.

---

## A. Misnumbering and internal inconsistencies

| # | Sev | PRD location | Finding | Suggested fix |
|---|---|---|---|---|
| A1 | H | §6.1 "All 13 product screens: 101–112, including 104.1, 110.1, 110.2" | 101–112 is 12 numbered frames. With 104.1, 110.1 and 110.2 that makes 15. No counting gives 13. | Change to "All 15 product frames (12 screens 101–112 plus states 104.1, 110.1, 110.2)". |
| A2 | H | §7 SM-1 "Validates FR-6 to FR-35 and NFR-1" | The auth screens (FR-1–FR-5, screens 101–103) are designed but sit outside the visual-fidelity metric. | Change to "FR-1 to FR-35". |
| A3 | L | §4 intro "Each one references its source screen as `[scr NNN]`" | FR-5 to FR-15 and FR-33 to FR-35 have no `[scr]` tag. Sections 4.2 and 4.3 rely on the section heading instead. | Add the tags, or relax the rule ("FR or its section heading references…"). |
| A4 | M | FR-14 "days run Sun–Sat for the week that contains mock today" | The design axis reads "17 Sun … 23 Sat". In May 2023, the 17th is a Wednesday. The PRD rule gives "14 Sun … 20 Sat", and 20 May is after mock today (19 May). This correction follows the label/date decision, but §8.1 does not list it. The "DD Ddd" tick format and the handling of future days are also unspecified. | Add to §8.1: "Statistics x axis = 14 Sun–20 Sat, label format `DD Ddd`. Days after mock today show no 'This week' bar `[ASSUMPTION]`." |

## B. Visible design elements the PRD drops

| # | Sev | PRD location | Dropped element (source) | Suggested fix |
|---|---|---|---|---|
| B1 | M | FR-25 / FR-27 (modals) | **Overlay scope.** In 104.1 and 110.1 the dim overlay covers only the content area. The sidebar and top bar stay fully lit (verified in the PNGs). A default modal library dims the whole viewport. | Add to FR-25: "The overlay dims the content area only. The sidebar and top bar stay undimmed." |
| B2 | M | FR-9 (top bar) | The **">>" double-chevron icon** before the date appears on every screen. It is not mentioned, not even as decorative. | Add "a decorative '>>' icon precedes the date (non-interactive) `[ASSUMPTION]`". Or list it in §8.2 if it might be a sidebar toggle. |
| B3 | M | FR-23, FR-26 | Both **"Adjust Goal" and "Adjust" carry a pencil icon** (110, Components "Adjust ✎"). The PRD says only "outlined button". FR-11's pencil sits in a **grey square button** (104). | Write "outlined teal button with trailing pencil icon" in FR-23 and FR-26. |
| B4 | L | FR-23, FR-11 | The gauge has a **needle** and min/max labels "$0" / "$20k". FR-23 gives min/max values but not the needle. | Add "with a needle at the achieved position". |
| B5 | M | FR-24 | **Saving Summary y axis** ($0, $500, $2000, $5000, non-linear) and **x ticks every 5 days** (May 01, 05 … 30) are not specified. The §8.1 log-axis decision covers bar charts only. | State the tick sets and scale for the line chart, or extend the §8.1 axis decision to it. |
| B6 | L | FR-15 | Percentages carry an **asterisk ("15%\*")** footnoted by the section note "**\*Compare to last month**" (104). | Add the footnote and asterisk to FR-15. |
| B7 | L | FR-15 | The Housing tile "→" is **teal** and the others are grey. This is the only designed hover/active cue on Overview. | Add "→ turns teal on tile hover `[ASSUMPTION: teal arrow in 104 is the hover state]`". |
| B8 | L | FR-10 | The carousel card is a **teal-filled card** labelled "Account Type". The design shows **3 dots** for 5 accounts, and the PRD does not say how the dot count maps to accounts. "Next" behaviour on the last slide is not stated. | State one dot per account (normalized), and that "Next" is disabled on the last slide `[ASSUMPTION]`. |
| B9 | L | FR-6, FR-19, FR-13 | **Nav items each have an icon.** Transaction rows have **category icons in grey squares**. Active list tabs (All/Revenue/Expenses) use **teal text and underline**. FR-29 states this style for Settings only. | Mention the icons, and reuse the FR-29 tab style for FR-13 and FR-19. |
| B10 | L | FR-16, FR-20, FR-21, FR-23 | **Page and section titles**: "Balances", "Upcoming Bills", "Expenses Comparison", "Expenses Breakdown", "Goals", "Expenses Goals by Category". On Overview, section titles sit **above** the cards, not inside them. The PRD names only some of them. NFR-1 covers this implicitly. | Optional: list the page titles per screen. Settings is the only screen without one (already stated). |
| B11 | L | FR-1 | "Keep me signed in" is shown **checked**. The PRD does not give its default state. | State the default (checked as designed, or unchecked `[ASSUMPTION]`). |
| B12 | L | FR-16 vs FR-10 | **Two masking styles.** The carousel shows `**** **** **** 2598` (last 4). The Balances and Details cards show `3388 4556 8860 8***` (leading digits). FR-33 requires the same record to look the same everywhere, and the PRD does not reconcile the two. | State that each screen keeps its designed mask style from the same full number. |

## C. PRD claims not backed by design and not tagged `[ASSUMPTION]` or listed in §8.1

| # | Sev | PRD location | Untagged invented detail | Suggested fix |
|---|---|---|---|---|
| C1 | H | FR-28 | "non-negative amounts up to two decimals", "empty or non-numeric blocks Save and shows an inline error". None of this is designed. Only "Present above Target" is tagged. The design shows the value as "$500000", and the PRD does not say whether the "$" prefix or thousands separators are accepted. | Tag the rules `[ASSUMPTION]`. Specify "$" / comma handling (strip or display prefix). |
| C2 | M | FR-5, FR-32 | FR-5 "validates required fields and email format": the rule set is untagged. FR-32 does not say whether **Old Password is checked** against the mock credential (the extract implies it is). Signup (FR-2) has no length rule, but FR-32 enforces 8. | Tag FR-5. State the mock old-password check. Align the signup password rule with FR-32, or state the difference explicitly. |
| C3 | M | FR-34 | "Most amounts show two decimals… headline balances and goal amounts show none". The design also shows **bill amounts ($150, $559)** and **account card amounts ($25000)** with no decimals, and the PRD does not place them in either group. The result: an unclear spec, with a risk of losing fidelity. | Give an explicit list of 0-decimal contexts: total balance, carousel/account-card balance, bill amounts, goal amounts. Everything else uses 2 decimals. |
| C4 | M | FR-10 / FR-33 "Total Balance is the sum of the accounts" | The design does not show how a **Loan** balance counts (asset or liability). Summing it as positive is an invented rule. | Tag `[ASSUMPTION]` and state the Loan sign. |
| C5 | M | Glossary "Transaction … belongs to a category"; FR-18 | The transaction icons include **gadget/gamepad**, which is not one of the six expense categories. Account Details shows **Status ("Complete")** and **Transaction Type ("Credit")**, while the glossary defines kind only as Revenue/Expense. The PRD does not define how Transaction relates to Expense, which FR-15 and FR-22 depend on. | Define the transaction category set and its icons, the Credit/Debit ↔ Revenue/Expense mapping and the Status values, and say whether Expenses items are Expense-kind transactions. Tag `[ASSUMPTION]`. |
| C6 | L | FR-7 "Authenticated routes redirect to Login when there is no session" | This is reasonable but not designed. The reverse case (a signed-in user opens /login) is unspecified. | Tag `[ASSUMPTION]`, and add the reverse redirect. |
| C7 | L | FR-17 | After "Remove" on **Account Details (106)**, the destination is unspecified, since the viewed account no longer exists. | Add "returns to Balances `[ASSUMPTION]`". |
| C8 | L | FR-18, FR-19 "Load More appends the next page" | The page size and the end-of-list state (hide or disable the button) are not designed and not tagged. FR-12 and FR-13 widget row counts (the design shows 2 bills and 5 transactions) are not stated. | Tag the page size and end state. State the widget counts (2 / 5) as designed. |
| C9 | L | FR-21 "This matches the Figma bar heights" | This is a claimed verification of the log axis. Nothing in the extracts measures it. | Soften to "approximates", or keep it as a §8.1 decision only. |
| C10 | L | FR-27 | It does not say whether the category modal opens **prefilled**. FR-25's prefill and "$500000 is placeholder" assumption is not carried over. | Add "Opens prefilled with the category's current limit (as FR-25)". |

## D. Qualitative / visual-language coverage (NFR-1 + addendum)

What the designs establish:
- a dark near-black sidebar (#191919, about 270px)
- a light grey content background (#F3F3F3 / about #F4F5F7) with **white rounded cards and soft shadows**
- a teal #299D91 accent for the active nav pill, primary buttons, active tabs, the carousel card, chart "this" series and the bell dot
- an **outlined teal "Adjust" style**
- red ↑ / green ↓ semantics
- inputs on light screens with a light 1px border, plus a darker border for filled or focused fields; Settings inputs have no visible border
- sidebar item states: active teal fill, default white at 70%, hover white at 8%; a Logout button with a white 8% fill

**NFR-1** ("every screen matches its Figma export in layout, spacing, colour and type scale") does cover the static look. The dark sidebar, light content, white cards and teal accent are all visible in the 15 screen exports, so a reviewer comparing against the PNGs catches them. It is **not adequate** in four ways:

1. **Interactive states are not in the screen exports.** Sidebar hover, input filled/focused and the button secondary/disabled variants exist only on `design-reference/components/Components-1.png` and `Components-2.png`. NFR-1 and SM-1 reference "its Figma export" per screen, so these sheets are outside the acceptance target. FR-6 names a hover state but gives it no visual definition.
2. **The addendum token list drops the dark-surface tokens** from Typography-color: white at 70% (inactive nav text), white at 8% (hover and Logout fill) and #D2D2D2 at 25% (divider on dark). It also drops the sidebar background role for #191919. Without them the hover state and the sidebar can't be built from tokens.
3. **No radius, shadow, border or spacing guidance** is recorded: cards about 8px with a soft shadow, inputs and buttons about 4–8px and 44–48px tall, a pill search bar, about 8px label gap, about 24px group gap, a 1px #E8E8E8 default border and a darker focused border. The extract notes these as hints. The addendum omits them.
4. **Component-level look is not named.** FR-23 and FR-26 say "outlined" but not that the outline and text are teal with a pencil. Modal overlay scope (B1) and the teal carousel card are structural, not tokens, so token lists won't capture them.

**Suggested fix:** extend NFR-1 to "screen exports **and** the component/design-system sheets (`design-reference/components/*`, `design-system/Typography-color.png`) for interactive states". Add to the addendum:
- a "Surfaces and states" block: sidebar #191919; content #F3F3F3; card #FFFFFF with radius about 8 and a soft shadow; nav default white/70, hover white/8, active #299D91; Logout white/8; divider on dark #D2D2D2/25
- an input border default and focused
- an "outlined button: 1px #299D91 border, teal text, trailing icon" variant

## E. Checked and consistent (no action)

- Seven nav items in order; Account Details highlights Balances; Overview-only greeting; bell with an unread dot; search placeholder.
- Auth copy and links: "Forgot Password?", "Create an account", "Sign in here", "terms of service.", "Back to login", "Continue with Google".
- Balances card actions and the Add/Edit Accounts card; Account Details fields and columns; Transactions and Bills columns; Load More.
- Expenses 3×2 order, header and caption; Goals card contents; 110.1 / 110.2 field sets and "no title"; Settings fields, +880 split, upload box copy, button labels.
- The typo fix, the $500000-as-placeholder note, the y-axis log decision, and the legend and month-selector corrections are all tagged or listed in §8.1.
