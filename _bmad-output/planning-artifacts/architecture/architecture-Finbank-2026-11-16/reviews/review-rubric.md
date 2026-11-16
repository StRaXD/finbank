# Review: Architecture Spine — Finbank Frontend (rubric + PRD reconcile)

- **Spine:** `../ARCHITECTURE-SPINE.md` (status: draft, 2026-11-16)
- **Driving PRD:** `prds/prd-Finbank-2026-11-16/prd.md` + `addendum.md`
- **Reviewer stance:** build substrate for devs and AI agents implementing epics; judge divergence control, enforceability, coverage, envelope, bloat.

## Verdict

**Sound, lean, and close to ready. Fix two high findings before epics start.** The paradigm (feature slices + one port + one adapter composition point) fits the PRD. AD-2/3/4/5/8/9/10/12/13/16 map directly onto the PRD's cross-cutting requirements (NFR-4, FR-33, FR-34, FR-35, FR-25 overlay, FR-29 URL tab). The gaps are where two screens show *the same data* through *different port calls* (Overview vs Expenses, Overview vs Goals after a mutation), plus a few data-shape conventions (liability sign, date parsing, avatar storage) that each unit would otherwise invent on its own.

| Severity | Count |
| --- | --- |
| Critical | 0 |
| High | 2 |
| Medium | 8 |
| Low | 10 |

---

## Part A — Rubric

### A1. Divergence points fixed / missed

Fixed well: dependency direction (AD-1), single data path (AD-2), adapter choice (AD-3), aggregate ownership (AD-4), single mock state + storage key (AD-5), server-state cache (AD-6), URL vs local state (AD-7), money/date/today representation (AD-8), formatting (AD-9), tokens (AD-10), primitives (AD-11), modal placement + single goal modal (AD-12), routes (AD-13), forms (AD-14), chart scale (AD-15), async states (AD-16).

Missed divergence points:

**[HIGH] H1 — Same series reachable through two port calls (FR-14 ↔ FR-21, FR-15 ↔ FR-22).**
*Location:* Structural Seed, port `getOverview()` (`weeklyStats`) and `getExpenses(period)`; AD-4.
FR-14 says the Overview Monthly option "shows the same chart as Expenses"; FR-21 says Expenses Weekly "shows the same data as Overview Statistics"; FR-15 says tile values "are identical to" the Expenses Breakdown totals. The port exposes weekly data twice (`getOverview().weeklyStats` and `getExpenses('weekly')`) and does not say where Overview's six tiles come from (not in the `getOverview` comment). Two teams will wire Overview to different calls, and the adapter will have two code paths computing the same series/totals.
*Fix:* Add to AD-4 (or a new AD): "Each comparison series and each category summary has exactly one port method. Overview Statistics and the Expenses chart both call `getComparison(period: 'weekly'|'monthly')` (rename of `getExpenses` series part); Overview tiles and Expenses cards both call `getCategorySummaries(month)`. `getOverview()` does not carry `weeklyStats` or category totals." Same hook, same query key, same cache entry.

**[HIGH] H2 — Mutation invalidation is left to each hook author (FR-25, FR-17, FR-30).**
*Location:* AD-6 ("Each mutation declares in its own hook which keys it invalidates").
The rule says *who* declares invalidation, not *what* must be invalidated, so it does not actually prevent the stated divergence ("Overview goal not updating after a Goals edit"). Concrete PRD obligations: FR-25 Save must refresh the Goals card, gauge **and Overview widget**; FR-17 remove must refresh Balances, Overview carousel, Total Balance, Transactions (if cascaded) and Account Details; FR-30 must refresh the sidebar user block and Overview greeting.
*Fix:* Put an invalidation table in `queryKeys.ts` and the spine — e.g. `updateSavingsGoal → [qk.savingsGoal(month), qk.overview]`, `removeAccount → [qk.accounts, qk.account(id), qk.overview, qk.transactions, qk.categorySummaries]`, `updateProfile → [qk.profile]`. Or, simpler for a mock v1: every mutation invalidates `qk.all` (the root key). Either is enforceable; "declare your own" is not.

**[MEDIUM] M1 — Liability sign convention for Total Balance (FR-10).**
*Location:* AD-4, AD-8, domain type `Account`.
AD-4 says `totalBalanceCents` = assets − liabilities, but nothing says how a Credit Card / Loan balance is stored. If one seed author stores loans as negative cents and the adapter also subtracts, the total double-negates; card display (FR-16, FR-34 "no sign") also depends on it.
*Fix:* AD-8 addendum: "`Account.balanceCents` is always non-negative. `Account.type` determines asset/liability (`isLiability(type)` in `lib/money.ts`); only the adapter applies the sign."

