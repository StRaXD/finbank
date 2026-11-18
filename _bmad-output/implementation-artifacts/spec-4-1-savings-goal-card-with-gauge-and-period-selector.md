---
title: 'Savings Goal card with gauge and period selector'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '75164cfa3f8d4f1721f6a2508f2afe5b5d4fa3fb'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/goals` is a placeholder. Users can't see their monthly savings target or how close they are to it (FR23, screen 110).

**Approach:** Store one savings goal per calendar month in the mock seed and expose it through `getSavingsGoal(month)` and `useSavingsGoal`. Build a reusable `GoalGauge` half-donut in `src/ui`. Render a `SavingsGoalCard` on a new Goals page, with a grey month `Dropdown`, both amounts, the gauge, and an "Adjust Goal" button that does nothing yet.

## Boundaries & Constraints

**Always:**
- **Money and dates:** money is integer cents. Read today only through `useToday()`. Month options come from `selectableMonths(today)`, labelled with `formatRange`, and default to `currentMonth(today)`.
- **Gauge derivation:** only `GoalGauge` computes the gauge ratio (achieved ÷ target, clamped to [0, 1], 0 when the target is 0), the needle angle and the centre and end labels (`formatCompact(achieved,'gauge')`, "$0", `formatCompact(target,'axis')`).
- **Gauge props:** `GoalGauge` takes only numbers and a required `summary` string, and renders the summary as `sr-only`. Its colours come from Tailwind token classes (`stroke-chart-current`, `stroke-chart-previous`), with no hex literals.
- **Card values:** the card shows amounts with `formatMoney(…, 'whole')`.
- **Query states:** the card body goes through `AsyncSection` (skeleton, empty, and error with retry).
- **Feature boundary:** `features/goals` exports its page and `SavingsGoalCard` from `index.ts`.
- **Port method:** the new port method is listed in `FINBANK_API_METHODS` and has an http stub that throws `NOT_IMPLEMENTED`.

**Never:**
- No `updateSavingsGoal`, modal, `MoneyInput` or `invalidationMap` change. Those belong to Story 4.2.
- No Saving Summary chart or category limits. Those belong to Stories 4.3 and 4.4.
- No `MOCK_STATE_VERSION` bump. `loadState` already fills missing top-level keys from the seed.
- No `new Date()` in features, and no direct lucide imports outside `ui/icons.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seeded month | `getSavingsGoal('2023-05')` | `{ month:'2023-05', targetCents:2000000, achievedCents:1250000 }` | N/A |
| Month without a goal | `getSavingsGoal('2022-08')` | `{ month:'2022-08', targetCents:0, achievedCents:0 }` (a zero goal, not an error) | N/A |
| Bad month | `getSavingsGoal('2023-13')` or `'2023-05-01'` | rejects | `ApiError('VALIDATION')` |
| Corrupt storage | `savingsGoals` is not an array, or an entry has negative or non-integer cents or a duplicate month | non-arrays fall back to the seed, and invalid or duplicate entries are dropped | state written back as dirty |
| Gauge ratio | 1250000 / 2000000 | 0.625 | N/A |
| Over target | achieved 2500000, target 2000000 | ratio 1, so the fill is full and the needle sits at the right end | N/A |
| Zero target | 0 / 0, or 5000 / 0 | empty gauge with the needle at the left and both end labels "$0", with no throw and no NaN | N/A |

</frozen-after-approval>

## Code Map

- `src/api/types.ts` -- add `SavingsGoal = { month: YearMonth; targetCents; achievedCents }`, the stored "Present" amount.
- `src/api/port.ts` -- add `getSavingsGoal(month: YearMonth): Promise<SavingsGoal>` and append it to `FINBANK_API_METHODS`. The compile-time guard enforces the listing.
- `src/api/mock/seed.ts` -- `MockState` gains `savingsGoals: SavingsGoal[]`. Add the key to `seed`'s readonly `Omit` typing and freeze it like `bills`.
- `src/api/mock/mockApi.ts` -- in `loadState`, call `normalizeSavingsGoals(value, fallback)`, following the pattern of `normalizeBills` at ~line 461 (validate the month with `toYearMonth` and require non-negative safe integers). Add the adapter method next to `getComparison`, keeping keys in seed order so a clean seed round-trips without a write.
- `src/api/http/httpApi.ts` -- add the stub.
- `src/api/queryKeys.ts` -- `qk.savingsGoal(month?)`. Without a month it is the prefix, mirroring `qk.comparison`.
- `src/api/hooks/useComparison.ts` -- the template for the new `useSavingsGoal.ts`.
- `src/ui/Dropdown.tsx` -- `DropdownVariant` is only `'plain'` today. Add `'filled'`: a grey `bg-surface` box, `rounded-button`, `h-8 px-4`, `text-14` `text-ink-2`, and a 16px chevron (screen 110 trigger, about 156×32px).
- `src/ui/icons.ts` -- add `trophy: Trophy` and `target: Target`. `pencil` already exists.
- `src/ui/Button.tsx` -- reuse `variant="outline"` with `trailingIcon="pencil"`.
- `src/ui/Card.tsx`, `src/ui/AsyncSection.tsx` -- reuse. The card header ("Savings Goal" plus the dropdown) is inside the card body, not the `title` prop.
- `src/features/expenses/components/ComparisonChartCard.tsx` -- the pattern for a local-state dropdown, a query, and `AsyncSection`.
- `src/app/routeObjects.tsx:79` -- replace the Goals `PlaceholderPage` with `GoalsPage`.
- `design-reference/screens/110. Goals.png` -- the fidelity reference. It is 2880px wide, so divide by 2 for CSS px.

