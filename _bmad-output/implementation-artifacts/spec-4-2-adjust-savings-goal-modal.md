---
title: 'Adjust Savings Goal modal'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'e902d5ad4a1b9f2766f41f9eb93a0bcedd563bcd'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-1-savings-goal-card-with-gauge-and-period-selector.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** "Adjust Goal" on the Savings Goal card does nothing, so users can't correct their monthly target or the amount they've saved (FR25, FR28).

**Approach:** Add `updateSavingsGoal(month, { targetCents, achievedCents })` to the port. It writes into the same stored `savingsGoals` that `getSavingsGoal` reads. Add a `MoneyInput` to `src/ui` and an `AdjustSavingsGoalModal` (Target and Present fields, then Save) that opens from the card for the selected month. A successful save invalidates every `savingsGoal` query and waits for the active ones to refetch before the modal closes. The card and gauge therefore already show the saved values when the modal disappears, with no reload and no stale frame.

## Boundaries & Constraints

**Always:**
- **One source of truth:** goal data has one owner, the adapter's stored `savingsGoals`. Save upserts that month's entry, creating it for a month that had none, and persists it to localStorage with the existing write-first-then-commit pattern (`removeAccount`).
- **Refresh:** the cache refresh goes through `invalidationMap` only. Add `updateSavingsGoal: [qk.savingsGoal()]`, the prefix entry, so every month and every future view (the Overview widget in 4.5) refreshes. The mutation hook awaits `applyInvalidation`, so it stays pending until the active refetches settle.
- **Money values:** all money is integer cents. `MoneyInput` reports `dollarsToCents(text)` (`"$1,234.50"` → 123450; empty or unparseable → `null`). Validation is a zod schema run through react-hook-form. Each field is required, must parse, and must be ≥ 0. Present may exceed Target.
- **Prefill:** both fields are prefilled with `formatMoney(cents, 'exact')`, e.g. "$20,000.00", which round-trips through `dollarsToCents`.
- **Modal shell:** use the existing `Modal`, which provides the content-area dim, the X, Esc, an overlay click and the focus trap. The modal has no visible title, but the dialog gets the accessible name "Adjust savings goal". Every close path except a successful Save discards edits. Reopening shows the stored values.
- **Feature boundary:** `AdjustSavingsGoalModal` is exported from `features/goals/index.ts`.

**Never:**
- No optimistic or hand-written cache writes such as `setQueryData`. Invalidation only.
- No category limits (Story 4.4) and no Overview widget (Story 4.5).
- No `MOCK_STATE_VERSION` bump.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Save May | Target "$25,000", Present "13,000.5" | `updateSavingsGoal('2023-05', {2500000, 1300050})`. The modal closes, and the card shows $25,000 / $13,001 and gauge "13K" without a reload | N/A |
| Present > Target | 30000 / 20000 | accepted and saved, and the gauge is capped full | N/A |
| Month without a goal | Jun 2022, save 1000 / 0 | the entry is created, and reopening June shows $1,000.00 | N/A |
| Empty, negative or junk | "", "-5", "abc", "1.234" | Save is blocked, each bad field shows an inline error, no API call is made, and the modal stays open | `aria-invalid` + danger text |
| Discard | edit, then X, Esc or an overlay click | closes, nothing is saved, and reopening shows the stored values | N/A |
| Adapter rejects | `updateSavingsGoal` throws `ApiError` | the modal stays open with edits kept. Field errors go on their inputs; any other error shows as one `role="alert"` line above Save | Save works again |
| Bad port input | negative, non-integer or unsafe cents, or a bad month | rejects | `ApiError('VALIDATION')` with `fieldErrors` `targetCents` / `achievedCents` |

</frozen-after-approval>

## Code Map

- `src/api/port.ts`, `types.ts`, `http/httpApi.ts`, `mock/mockApi.ts` -- port method, `FINBANK_API_METHODS`, the stub, and the adapter. Reuse `validYearMonth`/`isCents` (mockApi.ts ~line 476) and the write-first pattern of `removeAccount` (~line 686). Return a copy.
- `src/api/queryKeys.ts` -- `invalidationMap` entry. `qk.savingsGoal()` already exists.
- `src/api/hooks/useRemoveAccount.ts` -- the template for `useUpdateSavingsGoal.ts`. Its variables are `{ month, targetCents, achievedCents }`.
- `src/lib/money.ts` -- `dollarsToCents` already accepts "$", grouping, ≤2 decimals and a sign. Negatives parse as negative and are rejected by the schema.
- `src/ui/TextInput.tsx`, `Field.tsx`, `fieldStyles.ts` -- `MoneyInput` wraps `TextInput` with `inputMode="decimal"` and `autoComplete="off"`, forwards input props (so `register` works), and adds an optional `onCentsChange(cents | null)`.
- `src/ui/Modal.tsx` -- add an optional `label` prop, rendered as `aria-label` when there is no `title`. The panel is 488px wide with `px-16 pt-16 pb-12`; keep it.
- `src/features/auth/LoginPage.tsx`, `features/auth/schemas.ts`, `applyApiError.ts` -- the react-hook-form + zod + `setError` pattern. `applyApiError` is auth-internal, so map `fieldErrors` locally.
- `src/features/goals/components/SavingsGoalCard.tsx` -- wire "Adjust Goal" to open the modal with the selected `month` and the loaded goal. Disable it while the goal is not loaded.
- `design-reference/screens/110.2. Goals.png` -- the category variant of the same modal shell. Save is a centred primary button about 192×48px, not full width. The label is `text-16 font-medium`, with a 48px input below it.

