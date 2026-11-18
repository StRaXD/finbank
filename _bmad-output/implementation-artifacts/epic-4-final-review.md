# Epic 4 final review

- **Date:** 2026-11-18
- **Target:** `feat/epic-4` vs `main` (`5db7e00..96c1570`, stories 4.1–4.5), `src/` only. 60 files, +3,381 / −52 lines.
- **Mode:** full. Checked against:
  - `epic-4-context.md` and the five story specs, including each frozen block and every human decision;
  - the PRD (FR-11, FR-23–FR-28, FR-33, FR-34, NFR-1, NFR-3);
  - the architecture spine (AD-1–AD-16);
  - Figma screens 104, 104.1, 110, 110.1 and 110.2.
- **Chunks:**
  1. `src/api`, `src/lib` and `src/styles` (59 kB diff).
  2. `src/ui`, `src/app` and `src/features` (138 kB diff).
- **Layers:**
  - Blind Hunter, Edge Case Hunter and Verification Gap on each chunk.
  - One Acceptance Auditor across the whole epic.
  - 7 runs in total; no layer failed.

## Verification

| Check | At review time (`96c1570`) | After fixes |
|---|---|---|
| `npm run lint` (oxlint `--deny-warnings`) | pass | pass |
| `npx tsc -b` | pass | pass |
| `npm test` | 82 files; 2496 passed, 6 skipped | 82 files; 2523 passed, 6 skipped |
| `npm run test:tz` | 20 files; 1321 passed, 4 skipped | 20 files; 1341 passed, 4 skipped |
| `npm run build` | pass. The JS chunk is 986 kB (296 kB gzip), up from 922 kB at Epic 3 (deferred, see below) | pass, same |

## Acceptance audit

Every acceptance criterion of stories 4.1–4.5 is met, superseded by a recorded human decision, or a recorded, accepted deviation. The Acceptance Auditor ran the 15 Epic 4 test files (439 tests) and checked each criterion against code and tests.

- **Superseded:**
  - 4.1 "Adjust Goal has no action yet": replaced by 4.2.
  - 4.3 "series from seeded history": replaced by the human decision that each month's Present is split by day, and that the two month selectors are linked.
- **Accepted deviation:** 4.3 places its x labels on their true days, so the inner labels sit up to about 15px from the design's evenly spaced ones.
- **Discrepancies:** all in planning docs that were written before the human decisions. They are fixed below.

## Cross-screen consistency (1440×1024, headless Chrome, real `vite` dev server)

One browser session on a fresh seed, with a real `location.reload()`:

| Step | Overview Goals card | Goals: Savings Goal card | Goals: Saving Summary "this month" total |
|---|---|---|---|
| Seed | $20,000 target, $12,500 achieved | $20,000 / $12,500 | $12,500 |
| Save $25,000 / 13,000 on Overview | updated before the dialog closed | $25,000 / $13,000 | $13,000 |
| Save $30,000 / 14,500 on Goals | $30,000 / $14,500 | updated before the dialog closed | $14,500 |
| After a real page reload | $30,000 / $14,500 | $30,000 / $14,500 | $14,500 |

localStorage holds one May goal, `{ targetCents: 3000000, achievedCents: 1450000 }`.

- **One source:**
  - Both pages read `useSavingsGoal(month)`, one `qk.savingsGoal(month)` entry.
  - Both render the stats and gauge through `SavingsGoalSummary` and open the same `AdjustSavingsGoalModal`.
  - `updateSavingsGoal` invalidates `savingsGoal` and `savingSummary` through `invalidationMap`. The mutation stays pending until the active queries refetch.
- **Month selection:**
  - Picking April in either Goals dropdown moved both dropdowns, the card ($17,100 / $18,000) and the chart ($17,100) to April.
  - Overview always shows the month containing mock today (May 2023).
- **Chart accuracy:**
  - The current series sums exactly to the month's Present on every check.
  - Days after mock today (20–31 May) are gaps.
  - The previous month shows only the days the selected month also has (April shows March minus March 31: $15,680 of $16,300), as documented in the port.
  - Y ticks $0/$500/$2000/$5000 use `createTickScale(SAVING_TICKS)`, and a chart test pins in-range y placement.
