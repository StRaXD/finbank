# Review Polish Log — 2026-11-16

Lenses: structure, then prose (bmad-review). Reader: humans. All IDs, `[ASSUMPTION]`/`[NON-GOAL for MVP]` tags, and frontmatter unchanged (verified: 37 ASSUMPTION, 1 NON-GOAL, 35 FR headings, NFR-1..4, SM-1/2/C1, 18 screen refs before and after).

## prd.md (20 edits)
- §3 Glossary: "7 nav items" -> "seven"; moved User before Account and Expense category before Expense item (define before use); merged the duplicate "Spending limit" entry into "Category Goal (spending limit)".
- §4 intro: clarified that FRs without `[scr NNN]` inherit the screens in their section heading.
- FR-18: removed duplicated "Load More" bullet; kept the 10-rows assumption.
- FR-21: merged the trailing "Weekly option shows the same data as FR-14" bullet into the dropdown bullet.
- FR-27: tag-only bullet given a lead sentence (tag text unchanged).
- FR-30: merged duplicate validation bullets into the "Update Profile" bullet.
- FR-33: "sum of its expenses" -> "sum of its expense items" (glossary term); "Total Balance is the sum of the accounts" -> "derived from the accounts (FR-10)" to stop it reading against FR-10's asset-minus-liability rule.
- NFRs: bold pseudo-heading under §4.10 promoted to "### 4.11 Non-Functional Requirements".
- §6.2: added §8.2 item cross-refs to every deferred item for consistency.
- §8.1 / §9: `localStorage` code-formatted consistently; "Category goals" -> "Category Goals".
- §9 Assumptions Index: reordered to FR order (FR-8 before FR-9; FR-32 before NFR-1).

## addendum.md (5 edits)
- Data layer: added "(PRD NFR-4)" cross-ref; mapped `Expense` entity to the PRD term "expense item".
- Font line condensed; "Simple architecture" line tightened; trend-colour line punctuation clarified.

## Not applied
- §6.2 vs §8.2 overlap (structure: MERGE candidate) — kept; scope list and deferred-questions list serve different readers.
- British spelling (behaviour, colour, centred) vs Microsoft style guide — kept as the author's consistent voice.
