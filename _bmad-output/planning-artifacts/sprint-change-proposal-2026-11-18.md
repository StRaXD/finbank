# Sprint Change Proposal: Epic 6, Account Management & UX Completion

- **Date:** 2026-11-18
- **Author:** Developer agent (BMAD Correct Course), for Strahinja.kovacevic
- **Status:** **approved with adjustments** by Strahinja.kovacevic, 2026-11-18. The planning-doc changes are applied as the first commit on `feat/epic-6` (see "Approval record" at the end).
- **Mode:** Batch. Every proposed edit to an approved artifact is listed in §4 with OLD → NEW text.

---

## 1. Issue Summary

**Trigger:** after Epics 1–5 shipped (all 28 stories done, `main` at `2450f9b`), the user reported that "Add Accounts" on Balances does nothing.

**Finding:** this is not a regression. It is documented, intentional v1 scope:
- PRD FR-16: "Add Accounts" and "Edit Accounts" are "shown but do nothing in v1, because neither flow is designed".
- PRD FR-18: "Edit Details" is the same.
- PRD §6.2 and §8.2 #4: Add Account, Edit Accounts and Edit Details are out of scope, "shown but inert".
- Story 2.1 AC: "Both are inert."
- `BalancesPage.test.tsx:165` and `AccountDetailsPage.test.tsx:138` assert the inert behaviour.

The approved port has no create or update account method.

**Problem statement:** the three main account actions look like working primary buttons and links but do nothing. Four other deferred controls (bell, search, user menu, terms link) are inconsistently marked: some are `aria-disabled` with a default cursor, others have a pointer and hover underline. Users and assistive technology cannot tell what works.

**Issue type:** a new requirement from stakeholders (completing deferred scope), plus a UX consistency defect.

**Evidence:**