- **Category limits:**
  - Six cards in fixed order with the seed values (Housing $1,000.00 … Others $200.00).
  - Saving Food at $650 changed only Food, in the UI and in storage.
  - Limits are never compared with spending.
- **Expenses and Transactions:**
  - Overview's Expenses Breakdown tiles still equal the Expenses cards, with the Epic 3 values unchanged (Housing $2,023.00, 11% ↓; Entertainment $549.99, 409% ↑; Others $3,702.40, 10% ↓).
  - Transactions still lists the same newest rows (GTR 5 $160.00, Polo shirt $20.00, Biriyani $12.00 on 17 May).
  - Epic 4 adds no transaction data.
- **Modals:**
  - Prefill, the validation copy, and discarding on X, Esc and an overlay click are tested for both modals.
  - Close is ignored and double submit dropped while a save is pending.
  - Save works again after a validation error (new tests).

## Figma comparison

| Screen | Reference | Result |
|---|---|---|
| `/goals` Savings Goal card | 110 | Card 304–672 × 152–445, title, dropdown, divider, stats, gauge (504,237, 144×70), caption and "Adjust Goal" (417,385, 143×36). Within 1–2px. Re-measured identically after the final fixes. |
| `/goals` Saving Summary | 110 | Card 696,152, 712 wide; title, `subtle` dropdown, legend, y labels, "May 01"/"May 30". Within 2px, except the accepted inner x-label spacing. |
| `/goals` category grid | 110 | Cards at x 304/680/1056, y 525/644, 352×103; icon tile 40×48; "Adjust" 99×36 at 533,559 with a 16px pencil. Within 1.5px. |
| Adjust modals | 110.2 / 110.1 | Panel 604,276, 488 wide; X 1036,300; 56px fields at 668,372; Save 192×48, 32px below the last field. Matches. |
| `/` Goals widget | 104 / 104.1 | Card 680,144, 352×233, equal height with its neighbours; pencil 810,164, 32×32; text within 1px. The modal matches 104.1. |

Intentional differences:
- Values come from the seed, not the Figma placeholders. Category limits vary instead of the placeholder $250.00.
- The gauge needle sits at the true ratio (62.5%), not the design's drawn ~45°.
- The design's very light greys (gauge end labels, category names, axis labels) use `subtle`, because `faint` text is reserved for disabled states (contrast).
- Overview uses the standard pencil glyph, not the design's underlined pencil.

## Review Findings

### Patch (applied)
- [x] [Review][Patch] Nothing tested that Save works again after a client-side validation error. The `inFlight` guard is re-armed only through `handleSubmit`'s invalid callback, so dropping it would leave Save dead after the first typo with every test green. A test is added to each modal. [AdjustSavingsGoalModal.test.tsx, AdjustCategoryLimitModal.test.tsx]
- [x] [Review][Patch] The savings modal's "close ignored while pending" table lacked the overlay-click row that the category modal has. It is added. [AdjustSavingsGoalModal.test.tsx]
- [x] [Review][Patch] `GoalGauge`'s round stroke caps were clipped by 0.5px at the SVG's bottom edge. The SVG now draws with `overflow="visible"` at the same size, and the misleading layout comment is corrected. [src/ui/GoalGauge.tsx]
- [x] [Review][Patch] The `updateSavingsGoal` port doc omitted the `STORAGE_FULL`/`UNKNOWN` rejection on a failed write. It now matches `updateCategoryLimit`. [src/api/port.ts]
- [x] [Review][Patch] `formatMoney` `ungrouped` had no rounding-boundary tests. Added: 50 → $1, −50 → −$1, 49 → $0, and a large value without separators. [src/lib/format.test.ts]
- [x] [Review][Patch] The mutation-hook tests ended with a `waitFor` that would hide a mutation resolving before its refetch. They now assert the cache synchronously after `mutateAsync` and the hook data after a single batch flush. Verified by temporarily breaking the await: both tests fail. [src/api/hooks/hooks.test.tsx]
- [x] [Review][Patch] `SavingsGoalCard` kept an unused uncontrolled mode in which passing `month` without `onMonthChange` silently disabled the dropdown. `month` and `onMonthChange` are now required. [SavingsGoalCard.tsx]
- [x] [Review][Patch] Overview's Goals header shifted as the amount loaded: the pencil jumped right. A fixed-size placeholder now holds the amount's place; it pulses while loading and stays static on error. [features/overview/components/GoalsCard.tsx]
- [x] [Review][Patch] Planning docs were stale against the implemented human decisions:
  - Architecture spine:
    - `getSavingSummary` returns `SavingSummaryPoint[]`;
    - `updateSavingsGoal` invalidates `savingSummary` too;
    - the ownership table gains `AdjustCategoryLimitModal` and `SavingsGoalSummary`;
    - the domain types gain `SavingSummaryPoint`.
  - PRD FR-34: the Saving Summary's ungrouped tick labels are noted as an exception.
  - `epics.md`: 4.1's no-op "Adjust Goal" and 4.3's "seeded history" are annotated as superseded; 4.3's `SAVING_TICKS` origin is corrected.
  - `epic-4-context.md`: the series derivation, port type, invalidation, ownership, dropdown variants, Save width, linked month and story dependencies are aligned.
  - Spec 4.1: a stale "not checked in a browser" note is removed.

