---
title: 'Story 1.5: Data layer foundation: port, mock adapter and session'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: '3db55ceef1e7dcaec040ab181f23b6830d025451'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Finbank-2026-11-16/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Screens need auth, session, today and profile data from one swappable source. Without the port, the mock adapter and the query layer, Stories 1.6–1.8 would read fixtures directly and block a later swap to a real API (AD-2/3).

**Approach:** Define the `FinbankApi` port and domain types, plus a mock adapter persisted to `localStorage`, an http stub, and the TanStack Query layer:
- `qk` keys, `invalidationMap` and hooks;
- `ApiProvider`, `QueryClientProvider` and `SessionProvider`, composed once in `app/providers.tsx`.

## Boundaries & Constraints

**Always:**
- **`api/types.ts`**: the only home of domain types.
  - It re-exports `IsoDate`/`YearMonth` from `lib/dates`.
  - It defines:
    - `ApiError` (a class with `code`, `message`, `fieldErrors?: Record<string,string>`)
    - `Session { userId; persistent }`
    - `UserProfile { fullName; email; username; phoneCountryCode; phoneNumber; avatarUrl: string|null }`
    - `LoginInput { email; password; persistent }`
    - `SignupInput { name; email; password }`
- **`api/port.ts`**: the `FinbankApi` interface, limited to `getToday`, `login`, `loginWithGoogle`, `signup`, `logout`, `requestPasswordReset`, `getSession` and `getProfile`. Later stories extend it.
- **Mock adapter** (`api/mock/mockApi.ts`, `createMockApi({ storage, sessionStores, delayMs = 200 })`):
  - **Seed:** seeds from `api/mock/seed.ts`:
    - today `2023-05-19`
    - user `usr_1`: Tanzir Rahman, tanzir.rahman@email.com, username tanzir.rahman, +880 51547 58868, no avatar
  - **Persistence:** writes state through to `finbank:mock:v1` as `{ version: 1, … }`. When the entry is missing, unparseable or the wrong version, it falls back to the seed. When top-level keys are missing, it fills them from the seed, so that later epics can extend the state.
  - **Delay:** every method awaits `delayMs`.
  - **Errors:** it throws only `ApiError`. Malformed email or an empty password/name gives `code 'VALIDATION'` with `fieldErrors`. A failed storage write gives `'STORAGE_FULL'`.
- **Session:**
  - `login({persistent:true})` stores `{userId:'usr_1', persistent}` under `finbank:session` in `localStorage`; `persistent:false` uses `sessionStorage`. Each write removes the key from the other store.
  - `loginWithGoogle` and `signup` create a persistent session.
  - `logout` clears both stores.
  - `getSession` reads `localStorage` first, then `sessionStorage`. Corrupt data returns `null`.
- **http stub** (`api/http/httpApi.ts`): implements the whole port. Every method rejects with `ApiError{code:'NOT_IMPLEMENTED'}`. It reads `VITE_API_BASE_URL`.
- **`api/queryKeys.ts`**: `qk` is a hierarchical factory (`qk.today()`, `qk.session()`, `qk.profile()`, each a readonly array). `invalidationMap` maps `login`, `loginWithGoogle`, `signup` and `logout` to `'all'`, which clears the whole cache.
- **`api/hooks/`**:
  - Queries: `useToday`, `useSession`, `useProfile`.
  - Mutations: `useLogin`, `useLoginWithGoogle`, `useSignup`, `useLogout`, `useRequestPasswordReset`.
  - Mutations invalidate only through `invalidationMap`. After a login-type mutation clears the cache, the session query re-reads.
  - Hooks get the adapter from `ApiProvider` context (`useApi()`), which throws outside the provider.
- **`app/providers.tsx`**: creates exactly one adapter from `import.meta.env.VITE_API_MODE` (`'mock'` by default, `'http'`, otherwise throw). It wraps children in `ApiProvider` → `QueryClientProvider` → `SessionProvider`. `main.tsx` uses it.
  - QueryClient defaults: `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`.
- **`SessionProvider`** lives in `api/` and is the only other app-wide context. It exposes nothing beyond the `useSession` query result. It never copies query data into state.

**Never:**
- No routes, guards or screens (Story 1.6).
- No domain data beyond today, session and profile (later epics).
- Nothing outside `src/api` imports `api/mock` or `api/http`, except `app/providers.tsx` (lint already enforces this).
- No global state library, and no `Date`/`Intl` (lint).

