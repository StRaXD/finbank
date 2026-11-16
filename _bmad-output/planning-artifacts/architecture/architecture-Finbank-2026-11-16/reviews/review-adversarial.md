---
title: 'Adversarial review: Finbank Frontend architecture spine'
target: ../ARCHITECTURE-SPINE.md
prd: ../../../prds/prd-Finbank-2026-11-16/prd.md
date: '2026-11-16'
method: 'Pairwise divergence: two units (epics, devs, agents) that each obey every AD literally yet build incompatibly'
---

# Adversarial Review: Finbank Frontend Spine

## Verdict

The spine is sound in shape (one port, one adapter owner, one query cache, one formatter, one route table), but it is **not yet build-safe for parallel work**. The port seed lets two endpoints own the same entities. One AD (AD-4) contradicts the PRD. Several "the caller chooses" points (month strings, chart units, formatting modes, pagination style) give two compliant agents room to produce incompatible code. Twelve holes are listed below. H1 to H4 should be closed before epics are cut. The rest are cheap tightenings.

Severity scale:
- **High:** a user-visible inconsistency or stale data across screens that violates FR-33.
- **Medium:** a likely rework or a visible bug in one flow.
- **Low:** friction that is unlikely to ship broken.

---

## H1 (High): `getOverview()` is a second owner of accounts, bills and transactions, so invalidation silently misses

**Pair:**
- **Unit A, the Balances epic** (FR-16 and FR-17) builds `useRemoveAccount`. Following AD-6, it declares the keys it invalidates: `qk.accounts()` and `qk.account(id)`.
- **Unit B, the Overview epic** (FR-10, FR-12 and FR-13) renders the carousel, Total Balance, Upcoming Bills and Recent Transactions from `useOverview()`. It does this because the port seed says `getOverview()` returns `totalBalanceCents, accounts, upcomingBills(2), recentTransactions(5)`.

Both units follow every AD. After a removal, the Overview carousel still shows the removed account and Total Balance is stale until the cache expires. If removing an account also removes its transactions, then `qk.transactions(*)` and the expense totals are stale too. Neither author did anything wrong: AD-6 lets each mutation pick its own keys, and nothing says which queries contain an entity.

The same thing happens with `useUpdateSavingsGoal`. If Overview's goal widget reads a goal embedded in `getOverview()` (the seed comment doesn't forbid adding one), the Goals team will invalidate `qk.savingsGoal(month)` only.

**Proposed rule (tighten AD-4 and AD-6):**
> Each entity has exactly one read path. Composite reads (`getOverview`) return **only aggregates that no list endpoint returns**, such as `totalBalanceCents` and `weeklyStats`. They never embed entity lists. Overview widgets use the entity hooks: `useAccounts()`, `useBills({ limit: 2 })` and `useTransactions({ limit: 5 })`.
>
> Query keys are hierarchical (`[entity, params?]`). `src/api/queryKeys.ts` also exports one `invalidates` table that maps each mutation to the key prefixes it affects. `removeAccount` affects accounts, account, transactions, overview and expenses. `updateSavingsGoal` affects savingsGoal and savingSummary. Mutation hooks read from this table instead of choosing keys themselves.

---

## H2 (High): `getExpenses(period)` mixes chart granularity with the breakdown period, and weekly data has two sources

**Pair:**
- **Unit A, the Expenses epic** (FR-21 and FR-22) calls `getExpenses('weekly')` when the user picks Weekly in the dropdown. The response bundles the comparison series with `CategorySummary[]`, so the dev reasonably shows week-scoped category totals under the weekly chart.
- **Unit B, the Overview epic** (FR-15) needs category tiles and calls `getExpenses('monthly')`. For FR-14 Weekly it uses `getOverview().weeklyStats`.

What breaks:
- FR-15 requires that "Tile values are identical to the Expenses Breakdown totals". This now holds only while Expenses is on Monthly.
- FR-21 requires that "the Weekly option shows the same data as Overview Statistics". This now depends on two adapter methods agreeing: `weeklyStats` and `getExpenses('weekly').series`.
- `'monthly'` is also misleading. It means a Jan–Dec chart comparing this year with last year. It does not mean "this month".

**Proposed rule (port shape, under AD-4):**
> Split the port into two methods:
> - `getComparison(granularity: 'week' | 'year')` returns the bar series only. It is the **single** source for FR-14 and FR-21 in both dropdown positions. `getOverview()` does not return `weeklyStats`.
> - `listCategorySummaries()` always covers the month that contains today and takes no period parameter. Overview tiles and Expenses cards both use it.
>
> The dropdown value is `'week' | 'year'` everywhere. The labels "Weekly" and "Monthly comparison" are presentation only.

