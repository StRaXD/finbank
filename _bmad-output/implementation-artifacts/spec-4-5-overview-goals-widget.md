---
title: 'Overview Goals widget'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'db10ab7c72682513bbf68f7208e874b98dea2ae7'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-2-adjust-savings-goal-modal.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Overview's Goals slot (row 1, column 2 of screen 104) is empty, so users can't see or edit this month's savings goal from the dashboard (FR11, FR25, FR33).

**Approach:** Add an Overview "Goals" card. It reads the same `useSavingsGoal(currentMonth(today))` query as the Goals page and renders the same stats and `GoalGauge` through one shared component exported from `features/goals`. Its pencil opens the same `AdjustSavingsGoalModal`. The adapter's stored `savingsGoals` stays the only source, so a save on either page updates every view and persists in localStorage.

## Boundaries & Constraints

**Always:**
- **One data path:**
  - one query key, `qk.savingsGoal(month)`, for both pages;
  - one stored source, the mock's `savingsGoals` in localStorage;
  - one modal, `AdjustSavingsGoalModal` imported from `features/goals/index.ts`.

  Saving refreshes `savingsGoal` and `savingSummary` through `invalidationMap`, and the modal closes only after the active queries have refetched.
- **Shared rendering:** the Target Achieved / This month Target stats and the gauge render through one component, `SavingsGoalSummary`, exported from `features/goals` and used by both `SavingsGoalCard` and the Overview card. The Goals page must look identical before and after the extraction.
- **Header:** the target in the whole style (`text-22 font-extrabold`, as Total Balance), then a pencil button, then the month on the right as "May, 2023" (`formatDate(monthRange(month).start, 'monthComma')`, pattern `'MMMM, yyyy'`).
  - The pencil is a 32×32 grey `surface` square with the `pencil` icon, named "Adjust savings goal".
  - The month is `currentMonth(today)`, read through `useToday()`.
- **Layout:** the card sits in a new `slot-goals` (`col-start-2 row-start-1`) under `Card title="Goals" fill`, at equal height with Total Balance and Upcoming Bill. The body goes through `AsyncSection`, and the pencil is disabled until the goal loads.
- **Boundary:** `features/overview` imports only from `features/goals/index.ts`.

**Never:**
- No second goal query, cache write, or copy of the gauge or stats markup.
- No month selector on Overview; it is always the current month.
- No changes to the modal's behaviour.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seeded | open `/` | Goals card: "$20,000", pencil, "May, 2023", Target Achieved $12,500, This month Target $20,000, gauge "12K" | N/A |
| Edit on Overview | pencil, then Target "$25,000", Present "13,000", Save | the Overview card updates before the modal closes; on navigating to `/goals`, the card shows $25,000 / $13,000 and the chart total is $13,000 | N/A |
| Edit on Goals | save May on `/goals`, then navigate to `/` | the Overview card shows the new values without a reload | N/A |
| Reload | after either edit, a fresh adapter and query client on the same storage | both pages show the saved values | N/A |
| Goal query fails | `getSavingsGoal` rejects | inline error with Retry in the card; the pencil is disabled | `AsyncSection` |

</frozen-after-approval>

## Code Map

