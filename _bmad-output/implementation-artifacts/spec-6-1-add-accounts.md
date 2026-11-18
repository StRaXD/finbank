---
title: 'Story 6.1: Add Accounts'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: 'a7dba044b93543f1687f2e5494133b7f8ce4bd20'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** "Add Accounts" on Balances does nothing, so users cannot add accounts.

**Approach:**
- **Data:** add `createAccount` and `updateAccount` to the port and the mock adapter (normalised, validated, written first, persisted). Both invalidate only `accounts` and `balanceSummary`.
- **Shared modal:** move the Goals modal shell into a shared `ui` form-modal primitive, with a shared error-mapping helper.
- **Dropdown:** give `Dropdown` a 56px form-field variant with a placeholder.
- **Add modal:** "Add Accounts" opens an "Add account" modal, so a new account appears on Balances, Overview and Account Details at once and persists.

## Boundaries & Constraints

**Always:**
- **Fields:** each message lives once as a constant in `api/types.ts` and is used by both the zod schema and the adapter.

  | Field | Rule | Message |
  |---|---|---|
  | Account Type | required (Credit Card, Checking, Savings, Investment, Loan) | "Choose an account type." |
  | Bank Name | trimmed; required | "Enter the bank name." |
  | Bank Name | at most 60 characters | "Use 60 characters or fewer." |
  | Branch Name | trimmed; required | "Enter the branch name." |
  | Branch Name | at most 60 characters | "Use 60 characters or fewer." |
  | Card Network | required for Credit Card and Checking only: Visa, Mastercard or Other | "Choose a card network." |
  | Account Number | spaces and dashes removed; required | "Enter the account number." |
  | Account Number | 8–19 digits | "Enter 8–19 digits." |
  | Account Number | unique across all accounts | "An account with this number already exists." |
  | Balance | `MoneyInput`, labelled "Amount owed" for Credit Card and Loan, otherwise "Balance"; required | "Enter an amount, like 1,234.50." |
  | Balance | at least 0 | "Amount can't be negative." |

- **Adapter normalisation:** the adapter normalises before validating:
  - names are trimmed;
  - spaces and dashes are removed from the number;
  - `network` is dropped for non-card types.

  So "1234 5678 9012" is stored as `123456789012`. The money parsing in `balances/schemas.ts` is its own copy; it does not import `features/goals` (AD-1).
- **Dropdowns:** Type and Network start on "Select type…" / "Select network…" (`text-subtle`; no option is `aria-selected`). Switching to a non-card type clears Network; switching back shows the placeholder again. Balance keeps its value when its label switches. Esc in an open list closes only the list (pinned by a test).
- **Accounts are stored in a fixed key order:** id, type, bankName, branchName, network?, accountNumber, balanceCents (the seed order) on create and update, so a reload never rewrites storage. Ids come from a monotonic `nextAccountNumber` state key (filled from the seed or the highest stored number on load; no `MOCK_STATE_VERSION` bump). Ids are never reused: after removing `acc_5` the next id is `acc_6`, and `acc_9` is followed by `acc_10`.
- **`createAccount`:** appends the account, adds no transactions, writes first and then commits. A full store gives `STORAGE_FULL`; memory and storage are unchanged, and the open modal keeps its values.
- **`updateAccount(id, AccountUpdate)`:** builds the stored account only from allowed fields. A `type` that differs from the stored one is rejected with `VALIDATION` (`fieldErrors.type` "Account type can't be changed."). It keeps the id, the list position and every transaction byte for byte, and uniqueness excludes the account itself. An unknown id gives `NOT_FOUND`. It is implemented and tested now; its UI comes in 6.2 and 6.3.
- **Display:**
  - The modal closes once the account list has refetched.
  - Without a reload, the account is last on Balances (before the action card) and last in the Overview carousel. The Total Balance moves by + balance (asset) or − balance (Credit Card and Loan).
  - `/balances/<new id>` shows it with the empty transaction state.
  - Transactions, Expenses and the Overview Statistics and Expenses widgets are unchanged.
  - Everything survives a reload and a logout followed by a login.
- **Network mark:**

  | Account | Shown in the grid card and the Overview slide |
  |---|---|
  | Credit Card or Checking with Visa / Mastercard | the existing logo |
  | Credit Card or Checking with Other, an unknown network or none | the neutral lucide `CreditCard` icon (`subtle` in the grid, the on-dark token on the teal slide), sized to the logo height, with `role="img"` and the name "Other card network" |
  | Savings, Investment or Loan | nothing, even if stored data has a network |

  An incorrect logo is never displayed.
