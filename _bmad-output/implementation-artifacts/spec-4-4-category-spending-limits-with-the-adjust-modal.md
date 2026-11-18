---
title: 'Category spending limits with the Adjust modal'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '155d7594ea6257a2c68755ba6b0dda4f0bd31376'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-2-adjust-savings-goal-modal.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Goals has no "Expenses Goals by Category" section, so users can't set a monthly spending limit per category (FR26, FR27, FR28; screens 110 and 110.2).

**Approach:**
- **Storage:** store one `limitCents` per expense category in the mock and expose `listCategoryLimits` / `updateCategoryLimit`.
- **Grid:** render a 3×2 grid of limit cards under the top row.
- **Modal:** add `AdjustCategoryLimitModal`, built from the same pieces as Story 4.2's modal: `Modal`, `MoneyInput` (`fieldSize="lg"`), `Button`, the zod `money` schema, and the pending-until-refetched mutation pattern.
- **Shared pieces:** the save-error mapping, the close-while-saving guard and the Save button row are extracted once and used by both modals. Nothing is copied.

## Boundaries & Constraints

**Always:**
- **Categories and seed:** six categories in the fixed order Housing, Food, Transportation, Entertainment, Shopping, Others (`categoryLabels`, `ExpenseCategoryId`). Seed limits vary: Housing $1,000.00, Food $500.00, Transportation $300.00, Entertainment $250.00, Shopping $400.00, Others $200.00.
- **Card content:** `CategoryIcon`, the name, `formatMoney(limitCents, 'exact')`, and an outlined `Button` (`size="compact"`, `trailingIcon="pencil"`) labelled "Adjust". Its accessible name includes the category ("Adjust Housing limit"). No over-limit indicator, and no comparison with spending.
- **Save:** Save changes only that category, persists it with the write-first pattern, and invalidates `[qk.categoryLimits()]` through `invalidationMap`. The modal closes only after the refetch, so the card already shows the new limit.
- **Modal:** the same shell and behaviour as 4.2:
  - the content-area dim, the X, Esc and an overlay click all discard edits, and are ignored while a save is pending;
  - the in-flight double-submit guard;
  - the accessible name "Adjust Housing limit";
  - one "Target Amounts" `MoneyInput`, prefilled `formatMoney(limit, 'exact')`;
  - the same validation copy, via the shared `money` schema.
- **Query states:** the grid goes through `AsyncSection`.

