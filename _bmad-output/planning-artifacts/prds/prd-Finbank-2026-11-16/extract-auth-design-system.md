# Design Extract: Auth Screens, Design System, Components

Source: `design-reference/` Figma PNG exports. This file records only what is visible. Uncertain readings are marked (?).

## Layout / breakpoint

- The four screens are exported at 2880x2048 px. That is likely a 1440x1024 desktop frame at 2x (?).
- All auth screens use a single centered column. The form column is about 555 px wide at 2x export scale, so about 385 px at 1x (?).
- **No mobile or tablet layouts are included.** Responsive behavior is unspecified.
- The auth screens use a light background (very light gray, about #F4F5F7 (?), close to token F3F3F3).
- The component sheets are drawn on a dark (#191919) canvas. Sidebar and navigation components are shown on dark, but it is unclear whether the app chrome is dark or whether that is only the canvas (?).

---

## Screen: Welcome Page

**Purpose:** a Figma file cover / landing frame for the downloadable UI kit. It is not an in-app product screen.

- Heading line 1 (regular weight): "Welcome to the"
- Heading line 2 (bold): "Finebank - Financial Management Dashboard"
- Subtext (gray): "This file is totally free for personal project & education purpose, for commercial license please contact us"
- A short horizontal divider line
- Body: "To download complete dashboard click below button. Don't worry, its **totally free**"
- Pill-shaped primary button (teal, fully rounded, underlined white text): "Finebank Dashboard". It likely links to an external download (?).
- Underlined text link (dark gray): "Download more free UI Resources here". It is an external link.
- **PRD note:** this is designer marketing content, probably out of product scope. The product name is spelled two ways: "Finebank" here and "FINEbank.IO" in the app logo.

## Screen: 101. Login

**Purpose:** email/password sign-in with a Google SSO alternative.

- **Logo:** "FINEbank.IO" wordmark in teal (#299D91). "FINE" and ".IO" are heavy, "bank" is lighter. The logo is a geometric sans that differs from the UI font (?).
- **Field: Email Address**
  - Label: "Email Address"
  - Value: "johndoe@email.com" in dark text with a darker border. This is a filled or focused state (?).
- **Field: Password**
  - Label: "Password"
  - Right-aligned teal link on the label row: "Forgot Password?", which goes to 103 Forgot Password
  - Masked value (dots) with light border
  - Eye icon at the right, a show/hide password toggle
- **Checkbox:** "Keep me signed in", shown checked (teal fill, white check)
- **Primary button:** "Login", full width, teal fill, white bold text, small radius (about 4 px (?)). Likely goes to the dashboard/Overview.
- **Divider:** text "or sign in with" with horizontal rules on both sides
- **Secondary button:** "Continue with Google", full width, light gray fill (about #E5E7EB (?)), Google "G" icon. Starts Google OAuth.
- **Link (teal, semibold):** "Create an account", which goes to 102 Signup
- **States not shown:** no error states, validation messages, loading, or disabled states.

## Screen: 102. Signup

**Purpose:** account registration.

- Logo "FINEbank.IO"
- Heading: "Create an account" (bold, about 24 px (?))
- **Field: Name**
  - Label: "Name"
  - Value: "Tanzir Rahman", filled, with a darker border (filled/focused state (?))
- **Field: Email Address**
  - Label: "Email Address"
  - Placeholder: "hello@example.com" (gray text, light border, empty state)
- **Field: Password**
  - Label: "Password"
  - Masked dots with an eye toggle
  - No visible password-strength or rules hint
- **Legal copy:** "By continuing, you agree to our terms of service." The "terms of service." part is a teal link to a ToS page that is not designed.
- **Primary button:** "Sign up", full-width teal
- **Divider:** "or sign up with"
- **Secondary button:** "Continue with Google", with Google icon
- **Footer:** "Already have an account?" (gray) followed by teal bold link "Sign in here", which goes to 101 Login
- **Not shown:** no confirm-password field, no explicit ToS checkbox (agreement is implied by continuing), no error states, and no email-verification step.

## Screen: 103. Forgot Password

**Purpose:** request a password reset link.

- Logo "FINEbank.IO"
- Heading: "Forgot Password?" (bold)
- Subtext (gray): "Enter your email address to get the password reset link."
- **Field: Email Address**
  - Label: "Email Address"
  - Placeholder: "hello@example.com" (empty state)
- **Primary button:** "Password Reset", full-width teal. It sends a reset email.
- **Link (gray, semibold):** "Back to login", which goes to 101 Login
- **Not designed:** the confirmation/"email sent" state, the reset-password (new password) screen, and error states (for example an unknown email).

### Auth flow summary

- Login → Forgot Password → (email sent, not designed) → Back to login
- Login ↔ Signup, via "Create an account" and "Sign in here"
- Login or Signup → Google OAuth (not designed) → app (dashboard, assumed)
- Login → app (Overview, assumed)

---

## Design System (Typography-color.png)

### Typography

- **Font family:** not labeled in the export. The glyphs look like **Inter** (?), and the same face appears on all screens.
- **Weights shown:** Regular, Medium, Semi Bold, Bold, Extra Bold. These are likely 400/500/600/700/800 (?).

**Type scale** (size / line-height in px, with the weight seen in each example):

| Size | Line height | Example weight (observed) | Likely role (?) |
|---|---|---|---|
| 12 | 16 | Regular | captions, meta (dates, "Compare to last month") |
| 14 | 20 | Regular | small body, buttons, nav items |
| 16 | 24 | Regular | body, inputs, labels |
| 18 | 24 | Bold, Title Case | card titles |
| 20 | 28 | Medium, Title Case | section headings |
| 22 | 32 | Bold, Title Case | page headings |
| 24 | 28 | Semi Bold, sentence case | large headings / amounts |

The 24/28 line height is lower than the 22/32 row. This may be a design inconsistency (?).

### Colors: main palette (no token names given, hex only)

| Hex | Probable role (?) |
|---|---|
| #299D91 | Primary / brand teal (buttons, links, active nav, logo, checkbox) |
| #191919 | Primary text / darkest (also the dark canvas) |
| #525256 | Dark gray text (secondary headings) |
| #666666 | Body / secondary text |
| #878787 | Muted text (subtext, "Back to login") |
| #9F9F9F | Placeholder / tertiary text, icons |
| #E8E8E8 | Borders, dividers, secondary button fill (?) |
| #F3F3F3 | Page background (light) |

### Special colors (shown on a dark panel)

| Hex | Note | Probable role (?) |
|---|---|---|
| #E73D1C | — | Negative / error / downward trend (red arrows) |
| #4DAF6E | — | Positive / success / upward trend (green arrows) |
| #D2D2D2 | Opacity 25% | Overlay, divider or hover on dark surfaces |
| #FFFFFF | Opacity 70% | Secondary text on dark (sidebar inactive items) |
| #FFFFFF | Opacity 8% | Hover/selected background on dark (sidebar hover, logout bg) |

### Spacing and radius hints (no explicit spacing or radius tokens in the export)

- Inputs and buttons are about 44–48 px tall at 1x (?).
- Field label sits about 8 px above the input. Form groups are separated by about 24 px (?).
- Radius: buttons and inputs use a small radius, about 4–8 px (?). Cards use about 8 px (?). The Welcome pill button is fully rounded. The search bar uses a pill or large radius (?).
- Borders: 1 px light gray (#E8E8E8 / #D2D2D2 (?)) for default inputs. A darker border (#525256 / #191919 (?)) marks filled or focused inputs.

---

## Components (Components-1.png, Components-2.png)

### Buttons

- **Login button:** primary (teal fill, white text) and secondary/disabled (?) (light gray fill, dark text). Both are full width.
- **Continue with Google:** with Google icon and without icon. Both have a light gray fill.
- **Add Accounts:** teal, medium size.
- **Details >:** small teal button with a chevron. Two sizes are shown.
- **Check:** teal, medium size.
- **Details:** small teal tag-like button.
- **Adjust ✎:** outline teal button with a pencil icon (on the Housing card).
- **Save:** teal (in the modal).
- **Remove:** teal text link (Credit Card card).
- **Logout:** two variants on dark. One has a filled background (white at 8% (?)) with icon, the other is text plus icon without background.
- **Empty outlined button:** white border, no label, in the transaction row (?).

### Checkbox

- Checked state: teal fill with white check.
- Unchecked state: light gray box.
- The label text next to them is unreadable (dark on dark) (?).

### Inputs

Shown in two columns, probably a filled/focused variant (white text, light border) and a default/placeholder variant (dimmed) (?):

- Email: "hello@example.com" / "johndoe@email.com"
- Password, masked, with eye (show) icon
- Phone number with a country selector (US flag, "+1", dropdown caret) and placeholder "Phone number"
- Password, revealed ("152@@##PAss"), with eye-slash (hide) icon
- Labeled money input: label "Target Amounts", value "$500000"
- Labeled text input: label "Full name", value "Tanzir Rahman"
- Search bar: placeholder "Search here" with a magnifier icon, white pill-ish shape. Shown twice, once in the top bar.

### Sidebar / navigation

- Logo "FINEbank.IO" (white on dark).
- Nav items: Overview, Balances, Transactions, Bills, Expenses, Goals, Settings. Each has its own icon.
- Item states (Components-2):
  - **Active:** teal fill, white bold text
  - **Default:** no background, white text at 70% (?)
  - **Hover:** dark gray fill, white at 8% (?)
- Logout button at the bottom of the sidebar.
- User profile block: avatar, "Tanzir Rahman", "View profile", and a vertical kebab (⋮) menu. A divider sits above it.

### Cards

- **Credit Card card:**
  - Header "Credit Card" with "Master Card" and the Mastercard logo
  - Account number "133 456 886 8****", labeled "Account Number"
  - "$25000", labeled "Total amount"
  - Actions: "Remove" link and "Details >" button
- **Expense category card (compact):** Housing icon, "Housing $250.00", and an "Adjust ✎" outline button.
- **Expense breakdown card:**
  - Header (gray band): Housing icon, "Housing $250.00", "15% ↑" (red arrow), "Compare to last month"
  - Line items: "House Rent $230.00 17 May 2023" and "Parking $20.00 17 May 2023"
- **Goal edit modal:**
  - Close (X) button
  - "Target Amounts" input showing "$500000"
  - "Present Amounts" input with placeholder "Write presents amounts here" (sic)
  - "Save" button
- **Mini transaction item:** "Gadget & Gear" icon, "$160.00", "17 May 2023". It is dim, possibly a disabled or hover variant (?).
- **Category stat chip:** Housing icon, "Housing 20% ↑" (red), and a right arrow.

### Table / list rows

- **Transaction row** (dim on dark): gamepad icon | "Gadget & Gear" | "17 May, 2023" | "Credit Card", with a bottom divider.
- **Bill row:**
  - Date badge "May 15"
  - Figma logo with "Figma"
  - Description: "For advanced security and more flexible controls, the Professional plan helps you scale design processes company-wide."
  - Date "14 May, 2022"
  - Outlined button with an empty label (likely an amount or "Pay" (?))

### Top bar

- "» May 19, 2023": a double-chevron (breadcrumb or collapse (?)) followed by the date
- Notification bell with a teal dot (unread indicator)
- Search bar "Search here"
- Bottom divider

### Icons (Components-2)

The icon set is outline-style:

- Navigation and status: grid (overview), car (transportation (?)), eye, gear (settings), eye-off, bell, wallet/card, currency-exchange (?), document, wallet
- Actions and categories: login/logout arrow, pencil, bill ($ doc), transfer arrows, target/goal, crosshair (goals), receipt ($), arrow right (small and large)
- Gray variants (disabled/muted (?)): trophy (?), clock, search, chevron-down, bell with dot, search, X, target, figure/star (?), chevron-right
- Colored: chevron-right, green down-arrow, red up-arrow, teal housing icon, vertical divider, teal X
- Small arrows: diagonal arrow ↗, chevron-left, chevron-down

### Brand logos

Figma, Adobe, Mastercard, VISA.

### Charts

**None are visible on these sheets.** Chart components must come from the other dashboard screens.

---

## Notable ambiguities / gaps

1. **Name spelling:** "Finebank" vs "FINEbank.IO" vs the project name "Finbank".
2. **Font family** is not named. It looks like Inter (?).
3. **Color tokens are hex only.** There are no semantic names. The roles listed above are inferred.
4. **No error, loading, disabled or success states** are shown on any auth screen. The reset-email-sent and set-new-password screens are missing.
5. **The Terms of Service page** and **Google OAuth outcome** are not designed.
6. **Light vs dark theme:** the auth screens are light. The sidebar components are shown on dark, and the theme of the main app is unknown here.
7. **Desktop only.** There are no mobile designs.
8. **The phone-number input** appears in the components but not on the auth screens. Its purpose is unknown (profile/settings (?)).
9. **Signup** has no confirm-password field and no password rules.
10. **Typo in copy:** the placeholder reads "Write presents amounts here".