**[MEDIUM] M2 — ISO date parsing and time zone.**
*Location:* AD-8.
`new Date('2023-05-19')` parses as UTC midnight and formats as May 18 west of UTC. AD-8 bans `new Date()` for *today* only in *features*; `lib/format.ts` and the adapter will still parse ISO strings, and the Sun–Sat week (FR-14) is computed from them.
*Fix:* "ISO dates are parsed only via `parseIsoDate` in `lib/dates.ts` (date-fns `parseISO`, local time). Week start is Sunday (`weekStartsOn: 0`) and is defined once in `lib/dates.ts`."

**[MEDIUM] M3 — FR-14 future-day rule has no owner.**
*Location:* AD-4 / AD-8.
"Days after mock today have no This week bar" — chart primitive, feature, or adapter? Same question for FR-24 "This month" line after mock today.
*Fix:* AD-4: "Series points after today are `null` in the port response; chart primitives render `null` as no bar / line gap."

**[MEDIUM] M4 — Removing an account: what happens to its data (FR-17, FR-33).**
*Location:* AD-4/AD-5.
Do the account's transactions disappear from Transactions, Overview recent list and category totals? Different answers yield different numbers on different screens — exactly what FR-33 forbids.
*Fix:* One line in AD-5: "`removeAccount` cascades: the adapter removes the account's transactions; all aggregates are recomputed from the remaining seed state." (Or explicitly "transactions remain" — either, but decide.)

**[MEDIUM] M5 — Profile identity source (FR-8, FR-9, FR-30).**
*Location:* AD-7, Auth convention.
`SessionProvider` holds a `Session`. If `Session` carries name/avatar, the user block and greeting will read it from context and won't update after `updateProfile` (and it violates AD-6's "never copy query data into context").
*Fix:* "`Session` holds only `{ userId }` (and a token later). Name, avatar and greeting read `useProfile()`."

**[MEDIUM] M6 — Avatar persistence format (FR-31, FR-33).**
*Location:* Port `updateProfile(i: ProfileInput)`, AD-5.
Not stated whether `ProfileInput` carries the image, nor in what form. Object URLs don't survive reloads; a full-size data URL can blow the ~5 MB `localStorage` quota and make the whole `finbank:mock:v1` write fail.
*Fix:* "`ProfileInput.avatar` is a data URL, downscaled client-side to ≤ 256 px before submit; the mock adapter stores it inside `finbank:mock:v1`; a quota error surfaces as `ApiError{code:'STORAGE_FULL'}`."

### A2. Is each Rule enforceable, and does it prevent its divergence?

**[MEDIUM] M7 — Enforcement mechanism is not named for the import/literal bans.**
*Location:* AD-1, AD-2, AD-8, AD-9, AD-10; Conventions "Lint and types".
These rules are mechanically checkable but only `oxlint` + `tsc` are named, with no rule config. An AI agent will not self-police "no `Intl`", "no `bg-[#…]`", "no `new Date()` in features", "only `app` imports adapters".
*Fix:* One convention row: "Rules AD-1/2/8/9 are enforced by `no-restricted-imports` / `no-restricted-syntax` (oxlint or ESLint boundaries config) per directory; AD-10 by a grep check in CI/pre-commit for `\[#` and `text-\[\d`." Keep it to a list of patterns.

Other per-AD notes:

- AD-6 vs pagination **[LOW] L1:** "Every read is a `useQuery` hook" conflicts with Load More (FR-18/FR-19), which naturally needs `useInfiniteQuery`. *Fix:* "`useQuery` or `useInfiniteQuery` (paginated lists)"; query key includes `kind`/`accountId` so tab switch resets pages.
- AD-9 **[LOW] L2:** `formatCompact` must produce two styles ("12K" gauge vs "$2k" axes, FR-34) and `maskAccountNumber` must cover "the style each screen shows". One signature can't do either without a parameter. *Fix:* `formatCompact(cents, { currency: boolean, case: 'upper'|'lower' })` or two named functions; `maskAccountNumber(n, style)`.
- AD-15 **[LOW] L3:** ticks are stated in dollars while all data is cents (AD-8), and the FR-21 ">$250k clamps to top" rule isn't in the Rule. *Fix:* state ticks in cents (or "`toPlot` takes cents") and add "values above the last tick clamp".
- AD-12 **[MEDIUM] M8 — NFR-3 accessibility gaps** (see Part B too): with the overlay covering only the content column, the sidebar stays clickable/focusable unless made `inert`; the rule says "traps focus" but doesn't say what happens to the undimmed shell. *Fix:* "While a Modal is open, `AppShell` sets `inert` on sidebar and top bar."
- AD-11 **[LOW] L4:** capabilities without a primitive: carousel (FR-10), confirm dialog (FR-17), avatar upload box (FR-31), a line chart (FR-24 is listed as `ComparisonAreaChart` — fine if intentional). *Fix:* add `Carousel`, `ConfirmDialog` (built on `Modal`), `FileDrop`; or loosen the list to "includes at least".

