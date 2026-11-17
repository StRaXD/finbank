---
title: 'Story 1.1: Scaffold the project with the agreed starter and tooling'
type: 'chore'
created: '2026-11-16'
status: 'done'
baseline_commit: '5b444327a7af1eddb04e7cbc37c9acfb1b4af779'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Finbank-2026-11-16/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repo has only planning docs and design references. There is no app, so no later story can start, and nothing yet enforces the AD-1 layering rules.

**Approach:** Generate the create-vite 9.3.4 `react-ts` starter, add it to the repo root alongside the existing folders, and pin the full Stack table. Add Tailwind, Vitest with jsdom and Testing Library, and the Structural Seed folders. Harden `tsconfig` and `.oxlintrc.json` so that lint, type-check and tests pass on the scaffold, and a layering violation fails lint.

## Boundaries & Constraints

**Always:**
- Versions are exactly those in the architecture Stack table. Pin them exactly, with two exceptions: `typescript: ~7.0.2` and `oxlint: ^1.90.0`, as written.
- `.nvmrc` is `24`, and `engines.node` is `>=22.22`.
- `"strict": true` is set explicitly in every app and node tsconfig.
- `.oxlintrc.json` sets these rules:
  - `react/exhaustive-deps` is `error`.
  - `import/no-cycle` is `error`.
  - In `src/ui/**`, `no-restricted-imports` forbids imports from `features` and from `api`, except `import type` from `api/types`.
  - Every file outside `src/app/**` and `src/api/**` is forbidden to import `api/mock` or `api/http`. This follows AD-1, under which only `app` composes adapters.
  - `src/lib/**` may not import `app`, `features`, `ui` or `api`. `src/api/**` may not import `app`, `features` or `ui`.
- The `lint` script fails on warnings (`--deny-warnings`).
- Keep the existing `_bmad*`, `.claude/`, `design-reference/` and `.gitignore` content. Only append node, build and coverage ignores.

**Never:**
- No tokens, primitives, routes, providers, port or lib code. Stories 1.2 to 1.9 own those.
- No ESLint, Prettier, React Compiler, path aliases, or state libraries the architecture does not list.
- Do not keep the starter's demo content (counter, logos, `App.css`).

</frozen-after-approval>

## Code Map

- The repo root has no `package.json` or `src/`. The new project goes at the root.
- `ARCHITECTURE-SPINE.md` §Stack (L293–317) and §Structural Seed (L321–345): the source of truth for versions and folders.
- `reviews/review-currency.md` F-4 and the "Starter facts" section: the starter `tsconfig.app.json` has no `strict` key. oxlint 1.94 reports `exhaustive-deps` only as a warning by default. The starter `lint` script is a bare `oxlint`. `@tailwindcss/vite` is not in the starter.
- The starter ships `_oxlintrc.json`, which create-vite renames. Use it as the base for `.oxlintrc.json` and keep its `react`, `typescript` and `oxc` plugins. Add the `import` plugin.

## Tasks & Acceptance

**Execution:**
- [x] (scratchpad) -- Run `npm create vite@9.3.4 <tmp> -- --template react-ts` and copy the output into the repo root. Merge its `.gitignore` entries into the existing file. -- create-vite will not scaffold into a non-empty folder.
- [x] `package.json` -- Set name `finbank` and `engines.node >=22.22`. Pin every dependency in the Stack table. Scripts: `dev`, `build` (`tsc -b && vite build`), `preview`, `lint` (`oxlint --deny-warnings`), `typecheck` (`tsc -b`), `test` (`vitest run`). -- Covers the version AC.
- [x] `.nvmrc` -- `24`.
- [x] `tsconfig.app.json`, `tsconfig.node.json` -- Add `"strict": true`. Include `vitest.config.ts` in the node project. Add the jest-dom and vitest types to the app project. -- Covers the explicit-strict AC.
- [x] `vite.config.ts` -- Add the `@tailwindcss/vite` plugin next to `react()`.
- [x] `vitest.config.ts` -- Use the jsdom environment and a setup file that imports the jest-dom matchers. Limit `include` to `src/**/*.test.{ts,tsx}`.
- [x] `src/app/main.tsx`, `src/app/App.tsx`, `index.html` -- Move the entry into `app/`. `App` renders a minimal "Finbank" placeholder. Point `index.html` at `/src/app/main.tsx`. Delete `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css` and `src/assets/react.svg`.
- [x] `src/styles/index.css` -- `@import "tailwindcss";`, imported by `main.tsx`.
- [x] `src/{features,ui,api,lib,assets/brands}/.gitkeep` -- Create the Structural Seed folders.
- [x] `src/app/App.test.tsx` -- An RTL smoke test that renders `App` and finds the placeholder text, so `npm test` runs a real test.
- [x] `.oxlintrc.json` -- Add the AD-1 rules from Boundaries.
- [x] `src/lint-boundaries.test.ts` (or similar) -- Run oxlint on deliberate-violation probes and assert it fails: `ui` importing `features`, `ui` importing a value from `api/types`, and a feature importing `api/mock`. Also assert that a type-only import from `api/types` in `ui` passes. Probes must live outside the normal lint and type-check scope, or be generated in a temp folder. -- Keeps the boundary AC under regression test.

**Acceptance Criteria:**
- Given a fresh clone on Node 24, when `npm ci` runs, then it installs with no peer-dependency errors.
- Given the scaffold, when `npm run lint`, `npx tsc -b`, `npm test` and `npm run build` run, then all pass.
- Given a file in `src/ui/` that imports from `src/features/`, when lint runs, then it exits non-zero, naming the `no-restricted-imports` rule.
- Given the `src/` tree, when listed, then it contains `app/`, `features/`, `ui/`, `api/`, `lib/`, `styles/` and `assets/brands/`.

