# Review: Currency and reality-check of committed decisions

- **Spine:** `ARCHITECTURE-SPINE.md` (Finbank Frontend, draft, 2026-11-16)
- **Lens:** Was each committed decision checked against reality, or asserted from training data? Covers versions, whether each technology still exists and fits, and the live defaults of the starter.
- **Reviewed:** 2026-11-16
- **Spine edited:** No

## Verdict

**Pass, with three medium findings.** All 17 Stack versions match npm `latest` today. All API-fit claims compiled, built, linted and tested in a scratch project scaffolded from the real create-vite 9.3.4 `react-ts` template. The gaps are not about stale versions. They are live behaviours the spine relies on without stating them: Tailwind v4 removes theme variables that no utility uses (this breaks the AD-10 `chartColors` mechanism), the Node version floor is unstated, and no test environment is chosen.

## Method

1. `npm view <pkg> version` for every Stack row, plus the `dist-tags` for `typescript`.
2. `npm view <pkg>@<ver> peerDependencies engines` for every pinned version.
3. `npm pack create-vite@9.3.4` and unpacked `template-react-ts`. I read its `package.json`, `tsconfig.*.json`, `_oxlintrc.json`, `vite.config.ts` and `README.md`.
4. Built a scratch app from that template (Node v26.13.1) with every Stack package at its pinned version. Added `@tailwindcss/vite` and a probe file that uses each claimed API. Then ran:
   - `npm run build` (`tsc -b && vite build`)
   - `vitest run` (jsdom, with @testing-library/react)
   - `oxlint` with the starter config, plus a deliberately bad hooks file
5. Ran targeted probes: TS 7 strict default, Tailwind unused-token emission, and lucide icon names.

The scratch project is at `C:\Users\STRAHI~1.KOV\AppData\Local\Temp\claude\fe5b05880db43bf8\53545e9a-f5be-40e7-891a-d7c7a43a7890\scratchpad\app`.

## Version check (npm, 2026-11-16)

| Package | Spine | npm latest | Match |
| --- | --- | --- | --- |
| create-vite | 9.3.4 | 9.3.4 | yes |
| react / react-dom | 19.3.1 | 19.3.1 | yes |
| typescript | ~7.0.2 | 7.0.2 (`latest`; 7.1.0-beta also exists) | yes |
| vite | 8.3.8 | 8.3.8 | yes |
| @vitejs/plugin-react | 6.3.0 | 6.3.0 (starter range `^6.1.2`) | yes |
| tailwindcss / @tailwindcss/vite | 4.3.5 | 4.3.5 / 4.3.5 | yes |
| react-router | 8.5.1 | 8.5.1 | yes |
| @tanstack/react-query | 5.107.1 | 5.107.1 | yes |
| recharts | 3.10.1 | 3.10.1 | yes |
| react-hook-form | 7.92.0 | 7.92.0 | yes |
| zod | 4.6.7 | 4.6.7 | yes |
| @hookform/resolvers | 7.0.6 | 7.0.6 | yes |
| date-fns | 4.4.0 | 4.4.0 | yes |
| lucide-react | 1.73.0 | 1.73.0 | yes |
| vitest | 5.1.0 | 5.1.0 | yes |
| @testing-library/react | 16.3.3 | 16.3.3 | yes |
| oxlint | ^1.90.0 (starter range) | 1.94.0 (resolved by the range) | yes |

The author's claim is confirmed: every row is current. The starter's claims are confirmed too. The template's `package.json` pins `typescript: ~7.0.2`, `oxlint: ^1.90.0`, `vite: ^8.3.6` and `react: ^19.3.1`, and its `lint` script is `oxlint`.

## Peer and engine compatibility

