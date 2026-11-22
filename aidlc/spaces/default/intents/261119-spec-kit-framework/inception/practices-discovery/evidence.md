# Evidence (draft, re-run for EPIC-14)

Commit inspected: `90031e25c5fafc681865e7c8d7635ebc1498206d` (main). Read only; no tests or builds were run.

## Inspected

- **Git history**: last 40 commits and local and remote branches. Shows trunk on `main`, story-numbered commits, `docs:` commits straight to `main`, and `release: vX.Y.Z (#NN)` release commits. Latest tag `v0.2.12`.
- **CI** (`.github/workflows/release.yml`): tag check, gitleaks secret scan, `vitest run --coverage`, ESLint, Prettier, Playwright end-to-end tests of the built app, macOS universal `.dmg` build, Linux `.deb` build with glibc check, checksums, GitHub release. Runs on tags and on pull requests into `main`.
- **Config**: `vitest.config.mjs` (three projects, 80% line thresholds, per-file floors), `eslint.config.mjs`, `.prettierrc.json`, `playwright.config.mjs`, `.nvmrc`.
- **package.json**: `vitest` 5.1.0, `@vitest/coverage-v8` 5.1.0, `eslint` 9.39.5, `prettier` 3.10.1, `@playwright/test` 1.65.1, `electron-builder` 26.18.0. Scripts `test`, `coverage`, `lint`, `format:check` exist.
- **Tests**: 151 test files (98 in `tests/main`, 53 in `tests/renderer`), about 1,630 `it`/`test` lines by static grep. Not run.
- **Code KB** (refreshed at `90031e2`): code-structure, technology-stack, code-quality-assessment, dependencies. Consistent with the above.
- **Epic 14** (`docs/features/epic-14-spec-kit.md`): ten stories planned for v0.3.0. Its dependency chain sets the build order.
- **Project rules** (`memory/project.md`): v0.3.0 gets its own minor release.

## Inferred

- Coverage, ESLint and Prettier are set up and blocking in CI. The baseline's "not set up yet" is stale; the baseline's intent (keep them) stands.
- End-to-end tests of the built app exist and run in CI. They are new since the baseline (US-0608).
- The test count in the baseline (353) is out of date.
- The release workflow matches the baseline's deployment gates. The only additions are the secret scan and the end-to-end step.
- Nothing in the evidence contradicts TDD, trunk-based development, walking skeleton off, or fix-forward rollback.

## Decided and carried over

- Baseline `team.md` content for all five sections, with the updates above.
- Epic 14 stays on v0.3.0 and built story by story, with no walking skeleton.

## Interview decisions

1. **Manual `.dmg` check before a tag and smoke test after publishing: kept (Q1 = A).** CI's built-app Playwright tests do not replace either check.
2. **Secret scan on every pull request: recorded as a team practice (Q2 = A).** It is written into `team-practices.md` under Deployment, not as a new ALWAYS rule.

## Open for the interview

None.