---

## H3 (High): AD-4 says the adapter derives `achievedCents`, but FR-25 makes it user input

**Pair:**
- **Unit A, the mock adapter author**, follows AD-4 literally ("the goal's `achievedCents`" is an aggregate calculated in the adapter). They compute it from the seed, for example from net revenue minus expenses for the month, and ignore the incoming `achievedCents` in `updateSavingsGoal`.
- **Unit B, the Goals epic**, follows FR-25 and the port signature `updateSavingsGoal(month, { targetCents, achievedCents })`. Its modal saves "Present Amounts".

Result: the user saves Present = $9,000 and the gauge still shows the derived value. Both units are compliant, because the spine contradicts itself (AD-4 vs the port seed) and AD-4 contradicts the PRD.

A second risk: the gauge ratio (achieved ÷ target, capped at 100%) is itself a derived value. Under AD-4, the Goals widget and the Overview widget could each argue about who computes it.

**Proposed rule (amend AD-4):**
> `SavingsGoal.targetCents` and `SavingsGoal.achievedCents` are **stored values** that the user sets (FR-25). They are not derived. Derived goal values are computed only inside `GoalGauge`, from the `achievedCents` and `targetCents` props (ratio, cap and centre label), so every gauge renders identically.
>
> Saving Summary series are derived by the adapter. Whether their last point must equal `achievedCents` is stated in the adapter. `[decide: recommended no, they are independent]`

---

## H4 (High): "month" and "today" have no canonical form, and `useToday()` is asynchronous

**Pair:**
- **Unit A, the Overview Goals widget** (FR-11), derives the current month as `today.slice(0, 7)`, giving `'2023-05'`, and calls `useSavingsGoal('2023-05')`.
- **Unit B, the Goals epic** (FR-23), builds its period selector from date-fns month starts and calls `useSavingsGoal('2023-05-01')`. It invalidates `qk.savingsGoal('2023-05-01')` after saving.

The two widgets now use different cache entries. Editing on Goals does not refresh Overview, which is exactly what AD-6 says it prevents. Depending on how the adapter parses the string, they may even read different records.

Related divergences:
- **Selector range:** which months are selectable? A dev could choose 12 back from today, all of 2023, or only months that have a goal. FR-23 and FR-24 have two selectors that could differ.
- **Loading gap:** `useToday()` is a query, so it is `undefined` on first render. One dev gates with `enabled: !!today`. Another falls back to `format(new Date(), 'yyyy-MM')` "just while loading", which defeats AD-8 and flashes November 2026 data.
- **Time-zone shift:** `new Date('2023-05-19')` is parsed as UTC midnight, so in UTC− time zones it formats as 18 May. Nothing stops a feature or lib helper from parsing ISO dates this way. Doing so is not the "current date" that AD-8 bans.

**Proposed rule (tighten AD-8):**
> - A month is always `YearMonth = 'YYYY-MM'` (a branded type in `types.ts`). Every month-scoped port method and `qk` entry uses it.
> - `lib/dates.ts` owns `monthOf(iso)`, `monthRange(ym)` (giving first and last ISO day), `weekOf(iso)` (Sun–Sat) and `selectableMonths(today)`. The last one is the single rule for selector options, e.g. the 12 months ending at today's month.
> - `RequireSession` does not render `AppShell` until today has loaded (`staleTime: Infinity`), so `useToday()` returns a plain `string` and is never `undefined`.
> - ISO dates are parsed only in `lib/dates.ts`, as local calendar dates. `new Date(isoString)` is not allowed elsewhere.

---

## H5 (Medium-High): the user's identity has two owners, `Session` and `UserProfile`

**Pair:**
- **Unit A, the App Shell** (FR-8 and FR-9 greeting), reads the name and avatar from `SessionProvider`. That is the only app-wide context AD-7 allows, and the Session returned by `login`/`signup` naturally carries the user.
- **Unit B, the Settings epic** (FR-30 and FR-31), calls `useUpdateProfile`, which invalidates `qk.profile`.

FR-30 says the saved name and avatar must appear in the sidebar and the greeting. They don't, because the sidebar reads Session, which is not a query. AD-6 even forbids copying query data into context, so Unit A can't sync it either. Moreover, `finbank:session` (in localStorage or sessionStorage) and `finbank:mock:v1` would then both hold a name.

**Proposed rule (Auth convention):**
> `Session` holds `{ userId, persistent }` and nothing that is displayed. The name, email and avatar are always read through `useProfile()`, including in `AppShell`. `signup` writes the profile into `finbank:mock:v1`. `logout` calls `queryClient.clear()`.