## Tasks & Acceptance

**Execution:**
- [x] `src/api/types.ts`, `port.ts`, `queryKeys.ts`, `http/httpApi.ts`, `hooks/useSavingsGoal.ts` -- type, port method, key, stub and hook -- the data contract.
- [x] `src/api/mock/seed.ts` -- seed Jan–May 2023 in cents: Jan 1,500,000/1,420,000, Feb 1,500,000/1,560,000, Mar 1,800,000/1,630,000, Apr 1,800,000/1,710,000, May 2,000,000/1,250,000 -- the AC data. Feb is over target, which exercises the cap.
- [x] `src/api/mock/mockApi.ts` (+ `mockApi.test.ts`) -- normalize, `getSavingsGoal` returning a copy, and the zero goal for unseeded months. Tests cover the matrix rows for seeded, unseeded, bad-month and corrupt-storage cases.
- [x] `src/ui/icons.ts`, `src/ui/Dropdown.tsx` (+ test) -- the trophy and target icons and the `filled` variant.
- [x] `src/ui/GoalGauge.tsx` (+ `GoalGauge.test.tsx`) -- export a pure `gaugeRatio(achieved, target)` and the SVG gauge. Tests cover 0.625, the cap, a zero target, the labels "$0"/"$20k"/"12K", the caption and the `sr-only` summary.
- [x] `src/features/goals/components/SavingsGoalCard.tsx`, `GoalsPage.tsx`, `index.ts` (+ `GoalsPage.test.tsx`) -- the card and the page. The page has a visible `h1` "Goals" in `text-22 font-normal text-subtle` above a `grid grid-cols-[1fr_2fr] gap-6` row. The card is in column 1, and column 2 is left empty for Story 4.3.
- [x] `src/app/routeObjects.tsx` -- route `/goals` to `GoalsPage`.

**Acceptance Criteria:**
- Given the seeded app on `/goals`, when it loads, then the heading "Goals" and the Savings Goal card show "01 May ~ 31 May", Target Achieved "$12,500", This month Target "$20,000", a gauge reading "12K" with end labels "$0"/"$20k", the caption "Target vs Achievement", and an outlined "Adjust Goal" button with a pencil icon.
- Given the card, when the user opens the period dropdown, then it lists the 12 months from `selectableMonths`, newest first. Choosing "01 Apr ~ 30 Apr" loads April's goal ($17,100 of $18,000).
- Given "Adjust Goal", when it is clicked, then nothing happens and no error occurs.
- Given the goal query errors, when the card renders, then the `AsyncSection` inline error with retry shows.
- Given screen 110 at 1440×1024, when compared, then the card matches the design: about 367px wide and 292px tall, a bold 18px "Savings Goal" header row with a 1px `border-border` divider, stats on the left, the gauge on the right, and the button centred below.

## Implementation Notes

