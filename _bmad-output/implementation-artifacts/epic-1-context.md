# Epic 1 Context: Foundation: design system, app shell and sign-in

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Lay the foundation every later epic builds on. When it is done, users can sign up, log in (email/password or mock Google) and request a password reset on pixel-faithful auth screens, then land in the real app shell with its sidebar, top bar and user block. Underneath sit the pinned toolchain with lint-enforced layering, the design tokens, the shared UI primitives, the formatting and date helpers, and the swappable mock data layer. Later epics (accounts, spending, goals, settings) reuse all of these, so getting the conventions right here prevents drift across the whole app.

## Stories

- Story 1.1: Scaffold the project with the agreed starter and tooling
- Story 1.2: Design tokens, typography and brand assets
- Story 1.3: Form primitives: Button, inputs, checkbox and form status
- Story 1.4: Money, date and formatting helpers
- Story 1.5: Data layer foundation: port, mock adapter and session
- Story 1.6: Routing, session guard and Login screen
- Story 1.7: Signup and Forgot Password screens
- Story 1.8: App shell: sidebar, top bar, user block and logout
- Story 1.9: Card, async states, Modal and ConfirmDialog primitives

## Requirements & Constraints

- **Auth is simulated:** any well-formed email and password succeeds. Signup needs Name, Email and Password, with no email verification. Forgot Password shows an inline confirmation after submit. "Continue with Google" is a mock login. Success always goes to Overview (`/`).
- **"Keep me signed in"** is checked by default. When checked, the session survives reloads. When unchecked, it lasts for the tab only.
- **Validation:** every form checks required fields and email format and shows inline errors in the danger colour. No submit happens while errors exist.
- **Route guard:** with no session, every app route redirects to Login. Logout clears the session and the query cache, then goes to Login.
- **Shell:** seven nav items in the order Overview, Balances, Transactions, Bills, Expenses, Goals, Settings, each with active, default and hover states. Account Details highlights Balances. "View profile" goes to `/settings?tab=account`. The kebab menu, bell, search and ">>" icon are visible but inert. The top bar shows mock today as "May 19, 2023".
- **Inert links:** "terms of service." on Signup does nothing.
- **Fidelity:** at 1440×1024, screens match the Figma PNG exports in `design-reference/` (2× scale) within 2px, using exact colour tokens and the Inter type scale. Desktop only, 1280px and wider. No responsive layouts.
- **Accessibility:** everything is keyboard-reachable with a visible focus ring. Every input has a linked label. Modals trap focus, close on Esc, and return focus to the element that opened them. Charts (later epics) need a text summary.
- **Swappable data:** components never import mock data. They use only the provider and hooks.
- **Default states:** a muted empty line, a skeleton while loading, inline danger-colour error text, and a short inline success confirmation.

## Technical Decisions

- **Stack (pinned exactly):**
  - create-vite 9.3.4 `react-ts`, React 19.3.1, TypeScript ~7.0.2, Vite 8.3.8, @vitejs/plugin-react 6.3.0
  - Tailwind 4.3.5 via `@tailwindcss/vite`
  - react-router 8.5.1, @tanstack/react-query 5.107.1, recharts 3.10.1
  - react-hook-form 7.92.0, zod 4.6.7, @hookform/resolvers 7.0.6
  - date-fns 4.4.0, lucide-react 1.73.0, oxlint ^1.90.0
  - vitest 5.1.0, jsdom 31.0.1, Testing Library (react 16.3.3, dom 10.4.2, jest-dom 7.0.1)
  - `.nvmrc` is `24`; `engines.node` is `>=22.22`