**Decision (human, 2026-11-16):** The mock is single-user. `signup`, `login` and `loginWithGoogle` always create a session for `usr_1` (Tanzir Rahman). The name and email entered at signup or login are validated, then discarded, and never written to the profile.

</frozen-after-approval>

## Code Map

- `src/api/.gitkeep`: replace it with `types.ts`, `port.ts`, `errors.ts` (optional), `queryKeys.ts`, `ApiProvider.tsx`, `SessionProvider.tsx`, `hooks/*.ts`, `mock/seed.ts`, `mock/mockApi.ts` and `http/httpApi.ts`.
- `src/lib/dates.ts`: re-export `IsoDate`, `YearMonth` and `toIsoDate` from here (Story 1.4). `api → lib` is allowed.
- `src/app/main.tsx`: currently renders `<App/>` directly. Wrap it in `<AppProviders>`. `App.tsx` (the specimen) stays as it is.
- `.oxlintrc.json`: the `src/api/**` override forbids app/features/ui. The base rule allows only `src/app` to import mock/http. `react` and `@tanstack/react-query` are fine.
- `vite-env.d.ts` or `src/env.d.ts`: type `VITE_API_MODE` and `VITE_API_BASE_URL` on `ImportMetaEnv`.
- Tests use jsdom `localStorage`/`sessionStorage`, injected through `createMockApi` options, with `delayMs: 0`.

## Tasks & Acceptance

**Execution:**
- [x] `src/api/types.ts`, `port.ts` -- Types and port as above.
- [x] `src/api/mock/seed.ts`, `mockApi.ts` + test -- Covers:
  - seeding;
  - persistence round-trip;
  - fallback on missing, corrupt or wrong-version storage;
  - top-level key backfill;
  - persistent vs session storage;
  - logout clearing;
  - validation errors;
  - `STORAGE_FULL` via a throwing storage stub;
  - the delay being honoured.
- [x] `src/api/http/httpApi.ts` + test -- Every port method rejects with `NOT_IMPLEMENTED`. The test iterates the method list so a new port method cannot be missed.
- [x] `src/api/queryKeys.ts` + test -- Key shapes and the map entries.
- [x] `src/api/ApiProvider.tsx`, `SessionProvider.tsx`, `hooks/*` + RTL tests -- `useToday`/`useProfile` resolve via the mock; `useLogin` then gives a non-null `useSession`; `useLogout` gives `null` and an empty cache; `useApi` outside the provider throws.
- [x] `src/app/providers.tsx`, `main.tsx`, env typing + test -- Adapter selection for `mock`, `http` and invalid.

**Acceptance Criteria:**
- Given a fresh browser, when the app starts, then exactly one mock adapter exists, and `useToday()` resolves `2023-05-19` after about 200 ms.
- Given `login({persistent:false})` and then a reload simulated by a new adapter over the same stores, when `getSession` runs, then the session is found in `sessionStorage` only. With `persistent:true` it is found in `localStorage`.
- Given `npm run lint`, `npx tsc -b`, `npm test` and `npm run build`, then all pass.

## Implementation Notes

- **Composition helpers live in `src/api`:** `createApi(mode)` (`api/createApi.ts`) and `createQueryClient()` (`api/queryClient.ts`). `app/providers.tsx` calls `createApi(import.meta.env.VITE_API_MODE)` and `createQueryClient()` once at module load, so it stays the only app module that composes an adapter, and no app module imports `api/mock` or `api/http`. An empty `VITE_API_MODE` counts as unset (mock). `.env.example` documents both env vars.
- **Session context:** `api/sessionContext.ts` holds `SessionContext` and `useSessionContext()`. It sits outside `SessionProvider.tsx` because `react/only-export-components` forbids non-component exports from `.tsx` files. The context value is the `useSession()` query result, unchanged. `useApi`/`ApiContext` live in `api/hooks/useApi.ts` for the same reason.
- **Error codes:** besides `VALIDATION`, `STORAGE_FULL` and `NOT_IMPLEMENTED`, there is `UNKNOWN`. It covers any non-`ApiError` failure inside the mock, including non-quota storage errors. Only quota errors (`QuotaExceededError`, `NS_ERROR_DOM_QUOTA_REACHED`, code 22/1014) map to `STORAGE_FULL`.
- **`'all'` invalidation:** `applyInvalidation` cancels in-flight queries, removes every inactive query, then resets and refetches every mounted query, resolving once those refetches settle. The query cache is left holding only the mounted queries, re-read under the new identity. The mutation cache is not cleared; `useLogin`/`useSignup`/`useLoginWithGoogle` use `gcTime: 0` so credentials do not linger. A failed mutation does not invalidate.
- **Storage resilience:** if reading `localStorage`/`sessionStorage` throws (storage disabled), the mock falls back to an in-memory `StorageLike`. On reads, a failed write-back of seeded or repaired state is swallowed and the state is kept in memory. Writes the caller asked for (session writes) still reject.
- **Stored-state repair:** a wrong-version entry is reseeded, not migrated. In a v1 entry, missing or `null` top-level keys are backfilled from the seed. `today` must pass `toIsoDate`. `profile` fields are merged over the seed profile, with each field type-checked. Repaired state is written back.
- **Session:** `getSession` returns `parseSession(local) ?? parseSession(session)`, so a corrupt local entry does not mask a valid tab session. A session whose `userId` is not `usr_1` reads as `null`.
- **`getProfile` does not require a session.** Guarding is Story 1.6's `RequireSession`.