- **Overflow:** long bank or branch names wrap (`break-words`) in the cards and on Account Details. They never overflow.
- **Empty state:** with zero accounts, Balances shows "No accounts yet." with the Add Accounts card beneath it, without "Edit Accounts". With accounts, "Edit Accounts" stays inert until 6.2.
- **Modal state:** `BalancesPage` owns the open state outside `AsyncSection`, so the modal survives the empty → grid change. After a save, focus returns to "Add Accounts" in its new position.
- **Modal layout and behaviour (user decision):**
  - **110.2 geometry:** a 488px panel, X close, 56px labelled bordered fields with 24px gaps, and a centred 192×48 Save ("Save" / "Saving…") 32px below the last field.
  - **Position:** tall forms anchor about 120px from the top of the content area, so the whole form fits at 1440×1024. The Goals modals keep their position.
  - **Behaviour:** X, Esc and an overlay click discard the form and are ignored while saving, and a second Save is dropped. The accessible name is "Add account". Save uses `aria-disabled` while saving, so focus stays in the modal (deferred item 50).
  - **Failed Save:** focus moves to the first invalid field, including a dropdown.
- **Dropdown `field` variant:**
  - a visible label linked with `aria-labelledby` (clicking the label does not toggle the list);
  - the accessible name is the label alone (for example "Account Type");
  - the trigger is `role="combobox"` with `aria-invalid` and `aria-describedby` for its error;
  - it accepts `name`, `onBlur` and `ref`, for a react-hook-form `Controller`;
  - the popup is full width;
  - the existing variants are unchanged, including the option-0 fallback.
- **Shared primitive files:** `ui/FormModal.tsx` (components and types only, because of the lint rule `only-export-components`) and `ui/mapApiFieldErrors.ts` (+ test). The helper uses a type-only `ApiError` import with a structural `fieldErrors` check, because the lint boundary rule forbids a runtime import in `ui`.
  - **Goals migration:** both Goals modals move to the shared primitive with identical behaviour and pixels. Only the Save `toBeDisabled()` assertions change, at `AdjustSavingsGoalModal.test.tsx:100` and `AdjustCategoryLimitModal.test.tsx:106`. `goalModalForm.tsx` is deleted.
  - **Deferred items 58/65/73:** these are the non-modal copies in auth, ProfileForm and PasswordForm. They stay open; the helper is ready for them to adopt later.

- **Phases (human requirement, 2026-11-18):** implementation runs in three phases, and nothing is dropped to shorten the spec. Every acceptance criterion and matrix row still applies.
  1. **Shared infrastructure:** the dialog extraction and Goals migration, the Dropdown `field` variant, the validation constants and helpers, and the mock API methods with their invalidation and hooks. It must be green before phase 2.
  2. **Add Account feature:** the modal, form, network mark, empty state, persistence and cross-screen updates.
  3. **Verification:** automated tests, accessibility checks, visual comparison and code review. Phase 3 is run by the build workflow's review step.

**Never:**
- No edit UI.
- No bank logos.
- No generated transactions.
- No `MOCK_STATE_VERSION` bump.
- No change to transactions, category summaries or comparison data.
- No hex literals.
- No `text-faint` text.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy (card) | Checking, " City Bank ", "Main", Visa, "1234 5678-9012", $1,500.00 | `acc_6` stored with `{bankName:"City Bank", accountNumber:"123456789012"}`; last on Balances with the VISA logo; last in the carousel; Total +$1,500 | N/A |
| Liability | Loan, $2,000 owed | Card $2,000; Total −$2,000 | N/A |
| Other network | Credit Card, Other | Neutral icon in the grid and on the slide; no brand logo | N/A |
| Non-card type | Savings (network sent anyway, adapter level) | No network field; network not stored or shown | N/A |
| Type switch | Checking+Visa → Savings → Checking | Network back to "Select network…"; Balance value kept, label "Balance" | N/A |
| Missing choice | Type or Network on its placeholder | The table message on that field; focus on it | client and adapter |
| Blank text | Bank, Branch or Number blank or spaces | The table messages | client and adapter |
| Bad number | "1234 567", "12a45678", 20 digits | "Enter 8–19 digits." | client and adapter |
| Duplicate | `acc_1`'s number, spaced "3388 4556 8860 2598" | "An account with this number already exists." | adapter → field |
| Long name | 61 characters | "Use 60 characters or fewer." | client and adapter |
| Bad balance | "", "abc", "-5" | The table messages | client and adapter |
| Storage full | quota error on write | Alert; modal open with its values; storage unchanged; `listAccounts` still 5 | adapter |
| Ids | remove `acc_5`, then add; also nextAccountNumber 9 | `acc_6` (`acc_5` not reused); `acc_9` then `acc_10` | N/A |
| Update type | `updateAccount(id, {type:'loan', …})` | `VALIDATION` with `type`; nothing written | adapter |
| Update keeps data | update `acc_2` bank and balance | Same id, type and position; its transactions identical; reload without rewrite | N/A |
| Unchanged screens | before and after an add | Transactions rows, Expenses totals and Overview Statistics identical | N/A |
| Empty list | all removed | "No accounts yet." plus the Add card, no "Edit Accounts"; the first add shows the grid and keeps focus sane | N/A |
| Reload / re-login | after adding | Last on Balances and in the carousel; `/balances/acc_6` shows it with no transactions | N/A |