- **Layers:** `src/app`, `features/<area>`, `ui`, `api`, `lib`, `styles`, `assets/brands`. Allowed imports: app → features/api/ui; features → ui/api/lib; ui → lib (and `import type` from `api/types` only); api → lib. Features import each other only through `index.ts`. Only `app` and `api` itself touch `api/mock` and `api/http`. Enforced in `.oxlintrc.json` with `no-restricted-imports`, `import/no-cycle` and `react-hooks/exhaustive-deps` as errors. `tsconfig` sets `"strict": true` explicitly.
- **Data port:** `FinbankApi` lives in `api/port.ts`. Domain types (`ApiError { code, message, fieldErrors? }`, `Session`, `UserProfile`, `IsoDate`, `YearMonth`) live only in `api/types.ts`. Epic 1 methods: `getToday`, `login`, `loginWithGoogle`, `signup`, `logout`, `requestPasswordReset`, `getSession` and `getProfile`. Adapters throw only `ApiError`.
- **Composition:** `app/providers.tsx` creates exactly one adapter from `VITE_API_MODE` (`mock` by default). `ApiProvider`, `QueryClientProvider` and `SessionProvider` are the only app-wide providers. The http adapter implements the whole port and throws `NOT_IMPLEMENTED`. No global state library.
- **Mock adapter:** seeded from `api/mock/seed.ts` (user Tanzir Rahman, mock today `2023-05-19`). It writes through to `localStorage` key `finbank:mock:v1` and falls back to the seed when that value is missing or corrupt. Each response waits about 200 ms.
- **Session:** `Session` is `{ userId, persistent }`, stored under `finbank:session` in `localStorage` (persistent) or `sessionStorage` (not). The shell gets name and avatar from `useProfile()`, never from the session.
- **Query layer:** reads use `useQuery`, writes use `useMutation`, and all hooks live in `api/hooks/` (`useToday`, `useSession`, `useProfile`). Hierarchical keys come from the `qk` factory in `api/queryKeys.ts`. Mutations invalidate only through `invalidationMap`; for now `login` and `logout` clear the whole cache. Query data is never copied into state, except as form defaults.
- **Dates and money:** `lib/dates.ts` is the only module that parses dates or does date arithmetic (date-fns, `weekStartsOn: 0`). It owns `currentMonth`, `monthRange`, `weekOf` and `selectableMonths`, and `2023-05-19` must parse to 19 May in every time zone. Features never call `new Date()` or `Date.parse`. All amounts are integer cents.
- **Formatting:** all display formatting goes through `lib/format.ts`: `formatMoney` (`whole`/`exact`), `formatCompact` (`gauge`/`axis`), `formatPercent`, `formatDate` (`row`/`badge`/`header`/…), `formatRange` and `maskAccountNumber` (`groups`/`tail4`). No direct `Intl` or `toFixed` in components.
- **Tokens:** colours, font, type scale, radii, shadow and focus ring are defined once in `styles/tokens.css` under Tailwind v4 `@theme`. Colours read from JavaScript (for charts later) go under `@theme static`. Hex literals and arbitrary colour or font-size utilities are not allowed outside `tokens.css`.
- **Primitives:** they live in `src/ui`, and a new look is added as a variant, never a local restyle. Epic 1 builds `Button` (`primary`, `outline`, `text`, `google`), `TextInput` (with a `borderless` variant), `PasswordInput`, `Checkbox`, `FormStatus`, `Card`, `Skeleton`, `EmptyState`, `AsyncSection`, `Modal` and `ConfirmDialog`. Inputs require a `label` and accept an `error` linked by `aria-describedby`. Icons come through the single map in `ui/icons.ts`, which uses lucide-react. Primitives needed by only one later screen (tables, tabs, charts, carousel and so on) are built in that screen's epic.
- **Async cards:** every query-backed card renders through `AsyncSection` (`query`, `isEmpty`, `children`). It shows a skeleton while loading, an empty line when empty, and a danger message with a Retry that calls `refetch` on error.
- **Modals:** they portal into `#content-overlay-root` inside the shell's content column, so the dim covers only that column. The sidebar and top bar are `inert` while a modal is open.
- **Routing:** `app/router.tsx` holds one `createBrowserRouter` table. Public routes: `/login`, `/signup`, `/forgot-password`. A `RequireSession` layout route renders `AppShell` over `/`, `/balances`, `/balances/:accountId`, `/transactions`, `/bills`, `/expenses`, `/goals` and `/settings`. Paths come only from the `routes` constants. The active nav item matches the first path segment. `RequireSession` waits for `useToday()` before rendering. App routes show placeholder pages until their epic.
- **Forms:** react-hook-form with a zod schema in the feature's `schemas.ts` and `zodResolver`. `ApiError.fieldErrors` map to `setError`. Success messages use `FormStatus`.
- **Conventions:** components are `PascalCase.tsx`, one per file; hooks are `useThing.ts`; tests sit next to the code as `*.test.ts(x)`. A feature folder holds `index.ts`, `<Area>Page.tsx`, `components/` and optionally `schemas.ts`. UI copy is inline English.
- **Testing:** vitest unit tests for `lib/` and the mock adapter (seeding, persistence, corrupt-storage fallback, persistent vs session, the http stub). React Testing Library tests for forms, inputs, modals and async states. No end-to-end tests.

