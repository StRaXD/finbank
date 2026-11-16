- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-scaffold-the-project-with-the-agreed-starter-and-tooling.md`
  summary: Lint-enforce the AD-1 sub-rule that features import other features only through their `index.ts`.
  evidence: With relative imports and no path alias, oxlint `no-restricted-imports` cannot tell cross-feature deep imports apart from in-feature imports by import string; needs an alias or a custom check.