</frozen-after-approval>

## Code Map

- `src/api/types.ts:82-97` -- `AccountType`, `CardNetwork` (+`'other'`), `Account`. Add `AccountInput`, `AccountUpdate`, the message constants and the rule constants (`ACCOUNT_NAME_MAX = 60`, `ACCOUNT_NUMBER_DIGITS = [8, 19]`).
- `src/api/port.ts:60-69,133-157` -- the methods and `FINBANK_API_METHODS` (the compile guard).
- `src/api/http/httpApi.ts:14,33` -- `notImplemented` stubs.
- `src/api/mock/mockApi.ts`:
  - `ACCOUNT_TYPES`/`CARD_NETWORKS` at :212-213 (add `other`). `normalizeAccount` (:224-249) is in seed key order, and stored data keeps its 4+ digit rule.
  - Load filling at :701-703 (for `nextAccountNumber`).
  - The write pattern of `removeAccount` (:892-905), and `updateProfile`'s trim at :854-858.
  - The "does not rewrite clean stored accounts" test at `mockApi.test.ts:197`. The deferral at `deferred-work.md:20` is already fixed; mark it resolved.
- `src/api/queryKeys.ts:52-61`, `queryKeys.test.ts:46-57` (map pin) and `:59-68` (per-mutation "nothing else" tests). `hooks/useRemoveAccount.ts` is the pattern for the new hooks.
- `src/features/goals/components/goalModalForm.tsx` is the source of the primitive (`showSubmitError` :21-43, guards :75-84, layout :104-119, `GoalModal` :123-146). Users: `AdjustSavingsGoalModal.tsx`, `AdjustCategoryLimitModal.tsx`. Tests are at the feature root: `src/features/goals/*Modal.test.tsx`. `features/goals/schemas.ts:4-5` is the money-parsing pattern to copy.
- `src/ui/Modal.tsx`:
  - `pt-69` at :117 and padding at :126 (a tall-form placement option is needed);
  - focus return at :62 and the Esc `defaultPrevented` guard at :72.
- `src/ui/Dropdown.tsx`:
  - the `value` type at :18, the fallback at :48-52, the list keys at :111-113, ids and labelling at :129-134;
  - `Field.tsx:34-38,62`;
  - `TextInput.tsx:5,17-35` (ref and `lg`).
- `src/ui/AsyncSection.tsx:58` -- the empty state replaces the children. `BalancesPage` must render the empty line and the card itself (via an `isEmpty` branch or its own check).
- `src/ui/icons.ts` -- add `creditCard`. `balances/components/NetworkLogo.tsx:7-8` (logo heights). `AccountCard.tsx:36` (teal slide), `:45` and `:88` (the network gate, to change to a type gate), `:86-87` (the bank name). `AccountDetailsPage.tsx` `Detail` (wrapping).
- `src/features/balances/BalancesPage.tsx:17-54`. Tests in `BalancesPage.test.tsx`: replace the inert test at :165-171; update the empty-state test at :173-177; :110, :123 and :150 stay valid.
- `src/app/test-utils.tsx`, `src/app/settings.test.tsx` -- the full-app pattern.
- **Design:** 110.2 (488px panel, 56px fields, Save 192×48) and Components-1 (bordered inputs, dropdown).

## Tasks & Acceptance