## Tasks & Acceptance

**Execution:**
- [x] `src/api/types.ts`, `port.ts`, `http/httpApi.ts`, `queryKeys.ts`, `hooks/useUpdateSavingsGoal.ts` -- the contract, invalidation and hook.
- [x] `src/api/mock/mockApi.ts` (+ test) -- validate, upsert, persist and return a copy. Tests cover the matrix rows for the port and persistence (a fresh adapter on the same storage reads the saved values).
- [x] `src/ui/MoneyInput.tsx` (+ test), `src/ui/Modal.tsx` (+ test) -- `MoneyInput` emits cents or `null` ("$1,234.50" → 123450); `Modal` gets the `label` prop.
- [x] `src/features/goals/schemas.ts`, `components/AdjustSavingsGoalModal.tsx`, `index.ts` -- the form: "Target Amounts" and "Present Amounts" (placeholder "Write present amount here"), with a stack gap of 24px and Save 32px below. Save is disabled and labelled "Saving…" while pending. Error copy: "Enter an amount, like 1,234.50." or "Amount can't be negative."
- [x] `src/features/goals/components/SavingsGoalCard.tsx` -- open the modal from "Adjust Goal".
- [x] `src/features/goals/AdjustSavingsGoalModal.test.tsx`, `src/app/router.test.tsx` -- RTL tests for prefill, validation, a successful save, discard on close and the adapter-error row. A router-level test on the real mock adapter edits May, sees the card and gauge update in place, then confirms that a fresh adapter on the same storage returns the saved goal.

**Acceptance Criteria:**
- Given `/goals` on May, when "Adjust Goal" is clicked, then a dialog named "Adjust savings goal" opens in the content area with Target "$20,000.00" and Present "$12,500.00" prefilled, an X and a "Save" button, and the shell is inert.
- Given valid edits, when Save completes, then the dialog has closed and the card already shows the new amounts and gauge.
- Given a saved edit, when the page is reloaded, then the stored values remain.
- Given screen 110.2 at 1440×1024, when compared, then the modal matches the design within 2px. The savings variant adds the second field.

## Implementation Notes

- **Field height deviates from the Code Map.** 110.2 measures the input at 56px (y 372-428 at 1x), not 48px, with text 24px in from the border. To meet the 2px acceptance criterion, `TextInput` gained `fieldSize?: 'md' | 'lg'` (`md` = existing `h-12 px-4`; `lg` = `h-14 px-6`), `fieldBase` lost its built-in `h-12` (now set by `TextInput` and `PasswordInput`), and the modal passes `fieldSize="lg"`. Story 4.4 can reuse it.
- Adapter: a bad month rejects with a plain `VALIDATION` (no `fieldErrors`); bad amounts reject with `fieldErrors.targetCents` / `achievedCents`, only for the bad field(s), before any write.
- The form lives in an inner component mounted only while `Modal` is open, so every close path discards edits and each opening re-reads the stored goal. Adapter `fieldErrors` are mapped locally (`targetCents` -> Target, `achievedCents` -> Present); anything else goes to a single `role="alert"` above Save.
- "Adjust Goal" is disabled while the selected month's goal query has no data (including after a month switch).
- **Visual check (2026-11-18, headless Chrome over CDP, `vite preview`, 1440x1024, seeded mock):** dialog 604,276 488 wide (design 604,276, 488); X at 1036,300; "Target Amounts" label text y 349-361 (design 349-361); input 668,372 360x56 (design 668,372 ~360x56); Save 752 x, 192x48, 32px below the last input (design 752, 192x48, 32px). The Present field adds 112px (24px gap + 24px label + 8px + 56px). Kept on purpose: a filled input uses the existing `ink-2` border (`TextInput` behaviour), where the design shows a placeholder-state grey border. Saving $25,000 / 13,000.5 closed the dialog with the card already at $25,000 / $13,001 / "13K" / "$25k", and a reload kept the values.
- Review patches (pass 1):
  - `AdjustSavingsGoalModal` owns `useUpdateSavingsGoal`, and `Modal`'s close does nothing while a save is pending. X, Esc and the overlay can't half-discard an edit that is still being written, and a rejection still reaches the open dialog's alert.
  - A synchronous `inFlight` ref drops a second submit made before `isPending` flips.
  - `Field` has a `labelTone`. `TextInput` `fieldSize="lg"` labels are `text-ink-2`, matching 110.2's (82,82,86); `md` stays `text-ink`.
  - Tests pin `PasswordInput` `h-12` and the borderless `h-12 px-6`.