---

## H6 (Medium): chart tick units: AD-15 ticks are in dollars, but values are in cents (AD-8)

**Pair:**
- **Unit A, the Expenses chart**, converts the series to dollars before calling `toPlot`. That matches the ticks, which AD-15 gives "in dollars".
- **Unit B, the Overview chart**, passes `…Cents` values straight to `ComparisonBarChart`, since AD-8 says every amount is cents. The primitive calls `toPlot` on cents.

One chart's bars are 100 times too tall and clamp at the top. Both units are compliant.

**Proposed rule (tighten AD-15):**
> Tick arrays and `toPlot` inputs are in **cents**, e.g. `[0, 200_000, 1_000_000, 5_000_000, 25_000_000]`. Chart primitives accept cents only and label ticks with `formatCompact`. The two tick arrays are exported constants from `lib/chartScale.ts` (`BAR_TICKS` and `SAVING_TICKS`). Callers do not pass literals.

---

## H7 (Medium): pagination style is unspecified, and AD-6 literally rules out `useInfiniteQuery`

**Pair:**
- **Unit A, the Transactions epic** (FR-19), reads AD-6 ("every read is a `useQuery` hook") literally. It implements Load More by raising the limit: `useQuery(qk.transactions({ kind, limit: 10 * n }))`.
- **Unit B, Account Details** (FR-18), uses the port's cursor contract. It keeps `nextCursor` in component state and concatenates the pages into a `useState` array. This is arguably "copying query data into state".

The result:
- two incompatible key shapes for the same entity, so H1's prefix invalidation has to match both
- two Load More behaviours on top of the shared `LoadMore` primitive
- for Unit A, the cursor port is unused

**Proposed rule (tighten AD-6 and the Port convention):**
> Paginated reads use `useInfiniteQuery` through one hook, `useTransactions({ kind?, accountId?, limit? })`. Its key is `qk.transactions({ kind, accountId })`, which never includes the cursor. `LoadMore` is driven by `hasNextPage` and `fetchNextPage`. Overview's "5 most recent" uses the same hook with `limit: 5` and the first page only.

---

## H8 (Medium): formatting choices left to the caller

AD-9 centralises the functions but leaves the semantics to callers. Each item below can diverge between two compliant units.

| Gap | Divergent pair | Minimal fix |
| --- | --- | --- |
| `formatCompact` is said to produce both "12K" and "$2k" | The gauge dev and the chart-axis dev each get one style, or each add a flag | `formatCompact(cents, 'gauge' \| 'axis')`: `'gauge'` gives "12K" (no $, capital K) and `'axis'` gives "$2k" |
| The `decimals` choice is left to the caller "per FR-34" | Overview tiles (category totals) vs the Expenses cards. Account Details balance (2 decimals) vs FR-18 "values match the card" (0 decimals) | Replace `decimals` with a semantic role: `formatMoney(cents, 'whole' \| 'exact')` plus a role table in `format.ts` comments (balance, card, bill, goal → whole; everything else → exact). Flag the FR-18 vs FR-34 tension to the PM. |
| Missing date modes | "May 2023" (FR-24 selector), "May 05" (FR-24 axis) and "14 Sun" (FR-14 axis) have no mode. Devs call date-fns `format` directly, which AD-9 does not forbid. | Add `'month'`, `'axisDay'` and `'weekday'` modes. Forbid date-fns `format` outside `lib/`. |
| `formatDate(iso, 'range')` takes one ISO date | "01 May ~ 31 May" needs a range, so one dev passes a month and another passes a start date | `formatMonthRange(ym: YearMonth)` |
| Percent has no formatter, and the `changePct` scale is undefined | The Overview tile treats `0.125` as a fraction; the Expenses card treats `12.5` as a percentage | `changePct` is in percentage points (12.5 means 12.5%). Add `formatPercent` to `format.ts`. `TrendIndicator` takes `changePct` and owns the arrow and colour (up → danger). |
| `maskAccountNumber` has no style, but the PRD says "masked in the style each screen shows" | The carousel and Balances show different masks | `maskAccountNumber(n, 'card' \| 'list')`, defined against the Figma frames |

---

## H9 (Medium): duplicate domain display components, which AD-1 makes worse

AD-1 forbids `ui/` from importing domain types. A component that takes an `Account`, `Transaction`, `Bill` or category must therefore live in a feature. AD-12 assigns a single owner only for `AdjustSavingsGoalModal`.