**Execution:** Phase 1 is the first four tasks, Phase 2 the next three, and the planning-docs task closes Phase 2. Run the full lint, type-check and tests at the end of Phase 1 and again at the end of Phase 2.

*Phase 1: Shared infrastructure*
- [x] `src/ui/mapApiFieldErrors.ts` (+test), `src/ui/FormModal.tsx` (+test), `src/ui/Modal.tsx` (tall placement), the Goals modals and tests -- extract, migrate, delete the old file, and add `aria-disabled` Save.
- [x] `src/ui/Dropdown.tsx` (+test) -- the `field` variant per the constraints; the old variants are pinned.
- [x] `src/api/types.ts`, `port.ts`, `httpApi.ts`, `mock/mockApi.ts` (+`mockApi.test.ts`) -- every adapter row of the matrix, including no `setItem` on a reload after a create or update.
- [x] `src/api/queryKeys.ts` (+test, including "nothing else"), `hooks/useCreateAccount.ts`, `useUpdateAccount.ts` (+`hooks.test.tsx`).
*Phase 2: Add Account feature*
- [x] `src/ui/icons.ts`, `NetworkLogo.tsx`, `AccountCard.tsx` (both variants), `AccountDetailsPage.tsx` (wrap) (+tests) -- the network-mark table and overflow.
- [x] `balances/schemas.ts`, `components/AccountFormModal.tsx`, `AddAccountsCard.tsx`, `BalancesPage.tsx` (+tests) -- the form rows of the matrix, the empty state and the focus behaviour.
- [x] `src/app/accounts.test.tsx` (new) -- the full-app rows: Happy, Liability, Unchanged screens, Empty list, Reload / re-login.
- [x] `_bmad-output/planning-artifacts/epics.md` (Story 6.1) and `deferred-work.md` -- record the 6.1 decisions (placeholders, number formatting, the 60-character limit, the empty-state card, the tall-modal placement, the monotonic ids, items 58/65/73 still open) and resolve deferred items 20 and 50.

**Acceptance Criteria:**
- Given 1440×1024, when the modal opens with six fields, then the panel width, X, 56px fields, 24px gaps and the Save size and spacing match 110.2 within about 2px, and Save is fully visible. The Goals modals are unchanged in position and pixels.
- Given only the keyboard, when the user tabs through the modal, then every field, the dropdown options and Save are reachable, and Esc behaves as specified.
- Given lint, type-check, both test suites and `npm run build`, when run, then all pass.

## Implementation Notes

- **Phase 1 (shared infrastructure):**
  - `ui/FormModal.tsx` and `ui/mapApiFieldErrors.ts` replace `goalModalForm.tsx`. Save uses `aria-disabled` while saving, which resolves deferred item 50 for modal forms.
  - `Modal` gains `placement="tall"` (`pt-30`, 120px).
  - `Dropdown` gains the `field` variant: a combobox with a placeholder, error, `required` and a ref.
  - `CardNetwork` gains `'other'`, and `ApiErrorCode` gains `'NOT_FOUND'`.
  - New `createAccount` / `updateAccount` with a monotonic `nextAccountNumber` state key (no version bump).
  - Invalidation is limited to `accounts` and `balanceSummary`, through the new hooks `useCreateAccount` and `useUpdateAccount`.
- **Phase 2 (Add Account feature):**
  - `AccountFormModal` and `balances/schemas.ts` (its own money parsing).
  - The `NetworkLogo` type gate: logo, neutral `CreditCard` icon, or nothing.
  - Long names wrap; the empty state shows the Add card; `BalancesPage` owns the modal state.
  - On a failed Save, focus goes to the first invalid field in display order (via `onInvalid`).
- **Phase 3 (verification, 2026-11-18):**
  - **Checks:** lint, type-check, 2774 tests and 1341 timezone tests pass, and the build passes (1,012 kB JS chunk, the existing deferred bundle-size item).
  - **One unexplained failure:** the very first full run showed 1 failed test. It did not reproduce in 11 further runs, including one under parallel load, so its source is unidentified. Watch for it.
  - **Chrome at 1440×1024 (iframe), Goals modal:** unchanged at 604,276, 488 wide, X at 1036,300, fields at 668,372, Save 192×48 32px below the last field.
  - **Chrome, Add modal:** it follows the 110.2 rhythm (24px labels, 8px to the 56px field, 24px gaps, Save 32px below). After the review fix the six-field panel spans 120 to 960 with no scroll.
  - **Chrome, data checks:**
    - A duplicate number entered with spaces was rejected.
    - "1234 5678-9012" was stored as digits, with names trimmed.
    - The new accounts got ids `acc_6`, `acc_7` and `acc_8`, and the counter moved to 9.
    - Visa shows the VISA logo, Other the neutral icon, and Savings stores no network.
    - The Overview total moved from $240,399 to $241,749 (+1,500 −250 +100), and held after a reload.
    - `/balances/acc_6` shows the account with no transactions.
    - Focus returned to "Add Accounts" after each save, and a 60-character name wraps in its card.

