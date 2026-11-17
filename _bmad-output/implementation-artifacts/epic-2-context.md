# Epic 2 Context: Accounts, transactions and bills

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let users see where their money is. When this epic is done, Balances lists every account as a card, with confirmed removal and a per-account Details page showing its transaction history. Transactions and Upcoming Bills each have a full page, and Overview greets the user and shows the Total Balance carousel and the Upcoming Bill and Recent Transaction widgets. The epic adds the first real domain data (accounts, transactions, bills) to the port, seed and query layer. It also builds the shared domain components `AccountCard`, `TransactionList` and `BillList` once and reuses them on Overview, so every screen shows the same record with the same values.

## Stories

- Story 2.1: Balances page with account cards
- Story 2.2: Remove an account from Balances
- Story 2.3: Transactions page with tabs and Load More
- Story 2.4: Account Details with transaction history and remove
- Story 2.5: Upcoming Bills page
- Story 2.6: Overview page with greeting and Total Balance carousel
- Story 2.7: Overview Upcoming Bill and Recent Transaction widgets

## Requirements & Constraints

- **One dataset, derived aggregates:** all screens read the single seeded mock dataset. The same account, transaction or bill shows identical amounts and dates on Overview and on its own page. Totals are calculated, never hard-coded. Seed values don't have to match the Figma placeholders, which are inconsistent with each other.
- **Total Balance:** asset accounts (Checking, Savings, Investment) minus liability accounts (Credit Card, Loan). It is shown with the "All Accounts" label.
- **Balances:** a 3-column grid of five account cards (one of each type), in seed order, then an action card with "Add Accounts" (primary) and "Edit Accounts" (text link). Both are inert. Each account card has a "Remove" text link and a "Details >" button that goes to Account Details.
- **Remove account:** a `ConfirmDialog` that names the account. Cancel changes nothing. Confirm removes the account and its transactions, persists the change across reloads, and updates every screen, including the Overview carousel and total. Removing from Account Details goes back to Balances.
- **Account Details:** Bank Name, Account Type, Balance, Branch Name and masked Account Number, matching the account's Balances card. "Edit Details" is inert. The Balances nav item stays active. "Transactions History" has the columns Date, Status, Transaction Type, Receipt and Amount, for this account only. An unknown id shows "Account not found" with a link back to Balances.
- **Transactions page:** titled "Recent Transaction", with All/Revenue/Expenses tabs and the columns Items (icon and name), Shop Name, Date, Payment Method and Amount. No sorting or filtering.
- **Load More:** adds 10 rows at a time and is hidden when no rows remain. It is used on Transactions and Account Details.
- **Bills page:** titled "Upcoming Bills", with the columns Due Date badge, Logo, Item Description (title and description), Last Charge and a boxed Amount. No pay or add actions.
- **Overview:** "Hello {firstName}" in the top bar. Upcoming Bill shows the next two bills by due date, and Recent Transaction shows the five most recent transactions of the selected tab. Each widget has a "View All >" link to its page. Widget slots owned by later epics stay empty.
- **Formatting:** no decimals for Total Balance, account card and carousel balances, and bill amounts. Two decimals for transactions and the Account Details balance. Revenue and expense amounts look the same, with no sign or colour. Each screen keeps its own mask style from the same full account number: `groups` on Balances and Details, `tail4` in the carousel.
- **States:** every list and card shows a skeleton while loading and a muted empty line when there is nothing to show.
- **Fidelity:** each screen matches its design at 1440×1024. The Carousel must be keyboard-operable.

## Technical Decisions

- **Port additions:** `listAccounts`, `getBalanceSummary` (returns `{ totalBalanceCents }`), `getAccount`, `removeAccount`, `listTransactions({ kind?, accountId?, cursor?, limit })` returning `{ items, nextCursor }`, and `listBills({ limit? })`. Each needs a hook in `api/hooks/`, a `qk` key, and a stub on the http adapter.
- **Stored vs derived:** `Account.balanceCents` is always a non-negative magnitude. The adapter applies the sign by account type when it calculates `totalBalanceCents`. Components never recalculate it.
- **Ordering is done by the adapter:** accounts in seed order, transactions newest first, bills earliest due date first.
- **Seed shapes:**
  - Account: type, bank name, branch name, optional card network, full account number, `balanceCents`.
  - Transaction: item, shop, `kind` (revenue or expense), optional expense category, payment method, status, type (Credit or Debit), receipt id, `amountCents`, `IsoDate`, `accountId`, icon key. Each account needs at least 15, so Load More appears.
  - Bill: vendor, logo key, title, description, billing cycle, `dueDate`, `lastChargeDate`, `amountCents`. At least three.
  - IDs are opaque strings such as `acc_1` and `txn_42`, and every date is relative to mock today, `2023-05-19`.
- **Pagination:** `useTransactions` uses `useInfiniteQuery` with a page size of 10. The cursor is never part of the query key.
- **Invalidation:** `removeAccount` invalidates `accounts`, `balanceSummary` and `transactions`, through `invalidationMap` only. The mock adapter also deletes the removed account's transactions.
- **Removal from Account Details:** navigate to `/balances` first, then fire the mutation, so the page never renders a missing account.
- **One owner per component:**
  - `AccountCard` is owned by `features/balances`, `TransactionList` by `features/transactions` and `BillList` by `features/bills`. Each is exported from its feature's `index.ts`.
  - `TransactionList` and `BillList` each have a `table` variant and a `compact` variant (for Overview).
  - `features/overview` composes these exports and reuses the detail-screen hooks: `useAccounts()`, `useBalanceSummary()`, `useBills({ limit: 2 })` and `useTransactions({ kind, limit: 5 })`.
- **New primitives in `src/ui`:** `Tabs`, `Table`, `LoadMore`, `DateBadge` and `Carousel`. Transaction tab state stays local to the component.
- **Tests:** unit tests for the total-balance calculation, and for `removeAccount` removing the account and updating the balance summary. Add React Testing Library coverage for the new interactive primitives where it adds value.

## UX & Interaction Patterns

- **Carousel:** teal-filled account cards (type, `tail4` masked number, whole balance, network logo, ↗ button to Account Details). "Previous" and "Next" text buttons, one dot per account, "Previous" disabled on the first slide and "Next" disabled on the last.
- **Tabs:** the active tab has teal text and a 2px teal underline.
- **Rows:** list rows have dividers. Transaction items have a category icon in a grey square. On Overview, the item name sits above the shop, and the amount sits above the date, right-aligned.
- **Bill rows:** a `DateBadge` with the month above the day, the vendor logo and name, the title, "Last Charge - {date}" on Overview, and the amount in an outlined box.
- **Section titles** sit above the cards. "View All >" is a teal text link in the card header.
- **Brand logos:** Mastercard, VISA, Figma and Adobe SVGs come from the Epic 1 brand assets.

## Cross-Story Dependencies

- 2.1 adds accounts to the seed, plus `AccountCard`, and is needed by 2.2, 2.4 and 2.6. 2.2 uses the Epic 1 `ConfirmDialog`.
- 2.3 adds transactions, `useTransactions`, `TransactionList`, `Tabs`, `Table` and `LoadMore`. 2.4 reuses them (`useTransactions({ accountId })`) along with the remove flow from 2.2.
- 2.5 adds bills, `BillList` and `DateBadge`. 2.7 uses the `compact` variants from 2.3 and 2.5.
- 2.6 creates the Overview layout that 2.7 and later epics (Statistics and Breakdown in Epic 3, the Goals widget in Epic 4) fill in.
- Epic 3 builds on the transaction seed, since category totals sum expense-kind transactions in the current month.
