---
title: 'Story 1.4: Money, date and formatting helpers'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: '7066e1d7a87a83ed49fe7457ebc13f9a6886e104'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Every screen shows money and dates. Ad hoc `Intl`, `toFixed` or `new Date()` calls would drift between screens and shift dates across time zones. AD-9/AD-10 require one owner for each.

**Approach:** Add pure, fully unit-tested helpers in `src/lib/`:
- `money.ts`: integer-cents helpers.
- `dates.ts`: the only date parsing and arithmetic, using date-fns with `weekStartsOn: 0`, plus the branded `IsoDate`/`YearMonth` types.
- `format.ts`: every display format in FR-34.

All of them are time-zone-safe, so they never depend on the runtime's local offset.

## Boundaries & Constraints

**Always:**
- **Types:** `IsoDate` (`YYYY-MM-DD`) and `YearMonth` (`YYYY-MM`) are branded string types defined in `lib/dates.ts`. Story 1.5's `api/types.ts` re-exports them, because AD-1 forbids `lib` importing `api`. Provide validating constructors `toIsoDate(s)` and `toYearMonth(s)` that throw on malformed input. Construct `Date` objects only from validated parts (`new Date(y, m-1, d)`), never with `Date.parse` or from an ISO string.
- **`dates.ts` exports:**
  - `toIsoDate`, `toYearMonth`
  - `parseIsoDate`, `yearMonthOf(iso)`
  - `currentMonth(today) → YearMonth`
  - `monthRange(ym) → { start: IsoDate, end: IsoDate }`
  - `weekOf(today) → IsoDate[7]`, Sun–Sat, `weekStartsOn: 0`
  - `selectableMonths(today) → YearMonth[]` (see Decisions)
  - `addMonths(ym, n)`
- **Time zones:** `toIsoDate('2023-05-19')` parsed and formatted yields 19 May under `TZ` values `UTC`, `America/Los_Angeles` and `Pacific/Kiritimati`. Tests prove it by running the suite with each of those `TZ` values.
- **`format.ts` outputs:**

| Call | Output |
|---|---|
| `formatMoney(24039900,'whole')` | `$240,399` |
| `formatMoney(2505600,'exact')` | `$25,056.00` |
| `formatCompact(1250000,'gauge')` | `12K` |
| `formatCompact(200000,'axis')` | `$2k` |
| `formatPercent(8)` | `08%` |
| `formatDate('2023-05-17','row')` | `17 May 2023` |
| `formatDate(d,'badge')` | `May 15` |
| `formatDate(d,'header')` | `May 19, 2023` |
| `formatDate(d,'axisDay')` | `May 01` |
| `formatDate(d,'weekday')` | `14 Sun` |
| `formatDate(d,'month')` | `Jan` |
| `formatRange('2023-05')` | `01 May ~ 31 May` |

- **Formatting rules:**
  - Money is en-US USD.
  - `whole` rounds half-up to dollars. Negative values render as `-$…`.
  - Compact values truncate, never round up: $12,500 gives `12K`. `gauge` has no `$` and uppercase `K`/`M`. `axis` has a `$` and lowercase `k`/`m`. Values under $1,000 print whole dollars.
  - `formatPercent` takes a signed integer and prints its magnitude zero-padded to 2 digits, because direction is shown by the trend arrow.
- **Inputs:** every function takes integer cents (asserted) or branded dates. Invalid input throws, never formats silently.
- **Lint:** add an oxlint `no-restricted-syntax`/`no-restricted-globals` style rule, or a literal-scan test, so `Date.parse`, `new Date(` with arguments, `Intl.` and `.toFixed(` appear only in `src/lib/dates.ts` and `src/lib/format.ts`.

**Never:**
- No `api/` types or hooks, and no UI. `lib` imports only date-fns.
- No locale switching. English only.

