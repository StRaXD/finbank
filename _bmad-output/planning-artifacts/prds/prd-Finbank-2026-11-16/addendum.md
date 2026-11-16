# Addendum: Finbank PRD

This addendum records technical-direction notes for architecture. They are not requirements.

## Stack (from discovery)
- React, TypeScript, Vite and Tailwind CSS.
- Architecture: a simple, frontend-only SPA.

## Data layer
- Screens read data only through a typed data-provider interface (PRD NFR-4). The v1 implementation is a mock provider seeded from one dataset, with user changes persisted to `localStorage` (PRD FR-33).
- An HTTP provider can later replace the mock provider without changing any screen (SM-2).
- These entities come from the design extracts: User/UserProfile, Account, Transaction, Bill, ExpenseCategory and Expense (PRD "expense item"), SavingsGoal, CategoryGoal, plus the chart series (weekly stats, monthly expense comparison, saving summary).

## Design tokens (from `extract-auth-design-system.md`)
- **Primary:** #299D91.
- **Text and neutrals:** #191919, #525256, #666666, #878787, #9F9F9F, #E8E8E8, #F3F3F3.
- **Danger and positive:** #E73D1C and #4DAF6E.
- **Font:** Inter, assumed because the designs don't name it (PRD NFR-1).
- **Type scale:** 12/16, 14/20, 16/24, 18/24, 20/28, 22/32 and 24/28.
- **Target frame:** 1440×1024. The PNG exports are at 2× scale.

## Surfaces and states (from the design-system and component sheets)
- **Sidebar:** #191919 background.
  - Inactive nav text: white at 70%.
  - Hover and Logout background: white at 8%.
  - Active nav item: #299D91 fill, white bold text.
  - Dividers: #D2D2D2 at 25%.
- **Content:** #F3F3F3 background with white cards (radius about 8px, soft shadow).
- **Buttons:**
  - Primary: #299D91 fill, white text, radius about 4px.
  - Outlined ("Adjust", "Adjust Goal"): 1px #299D91 border, teal text and pencil icon, transparent fill.
  - Text links ("Remove", "View All"): teal.
- **Inputs:**
  - Default: 1px #E8E8E8 border.
  - Filled or focused: darker border (#525256).
  - Placeholder text: #9F9F9F.
  - Settings shows its inputs borderless, as designed.
- **Modal overlay:** dims the content area only. The sidebar and top bar stay undimmed.
- **Trend colours:** up (bad) is #E73D1C; down (good) is #4DAF6E.