## Spec Change Log

## Review Triage Log

Layers: Blind Hunter, Edge Case Hunter and Verification Gap. The Verification Gap reviewer found no gaps. The Chrome check (1440×1024) added one finding (row 1).

| # | Source | Finding | Verdict | Evidence / route |
|---|--------|---------|---------|------------------|
| 1 | chrome + blind | the tall modal sits at 208px; with six fields the panel ends at 1048, the overlay scrolls and the panel shifts 7px | medium | Measured: panel 597,208 to 1048, scrollHeight 1080 vs 1024. The user-approved layout puts the top at y≈120 and the bottom at ≈960. Patch: tall offset 120px. With every field showing an error the form still grows past the fold; the overlay scrolls, which is acceptable. |
| 2 | blind | `emptyMessage` on Balances is dead and duplicates the empty-state copy | low | A direct correction. Patch: one constant. |
| 3 | blind | the `useUpdateAccount` hook test is thin (no "transactions untouched" check, no rejection cases) | low | A test gap, cheap to fill. Patch. |
| 4 | blind | no field exposes `aria-required` | low | Real accessibility gap; the fix is an attribute. Patch. `maxLength` was rejected, because it would hide the 61-character error required by the frozen matrix. |
| 5 | blind | the Dropdown `useImperativeHandle` has empty dependencies | low | A direct correction. Patch. |
| 6 | blind + edge | stored accounts are normalised more loosely (4+ digits, no 60-character or uniqueness check) than the write rules, so editing a legacy account could fail on a field the user didn't touch | low | Seed accounts satisfy every rule; only corrupt or legacy data hits it. There is no edit UI until 6.2. Deferred to the 6.2 spec: decide whether update tolerates unchanged legacy values. |
| 7 | blind | server-error focus follows `fieldErrors` key order | low | The mock emits keys in display order and http is `notImplemented`. Unreachable today; the fix adds a parameter. Rejected. |
| 8 | blind | `updateAccount` ships with no UI consumer | false | The spec mandates building it in 6.1 for 6.2 and 6.3 (frozen block). |
| 9 | blind + edge | no maximum balance; totals could exceed the safe-integer range | low | Needs balances around $90T. A new product rule; rejected. |
| 10 | blind | the 60-character check counts UTF-16 units | low | Rare (emoji in bank names); the fix needs a custom refinement. Rejected. |
| 11 | blind | "Edit Accounts" is still a focusable inert button | low | It was inert before this story; Story 6.2 wires it in this epic. Rejected. |
| 12 | blind | no success announcement after adding | low | The same pattern as the Goals modals: the modal closes and focus returns to the opener. Rejected. |
| 13 | blind | "Other card network" names unknown or missing networks too | false | The name is mandated by the frozen network-mark table. |
| 14 | blind | long option labels could overflow the field popup | low | All labels are short and fixed. Rejected. |
| 15 | edge | a close during async zod validation still saves | false | The same claim was rejected in the Epic 4 final review: the window is resolver microtasks, which no human Esc or click can land in. The pending guard is tested. |
| 16 | edge | a hung refetch keeps the modal locked | false | The mock refetch always settles. |
| 17 | edge | the id regex cap and `nextAccountNumber` near the safe-integer limit | low | Needs more than 10⁹ accounts. Rejected. |
| 18 | edge | two tabs creating concurrently can collide on an id | low | Existing AD-6 behaviour for every mutation: each tab keeps its own in-memory state, so the last write wins. Not introduced by this story. Rejected. |

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run test:tz`, `npm run build` -- expected: all pass

**Manual checks:**
- In Chrome at 1440×1024 (iframe method), add a Visa Checking, an Other Credit Card, a Savings account and a 60-character bank name. Check Balances, the Overview carousel and total, and Account Details. Reload. Measure the modal against 110.2.