| Package | Relevant peer / engine | Result |
| --- | --- | --- |
| @vitejs/plugin-react 6.3.0 | vite `^8.0.0`; node `^20.19 \|\| >=22.12` | OK. Its babel and compiler peers are optional. |
| @tailwindcss/vite 4.3.5 | vite `^5.2 \|\| ^6 \|\| ^7 \|\| ^8` | OK |
| react-router 8.5.1 | react/react-dom `>=19.2.7`; **node `>=22.22.0`** | OK with React 19.3.1. Sets the Node floor (F-2). |
| vitest 5.1.0 | vite `^6.4 \|\| ^7 \|\| ^8`; **node `^22.12 \|\| ^24 \|\| >=26`**; jsdom/happy-dom optional peers | OK. Environment unselected (F-3). |
| @tanstack/react-query 5.107.1 | react `^18 \|\| ^19` | OK |
| recharts 3.10.1 | react `^16.8…^19`, react-is | OK |
| @hookform/resolvers 7.0.6 | zod `^3.25 \|\| ^4`; react-hook-form `^7.55` | OK |
| @testing-library/react 16.3.3 | react `^18 \|\| ^19`; **@testing-library/dom `^10` (peer)** | OK. The peer needs installing (F-3). |
| lucide-react 1.73.0 | react `^16.5…^19` | OK |

## API-fit claims

| Spine claim | How checked | Result |
| --- | --- | --- |
| AD-13: react-router 8 `createBrowserRouter`, pathless layout route (`RequireSession` → `AppShell`), `:accountId`, `NavLink`, `Navigate`, `useSearchParams` for `?tab=` | Probe compiled under `tsc -b` and bundled. `createBrowserRouter(routes: RouteObject[], opts?)` is exported from `react-router` with no `@deprecated` tag (`dist/development/lib/dom/lib.d.ts:525`). `npm view react-router readme` is empty, so the type declarations are the evidence. | **Confirmed** (compile and bundle; not exercised at runtime) |
| AD-10: Tailwind v4 `@theme` tokens with `@tailwindcss/vite` | `bg-primary`, `rounded-card`, `shadow-card`, `text-body`, `font-sans` were generated from the `@theme` tokens | **Confirmed**, but see F-1 |
| AD-6: TanStack Query v5 `useQuery` / `useMutation` / `invalidateQueries({ queryKey })` | Compiled | **Confirmed** |
| AD-15: recharts 3 plots pre-transformed values with custom tick labels | `YAxis ticks={ticks.map(toPlot)} tickFormatter={(v, i) => …}` compiled against recharts 3 types. `BarChart`, `AreaChart` and `PieChart` (half-gauge angles) also compiled. | **Confirmed at type level.** The tick-label rendering was not inspected visually. |
| AD-14: zod 4 with `@hookform/resolvers` 7 `zodResolver`, `setError` | `useForm<z.input, unknown, z.output>({ resolver: zodResolver(schema) })` with `z.email()` and `setError` compiled. A zod 4 parse ran under vitest. | **Confirmed** |
| Icons convention: lucide-react 1.x | Nav and category names resolve (`House`, `Wallet`, `ArrowLeftRight`, `Receipt`, `Target`, `ShoppingBag`, `Car`, `Film`, `Utensils`, `Eye`/`EyeOff`, …). Brand icons do **not** exist (`Github`, `Chrome` and `Google` are all undefined). | **Confirmed**, with a note (F-5) |
| TypeScript 7 with Vite 8 and vitest 5 | `tsc -b` (TS 7.0.2 native) passed. Vite 8.3.8 built. Vitest 5.1.0 ran a jsdom and RTL test. Vite and vitest transpile with Oxc and do not load `typescript`. | **Confirmed** |
| "`strict` mode is on" | The starter `tsconfig.app.json` has **no `strict` key**. A probe with an implicit `any` and a nullable dereference failed `tsc -b` with TS7006 and TS18047, so strict is on **by default** in TS 7. | **True by default only** (F-4) |
| oxlint covers React hooks rules | Starter config sets `react/rules-of-hooks: error`. Against a bad file, oxlint 1.94 reported `react-hooks(rules-of-hooks)` as an **error** and `react-hooks(exhaustive-deps)` as a **warning** by default. It also reported `react(set-state-in-effect)`. `-D react/exhaustive-deps` raises it to an error. | **Confirmed.** Exhaustive-deps is a warning unless raised (F-4). |

## Findings

### F-1 (Medium): AD-10 `chartColors` from CSS variables breaks for tokens no utility uses

AD-10 says charts read colours from a `chartColors` map "which takes its values from the CSS variables". Tailwind v4.3.5 emits only the theme variables used somewhere.

**Probe:** a `--color-chart-unused` token in a plain `@theme` block was **absent** from the built CSS (0 occurrences). The same token under `@theme static` was present.