| Control | Where | Planned behaviour | Looks actionable today |
|---|---|---|---|
| Add Accounts | `AddAccountsCard.tsx:10` | inert (FR-16) | yes: enabled primary button |
| Edit Accounts | `AddAccountsCard.tsx:11` | inert (FR-16) | yes: pointer and hover underline |
| Edit Details | `AccountDetailsPage.tsx:44` | inert (FR-18) | yes: enabled primary button |
| terms of service | `SignupPage.tsx:100` | inert (§8.2 #1) | partly: `aria-disabled`, but pointer and hover |
| Notifications bell | `TopBar.tsx:40` | inert (§8.2 #3) | no |
| Search here | `TopBar.tsx:51` | inert (§8.2 #3) | you can type; Enter does nothing |
| User menu (⋮) | `UserBlock.tsx:35` | inert (§8.2 #2) | no |

## 2. Impact Analysis

### 2.1 Change-navigation checklist

| Item | Status | Finding |
|---|---|---|
| 1.1 Trigger | [x] | User feedback after the project completed. No story is at fault; Story 2.1 delivered the approved inert behaviour. |
| 1.2 Problem | [x] | New requirement plus UX consistency (above). |
| 1.3 Evidence | [x] | The table above, with the PRD and epic citations. |
| 2.1 Current epic | [N/A] | All epics are done. |
| 2.2 Epic-level change | [x] | Add a new Epic 6. No existing epic is reopened. |
| 2.3 Future epics | [N/A] | None are planned. |
| 2.4 Obsolete or new epics | [x] | One new epic. Nothing becomes obsolete. |
| 2.5 Ordering | [x] | Epic 6 runs last. Stories in order 6.1 → 6.2/6.3 → 6.4 (6.4 is independent). |
| 3.1 PRD | [!] | FR-16, FR-18, §6.2 and §8.2 #1–#4 change. Add new FR-36 to FR-38 (see §4.2). The MVP goals are unaffected. |
| 3.2 Architecture | [!] | Port: `createAccount` and `updateAccount`. Two `invalidationMap` entries. AD-6 account rules. A shared form-modal primitive in `ui`. The ownership table (see §4.3). |
| 3.3 UI/UX | [!] | No Figma exists for the account form or the edit mode. The form follows the 110.2 modal pattern (user decision). The placeholder treatment is new (user decision). |
| 3.4 Other artifacts | [!] | `sprint-status.yaml` gains `epic-6` and 4 stories. Two inert-asserting tests are rewritten. `deferred-work.md` items 50/58/65/73 are addressed by 6.1. No CI or deploy impact. |
| 4.1 Direct adjustment (new epic) | Viable | Effort Medium, risk Low. It reuses the port, mock, invalidation, Modal and form patterns. |
| 4.2 Rollback | Not viable | There is nothing to roll back; the inert controls are correct per v1. |
| 4.3 MVP review | Not viable or needed | The MVP is delivered. This is a post-MVP extension. |
| 4.4 Path | [x] | Option 1: a new Epic 6 (rationale in §3). |

### 2.2 Data consistency across screens (the user's key constraint)

| Screen | Reads | Effect of Epic 6 |
|---|---|---|
| Balances | `listAccounts` | New accounts appear before the action card; edits show at once. |
| Overview Total Balance carousel and total | `listAccounts`, `getBalanceSummary` | New and edited accounts and balances show at once, with the sign by type (AD-5). |
| Account Details | `getAccount(id)`, `listTransactions({accountId})` | Edits show at once. A new account shows the existing empty transaction state. |
| Transactions | `listTransactions` | Unchanged. The account type is fixed after creation (user decision), so `paymentMethod` never changes and no transaction is rewritten or dropped. |
| Expenses and the Overview Expenses/Statistics widgets | transactions | Unchanged. New accounts have no transactions (user decision below). |

**Risk removed by a user decision:** `normalizeTransactions` (`mockApi.ts:330-341`) drops any transaction whose `paymentMethod` disagrees with its account's type. With the type editable, an edit would have silently deleted that account's transactions on the next reload. Keeping the type fixed after creation removes this risk.

### 2.3 Decisions taken with the user (2026-11-18)

1. **Form UI:** one shared Account modal following the 110.2 pattern, used for Add and Edit: X close, labelled bordered inputs, centred 192px Save.
2. **Edit Accounts:** a Balances edit mode. The link toggles to "Done", and each account card shows an "Edit" action that opens the shared form. Edit Details opens the same form for one account.
3. **Account type:** chosen only when adding, and read-only when editing.
4. **Validation:**
   - All text fields are required.
   - Account number: digits only, 8–19 digits, unique across accounts.
   - Card network (Visa or Mastercard) is required for Credit Card and Checking, and hidden and cleared for the other types.
   - Balance: a non-negative amount. For Credit Card and Loan it is the amount owed (as today).
5. **Balance:** editable in Add and Edit. Balances stay stored values, independent of transactions.
6. **Placeholders:** clearly unavailable but visible as designed. They get `aria-disabled`, a default cursor, no hover affordance, and a "Coming soon" tooltip plus an accessible description. Search becomes read-only.
7. **Review mode:** Batch.

**Assumptions to confirm on approval (low impact; flag any you disagree with):**
- **A1 – no transactions for new accounts:** a new account starts with no transactions. Nothing is generated.
- **A2 – where new accounts go:** a new account is appended last (after the existing accounts, before the action card), and is added to the end of the Overview carousel. The id is `acc_<n>`, the next free number.
- **A3 – edit mode is temporary:** it lives in component state, not the URL. Leaving Balances or pressing "Done" ends it. Remove and Details stay available in edit mode.
- **A4 – "Edit" button style:** it reuses the outline "Adjust"-style button with a pencil (Goals category card) and reads "Edit".
- **A5 – modal titles:** the modal is named "Add account" or "Edit account" (accessible label; 110.2 shows no visible title). Save reads "Save".
- **A6 – no bank logos:** bank names are free text, and only Visa and Mastercard logos exist.

## 3. Recommended Approach

**Option 1, Direct Adjustment:** add one new epic with four stories.

**Rationale:**
- **Reuse:** the architecture already covers everything needed. There is one port, and one mock adapter that owns state (AD-6), with write-first persistence and `STORAGE_FULL` handling. There is one `invalidationMap` (AD-7), and the `Modal`, `TextInput`, `MoneyInput` and `Dropdown` primitives.
- **No migration:** `normalizeAccounts` already accepts any account list, so `MOCK_STATE_VERSION` stays 2.
- **Fit:** the changes are additive and isolated to `features/balances`, `api` and `ui`, with a small `app/AppShell` touch for 6.4.

**Effort and risk:**
- 6.1: M
- 6.2: S
- 6.3: S
- 6.4: S
- Overall risk: Low. The only cross-screen data risk (type edits) is removed by a user decision.

**Story boundaries and dependencies:**

```
6.1 Add Accounts ─────┬──> 6.2 Edit Accounts (Balances edit mode)
  (shared form modal, │
   createAccount,     └──> 6.3 Edit Account Details
   updateAccount port      (Account Details entry point)
   + mock)
6.4 Placeholder UX ── independent (can run any time)
```

- **6.1:** adds the form-modal primitive, the Account form, `createAccount`, and both port methods with their mock (`updateAccount` included so the form is built once).
- **6.2 and 6.3:** only wire entry points to `updateAccount` and the shared form.
- **Alternative considered:** Edit in 6.1, with 6.2/6.3 as UI only, or merging 6.2 and 6.3. Rejected in favour of the user's four-story structure, with the dependency made explicit.

## 4. Detailed Change Proposals

### 4.1 Epics (`epics.md`)

**4.1.1 FR inventory (top of `epics.md`)**

```
OLD (lines 65-67):
- FR16: The account card grid shows type, bank, network logo, masked number and total.
  ...
  - The last card has "Add Accounts" and "Edit Accounts", both inert.
NEW:
- FR16: The account card grid shows type, bank, network logo, masked number and total.
  ...
  - The last card has "Add Accounts" (FR36) and "Edit Accounts" (FR37).
- FR36: Add an account through the shared Account modal; it appears on Balances, Overview and
  Account Details at once and persists.
- FR37: Edit an account's bank, branch, network, number and balance (type is fixed) from the
  Balances edit mode or from Account Details; every screen updates at once and it persists.
- FR38: Controls whose flows are not designed (bell, search, user menu, terms link) are visibly
  and accessibly unavailable ("Coming soon").
```

**4.1.2 Story 2.1, Acceptance Criteria (annotate, don't rewrite history)**

```
OLD:
**Then** the last card holds the primary "Add Accounts" button and the "Edit Accounts" text link. Both are inert.
NEW:
**Then** the last card holds the primary "Add Accounts" button and the "Edit Accounts" text link. Both are inert.
*Superseded by Epic 6 (2026-11-18): Story 6.1 wires Add Accounts, Story 6.2 wires Edit Accounts.*
```

Story 2.4 ("Edit Details" inert) gets the same annotation, pointing to Story 6.3.

**4.1.3 New section appended: Epic 6 (full text)**

> ## Epic 6: Account Management & UX Completion
>
> Users can add accounts and edit existing ones, and every screen that shows account data stays consistent. Controls whose flows are still undesigned clearly say they are coming soon. **FRs covered:** FR16, FR18, FR36–FR38. **Builds on:** Epics 1, 2 and 5.
>
> ### Story 6.1: Add Accounts
>
> As a user, I want to add a bank account, so that all my accounts are tracked in Finbank.
>
> **Acceptance Criteria:**
>
> - **Given** Balances, **when** the user activates "Add Accounts", **then** the "Add account" modal opens (110.2 pattern: X close, bordered labelled inputs, centred 192px Save). It has the fields Account Type (Dropdown: Credit Card, Checking, Savings, Investment, Loan), Bank Name, Branch Name, Card Network (Visa / Mastercard; shown only for Credit Card and Checking), Account Number, and Balance (`MoneyInput`, labelled "Amount owed" for Credit Card and Loan).
> - **Given** an empty required field, an account number that is not 8–19 digits, a duplicate account number, or a missing network for Credit Card or Checking, **when** Save is pressed, **then** an inline error shows on that field and nothing is saved.
> - **Given** valid input, **when** Save is pressed, **then** `createAccount` persists the account through the mock adapter, writing first to `finbank:mock:v1`. The modal closes after the account list has refetched. The new card appears last on Balances (before the action card), in the Overview carousel, and in the Overview Total Balance (signed by type, AD-5). It survives a reload and a logout followed by a login.
> - **And** the new account opens in Account Details with the existing empty transaction state; Transactions and Expenses are unchanged.
> - **Given** a full store, **when** Save is pressed, **then** `STORAGE_FULL` shows inline, the modal stays open with the values kept, and nothing changes.
> - **And** X, Esc and an overlay click discard the form, and are ignored while saving. A second Save is dropped while one is pending. Keyboard focus stays inside the modal while saving (fixes deferred item 50 for the shared primitive).
> - **And** groundwork: the Goals modal shell and the `fieldErrors` → `setError` mapping move into one shared, tested `ui` form-modal primitive used by the Goals modals and the Account modal. Goals behaviour and pixels are unchanged. This closes the "shared form-error helper" deferrals for modal forms.
> - **And** the port gains `createAccount(input: AccountInput): Promise<Account>` and `updateAccount(id, input: AccountUpdate): Promise<Account>` (mock implemented; the http adapter is a `notImplemented` stub). `invalidationMap` gains `createAccount` and `updateAccount` → `accounts`, `balanceSummary`.
> - **And** tests cover the mock (validation, uniqueness, id, persistence across a fresh adapter, `STORAGE_FULL`), the form rules, and a full-app flow (add, then Balances, Overview and Account Details, then reload). The modal matches the 110.2 pattern at 1440×1024.
>
> ### Story 6.2: Edit Accounts
>
> As a user, I want to edit my accounts from Balances, so that I can keep their details correct.
>
> **Acceptance Criteria:**
>
> - **Given** Balances, **when** the user activates "Edit Accounts", **then** the grid enters edit mode. The link reads "Done" (`aria-pressed`), and each account card shows an outline "Edit" button with a pencil. Remove and Details stay available.
> - **Given** edit mode, **when** "Edit" is activated on a card, **then** the shared modal opens as "Edit account", prefilled. The account type is shown read-only. Bank, branch, network (Credit Card and Checking), account number and balance are editable, with the 6.1 rules (uniqueness ignores the account itself).
> - **Given** valid changes, **when** Save is pressed, **then** `updateAccount` persists them. The card, the Overview carousel and total, and Account Details update without a reload. Transactions and Expenses are unchanged, and the change survives a reload.
> - **And** "Done", leaving Balances, or a reload ends edit mode.
> - **And** errors, `STORAGE_FULL` and modal behaviour work as in 6.1. Tests cover entering and leaving edit mode, editing, and cross-screen consistency.
>
> ### Story 6.3: Edit Account Details
>
> As a user, I want to edit an account from its details page, so that I can fix it where I see it.
>
> **Acceptance Criteria:**
>
> - **Given** `/balances/:accountId`, **when** "Edit Details" is activated, **then** the same "Edit account" modal opens, prefilled, with the type read-only.
> - **Given** valid changes, **when** Save is pressed, **then** the Details card, the Balances card, and the Overview carousel and total update without a reload. The transaction history is unchanged, the user stays on the page, and the change persists.
> - **And** errors, `STORAGE_FULL` and the modal behave as in 6.1. The test that asserts Edit Details is inert is replaced.
>
> ### Story 6.4: Placeholder UX for the remaining undesigned controls
>
> As a user, I want controls that are not available yet to say so, so that I don't think the app is broken.
>
> **Acceptance Criteria:**
>
> - **Given** the notifications bell, the user menu (⋮), the "terms of service" link and the "Search here" box, **when** they render, **then** they keep their designed look. Each is `aria-disabled` (the search input `readOnly`), with a default cursor and no hover change. Each has a "Coming soon" tooltip (`title`) and accessible description (`aria-describedby`). They stay keyboard-focusable, with the focus outline.
> - **And** activating them does nothing and throws no errors. Search accepts no typing.
> - **And** after Epic 6, no enabled-looking control in the app is inert. A test sweeps the shell, Balances, Account Details, Signup and Settings for the pattern.
> - **And** each screen still matches its Figma at 1440×1024.

### 4.2 PRD (`prd-Finbank-2026-11-16/prd.md`)

**FR-16**

```
OLD:
- A final card holds the "Add Accounts" and "Edit Accounts" actions. They are shown but do nothing in v1, because neither flow is designed (§8.2 #4).
NEW:
- A final card holds the "Add Accounts" and "Edit Accounts" actions. Add Accounts opens the Account form (FR-36); Edit Accounts toggles an edit mode in which each card offers "Edit" (FR-37). *(Changed by Epic 6, 2026-11-18; v1 shipped them inert.)*
```

**FR-18**

```
OLD:
- It has "Edit Details" and "Remove" actions. "Edit Details" is shown but does nothing in v1, because the edit form is not designed (§8.2 #4).
NEW:
- It has "Edit Details" and "Remove" actions. "Edit Details" opens the Account form for this account (FR-37). *(Changed by Epic 6.)*
```

**New requirements, added after FR-35 in a new section "4.12 Account management (Epic 6)":**

```
#### FR-36: Add account [no design; 110.2 modal pattern]
- Fields: Account Type, Bank Name, Branch Name, Card Network (Credit Card and Checking only), Account Number, Balance.
- All required; number 8–19 digits, unique; balance ≥ 0 (amount owed for Credit Card / Loan).
- Saved to mock data and localStorage; appears last on Balances, in the Overview carousel and Total Balance. New accounts have no transactions.
#### FR-37: Edit account
- From the Balances edit mode or Account Details. Type is fixed after creation; other fields as FR-36.
- Every screen showing the account updates without a reload; transactions are never changed.
#### FR-38: Unavailable controls
- Undesigned controls (bell, search, user menu, terms link) stay visible but are aria-disabled, show "Coming soon", and have no hover affordance.
```

**§6.2 Out of Scope**

```
OLD:
- Add Account, Edit Accounts and Edit Details (§8.2 #4).
NEW:
- (Moved into scope by Epic 6, 2026-11-18: Add Account, Edit Accounts and Edit Details — FR-36, FR-37.)
```

**§8.2 Deferred:** #1–#3 are annotated "Shown as unavailable ('Coming soon') per FR-38". #4 is annotated "Resolved by Epic 6 (FR-36, FR-37)".

**§9 Assumptions index:** add an FR-36/37/38 line with the user decisions in §2.3 and the assumptions A1–A6.

### 4.3 Architecture (`ARCHITECTURE-SPINE.md`)

**Port signature block** (line 365), with the account methods added:

```
OLD (line 365):  listAccounts(): Promise<Account[]>; getAccount(id: string): Promise<AccountDetail>; removeAccount(id: string): Promise<void>;
NEW:             listAccounts(): Promise<Account[]>; getAccount(id: string): Promise<AccountDetail>; removeAccount(id: string): Promise<void>;
      createAccount(i: AccountInput): Promise<Account>; updateAccount(id: string, i: AccountUpdate): Promise<Account>;
```

**Domain types:**
- `AccountInput = Omit<Account, 'id'>`
- `AccountUpdate = Omit<AccountInput, 'type'>`

**AD-6, new rules:**
- **IDs:** the mock assigns `acc_<n>` (the next free number).
- **Validation:** it checks the FR-36 rules (fieldErrors keys match the input fields) and clears `network` for types without a card.
- **Write order:** it writes first, then commits. A full store gives `STORAGE_FULL`.
- **Type is immutable:** `updateAccount` rejects a type change, because transaction `paymentMethod` is derived from the type.
- **No transactions:** a new account starts with none.

**AD-7 `invalidationMap`:**

```
NEW:  createAccount → accounts, balanceSummary
      updateAccount → accounts (covers account(id)), balanceSummary
```

Transactions, category summaries and comparison are not invalidated: balances and types are not inputs to them.

**Ownership table:**
- `ui`: `FormModal` / `FormModalForm` (the generalised `GoalModal` / `GoalModalForm`) and `mapApiFieldErrors`.
- `features/balances`: `AccountFormModal` and the edit-mode state.
- `features/goals`: imports the `ui` primitive instead of its own copy.

### 4.4 UI/UX

No Figma exists for these flows. The proposal binds them to existing design-system patterns:
- **Account modal:** the 110.2 modal geometry (panel, X, 56px labelled fields, centred 192px Save). It uses the bordered `TextInput` / `MoneyInput` / `Dropdown` from Components-1. The tokens are unchanged.
- **Edit mode:** the outline "Adjust" button pattern from 110 / Components-1, labelled "Edit". The "Edit Accounts" link label toggles to "Done".
- **Placeholders:** no visual change except removing the hover and pointer affordances. The tooltip is the native `title`, so there is no new component.

### 4.5 Sprint tracking (applied only after approval)

`sprint-status.yaml` gains:

```
  epic-6: backlog
  6-1-add-accounts: backlog
  6-2-edit-accounts: backlog
  6-3-edit-account-details: backlog
  6-4-placeholder-ux-for-undesigned-controls: backlog
  epic-6-retrospective: optional
```

## 5. Implementation Handoff

**Scope classification: Moderate.** It's a new epic plus PRD, epics and architecture updates, but no replan of shipped work.

| Role | Responsibility |
|---|---|
| Product Owner / Developer (this agent) | After approval, apply §4.1–§4.3 and §4.5 to the planning docs in one documentation commit. Generate `epic-6-context.md`. Create `feat/epic-6` from `main` per the one-branch-per-epic workflow. |
| Developer (bmad-build, per story) | Implement 6.1 → 6.2 → 6.3 → 6.4. Each story gets a spec, the three-reviewer code review, and a Chrome check at 1440×1024. Then a final Epic 6 review and a PR to `main` (the user merges). |

**Success criteria:**
- Add, Edit Accounts and Edit Details work end to end on the mock. Balances, Overview, Account Details, Transactions and Expenses stay consistent across reload and logout followed by login.
- No transaction is rewritten or lost.
- The Goals modals are unchanged in behaviour and pixels after moving to the shared primitive.
- No enabled-looking inert control remains.
- Lint, type-check, the full and timezone test suites, and the build all pass.
- The deferred form-error-helper and modal-focus items are resolved for modal forms.

**Open for approval:** the user decisions in §2.3 are final unless revised. Confirm or adjust assumptions A1–A6.

---

## Approval record (2026-11-18)

Approved, with these adjustments. Where they differ from §2–§4 above, they take precedence, and the applied documents reflect them:

1. **Traceability:** the original FR-16 and FR-18 text is preserved verbatim. New FR-36, FR-37 and FR-38 (PRD §4.12) explicitly supersede the placeholder behaviour, and FR-16 and FR-18 carry a "Superseded by…" note instead of being rewritten. This replaces the OLD → NEW rewrites proposed in §4.2. §6.2 and §8.2 are annotated, not rewritten.
2. **Balances:** they are stored values, independent of transaction history. A balance edit immediately updates Balances, Account Details and the Overview Total Balance, and never modifies a transaction.
3. **Numbers and type:** account numbers stay unique on both create and edit. The account type is immutable after creation.
4. **Assumptions:** A1–A5 are approved.
5. **A6, revised:**
   - Bank names are free text.
   - Visa and Mastercard use their existing logos.
   - An unsupported or missing card network uses a neutral fallback.
   - An incorrect network logo is never displayed.
   - The form offers Visa and Mastercard only; the fallback guards any other value.
   - *Revised at the Story 6.1 start (2026-11-18): the form also offers "Other", shown with a neutral card icon. `CardNetwork` becomes `'visa' | 'mastercard' | 'other'`.*
6. **Data preservation:** edits preserve account ids, transaction relationships and saved data.
7. **Display:** every create and update is validated, persisted, and reflected across the application without a page reload.
8. **Git workflow (unchanged):** one feature branch per epic (`feat/epic-6`, from `main` at `2450f9b`), with a commit and push after each completed story. Then a final epic review and one PR to `main`, which the user merges with a merge commit. Handoff change: the planning-doc update is the first commit on `feat/epic-6`, not a separate commit on `main`, so it reaches `main` through the epic PR.

**Applied to:**
- PRD: FR-16 and FR-18 notes, new §4.12 FR-36 to FR-38, §6.2, §8.2 #1–#4 and §9.
- `epics.md`: the FR inventory and coverage map, the Epic List, the Story 2.1 and 2.4 superseded notes, and the full Epic 6 section with Stories 6.1–6.4.
- Architecture spine: the port, AD-6 account rules, AD-7 invalidation, and the capability map.
- `sprint-status.yaml`: `epic-6` and its 4 stories as `backlog`.

`epic-6-context.md` is compiled by the build workflow when Story 6.1 starts.