- `src/features/overview/OverviewPage.tsx` -- the grid. Add `slot-goals` with `col-start-2 row-start-1` and update the doc comment.
- `src/features/overview/OverviewPage.test.tsx:200-220` -- the "leaving Goals empty" test. It now asserts that the Goals card is in `slot-goals`.
- `src/features/overview/components/TotalBalanceCard.tsx` -- the header pattern to copy: `Card title fill`, a `min-h-10 … border-b border-border pb-2` header row, and the `text-22 font-extrabold` amount. `UpcomingBillCard.tsx` is the other row-1 card.
- `src/features/goals/components/SavingsGoalCard.tsx` -- `Stat` and `GoalBody` (~lines 15-43), with the summary text and the `-mt-1` gauge wrapper. Extract them as `SavingsGoalSummary({ goal, period })` into `components/SavingsGoalSummary.tsx`, export it from `index.ts`, and use it in `SavingsGoalCard`. The existing Goals tests and the 4.1 visual measurements must still hold.
- `src/features/goals/index.ts` -- already exports `AdjustSavingsGoalModal`. Add `SavingsGoalSummary`.
- `src/api/hooks/useSavingsGoal.ts`, `useToday.ts`; `src/lib/dates.ts` (`currentMonth`, `monthRange`); `src/lib/format.ts` -- add `DateMode` `'monthComma'` with the pattern `'MMMM, yyyy'`.
- `src/ui/icons.ts` (`pencil`), `ui/Button.tsx`, `ui/Card.tsx`, `ui/AsyncSection.tsx`, `ui/GoalGauge.tsx` -- reuse them. Build the pencil square from `Button` if one of its variants fits after measuring; otherwise use a plain `button` with token classes. Don't add a new UI primitive.
- `design-reference/screens/104. Overview.png`, `104.1. Overview.png` -- fidelity references (2× exports). The card is about 680..1032 × 144..376 at 1x; the pencil square is about 810..842 × 164..196.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/format.ts` (+ test) -- the `monthComma` mode.
- [x] `src/features/goals/components/SavingsGoalSummary.tsx`, `SavingsGoalCard.tsx`, `index.ts` -- extract and export `SavingsGoalSummary`; the Goals tests pass unchanged.
- [x] `src/features/overview/components/GoalsCard.tsx`, `OverviewPage.tsx` -- the widget and its slot. The card owns the modal's open state.
- [x] `src/features/overview/OverviewPage.test.tsx` -- content, the pencil opening the dialog named "Adjust savings goal", the disabled pencil and the error state.
- [x] `src/app/router.test.tsx` -- real-adapter tests for the Edit on Overview, Edit on Goals and Reload rows.

**Acceptance Criteria:**
- Given the seeded app, when `/` loads, then the Goals card sits between Total Balance and Upcoming Bill at equal height, with the matrix's seeded values.
- Given either page's save, when the other page is visited, then both show the same target, achieved amount and gauge, and the Goals chart total equals the achieved amount.
- Given screens 104 and 104.1 at 1440×1024 in headless Chrome, when compared, then the card and its modal match within 2px.

## Implementation Notes

- `SavingsGoalSummary` is the old `Stat` + `GoalBody` markup moved verbatim (same classes, same `-mt-1` gauge wrapper, same screen-reader summary), so the Goals page renders identically; `SavingsGoalCard` now calls it. Exported from `features/goals/index.ts` with its props type.
- `GoalsCard` (`features/overview/components`) imports `AdjustSavingsGoalModal` and `SavingsGoalSummary` only from `features/goals/index.ts`. It reads `useToday()` → `currentMonth(today)` → `useSavingsGoal(month)` (same `qk.savingsGoal(month)` key as Goals), owns the modal's open state, and mounts the modal only once the goal has loaded. No new query, cache write or invalidation: the modal's existing `invalidationMap` path refreshes both pages.
- Pencil: no `Button` variant fits a 32×32 grey square (the `google`/disabled grey is #E4E7EB, the design's is `surface`), so it is a plain `button` with token classes (`size-8 rounded-button bg-surface text-ink-2`, 16px `pencil` icon), `aria-label="Adjust savings goal"`, disabled until the goal loads (pending and error).
- The header target renders only once the goal has loaded; the 32px pencil keeps the row height during loading and error. The body goes through `AsyncSection` (skeleton / error with Retry / empty line).
- Month label: measured against 104 the month is `text-14 font-medium text-ink-2` (as "All Accounts"), not 16px; at 16px it was 9px too wide.
- Kept as is (shared, out of scope): 104 draws the pencil-with-underline glyph and a needle at ~45°, while the app uses the `pencil` icon (as the spec says) and the shared `GoalGauge` needle at the true 62.5% ratio.
- Visual check (2026-11-18, headless Chrome over CDP, `vite preview`, 1440×1024, seeded mock): Goals card body 680,144 352×233 (design ~680..1032 × 144..376), equal to Total Balance and Upcoming Bill (both 352×233 at y 144); pencil 810,164 32×32 (design 810..842 × 164..196); target glyphs 705..798 × 170..192 (design 704.5..799 × 170..191.5); month glyphs 938..1006 × 175..187 (design 938.5..1006.5 × 174.5..187.5); divider at y 208 (design ~207.5); stat labels within 1px; gauge ring top 229 (design ~227); caption 870..1001 × 340..351 (design 870.5..1001 × 340..350). Modal from the pencil: dialog 604,276 488×392, white panel rows 276..667 (104.1: 277..666), inputs 668,372 / 668,484 360×56, Save 752,572 192×48. Saving $25,000 / 13,000 from Overview closed the dialog with the card already at $25,000 / $13,000 / "13K" / "$25k"; after a page reload `/goals` showed $25,000 / $13,000 with the Saving Summary "This month: $13,000 in total", and `/` showed the same.
- Verified: `npm run typecheck`, `npm run lint`, `npm test` (82 files, 2496 passed, 6 skipped), `npm run test:tz` (1321 passed, 4 skipped), `npm run build`.

- Review patches (pass 1):
  - The header amount has an `sr-only` "Target for May, 2023:" prefix.
  - The `useSavingsGoal` and `SavingsGoalSummary` comments cover both 110 and 104.
- Orchestrator browser check (headless Chrome, 1440×1024, one session with a real `location.reload()`):

  | Step | Overview | Goals card | Goals chart total |
  |---|---|---|---|
  | Seed | $20,000 / $12,500 | — | — |
  | Save $25,000 / 13,000 on Overview | updated before the dialog closed | $25,000 / $13,000 | $13,000 |
  | Save $30,000 / 14,500 on Goals | $30,000 / $14,500 | updated | $14,500 |
  | After reload | $30,000 / $14,500 | $30,000 / $14,500 | $14,500 |

  - Stored May is {3000000, 1450000}.
  - The Goals page re-measured identically after the `SavingsGoalSummary` extraction (card 304,152–672,445; button 417,385–560,421).
  - The Overview card matches 104. The pencil glyph and the needle angle differ by design choice.
- Verified: typecheck, lint, `npm test` (82 files, 2496 passed, 6 skipped), `test:tz` (1321 passed, 4 skipped), build.

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter, edge-case-hunter, verification-gap; plus the orchestrator's browser check):

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | blind | The header's "$20,000" and "May, 2023" have no accessible context | low | Screen readers hear a bare amount before the stats. A direct fix is an `sr-only` "Target for May, 2023" relationship | patch |
| 2 | blind | `useSavingsGoal` doc and `SavingsGoalSummary` comment name only the Goals page | low | Both now also serve Overview (104); direct doc fix | patch |
| 3 | edge-case | Month rolls over mid-edit; the modal remounts on the next month | false | Mock today is fixed for the session; `month` derives from it | reject |
| 4 | edge-case | `goal` becomes undefined while the modal is open | false | The month key never changes on Overview; a failed background refetch keeps `query.data` | reject |
| 5 | edge-case, blind | `emptyMessage` can never show | low | `AsyncSection` requires the prop; `getSavingsGoal` never returns empty (same as `SavingsGoalCard`) | reject |
| 6 | blind | Outer `useToday` path untested | false | `RequireSession` loads today before any page renders; its failure and Retry are tested in `router.test.tsx` | reject |
| 7 | blind | Router test name claims "updates before the dialog closes" | false | The assertions run synchronously on the first frame without the dialog, with no extra wait. A lagging card would fail them | reject |
| 8 | blind | No direct `SavingsGoalSummary` unit test | low | Both consumers assert its labels, values, summary and gauge | reject |
| 9 | blind | `data-testid="goals-card"` unused | low | Harmless hook; used by the orchestrator's browser checks | reject |
| 10 | blind | Header lacks `min-h` like Total Balance | low | Measured: the divider and pencil match 104 within 1px | reject |
| 11 | blind | Stale data after a failed background refetch keeps the pencil enabled | false | Same intended `AsyncSection` behaviour as every other card; the save still targets the stored goal | reject |
| 12 | blind | The Overview modal unit test doesn't assert the refresh | low | The real-adapter router tests assert the refresh on both pages | reject |
| 13 | blind | `monthComma` untested on the 1st under `test:tz` | low | It uses the same `parseIsoDate` path as every other `formatDate` mode, which `test:tz` already covers | reject |

## Verification

**Commands:**
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:tz`, `npm run build` -- expected: all pass

**Manual checks:**
- In headless Chrome, compare `/` with 104 and the open modal with 104.1. Edit on Overview, then open Goals; edit on Goals, then open Overview; reload, and confirm both pages agree.