Chart-only colours are likely referenced only from JS, for example comparison-series colours or gauge track colours. Those would resolve to empty, through `getComputedStyle` or `var(--…)` in an SVG `fill`. The cause is not obvious, because the colour appears as soon as some unrelated component uses the matching utility.

**Fix:** In AD-10, require chart-referenced tokens to be declared in `@theme static { … }`, or declare all tokens that way. Add a unit test that every `chartColors` entry resolves to a non-empty value.

### F-2 (Medium): The Node floor is unstated; the stack requires Node ≥ 22.22

The engines are `react-router@8.5.1: node >=22.22.0`, `vitest@5.1.0: ^22.12 || ^24 || >=26` and `plugin-react: ^20.19 || >=22.12`. The effective floor is **Node 22.22+, or 24.x, or 26+**. Node 20 or early 22.x installs will warn or fail. Neither the spine nor the Stack table pins a Node version, and Deferred pushes CI and environments out.

**Fix:** Add a Stack row `Node | >=22.22 (24 LTS recommended)`. Add `engines.node` and an `.nvmrc` to the structural seed.

### F-3 (Medium): The test environment is not chosen, and a required peer is missing from the Stack

The Stack lists `vitest` and `@testing-library/react` but no DOM environment. `jsdom` and `happy-dom` are both optional peers of vitest 5. It also omits `@testing-library/dom`, a required peer of RTL 16. The create-vite starter ships neither vitest nor any of these, so "from the starter" covers none of the test stack. Tests next to `.tsx` components (the Consistency Conventions) cannot run without a DOM environment.

**Fix:** Add rows for `jsdom` (or `happy-dom`) and `@testing-library/dom`, with versions from `npm view` and optionally `@testing-library/user-event`. Add `vitest.config.ts` (`test.environment`) to the seed.

### F-4 (Low): "`strict` on" and "oxlint covers hooks" are true only through live defaults

- **Strict:** the TS 7 default makes this true today, but the starter tsconfig never says `strict`. An explicit `"strict": true` keeps the rule from depending on a compiler default.
- **Exhaustive-deps:** reported as a *warning*, and the starter's `lint` script does not fail on warnings. AD-6 and AD-8 depend on effects and hooks being correct, so a warning is weak enforcement.

**Fix:** In the Lint and types convention, state "`strict: true` set explicitly in `tsconfig.app.json`". Set `react/exhaustive-deps: error` in `.oxlintrc.json`, or run `oxlint --deny-warnings`.

Related, at lower priority: AD-1 and AD-2 import boundaries have no named enforcement. oxlint 1.94 provides `import/no-cycle` and `no-restricted-imports` (both present in its schema), which can enforce them with per-directory overrides. TypeScript 7.0.2 exports only `./unstable/*` JS APIs, with the `.` export returning just the version. Any future tool that needs the classic `typescript` JS API will not work against TS 7. That includes typescript-eslint, some dependency-cruiser modes, dts and docgen plugins. Keep enforcement in oxlint.

### F-5 (Low): lucide-react 1.x has no brand icons; the `google` Button variant needs a separate source

AD-11 defines a `google` Button variant. lucide-react 1.73.0 has no `Google`, `Github` or `Chrome` export (brand icons were removed in 1.x). The Icons convention covers category and nav icons only, so the Google logo has no defined source.

**Fix:** In the Icons convention, say that brand marks (the Google "G") come from an exported Figma SVG in `src/ui/`, not from lucide.

## Confirmed without findings

- Every Stack version is current, and every pinned set is mutually peer-compatible (tables above).
- create-vite 9.3.4 `react-ts` uses `tsc -b && vite build`, oxlint with the `react`, `typescript` and `oxc` plugins, and `@vitejs/plugin-react` (Oxc). It has no ESLint and no React Compiler.
- The `@tailwindcss/vite` plugin is not in the starter. Adding it to `vite.config.ts` works with Vite 8.3.8.
- A production build of all libraries in the probe gave one 848 kB chunk (Vite's >500 kB warning). This is informational: route-level `lazy` in the AD-13 route table would split it, but nothing in the spine needs to change.

## Not verified

- Runtime behaviour in a browser: router navigation, recharts rendering of the uneven-axis labels, and modal portals. Checks were compile, bundle, lint and one jsdom test.
- Whether lucide icons match the Figma glyphs closely enough for NFR-1. The spine already marks this `[ASSUMPTION]`.