### Deferred (logged in `deferred-work.md`)
- [ ] The Goals Adjust modals disable the focused Save button while pending, so keyboard focus drops to `<body>` for the save's duration. This is the same pattern as the deferred ConfirmDialog item (spec 2.2); fix both together.
- [ ] The production JS chunk is 986 kB (296 kB gzip), up from 922 kB at Epic 3. This adds to the existing bundle-size item.
- [ ] `showSubmitError` (goals) duplicates `applyApiError` (auth). Move one shared helper to a layer both features may import.
- Also noted as resolved: the spec-1-9 deferred item "`Modal` without a `title` has no accessible name", fixed by 4.2's `Modal` `label` prop.

### Rejected or dismissed (verified)
- **Close during the async-validation window persists the edit:** the window between Save and `isPending` is the zod resolver's microtasks, so no human Esc or click can land inside it. Close while pending is guarded and tested.
- **Today rolling into a new month leaves the selection outside the options; summary keys omit today:** mock today is fixed for the session, and the previous month always stays within the 12 options.
- **No "no goal set" empty state; `emptyMessage` unreachable:** months without a stored goal read as a zero goal by the 4.1 decision, and the gauge renders empty. `AsyncSection` requires the prop.
- **The gauge centre truncates ("13K") while the stats round ("$13,001"):** compact labels truncate by design (`formatCompact`, "12K" for $12,500 in 110).
- **`placeholderData` on month switch:** the spec requires `AsyncSection` states; the same call as the Epic 3 chart.
- **No upper bound on amounts, or overflow of huge values:** no requirement exists; safe-integer cents format correctly. It would be a new product rule.
- **Previous-month truncation and past days changing as today advances:** they follow the frozen 4.3 decision; documented in the port. Mock today is fixed.
- **`getSavingSummary('0001-01')` rejects as `UNKNOWN`:** unreachable. The UI only offers the 12 months up to today.
- **Port shape differences (`updateCategoryLimit(category, cents)`), `SavingsGoal` not reusing `SavingsGoalAmounts`, untyped `FieldByApiField` keys:** they follow the architecture spine's signatures, or are developer niceties with tests on both maps.
- **Validation copy for non-integer cents, category checked before limit:** the form validates first, so the adapter copy is unreachable from the UI.
- **Negative stored cents, theme switching, tick days assuming day 1:** the adapter normalises cents ≥ 0, the app has no theme switching, and the adapter always returns whole months from day 1.
- **The `TextInput` label tone tied to `fieldSize`:** a single design use (110.2). It can be exposed when a second case appears.
- **Fragile `p.sr-only` test selectors:** test robustness only; the current selectors target the right node.
- **Weight test skips days 29–31, goals storage table lacks a number case, a duplicate-month ordering test:** bounded by construction (100 ± 40 ± 20), or covered by the matching limits and bills cases.
