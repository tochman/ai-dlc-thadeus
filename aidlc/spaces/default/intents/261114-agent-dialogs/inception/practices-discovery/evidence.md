# Evidence (final draft)

Repository inspected at commit 2d111d6 (`release: v0.2.4 (#30)`), branch `main`. Nothing was built, run or tested for this stage; test counts are static.

## Sources

### Git history and refs

- Last 60 commits on `main`. Most feature and fix commits are squash-merged pull requests with a story number in the subject (`feat(US-0207): ... (#26)`, `fix(US-0007): ... (#27)`). Pull request numbers run from #8 to #30. Merge commits from the early epics use the GitHub default `Merge pull request #N from tochman/<branch>`.
- Some commits went straight to `main` without a pull request: `docs: add background ... to README`, `docs: add Testing section ...`, `chore(aidlc): close living-lcars intent`, and `wip INTENT LIST` (no type prefix, one case in the last 60 commits).
- Branch names in use: `feat/...`, `fix/...`, `docs/...`, `chore/...`, `release/v0.2.2`, `release/v0.2.3`, plus `docs/released-v0.2.3` and `docs/release-plan-v0.2.4`. The `docs/released-v0.2.3` pull request (#22) followed the v0.2.3 release.
- Tags: `v0.1.0`, `v0.1.1`, `v0.2.0`, `v0.2.1`, `v0.2.2`, `v0.2.3`, `v0.2.4`. `v0.2.4` is the tag on `2d111d6`, the squash of pull request #30. Both `v0.2.3` and `v0.2.4` were tagged on 2026-11-14.
- The release commits change `package.json`, `docs/releases/`, and the feature docs. The v0.2.4 release commit also carried fixes found by checking the built `.dmg` (US-0008, US-0009). This is consistent with the manual check described in `docs/releases/0.2.4.md`.
- Remote: `origin` at `https://github.com/tochman/aidlc-dash.git`. Branch protection could not be read from the local clone. (uncertain)

### `.github/workflows/release.yml`

- Triggers: `push` of tags `v*.*.*`, and `pull_request` into `main`.
- Job `verify` (ubuntu-latest, Node from `.nvmrc`): on tags, checks the tag equals `package.json`'s version; then `npm ci` and `npx vitest run tests/`. Runs on pull requests too.
- Job `build-mac` (macos-latest, `npm run build:mac`, unsigned via `CSC_IDENTITY_AUTO_DISCOVERY: 'false'`) and job `build-linux` (ubuntu-22.04, `npm run build:linux`, then `scripts/check-glibc.mjs`). Both need `verify`; both run on pull requests, so packaging problems show before a tag.
- Job `release` runs only on tags, needs both builds, computes `SHA256SUMS.txt` with `sha256sum`, and runs `gh release create` with `--generate-notes`. It publishes a regular release, not a prerelease.
- The header comment says the repo is "this private repo". That conflicts with the README's open-source note, which is in the commit history. Not a practice question; left for the release owner to check. (uncertain)

### `package.json` and `vitest.config.mjs`

- Scripts: `test` = `vitest run tests/`; `build:mac`, `build:linux` = `electron-vite build && electron-builder --<os>`; `postinstall` installs app deps and fixes `node-pty` permissions. There is no lint, format, typecheck or coverage script.
- Version `0.2.4`.
- Dev dependencies include vitest 5.1.0, jsdom 29.1.1, @testing-library/react 16.3.3. No ESLint, Prettier or coverage package.
- `vitest.config.mjs`: two projects, `main` (node) and `renderer` (jsdom) with `setup-i18n.js`.

### Code knowledge base (`aidlc/spaces/default/codekb/aidlc-dash/`)

- `technology-stack.md`: Node 22 (`.nvmrc`), Electron 45.3.1, no TypeScript, "No coverage provider, linter or formatter is installed or configured."
- `code-quality-assessment.md`: 32 main and 27 renderer test files; "about 490 test cases" (not reproduced, see below); 10 `ponytail:` markers; 0 TODO/FIXME; no linter; no coverage. Style "consistent by hand (2 spaces, single quotes, semicolons, long lines up to about 160 characters)". Reports the CI gate on pull requests and tags.
- `code-structure.md` and `architecture.md`: source layout and the test layout; `data-testid` kebab-case convention; story-tagged doc comments; i18n through `t()`.
- `dependencies.md`: runtime and build dependencies; no lint or coverage packages.
- `business-overview.md`: the app is a desktop bridge console, released for macOS and Linux; the active intent `261114-agent-dialogs` covers US-0506.
- `architecture.md` improvement notes list "Coverage measurement and a linter" as an open improvement.

### Test suite (static count, not run)

- Files: 59 test files (32 under `tests/main`, 27 under `tests/renderer`). Matches the knowledge base.
- Cases: 353 `it(` / `test(` call sites found by grep (`^\s*(it|test)(\.each)?\(`). The knowledge base says "about 490". Not reconciled (uncertain); a test run would settle it. The number here is the count of call sites, not of expanded `.each` cases.
- The feature-doc status test (`tests/main/featureDocsStatus.test.js`, added in `9732b65`) enforces the project's feature-doc rule on every pull request.
- Fixtures are hand-transcribed picker screens (`tests/fixtures/picker/`, from a screenshot for US-0006), not live captures.

### Release and planning docs

- `docs/releases/0.2.3.md` and `0.2.4.md`: a release plan per version with the story slice, build order, "Deliberately not in" list, and a release checklist (acceptance criteria ticked, epic status lines and FEATURES.md rows updated, "Released in vX.Y.Z" on every story, version bumped, tagged, release workflow green).
- `docs/FEATURES.md` and `docs/features/epic-*.md`: story markers 📋, 🚧, ✅; each shipped story is marked "Released in vX.Y.Z".
- `aidlc/spaces/default/intents/261114-custom-plans/operation/deployment-pipeline/deployment-strategy.md` and `rollback-runbook.md`: the v0.2.4 release strategy (regular "latest" release, fix forward, the manual `.dmg` check, smoke test after publishing, prerelease to stop the offer, EPIC-00 story for the fix). Written for v0.2.4; the runbook was not exercised.
- `aidlc/spaces/default/intents/261114-intent-0-2-3-release/operation/deployment-execution/` records the v0.2.3 final stage: deployment log, smoke test and health check. Read for the record of how the last release was run; not re-read in full.

### Prior Code Generation plans

- `261113-audit-timeline`, `261113-config-view`, `261113-living-lcars`, `261113-harness-choice`, `261113-cost-and-models` (each `construction/code-generation/code-generation-plan.md`): `"methodology": "test-after"` and the framework default text of the testing posture. Evidence that the default was used, not a team choice; superseded for new work by the interview decision below.

### Scope file

- `.claude/scopes/aidlc-classic.md`: `skeleton: off`, `review_cap: advisory`, `sensors: on`, `learnings: on`, `plan_approval: on`, `collaborators: off`. Test strategy inherits Standard. The `classic` scope's 80% line-coverage floor applies.

### Framework knowledge (read for the preflight and the lead's method)

- `aidlc-shared/rules-reading.md`, `brownfield.md`, `verification.md`, `ai-dlc-principles.md`, `adding-a-repo.md`; `aidlc-pipeline-deploy-agent/cicd-patterns.md`, `branching-strategies.md`, `deployment-strategies.md`. Used to read the defaults and the menu of strategies; not evidence about this team.

## Inferred (before the interview)

- **Way of Working**: trunk-based with short-lived story branches and squash-merged pull requests; direct commits to `main` for docs and chores. Confirmed at the interview (Q5, Q6).
- **Walking Skeleton**: no thin-slice-first pattern in the history. Confirmed as off (Q4).
- **Testing Posture**: test-after, from the framework default in recent plans. Replaced by the interview decision (Q1: TDD).
- **Deployment**: desktop release by tag, unsigned builds on GitHub Releases, updater reads "latest", fix forward on a bad release. Confirmed at the interview (Q7, and the release gates).
- **Code Style**: hand-kept style with no tooling. Replaced by the interview decision (Q3: ESLint and Prettier in CI).

## Interview decisions

The practices interview is complete (seven questions, all answered). The answers are:

- **Q1: test-first (TDD) for new work.** Answer B. Recorded as `Methodology: tdd`.
- **Q2: add `@vitest/coverage-v8` and require an 80% line-coverage floor in CI now.** Answer A. Not installed yet; to be added.
- **Q3: add ESLint and Prettier and run them in CI.** Answer A. Not installed yet; to be added. A failure blocks the merge.
- **Q4: no walking skeleton; build in the planned order.** Answer B. Skeleton off.
- **Q5: docs and small chores may go straight to `main`; stories and fixes go through a pull request.** Answer A.
- **Q6: one branch and one squash-merged pull request per story.** Answer A.
- **Q7: the gates are the local `.dmg` check, green CI, the merge and the tag; no staging.** Answer A.

The full question and answer record is in `practices-discovery-questions.md` in this stage folder.

## Remaining uncertainty

- **Test count**: 353 `it`/`test` call sites by static grep against "about 490" in the knowledge base. Not reconciled; a test run would settle it. Not run for this stage.
- **Release workflow comment**: `release.yml` calls the repo "private", which conflicts with the open-source note in the README commit history. Left for the release owner to check.
- **Branch protection**: unknown from the local clone. The gate "green CI before merge" depends on it being enforced on GitHub. Not verified.
- **Tooling not installed**: the coverage provider (Q2) and ESLint/Prettier (Q3) are decided but absent. Until they are added, the CI gates they describe do not exist.
- **Rollback runbook**: written for v0.2.4 and not exercised.