**Decisions (human, 2026-11-16):**
- **`maskAccountNumber(num, 'groups')`** uses one rule for every account: digits grouped in 3s from the left, separated by single spaces, with the last 4 digits replaced by `*`. For example `13345688681234` gives `133 456 886 8****`. Accepted: two Balances cards differ slightly from their PNGs.
- **`maskAccountNumber(num, 'tail4')`** gives `**** **** **** ` followed by the last 4 digits, e.g. `**** **** **** 2598`.
- **`selectableMonths(today)`** returns the 12 months ending with the month that contains `today`, newest first. For `2023-05-19` that is `2023-05`, `2023-04` … `2022-06`.

</frozen-after-approval>

## Code Map

- `src/lib/.gitkeep`: replace with `money.ts`, `dates.ts`, `format.ts` and co-located `*.test.ts` files (jsdom-agnostic pure tests).
- `package.json`: `date-fns` 4.4.0 is already pinned. `test` is `vitest run`. Add `test:tz`, which runs vitest under the three `TZ` values via cross-platform env setting. `vitest.config.ts` can set `process.env.TZ` per run; Windows needs no `cross-env` if TZ is set in config or a setup file.
- `.oxlintrc.json`: AD-1 overrides exist for `src/lib/**`. Add the restricted-syntax rule globally with an override exempting `src/lib/dates.ts` and `src/lib/format.ts`. Probe it in `lint-boundaries.node.test.ts`.
- `src/design-literals.node.test.ts`: reference pattern for a source-scan test, if oxlint cannot express the `new Date(` rule.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/money.ts` + test -- `assertCents`, `dollarsToCents(string)` (parse "25,056.00" → 2505600, `null` on invalid; used by the later MoneyInput) and `centsToDollars`.
- [x] `src/lib/dates.ts` + test -- Every export listed above, the branded types, and the TZ-safe construction.
- [x] `src/lib/format.ts` + test -- Every mode in the table, plus edge cases: 0, negative, less than $1k, ≥ $1M, rounding boundaries, and invalid-input throws.
- [x] `src/lib/format.ts` -- `maskAccountNumber(num, 'groups' | 'tail4')` per the Decisions.
- [x] `.oxlintrc.json` + `src/lint-boundaries.node.test.ts` -- The restricted date/Intl/toFixed rule with fail and pass probes.
- [x] `package.json` / vitest config -- A TZ matrix so the date tests run under the three TZ values.

**Acceptance Criteria:**
- Given each row of the format table, when called, then the exact string is returned.
- Given `TZ=Pacific/Kiritimati` and `TZ=America/Los_Angeles`, when the dates and format tests run, then they pass identically.
- Given a feature file calling `new Date()` or `Intl.NumberFormat`, when lint runs, then it fails.
- Given `npm run lint`, `npx tsc -b`, `npm test` and `npm run build`, then all pass.

## Implementation Notes

- **TZ matrix:** `vitest.config.ts` uses vitest `projects`: `unit` (all tests, jsdom, host zone) plus one `tz:<zone>` project per zone (UTC, America/Los_Angeles, Pacific/Kiritimati, America/Santiago for a DST start that skips local midnight, Asia/Kolkata for a half-hour offset). Each reruns `src/lib/**/*.test.ts` in node with `env: { TZ, FINBANK_TZ_MATRIX }`. `npm test` runs every project and `npm run test:tz` runs only `tz:*`. No `cross-env` is needed. A sentinel test (skipped in `unit`) checks the zone really applied, using its 2023-05-19 offset.
- **Lint ban:** `no-restricted-globals` bans every use of `Date` and `Intl` as values, not only `new Date(` with arguments. `no-restricted-properties` bans `toFixed`, `toLocaleString`, `toLocaleDateString`, `toLocaleTimeString` and `globalThis`/`window`/`self` `.Date`/`.Intl`. Both rules apply everywhere, tests included, except `src/lib/dates.ts` and `src/lib/format.ts`. Using `Date` as a type is allowed. `isoDateOf(date)` converts a `Date` (e.g. an adapter's real-clock "now") to its local `IsoDate`.
- **Date formats (assumed; the examples are ambiguous):** `row` is `d MMM yyyy` ("5 May 2023"), `badge` is `MMM d` ("Jun 5"), and `header` is `MMMM d, yyyy` with the full month name ("June 5, 2023"). `axisDay` (`MMM dd`), `weekday` (`dd EEE`) and `formatRange` (`dd MMM`) are zero-padded. Check these against the PNGs.
- **Rounding:** `formatMoney(…, 'whole')` rounds half away from zero (-150 cents gives `-$2`) and never prints `-$0`.
- **`groups` mask:** the visible digits are grouped in 3s and `****` follows straight after the last group with no space: `13345688681234` gives `133 456 886 8****`, and `12345678` gives `123 4****`.

## Spec Change Log

## Review Triage Log

Pass 1 (blind, edge-case, verification-gap). Verification-gap found no gaps; its injected UTC-midnight bug failed 32 tests under the LA zone.

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | No exported way to turn a `Date` into an `IsoDate`, so a real-clock adapter can't get today without breaking lint (blind) | medium | `fromDate` is private and `Date` is banned in `src/api/**`. | patch |
| 2 | The lint message references a nonexistent helper (blind) | low | It mentions `useToday`/lib helpers that do not exist yet. Direct reword. | patch |
| 3 | Ban bypass via `toLocale*String` and `self.Date`/`self.Intl` (blind + edge-case) | medium | These are absent from `no-restricted-properties`. Locale formatting would drift from FR-34 undetected. | patch |
| 4 | `dollarsToCents(null/undefined)` throws (blind + edge-case) | low | `.trim()` on a non-string. Breaks the documented `null` contract. | patch |
| 5 | The TZ matrix lacks DST-skipped-midnight and half-hour zones; the sanity test passes vacuously in `unit` (blind) | medium | No assertions run when `FINBANK_TZ_MATRIX` is unset. UTC/LA/Kiritimati never skip midnight. | patch |
| 6 | Implementation Notes are empty (blind) | low | The non-obvious choices are unrecorded. Fix appends agent-owned notes and does not alter the spec. | patch |
| 7 | Historical zone-skip dates (Kiritimati 1994-12-31) are rejected or dropped (edge-case, incl. claim) | low | Real, but only for decades-old skipped days. Mock data is 2022–2023. A fix needs arithmetic validation. | reject |
| 8 | Year 0001/9999 overflow in `addMonths`/`weekOf`/`selectableMonths` (edge-case) | low | Unreachable from app dates. | reject |
| 9 | `formatCompact` ≥ $1B prints `1000M`; untested edge (blind + edge-case) | low | No account approaches $1B. | reject |
| 10 | Rounding near `MAX_SAFE_INTEGER` (edge-case) | low | Unreachable for real cents values. | reject |
| 11 | `whole` rounds half away from zero, not half-up, for negatives (edge-case claim) | low | FR-34 amounts are unsigned. Recorded in Implementation Notes. | reject |
| 12 | `centsToDollars` returns a float (blind) | low | No consumer yet. MoneyInput's story owns the display contract. | reject |
| 13 | `maskAccountNumber` throws on hyphens and shows a full 4-digit number (blind) | low | Seed numbers are digit strings by design. Strictness is intentional. | reject |
| 14 | Double validation in `formatDate`/`formatRange` (blind) | low | Negligible cost. No defect. | reject |
| 15 | `currentMonth` aliases `yearMonthOf` (blind) | false | The spec names both. No harm. | reject |
| 16 | No lint carve-out for tests/config (blind) | low | Intentional: tests use lib helpers too. Probes pin it. | reject |
| 17 | `npm test` runs lib suites four-plus times (blind) | low | About 1s total. No CI yet. | reject |
| 18 | Spec/sprint status mismatch (blind) | false | Sprint status syncs to `review` at completion. | reject |

## Verification

**Commands:**
- `npm run lint` -- expected: exit 0
- `npx tsc -b` -- expected: exit 0
- `npm test` -- expected: all pass, including the lib tests under the TZ matrix
- `npm run build` -- expected: success