## Implementation Notes

- oxlint 1.94 `regex` patterns do not support look-ahead. So `src/ui/**` uses an ordered pair: first a type-only `regex` for `api/types(.ts)`, then a `group` of `**/api` and `**/api/**` with `!**/api/types` negations. A matching negated group stops oxlint from checking any pattern listed after it, so the group must stay last. The boundary test guards this.
- `src/lint-boundaries.test.ts` needs Node APIs. It is excluded from `tsconfig.app.json` and type-checked by `tsconfig.node.json`. Its probes go into an OS temp folder next to a copy of `.oxlintrc.json`.
- The `@types/*` packages are not in the Stack table. They are pinned exactly to the versions the starter resolved (node 24.19.2, react and react-dom 19.3.0). Vitest globals are off. `vitest.config.ts` extends `vite.config.ts` via `mergeConfig`. `src/test-setup.ts` loads the jest-dom matchers and registers Testing Library `cleanup()` in `afterEach`, because RTL cannot auto-register it without globals.
- Review pass 1 patches: added a `src/features/**` override (no `app`, no adapters), widened the adapter regex to `([./]|$)`, and added `ignorePatterns` for the tooling folders. The boundary test now has 21 probes covering every override, `no-cycle` and `exhaustive-deps`, and runs under `@vitest-environment node`. Removed the Vite favicon.
- `src/ui/**` also forbids importing `app`, since under AD-1 ui may import only lib.

## Spec Change Log

## Review Triage Log

Pass 1 (blind, edge-case, verification-gap):

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| 1 | `src/features/**` may import `app` (blind + edge-case) | medium | No features override exists. The base rule only bans mock/http. The edge-case probe passed lint. | patch |
| 2 | The boundary test does not probe lib→api/features/app, api→ui/app or ui→app (verification-gap + blind) | medium | The verification-gap layer demonstrated that a regex regression goes unnoticed. | patch |
| 3 | No pass probes for feature→api/hooks or api→own mock (edge-case) | low | Over-blocking would go unnoticed. The fix is a direct test addition. | patch |
| 4 | `import/no-cycle` and `exhaustive-deps` are never exercised (verification-gap + blind) | low | Removing either rule keeps the suite green. The fix is one probe each. | patch |
| 5 | The adapter regex misses `../../api/mock.ts` (edge-case, incl. claim) | low | The edge-case probe passed lint. A one-character regex fix. | patch |
| 6 | `npm run lint` has no ignore list for tooling folders (blind) | low | Tracked `_bmad*`, `.claude/` and `design-reference/` folders are linted. A BMAD update with JS could break lint. A direct config addition. | patch |
| 7 | The test harness does not check `result.error`, has no timeout, and `afterAll` calls `rmSync(undefined)` (blind + edge-case) | low | A `null` status satisfies `not.toBe(0)`. Direct guards. | patch |
| 8 | The Node-only test runs under jsdom (blind) | low | It works, but takes the wrong environment. One-line pragma. | patch |
| 9 | `vitest/globals` types leak into app sources; `globals: true` is unused (blind) | low | Production code could reference `expect` with no type error. | patch |
| 10 | `vitest.config.ts` duplicates the Vite config (blind) | low | Future `vite.config.ts` changes would not reach tests. `mergeConfig` is direct. | patch |
| 11 | The Vite-logo `public/favicon.svg` is kept (blind) | low | Deviates from the Never rule: no starter logos. | patch |
| 12 | Root-absolute `/src/...` specifiers bypass the rules (blind) | false | TS resolves a leading `/` from the filesystem root, so `tsc -b` rejects such imports before they matter. | reject |
| 13 | The adapter regex matches any nested `api/` folder (blind) | low | Over-matching is harmless and no such folder is planned. Unlikely in everyday use. | reject |
| 14 | `engines` is not enforced; there is no `engine-strict` (blind + edge-case) | low | The spec asks only for the field and `.nvmrc`. Unlikely in everyday use, and adds a policy file. | reject |
| 15 | `.gitignore` lists `coverage/` but drops the `.vscode`/`.idea` entries (blind) | low | Cosmetic. Nothing breaks. | reject |
| 16 | The spec verification uses `npx tsc -b`, not the script (blind) | low | The fix edits this spec. | reject |
| 17 | `epic-1-context.md` says `react-hooks/exhaustive-deps` (blind) | false | Same rule. oxlint reports `react/exhaustive-deps` as `react-hooks(exhaustive-deps)`. | reject |
| 18 | Sprint status is `in-progress` while the spec is `in-review` (blind) | false | The workflow syncs sprint status at step 5. It was not missed. | reject |
| 19 | `main.tsx` uses a `#root` non-null assertion (edge-case) | false | `index.html` always provides `#root`. The missing-root state is unreachable. | reject |

## Design Notes

oxlint `no-restricted-imports` matches the import string as written, and this project uses no path aliases, so imports are relative (`../features/x`). Patterns must match relative paths. Use `regex` or `group` patterns such as `(^|/)features(/|$)`, and check each pattern against a probe before relying on it. If oxlint's override `files` globs make the probes hard to scope, the boundary test may write probes into a temp copy of `src/ui` and pass `-c .oxlintrc.json` explicitly.

Rule for features importing other features only through `index.ts`: relative cross-feature paths (`../balances/components/X`) cannot be told apart from in-feature paths by the import string alone. This sub-rule is deferred and recorded in `deferred-work.md`. It is not part of 1.1's acceptance.

## Verification

**Commands:**
- `npm ci` -- expected: clean install
- `npm run lint` -- expected: exit 0, no warnings
- `npx tsc -b` -- expected: exit 0
- `npm test` -- expected: smoke and boundary tests pass
- `npm run build` -- expected: `dist/` produced