## UX & Interaction Patterns

- **Colours:** primary #299D91. Text and neutrals #191919, #525256, #666666, #878787, #9F9F9F, #E8E8E8 and #F3F3F3. Danger #E73D1C, positive #4DAF6E. On dark surfaces: white at 70% (inactive text), white at 8% (hover and Logout background) and #D2D2D2 at 25% (dividers).
- **Type:** Inter at weights 400–800. Size/line-height steps: 12/16, 14/20, 16/24, 18/24, 20/28, 22/32 and 24/28.
- **Surfaces:** page background #F3F3F3, white cards with about 8px radius and a soft shadow, sidebar #191919, and a focus-ring token. Card section titles sit above the card, with optional header actions.
- **Auth layout:** a single centred column about 385px wide on a light background. The teal "FINEbank.IO" wordmark sits at the top. Buttons are full-width primary. An "or sign in with" / "or sign up with" divider precedes the grey "Continue with Google" button. On Login, "Forgot Password?" is a teal link on the password label row.
- **Inputs:** the default border is #E8E8E8, filled or focused is #525256, and placeholder text is #9F9F9F. The password eye toggle switches between eye and eye-off. The checkbox is teal.
- **Shell:** sidebar about 270px wide with the white wordmark. Nav items have an icon and label; the active item is a teal pill with bold white text, and hover is white at 8%. The Logout button has a white-at-8% background. A divider sits above the user block (avatar, name, "View profile", kebab). The top bar has a bottom divider, the ">>" date, a bell with a teal unread dot, and a white "Search here" pill.
- **Brand assets:** official Google, Mastercard, VISA, Figma and Adobe SVGs go in `src/assets/brands/`. The wordmark is rebuilt as SVG or styled text, in teal and white variants, and matched to the PNGs. The avatar is a neutral placeholder. The repo has no Figma source; Figma exports can replace these assets later.

## Cross-Story Dependencies

- 1.1 comes first. 1.2 (tokens) and 1.4 (lib helpers) are prerequisites for the UI work. 1.3 depends on 1.2. 1.5 depends on 1.4 for its date types.
- 1.6 needs 1.3, 1.5 and the brand assets from 1.2. 1.7 reuses 1.6's auth layout, routes and form patterns.
- 1.8 needs 1.5 (`useProfile`, `useToday`, logout) and 1.6 (router and `RequireSession`), and it provides `#content-overlay-root` and the `inert` hook-in used by 1.9's `Modal`.
- Epics 2–5 extend the port, seed, `qk` and `invalidationMap`, replace the placeholder pages, and reuse every Epic 1 primitive. Epic 2 adds `ConfirmDialog` usage for account removal; Epic 5 depends on the `borderless` `TextInput` and `FormStatus`.