**Pairs:**
- **Account card:** the Overview carousel builds `AccountCard`, and Balances builds `AccountCard` too.
- **Transaction row:** the Overview widget and the Transactions table each build one, and so does Account Details.
- **Bill row:** the Overview widget and the Bills table.
- **Category metadata:** the Overview tiles, Expenses cards and Goals cards each define their own `ExpenseCategoryId → label / icon / order` map. FR-22 fixes the order; a mistake in one map is a silent fidelity bug.
- **Comparison card:** Overview's "Monthly" view (FR-14) must equal the Expenses chart, and Expenses' "Weekly" view must equal Overview. Each page builds its own card, with its own dropdown, around `ComparisonBarChart`.

**Proposed rule (generalise AD-12 into an ownership table):**
> A domain-bound component used by more than one feature is defined once, in the owning feature, and exported through that feature's `index.ts`:
>
> | Component | Owning feature |
> | --- | --- |
> | `AccountCard` | balances |
> | `TransactionRow` | transactions |
> | `BillRow` | bills |
> | `ExpenseComparisonCard` | expenses |
> | `AdjustSavingsGoalModal` | goals |
>
> Category metadata (`EXPENSE_CATEGORIES`: ordered ids, labels and icon names) is one constant in `src/api/types.ts`. Both the adapter and the UI use it. `CategoryIcon` takes the icon name, not the domain id.

---

## H10 (Low-Medium): removing an account from Account Details races with its own query

**Pair:**
- **Unit A, the `useRemoveAccount` hook** invalidates `qk.account(id)`. Invalidating triggers a refetch of the active detail query, and the mock throws, either `NOT_FOUND` or something improvised.
- **Unit B, the Account Details page** navigates to `/balances` in its own `onSuccess`, which runs after the hook's invalidation.

The page briefly renders the `AsyncSection` error state. A deep link to a removed id shows the generic error with Retry instead of a sensible fallback.

**Proposed rule:**
> - `getAccount` throws `ApiError{ code: 'NOT_FOUND' }` for an unknown id. The `ApiError.code` values are a closed union in `types.ts`.
> - `useRemoveAccount` *removes* (it does not invalidate) `qk.account(id)`.
> - The route component redirects to `routes.balances` on `NOT_FOUND`.
> - `routes` exposes builders for parameterised paths: `routes.accountDetail(id)` and `routes.settings({ tab })`.

---

## H11 (Low): the money-input contract between `MoneyInput` and the schemas

**Pair:** `MoneyInput` (in `ui/`) emits `NaN` for "abc" and `0` for an empty field. The Goals schema author expects `undefined` for empty. FR-28 requires empty values to show an error, but `0` passes `z.number().nonnegative()`.

**Proposed rule (AD-14):**
> `MoneyInput` emits `number | null`: integer cents, or `null` when the field is empty or can't be parsed. `lib/money.ts` exports `moneyCentsSchema` (non-null, ≥ 0, integer), and every money field uses it.

---

## H12 (Low): `listBills` vs the Overview "next two" ordering

If H1 is adopted (Overview uses `useBills({ limit: 2 })`), this hole closes automatically. If H1 is not adopted, `listBills` and `getOverview().upcomingBills` could sort or filter differently: by due date or by last charge, with or without past-due bills. That would break FR-20 ("same bill records").

**Proposed rule:** `listBills` returns only bills with a due date on or after today, sorted by due date ascending with the id as tie-break. Overview shows the first two of that list.

---

## Checked and not a hole

These look risky but can't realistically diverge under the current ADs:
- **Adapter selection:** AD-3 (single composition point) is tight.
- **Seed and persistence key:** AD-5 is tight. Its one gap: the persisted blob should carry a schema version (the `v1` in the key covers this) and a write that fails on quota should throw `ApiError` (FR-31 photo). This is mentioned, not raised.
- **Settings tab in the URL vs Transaction tabs local:** AD-7 is explicit.
- **Modal portal target and focus behaviour:** AD-12 is explicit.
- **Token usage:** AD-10 is enforceable by lint.
- **Active nav by first segment:** `/` (no first segment) vs `/balances/:id` → Balances. Fine, provided the implementation compares segments and doesn't use `startsWith('/')`. This is not worth an AD.

## Suggested order of fixes

1. **H3:** fix the AD-4 contradiction. It is one line.
2. **H1 and H2:** reshape the port seed (no embedded lists; split comparison and summaries), add the `invalidates` table, and make `qk` hierarchical.
3. **H4 and H6:** add `YearMonth`, the today gate, and cents-based ticks.
4. **H5, H7, H8, H9:** add the conventions-table rows. Each is a single sentence.
5. **H10 to H12:** fold them into the relevant ADs when convenient.