**Never:**
- No change to `AdjustSavingsGoalModal`'s visible behaviour. Its existing tests must pass unchanged, apart from imports.
- No new UI primitives where an existing one fits.
- No `MOCK_STATE_VERSION` bump.
- No Overview widget (Story 4.5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| List | `listCategoryLimits()` | 6 entries in fixed order with the seed values | N/A |
| Save one | Food → "$650" | Food is 65000, the other five are unchanged, it persists for a fresh adapter, and the Food card shows $650.00 when the modal closes | N/A |
| Invalid | "", "-5", "abc", "1.234" | Save is blocked with an inline error and no call is made | `aria-invalid` + danger text |
| Discard | edit, then X, Esc or an overlay click | nothing saved; reopening shows the stored limit | N/A |
| Adapter rejects | `ApiError` with `fieldErrors.limitCents`, or another error | the field error goes on the input, or one `role="alert"`; edits are kept | Save works again |
| Bad port input | unknown category, or negative / non-integer / unsafe cents | rejects | `VALIDATION` (`fieldErrors.limitCents` for cents) |
| Corrupt storage | `categoryLimits` is not an array, or has bad, duplicate or missing entries | always 6 in fixed order; a missing or bad category falls back to its seed value | written back as dirty |

</frozen-after-approval>

## Code Map

- `src/api/types.ts`, `port.ts`, `http/httpApi.ts`, `queryKeys.ts` -- add `CategoryLimit = { category: ExpenseCategoryId; limitCents }`, both methods (in `FINBANK_API_METHODS`, with `NOT_IMPLEMENTED` stubs), `qk.categoryLimits()`, and `invalidationMap.updateCategoryLimit`.
- `src/api/mock/seed.ts`, `mock/mockApi.ts` -- `MockState.categoryLimits`, frozen like `savingsGoals`. Follow the `normalizeSavingsGoals`/`updateSavingsGoal` pattern; reuse `isCents`, `EXPENSE_CATEGORIES`, `throwIfInvalid` and `writeItem`.
- `src/api/hooks/useCategoryLimits.ts`, `useUpdateCategoryLimit.ts` -- mirror `useSavingsGoal` / `useUpdateSavingsGoal`.
- `src/features/goals/components/AdjustSavingsGoalModal.tsx` -- the source of the logic to extract into `components/goalModalForm.tsx`:
  - `showSubmitError` with its field map: a `fieldByApiField` param plus `setError`;
  - the `requestClose` pending guard;
  - the `inFlight` ref submit wrapper;
  - the centred `w-48` Save/"Saving…" row.

  Keep names local to `features/goals` (not `src/ui`), because they wire `ApiError` and react-hook-form.
- `src/features/goals/schemas.ts` -- reuse the `money` transform and add `categoryLimitSchema = z.object({ target: money })`.
- `src/ui/CategoryIcon.tsx` (`tone`), `ui/Button.tsx` (`compact`), `ui/Modal.tsx` (`label`), `ui/MoneyInput.tsx` -- reuse them unchanged unless a measurement forces a change.
- `src/features/goals/GoalsPage.tsx` -- add a section below the top row: an `h2` "Expenses Goals by Category" in `text-22 font-normal text-subtle` (the Expenses pattern) and `CategoryLimitsGrid`.
- `design-reference/screens/110. Goals.png`, `110.2. Goals.png` -- the fidelity references (2× exports). Card ≈ 351×103 at x 304/680/1056 with a 24px column gap; the icon tile is 40px; "Adjust" is about 99×35. Measure the row gap and the icon-tile tone (`header` or `plain`).

## Tasks & Acceptance

**Execution:**
- [x] API files and hooks -- the contract, key, invalidation and hooks.
- [x] `src/api/mock/seed.ts`, `mockApi.ts` (+ tests) -- seed, normalize, list and update. Tests cover every port and storage matrix row.
- [x] `src/features/goals/components/goalModalForm.tsx`, `AdjustSavingsGoalModal.tsx` -- extract the shared pieces and switch the savings modal to them, with its tests still passing.
- [x] `src/features/goals/schemas.ts`, `components/AdjustCategoryLimitModal.tsx`, `index.ts` -- the modal, exported from the index.
- [x] `src/features/goals/components/CategoryLimitCard.tsx`, `CategoryLimitsGrid.tsx`, `GoalsPage.tsx` -- the grid and cards. Each card owns its modal open state.
- [x] `src/features/goals/AdjustCategoryLimitModal.test.tsx`, `src/app/router.test.tsx` -- RTL tests for prefill, validation, save (only that card changes), discard and adapter errors. A real-adapter router test saves Food and reads it back from a fresh adapter.

**Acceptance Criteria:**
- Given `/goals`, when it loads, then "Expenses Goals by Category" shows six cards in fixed order with the seeded limits in the exact style, each with an outlined "Adjust" button and no over-limit indicator.
- Given "Adjust" on Food, when clicked, then a dialog named "Adjust Food limit" opens with one "Target Amounts" field prefilled "$500.00" and a "Save" button.
- Given screens 110 and 110.2 at 1440×1024 in headless Chrome, when compared, then the grid and the modal match within 2px.

## Implementation Notes

- **Shared pieces** (`components/goalModalForm.tsx`): `GoalModal` (the `Modal` shell whose close is ignored while `pending`) and `GoalModalForm` (the `inFlight` double-submit guard, the `fieldByApiField` + `setError` save-error mapping, the single `role="alert"` and the centred `w-48` Save/"Saving…" row). They are components rather than exported functions/hooks because `react/only-export-components` runs with `--deny-warnings`; `showSubmitError` stays module-private. Both modals use them; nothing is duplicated.
- **Storage:** `MockState.categoryLimits` (frozen seed, fixed order). `normalizeCategoryLimits` always returns six entries in `EXPENSE_CATEGORIES` order: a non-array falls back to the seed; the first valid entry per category wins; bad, unknown or repeated entries are dropped; a missing category gets its seed value. The result is written back when it differs (existing `dirty` check). An unknown category rejects with a plain `VALIDATION`; bad cents with `fieldErrors.limitCents`.
- **CategoryIcon changed (measurement-forced):** 110's limit tile is 40×48 (y 552-600 at 1x), with a #F4F4F4 fill and a (82,82,86) glyph, so neither `header` (D2 tile) nor `plain` (`subtle` glyph, 40×40) fits. Added `tone="limit"` = `h-12 w-10 bg-surface text-ink-2`; the size moved into each tone's classes (existing tones unchanged and still `size-10`).
- **Adjust button width:** `compact` has 20px side padding (correct for "Adjust Goal", re-measured 417-559 in both), but 110's category "Adjust" is 99px wide (~16px sides). The button fills a `w-24.75` slot (`fullWidth`, content centred), like the Save `w-48` slot. `Button` is unchanged.
- **Label colour:** 110 samples the category name at #9F9F9F (`faint`, 2.7:1); `text-subtle` is used instead, following the tokens' WCAG AA decision (as the Expenses cards do).
- **Savings modal tests:** their fake API rendered `GoalsPage`, which now also calls `listCategoryLimits`; one stub line (`listCategoryLimits: () => Promise.resolve([])`) was added to the fixture. No assertion changed.
- **Visual check (headless Chrome over CDP, `vite preview`, 1440×1024, seeded mock):** cards 304/680/1056 × y 525/644, 352×103 (design 304/680/1056 × 524.5/644, ~352×103); row gap 16, column gap 24; tile 328,552.5 40×48 (design 328,552 40×48); "Adjust" 533,558.5 99×36 (design 533,558 99×36); name glyph top 556 (design 555); limit glyph top 582 (design 580.5); title glyph 306,485 (design 306,483.5). Food modal: panel 604,276-556, 488 wide (design 276-556); X 1036,300; label 668,340; input 668,372 360×56; Save 752,460 192×48 (design 752,460). Saving "$650" closed the dialog with only Food at $650.00 and stored `food: 65000`.
- Verified: `npm run typecheck`, `npm run lint`, `npm test` (82 files, 2477 passed, 6 skipped), `npm run test:tz` (1311 passed, 4 skipped), `npm run build`.

- Review patches (pass 1):
  - `Button` icons are `shrink-0`, so the pencil in the 99px "Adjust" slot keeps 16×16 (it was squashed).
  - `CategoryIcon` doc gives each tone's size.
  - The `updateCategoryLimit` port doc lists `STORAGE_FULL` and `UNKNOWN`.
  - Test imports ordered.
- Orchestrator browser check (headless Chrome, 1440×1024):
  - The grid shows six cards in fixed order with the seed limits. "Adjust" is 99×36 at x 533 / 909 with a 16×16 pencil.
  - The Food modal "Adjust Food limit" is prefilled "$500.00" and matches 110.2.
  - Saving "$650" closed it with only Food changed; storage `food: 65000`, others unchanged.
- Verified: typecheck, lint, `npm test` (82 files, 2477 passed, 6 skipped), `test:tz` (1311 passed, 4 skipped), build.

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter, edge-case-hunter, verification-gap; plus the orchestrator's browser check):

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | orchestrator (visual) | The pencil on each "Adjust" is squashed to a sliver | medium | Screenshot vs 110. Content of 67px in the 99px slot minus the compact `px-5` (57px) makes the flex SVG shrink. `Button`'s icons are not `shrink-0` | patch |
| 2 | blind | `CategoryIcon` doc still says "40×40" for every tone | low | The `limit` tone is 40×48; direct doc fix | patch |
| 3 | blind | `updateCategoryLimit` port doc omits the `STORAGE_FULL` rejection | low | The mock throws it on a failed write (tested); direct doc fix | patch |
| 4 | blind | Import order in `hooks.test.tsx` | low | Cosmetic; direct move | patch |
| 5 | edge-case | A failed post-save refetch closes the modal with a stale card / prefill | low | Carried from 4.2 #6: the save succeeded, the same pattern as `removeAccount`, and the mock never fails reads | reject |
| 6 | blind | A huge limit overflows the card | low | Carried from 4.2 #9: no cap requirement; safe-integer cents format | reject |
| 7 | blind | Six mutation hooks and modal instances | low | Closed modals render nothing; idle observers cost nothing measurable | reject |
| 8 | blind | Save with an unchanged value still writes | low | Idempotent write; no user-visible effect | reject |
| 9 | blind, verification-gap | Empty-state and loading paths untested or unreachable | low | The port guarantees six limits; the `AsyncSection` states are tested elsewhere | reject |
| 10 | blind | Grid not responsive | false | The app targets the fixed 1440 layout (NFR-1); other grids match | reject |
| 11 | blind | Screen readers don't hear "limit" | low | The section heading "Expenses Goals by Category" labels the grid, and each button says "Adjust Housing limit" | reject |
| 12 | blind | `FieldByApiField` keys untyped | low | Developer nicety; both maps are covered by field-error tests | reject |
| 13 | blind | No comment on skipping the version bump | false | The `loadState` doc already states that missing keys are filled from the seed so later epics can extend the state | reject |
| 14 | blind | Diff omits the spec and sprint status | false | By design | reject |
| 15 | blind | `CategoryLimitCard`/`Grid` not exported | low | No consumer outside the feature | reject |

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:tz`, `npm run build` -- expected: all pass

**Manual checks:**
- Compare `/goals` (the grid) and the open Food modal with 110 and 110.2 at 1440×1024 in headless Chrome. Save a new Food limit and confirm only the Food card changes.