- Orchestrator re-check (headless Chrome, dev server, 1440×1024):
  - Panel 604,276, 488 wide; X 1036,300; labels at 668,340 in `ink-2`; inputs 668,372, 360×56; Save 752,572, 192×48.
  - Saving $25,000 / 13,000.5 closed the dialog with the card at $25,000 / $13,001 / "13K" / "$25k". The stored May goal is {2500000, 1300050}.
- Verified: `npm run typecheck`, `npm run lint`, `npm test` (80 files, 2363 passed, 6 skipped), `npm run test:tz` (1281 passed, 4 skipped), `npm run build`.

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter, edge-case-hunter, verification-gap; plus the orchestrator's visual check):

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | edge-case, blind | X/Esc/overlay during a pending Save still persists the edit; a later rejection is lost after unmount; reopening mid-save prefills stale values | medium | Close unmounts the form, but the in-flight `mutate` still writes. This breaks the frozen "every close path except a successful Save discards edits". The only faithful fix is to ignore close while pending | patch |
| 2 | edge-case, blind | Double submit before `isPending` flips starts two mutations | low | `handleSubmit` resolves zod asynchronously before `mutate`, so `isPending` is still false. `RemoveAccountDialog` already guards with an `inFlight` ref | patch |
| 3 | verification-gap | `PasswordInput` `h-12` (moved out of `fieldBase`) not pinned | medium | Pre-verified: no height assertion in `PasswordInput.test.tsx` | patch |
| 4 | verification-gap | Borderless `TextInput` height/padding no longer pinned | medium | Pre-verified: the borderless tests assert only border classes | patch |
| 5 | orchestrator (visual) | Modal labels render `ink`; 110.2 samples #525256 (`ink-2`) | low | Pixel sample of 110.2 at the label is (82,82,86). Login's label is (25,29,35), so the shared default stays `ink` and only the `lg` field changes | patch |
| 6 | edge-case | A failed post-save refetch closes the modal as a success | low | The save did succeed. The same pattern as `removeAccount`. The mock never fails reads; the fix would add guard logic | reject |
| 7 | verification-gap, blind | `showSubmitError` fallbacks (unknown key, blank message, non-ApiError) untested | low | Defensive only: the adapter sends just the two mapped keys | reject |
| 8 | blind | Write `setQueryData` before invalidating so the modal closes sooner | false | Spec Never forbids hand-written cache writes | reject |
| 9 | blind | No upper limit on amounts | low | No requirement exists. Safe-integer cents format correctly; a cap would be a new rule | reject |
| 10 | blind | `schemas.ts` lacks its own unit tests | false | The parser is `dollarsToCents`, covered in `money.test.ts`. Both schema messages are exercised by the modal tests | reject |
| 11 | blind | `ModalProps` should be a title/label union | low | Type nicety with no user-facing defect. `ConfirmDialog` relies on optional `title` | reject |
| 12 | blind | Removing height from `fieldBase` is fragile | low | Only two consumers, both set a height, and both are pinned by #3/#4 | reject |
| 13 | blind | `MoneyInput.onCentsChange` has no production caller | false | Spec AC requires `MoneyInput` to emit cents | reject |
| 14 | blind | `AdjustSavingsGoalModal` exported without an external consumer | false | Spec Always requires the export (Story 4.5 reuses it) | reject |
| 15 | blind | "Adjust Goal" untested on query error and month switch | false | `disabled={!goal}` with `goal = query.data`, which is undefined in both states | reject |
| 16 | blind | Focus entry/return untested | false | Shared `Modal` behaviour, covered in `Modal.test.tsx` | reject |
| 17 | blind | Adapter and form validation copy differ | low | The form validates first; adapter copy is unreachable from the UI | reject |
| 18 | blind | Diff omits the spec and sprint status | false | By design: reviewers see code only | reject |

## Design Notes

The epic context says "full-width Save", but 110.2 shows a centred button about 192px wide. The design is the fidelity reference (NFR-1), so the spec follows it. `MoneyInput` stays a thin text field: react-hook-form keeps the raw text, so what the user typed survives a failed validation. The zod schema turns that text into cents with `dollarsToCents`, which keeps `MoneyInput` and the schema on one parser.

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` -- expected: all pass

**Manual checks:**
- In headless Chrome at 1440×1024, open the modal on `/goals` and compare it with `110.2. Goals.png`. Save new values and confirm the card updates in place.