### A3. Can anything under Deferred let two units diverge?

Mostly no — all deferred items sit behind the port or outside v1. One small risk:

- **[LOW] L5 — Hosting deferred, but `createBrowserRouter` needs SPA fallback.** Deep links (`/settings?tab=security`, `/balances/:id`) 404 on a naive static host, and a sub-path deploy needs Vite `base` + router `basename`. *Fix:* add to Deferred: "Any host must rewrite unknown paths to `index.html`; `base` defaults to `/`."
- http adapter "auth tokens" deferred is fine because `Session` is behind `SessionProvider` — provided M5 is adopted.

### A4. Capability coverage

All FR-1..35 and NFR-1..4 map to an area (Capability map is complete). Thin spots:

- **[LOW] L6 — FR-4 Google sign-in** has no port method; teams will either call `login` with fake creds or add `loginWithGoogle`. *Fix:* add `loginWithGoogle(): Promise<Session>` to the seed port (mock = same as login).
- **[LOW] L7 — FR-35 success confirmation** for forms (FR-3, FR-30, FR-32) has no shared component; AD-16 covers queries only. *Fix:* one line: forms show success via `FormStatus` primitive in `ui/`.
- FR-13 recent-transactions tabs — see Part B R6.

### A5. Dimensions owned by this altitude (incl. operational envelope)

| Dimension | Status |
| --- | --- |
| Deployment / hosting | Deferred (static host) — add SPA fallback note (L5) |
| Environments | Decided: local dev/preview, mock mode only |
| Providers / external API | Deferred (http adapter) — adequate |
| Config / secrets | Decided: `VITE_API_MODE`, `VITE_API_BASE_URL` |
| Testing strategy | **Under-decided [LOW] L8:** only naming is fixed. Say what must be tested (e.g. `lib/*` and mock adapter aggregates unit-tested; one RTL smoke test per page). |
| Browser support | Not stated **[LOW] L9:** one line ("evergreen desktop Chrome/Edge/Firefox/Safari, last 2") since `inert`, `@theme`, etc. depend on it. |
| Observability, i18n, responsive | Deferred with reason — fine |
| Stack versions | Decided. **[LOW] L10:** TypeScript `~7.0.2` (native compiler) — confirm `tsc -b` project references and editor tooling work in the starter; otherwise pin 5.x/6.x. Not verified by this review. |
| Mock data versioning | `finbank:mock:v1` — implicit rule "bump the key when seed shape changes" worth one clause in AD-5 (folded into L10 note? no — trivial, not counted). |

### A6. Bloat

Low overall; the spine is close to minimal. Candidates to trim:
- The `erDiagram` adds little beyond the Domain types row and the glossary; keep only if epics reference it.
- The deployment `graph LR` restates AD-3 and Deferred.
- AD-11's exhaustive primitive list is borderline (it's a design-system inventory), but it does prevent per-feature restyling; acceptable — convert to "at least these" to avoid it becoming stale (L4).
- AD-15 repeats PRD tick values; fine, it is load-bearing for agents.

---

## Part B — Reconcile PRD/addendum against the spine

