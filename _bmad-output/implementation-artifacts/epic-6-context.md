# Epic 6 Context: Account Management & UX Completion

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let users add bank accounts and edit existing ones, and keep every screen that shows account data consistent: Balances, the Overview carousel and Total Balance, Account Details, Transactions and Expenses. When this epic is done, "Add Accounts", "Edit Accounts" and "Edit Details" work instead of being inert, through one shared Account modal. The four controls whose flows are still undesigned (notifications bell, "Search here", the user-block ⋮ menu and the Signup "terms of service" link) look as designed but clearly say "Coming soon", so nothing that looks enabled is inert. This is a post-MVP extension added on 2026-11-18. None of these flows has a Figma design, so they reuse existing design-system patterns.

## Stories

- Story 6.1: Add Accounts
- Story 6.2: Edit Accounts
- Story 6.3: Edit Account Details
- Story 6.4: Placeholder UX for the remaining undesigned controls

## Requirements & Constraints

- **Add account fields:** Account Type (Credit Card, Checking, Savings, Investment, Loan), Bank Name, Branch Name, Card Network, Account Number and Balance.
  - Card Network offers Visa, Mastercard or Other. It is shown and required only for Credit Card and Checking, and hidden and cleared for the other types.
  - Balance uses `MoneyInput` and is labelled "Amount owed" for Credit Card and Loan.
- **Validation (create and edit):**
  - Every field is required. Bank and branch names are free text.
  - The account number is digits only, 8–19 digits, and unique across all accounts. On edit, the account itself is excluded from the uniqueness check.
  - The balance is at least 0.
  - Errors show inline on their field, and nothing is saved.
- **Account type:** chosen only when adding. It is immutable afterwards and shown read-only in the Edit modal.
- **Create:** the new account is appended last, after the existing accounts and before the action card on Balances, and at the end of the Overview carousel. It is included in the Total Balance, signed by type. It opens in Account Details with the existing empty transaction state. It starts with no transactions, so Transactions and Expenses do not change. It survives a reload and a logout followed by a login.
- **Edit:** an edit keeps the account id, its list position, its transactions and their links. Balances are stored values, independent of transaction history. A balance edit updates Balances, Account Details and the Overview total immediately and never modifies a transaction.
- **No reload:** every create and update is validated, persisted, and reflected across the app without a page reload.
- **Storage full:** `STORAGE_FULL` shows inline, the modal stays open with its values kept, and nothing changes.
- **Network logos:** a card shows the Visa or Mastercard logo only for that network. "Other", and any unknown or missing value, shows a neutral card icon. A wrong logo is never shown.
- **Modal behaviour:**
  - X, Esc and an overlay click discard the form. They are ignored while saving.
  - A second Save while one is pending is dropped.
  - Focus stays inside the modal while saving.
  - The modal closes only after the account list has refetched.
- **Edit mode (Balances):** the "Edit Accounts" link toggles to "Done" (`aria-pressed`). In edit mode each account card adds an "Edit" action, and Remove and Details stay available. "Done", leaving Balances, or a reload ends edit mode.
- **Edit Details:** opens the same Edit modal from `/balances/:accountId`. The user stays on the page, and the transaction history is unchanged.
- **Unavailable controls:** the bell, the ⋮ user menu, the terms link and the search box keep their designed look.
  - Each is `aria-disabled`, and the search input is also `readOnly` and accepts no typing.
  - Each has a default cursor and no hover change.
  - Each has a "Coming soon" native `title` tooltip and an `aria-describedby` description.
  - Each stays keyboard-focusable with the focus outline.
  - Activating one does nothing and throws no error.
- **Fidelity:** the modal matches the 110.2 pattern, and every touched screen still matches its Figma at 1440×1024.
- **Tests:**
  - The two existing tests that assert Add/Edit Accounts and Edit Details are inert get replaced.
  - A sweep test checks that no enabled-looking control in the shell, Balances, Account Details, Signup or Settings is inert.
  - Lint, type-check, the full and timezone test suites, and the build all pass.

## Technical Decisions