## Spec Change Log

## Review Triage Log

Pass 1 (blind, edge-case, verification-gap):

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | The stored v1 entry is not shape-checked; `profile: null`/`{}` or `today: 123` leak out (blind + edge-case) | medium | `loadState` only checks object and version, and backfills only `undefined` keys. | patch |
| 2 | A failed first write-back makes every read reject `STORAGE_FULL` forever (blind) | medium | `current` is set only after `persist` succeeds. Affects Safari private mode and a full quota. | patch |
| 3 | Non-quota storage errors are reported as `STORAGE_FULL` (edge-case) | low | The catch-all maps every error to `storageFull()`. Direct fix. | patch |
| 4 | A `SecurityError` on the default storage lookup crashes the app at module load (edge-case) | medium | `createApi` runs at module scope in `providers.tsx`. | patch |
| 5 | A corrupt local session masks a valid session-storage session (all three, incl. claim) | low | `local !== null` short-circuits. Direct `??` fix. | patch |
| 6 | Sessions for unknown `userId`s count as signed in (blind + edge-case) | low | Single-user mock. The profile would not match the session. | patch |
| 7 | Login and signup variables (password) linger in the mutation cache after logout; the `'all'` comment overstates (blind + edge-case claim) | medium | `applyInvalidation` touches queries only. | patch |
| 8 | `app/composition.ts` is a second app importer of mock/http, contradicting the frozen Never rule (blind) | medium | Lint allows `src/app/**`, but the spec names only `providers.tsx`. Moved into `src/api`. | patch |
| 9 | Empty `VITE_API_MODE` throws; env typed `string`; no `.env.example` (blind) | low | `''` is not treated as unset, so the page renders blank. Direct fix. | patch |
| 10 | The http base-URL test is vacuous (blind + verification-gap) | medium | It asserts only `typeof getToday`. The env wiring can be dropped silently. | patch |
| 11 | No test that a failed login leaves the cache alone (blind) | low | Only the success path is covered. | patch |
| 12 | Provider tests depend on test order; the http test waits on real backoff (blind) | low | No `beforeEach` storage clear. Retries take about 3s. | patch |
| 13 | Implementation Notes are empty despite deviations (blind) | low | Appended notes; no spec change. | patch |
| 14 | `removeItem` on the other store throws after a successful write; logout partial failure (edge-case) | low | Storage removal failing after a successful set is not seen in practice. Guards add complexity. | reject |
| 15 | Other tabs' writes are not seen (edge-case) | low | Single-tab mock. Cross-tab sync is out of scope. | reject |
| 16 | Profile and today are not gated on a session; no `UNAUTHENTICATED` code (blind + edge-case) | low | The spec does not require it. Story 1.6 `RequireSession` guards the screens. Noted in Implementation Notes. | reject |
| 17 | `SessionProvider` context value re-renders all consumers (blind) | low | No consumers yet. Optimisation without a named harm. | reject |
| 18 | Untyped `fieldErrors`; whitespace-only passwords rejected (blind) | low | Forms can narrow the type. Rejecting a blank password as empty is acceptable for a mock. | reject |
| 19 | Spec/sprint status mismatch (blind) | false | Sprint status syncs to `review` at completion. | reject |

## Verification

**Commands:**
- `npm run lint`, `npx tsc -b`, `npm test`, `npm run build` -- expected: all pass