- `gaugeRatio` lives in `src/ui/gaugeRatio.ts`, not `GoalGauge.tsx`: oxlint's `react/only-export-components` forbids non-component exports from a component file. `GoalGauge` is its only caller.
- "Adjust Goal" first used `Button` `size="sm"` (32px, `text-12`); the visual check below replaced it with a new shared `compact` size (`h-9 px-5 gap-2 text-14`, 16px icon) for 110's outlined card actions, which Story 4.4's "Adjust" buttons reuse.
- **Visual check (2026-11-18, headless Chrome, 1440×1024, seeded mock, against `110. Goals.png` at 1x).** Fixed differences:
  - card 360×303 → 368×292, with the grid at `368fr_712fr`;
  - header raised 4px (`-mt-1`) and title `text-16 font-bold text-ink-2` (sampled #525256);
  - divider at y 216 (design 215);
  - amounts lowered 4px (`mt-1`, stat gap 24px);
  - gauge redrawn: 144×70 box, ring 127px wide outside, ring top flush with the drawing, `-mt-1` in the card, labels at y 313 (design 312), caption `text-12 font-medium` 131px wide;
  - "Adjust Goal" 143×36 at x 417 (design 142×36 at 417);
  - the filled `Dropdown` gains the design's 1px `border-border`.
  Every measured edge is now within 2px. Kept on purpose:
  - the gauge end labels use `text-subtle` (the design's ~#D1D1D1 fails contrast, and `faint` text is banned outside disabled states);
  - the dropdown text is `text-14`, about 10px wider than the design's ~13px, which is not on the type scale;
  - the needle follows achieved ÷ target as the spec requires (the design's needle is drawn at about 42°, not 62.5%);
  - the icons are the existing lucide set.
- `SavingsGoalCard` gates its content on `useToday()` through `AsyncSection`, so the header renders once today resolves.
- Verified: typecheck, lint, full test suite (78 files, 2311 passed, 6 skipped). (The visual check below was run afterwards.)

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter, edge-case-hunter, verification-gap):

| # | Source | Finding | Verdict | Evidence | Route |
|---|--------|---------|---------|----------|-------|
| 1 | verification-gap | `/goals` route swap not asserted by any router test (placeholder also renders h1 "Goals") | medium | Pre-verified gap; router/shell tests assert only the h1 | patch |
| 2 | verification-gap, blind-hunter | Outer `AsyncSection` (today) carries goal-specific `emptyMessage` | low | `SavingsGoalCard.tsx` outer section; text misdescribes the `today` query; one-line correction | patch |
| 3 | edge-case-hunter, blind-hunter | Selected month goes stale if today moves to a new month | false | The previous month stays in `selectableMonths` (12-month window), so the selected value remains a valid option; mock today is fixed | reject |
| 4 | edge-case-hunter | NaN/unsafe cents make `formatCompact` throw in `GoalGauge` | false | The adapter's `normalizeSavingsGoal` admits only non-negative safe integers; no path delivers such values | reject |
| 5 | edge-case-hunter | Negative target shows "-$5k" end label | false | Negative cents are dropped by `isCents` in the adapter | reject |
| 6 | edge-case-hunter | `gaugeRatio` not exported from `GoalGauge.tsx` as spec says | low | Lint (`react/only-export-components`) forbids it; documented in Implementation Notes; fix would edit this spec | reject |
| 7 | blind-hunter | Skeleton flashes on month change (no `keepPreviousData`) | false | Spec requires `AsyncSection` skeleton for the query; same behaviour as `ComparisonChartCard`'s dropdown | reject |
| 8 | blind-hunter | "Adjust Goal" is clickable but inert | false | Spec AC requires a no-op until Story 4.2 | reject |
| 9 | blind-hunter | Compact label formats inconsistent ("12K" vs "$20k", literal "$0") | false | Matches design 110 and `formatCompact` gauge/axis modes per epic context | reject |
| 10 | blind-hunter | No narrow-screen breakpoint on the 1fr/2fr grid | false | App targets fixed 1440 desktop (NFR-1); other pages use breakpoint-free grids | reject |
| 11 | blind-hunter | No `invalidationMap` entry for `savingsGoal` | false | Spec Never: invalidation belongs to Story 4.2 | reject |
| 12 | blind-hunter | All-invalid stored array silently becomes `[]` | false | Same rule as `normalizeBills`; matrix row specifies dropping invalid entries | reject |
| 13 | blind-hunter | Month-validation tests miss `2023-00`, `0000-01`, `2023-5`, non-strings | false | `dates.test.ts:127` covers these for `toYearMonth`, which the adapter delegates to | reject |
| 14 | blind-hunter | Card's `today` failure path untested | false | `RequireSession` blocks every signed-in route until today loads, with error/Retry covered in `router.test.tsx` | reject |
| 15 | blind-hunter | Filled dropdown keyboard handling untested | false | Keyboard logic is variant-independent and covered by existing `Dropdown` tests | reject |
| 16 | blind-hunter | Tiny non-zero ratio draws no fill | low | Only below ~6 cents of a $20k target; fix needs an extra guard; negligible in use | reject |
| 17 | blind-hunter | `SavingsGoalCard` exported from feature index without consumers | false | Spec Always requires the export (AD-12 ownership) | reject |
| 18 | blind-hunter | Two one-item `<dl>`s; `<h2>` line breaks | low | Cosmetic semantics; JSX trims the h2 whitespace; restructure not a direct correction | reject |

## Design Notes

`GoalGauge` is hand-written SVG, not recharts. A 180° arc is drawn as two stroked `path`s: the grey track over the full half, and the teal fill over `ratio`. The needle is a line from the pivot at angle `π·(1−ratio)`, with a round dot at the pivot. Draw only the track when `ratio === 0`, which avoids a zero-length arc artefact. Months with no stored goal return a zero goal because the port's return type is non-null, and the zero-target rule already defines how that renders. Story 4.2's save can then create the month's goal.

## Verification

**Commands:**
- `npm run typecheck` -- expected: no errors
- `npm run lint` -- expected: no warnings
- `npm test` -- expected: all pass, including the boundary, design-literal and token node tests

**Manual checks:**
- `npm run dev`, then sign in and open `/goals`. Compare the page with `110. Goals.png` and switch months.