- **Port:** add `createAccount(i: AccountInput): Promise<Account>` and `updateAccount(id: string, i: AccountUpdate): Promise<Account>`. The mock implements both. The http adapter is a stub that throws `ApiError{code:'NOT_IMPLEMENTED'}`.
- **Input types:** `AccountInput = Omit<Account, 'id'>` and `AccountUpdate = Omit<AccountInput, 'type'>`. `CardNetwork` becomes `'visa' | 'mastercard' | 'other'`.
- **Mock adapter:** only the mock adapter owns state.
  - It validates the rules above and returns `VALIDATION` with `fieldErrors` keyed by input field name.
  - It clears `network` for types without a card.
  - It writes to `finbank:mock:v1` first, then commits. A full store throws `ApiError{code:'STORAGE_FULL'}`.
  - Create assigns the next free `acc_<n>` id and adds no transactions.
  - Update rejects a type change. `normalizeTransactions` drops any transaction whose `paymentMethod` does not match its account's type, so a type change would silently lose transactions.
  - No storage migration is needed, and `MOCK_STATE_VERSION` stays 2.
- **Balance sign:** `Account.balanceCents` is always a non-negative magnitude. The adapter applies the sign by type when it derives the total, and components never recalculate it.
- **Invalidation:** `createAccount` and `updateAccount` both invalidate `accounts` (which covers `account(id)`) and `balanceSummary` in the single `invalidationMap`. They do not invalidate transactions, category summaries or comparisons. Mutation hooks live in `src/api/hooks/` and invalidate only through the map.
- **Shared form modal (6.1 groundwork):** generalise the Goals modal shell (`GoalModal` / `GoalModalForm`) into a tested `ui` primitive (`FormModal` / `FormModalForm`). Move the `ApiError.fieldErrors` → `setError` mapping into it as `mapApiFieldErrors`. Both Goals modals and the Account modal use it, and Goals behaviour and pixels must not change.
- **Ownership:** `features/balances` owns `AccountFormModal` and the edit-mode state. `features/goals` imports the `ui` primitive instead of its own copy. The FR-38 work is in `app/AppShell` (TopBar, UserBlock) and `features/auth` (Signup terms link).
- **Edit mode state:** local component state, not the URL. Do not add a global store.
- **Forms:** react-hook-form with zod, with the schema in the feature's `schemas.ts`. Field errors go through each input primitive's `error` prop. Adapters throw only `ApiError { code, message, fieldErrors? }`, and UI copy comes from `message`.
- **Modals:** they portal into `#content-overlay-root`. The shell is `inert` while a modal is open, focus is trapped, and focus returns to the element that opened the modal.
- **Colours:** no hex literals outside `tokens.css`. Add a new look as a `ui` variant, never as a local restyle.

## UX & Interaction Patterns

- **Account modal:** uses the 110.2 geometry: a panel with an X close, 56px labelled bordered inputs (`TextInput`, `MoneyInput`, `Dropdown` from Components-1) and a centred 192px "Save". It has no visible title. Its accessible name is "Add account" or "Edit account".
- **Edit button:** reuses the outline "Adjust"-style button with a pencil from the Goals category card, labelled "Edit".
- **Placeholders:** the only visual change is removing the pointer and hover affordances. The tooltip is the native `title`, not a new component.
- **Bank logos:** none. Only Visa and Mastercard logos exist.

## Cross-Story Dependencies

- Order: 6.1, then 6.2 and 6.3. 6.4 is independent and can run at any time.
- 6.1 builds the shared form-modal primitive, migrates Goals to it, and adds the Account form, both port methods with their mock (including `updateAccount`), the invalidation entries and the logo fallback.
- 6.2 and 6.3 only wire their entry points (the Balances edit mode, and Edit Details) to `updateAccount` and the shared modal.
- Builds on:
  - Epic 1: the port and mock store, `routes`, `Modal`, the inputs, `Button` outline, `FormStatus` and the shell.
  - Epic 2: `AccountCard`, the `AddAccountsCard`, Account Details, the Overview Total Balance carousel and `removeAccount`.
  - Epic 4: the Goals modals and the "Adjust" button.
  - Epic 5: the `STORAGE_FULL` handling pattern.