| # | PRD item | Spine | Status |
| --- | --- | --- | --- |
| R1 | **FR-33 persistence** (removed accounts, goal/limit edits, profile, photo, session; clearing storage restores seed) | AD-5 (`finbank:mock:v1`, seed fallback), Auth convention (`finbank:session`) | Covered. Gaps: photo format/quota (M6), remove cascade (M4). |
| R2 | **FR-34 formatting** (no-decimal list, two-decimal list, date formats, "12K"/"$2k", masking per screen, no sign/colour) | AD-9 | Covered; caller-chosen decimals acceptable. Compact/mask parameterisation gap (L2). "No sign or colour" relies on M1 for liabilities. |
| R3 | **FR-35 states** (empty muted line, skeleton, inline form error #E73D1C, inline success) | AD-16, AD-14 | Loading/empty/error-on-query covered. Inline success not covered (L7). Note: AD-16 adds "retry" on error — harmless extension. |
| R4 | **FR-25 overlay** (content area only, shell undimmed; Esc/overlay click close; prefilled; refresh card+gauge+Overview) | AD-12, AD-6 | Overlay and single modal covered. Refresh of Overview depends on H2. Shell `inert` (M8). |
| R5 | **FR-29 URL tab** (`View profile` deep-link) | AD-7 `?tab=account\|security`, AD-13 | Covered. Add `routes.settings({tab})` helper so FR-8 link uses it — minor, not counted. |
| R6 | **FR-13 recent transactions tabs** | `getOverview().recentTransactions(5)`, AD-7 local tab | **Ambiguous** (counted under H1's family? no — separate, LOW-ish, folded into A4): filtering 5 mixed rows client-side can show 1 Revenue row; fetching 5 per kind needs `listTransactions({kind, limit:5})`. Decide: use `listTransactions({kind, limit: 5})` and drop `recentTransactions` from `getOverview`. (Included in H1 fix scope: Overview should reuse list endpoints rather than carrying copies.) |
| R7 | **FR-14 week rule + mock today** (Sun–Sat week containing 2023-05-19; no This-week bars after today) | AD-5 anchors seed to 2023-05-19; AD-8 `useToday()` via `getToday()` | Mock today covered. Week start and future-day handling unowned (M2, M3). |
| R8 | **FR-21/FR-14 shared bar scale; FR-24 scale** | AD-15 | Covered; cents/clamp (L3). |
| R9 | **NFR-3 accessibility** (keyboard reachable, visible focus, modal trap + Esc, labelled inputs, **chart text alternatives**) | AD-12 (modal), AD-11 binds NFR-3 | Partially covered. **Chart text alternative is dropped** and visible focus/label requirements aren't in any Rule. Folded into M8: add "every chart primitive requires a `summary: string` prop rendered as accessible text; input primitives require `label`; focus ring is a token (`--focus-ring`) applied by every interactive primitive". |
| R10 | **Total Balance = assets − liabilities** (FR-10) | AD-4 | Covered as a rule; sign convention missing (M1). |
| R11 | **Load More page size 10** (FR-18, FR-19; hidden when none remain) | Port convention: `{cursor, limit}`, page size 10 | Covered. `nextCursor === null` hides button — implied; `useInfiniteQuery` wording (L1). |
| R12 | **Keep me signed in** (default checked; reload-safe vs tab-only) | Auth convention: `localStorage` vs `sessionStorage` under `finbank:session` | Covered. Note: `getSession()` must check both stores; logout must clear both — one clause. Not counted. |
| R13 | **FR-23/FR-24 month selectors** (calendar months anchored to mock today; goal per month) | Port `getSavingsGoal(month)`, `getSavingSummary(month)`; AD-7 local state | Covered, but **month key format unspecified** — AD-8 only defines `YYYY-MM-DD`. Add `YYYY-MM` month keys. (Low; counted with L3? — kept as part of M2 date-convention fix.) |
| R14 | **FR-28 money input** (non-negative, ≤2 decimals, `$`/separators stripped, Present > Target allowed) | AD-14 (`MoneyInput` → cents before validation) | Covered. |
| R15 | **FR-7 route guard** | AD-13 `RequireSession` | Covered. |
| R16 | **FR-6 Account Details highlights Balances** | AD-13 first-segment match | Covered. |
| R17 | **NFR-4 / SM-2 swappability** | AD-2, AD-3 | Covered. |
| R18 | **NFR-1 tokens from addendum** (colours, type scale, sidebar alphas, radii) | AD-10 | Covered. |
| R19 | **FR-26 non-goal: no limit vs spend comparison** | — | Nothing needed. |
| R20 | **FR-32 Security-tab phone read-only** | — | UI detail; reads `useProfile()` (M5). |

No PRD decision is **contradicted** by the spine. Dropped/under-specified items with architectural weight: chart text alternatives (R9), Overview data sourcing for FR-13/14/15 (R6, H1), cross-screen refresh after edits (R4, H2), liability sign (R10), avatar persistence (R1).

---

## Suggested edit list (in priority order)

1. H1: one port method per shared series/summary; Overview reuses them (and `listTransactions({kind, limit:5})` for FR-13).
2. H2: explicit invalidation map or root-key invalidation.
3. M1–M3: AD-8 additions — non-negative balances + `isLiability`, `parseIsoDate`, `weekStartsOn: 0`, `YYYY-MM` month keys, `null` for future points.
4. M4–M6: AD-5 additions — remove cascade, avatar data URL ≤256 px, `STORAGE_FULL`; `Session` = identity only.
5. M7: name the lint patterns.
6. M8: NFR-3 rule — chart `summary` prop, required `label`, focus-ring token, shell `inert` under modal.
7. Lows as convenient.
