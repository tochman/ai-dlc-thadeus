# Code Quality Assessment

## Tests

- **Runner**: vitest 5.1.0 with three projects. `main` runs in node (`tests/main/**/*.test.js`). `scripts` runs the timed hook-script tests in node after the others, with up to 2 retries. `renderer` runs in jsdom with Swedish i18n (`tests/renderer/**/*.test.jsx`).
- **Size**: 72 main and 39 renderer files, 3 helpers and 95 fixtures. There are 1071 `it`/`test` call sites by static count. No tests were run in this scan.
- **Coverage**: v8, with an 80% line floor across `src/**` and `.opencode/plugins/*.js`, plus per-file 80% floors for the agent-dialog modules (`vitest.config.mjs`). CI runs `npx vitest run tests/ --coverage`.
- **Gaps relevant now**: `BoltDag.jsx` has no test file. Unit status is only tested through `unitStatuses` in `tests/main/parsers.test.js`, and the Units tab is not exercised with running Units.

## Lint, Format, CI

| Check | State |
|---|---|
| ESLint 9 flat config | in CI (`npx eslint .`); a small rule set (recommended, react-hooks, react `jsx-uses-vars`) |
| Prettier | in CI (`npx prettier --check .`) |
| Secret scan | gitleaks on every PR commit |
| Build | the mac universal dmg and the Linux deb on every PR; the glibc check on Linux |

`team.md` still says coverage, ESLint and Prettier are "not set up yet". That is out of date: all three run in `.github/workflows/release.yml`.

## Quality Ratings

| Aspect | Rating | Evidence |
|---|---|---|
| Naming clarity | good | intent-revealing names; story ids in the headers |
| Function size | fair | most are small and pure; `ipc.js` (891 lines), `agentHooks.js` (864) and `App.jsx` (732) are large |
| Error handling | good | never-throw readers, the last good value, root confinement, warnings shown |
| Test presence | good | 111 test files, coverage floors; the gap is the DAG view |
| Duplication | fair | `debounce` is written twice in `watcher.js` (`watchFiles` and `watchIntents`) |
| Dead code | good | 0 TODO/FIXME, 4 `eslint-disable` lines |

## Technical Debt

- 37 `ponytail:` comments mark known ceilings. Examples: the unbounded caches in `projectService.js`; the HEAD watch, which does not work in a worktree (`ipc.js` `watchGitHead`); the picker regexes tied to Claude Code's layout.
- `.thadeus/tokens/<intent>.json` is written into the project but is neither ignored nor committed, so it shows as untracked.
- `.opencode/plugins/thadeus-dialog.js` is app-owned code inside a harness folder. It is linted and covered, but sits beside AI-DLC's install.

## Brownfield Notes for US-0507

1. **Unit status is wrong for builds today.** `units.js` needs `UNIT_STARTED`, but the code-generation swarm logs `WORKTREE_CREATED` → `BOLT_STARTED` → … → `BOLT_COMPLETED` → `WORKTREE_MERGED`, and design stages log only `UNIT_COMPLETED` (seen in `261114-agent-dialogs`). Running and stage should come from these events, or from the runtime graph `instances[]` (`started_at` without `completed_at`).
2. **The worktree is known but dropped.** `runtime-graph.json` instances carry an absolute `worktree` path under `<root>/.aidlc/worktrees/bolt-<id8>_<unit>`. It must be turned into a root-relative path and checked with `resolveInRoot` before any read.
3. **Plan ticks** are `- [x]` / `- [ ]` lines in `construction/<unit>/code-generation/code-generation-plan.md` (27 steps in u2 of the earlier intent). Inside the worktree the record path is expected under the same relative path. This should be confirmed in requirements.
4. **Findings by severity** are only in the review record JSON named by `REVIEW_COMPLETED` `Review Record` (relative to the intent's `.aidlc-engine/`). The audit has the verdict only.
5. **Liveness.** `watchIntents` ignores `.aidlc-engine/` except `active-directive.json` and never sees `.aidlc/worktrees/`. The audit and graph writes already trigger `project:changed`. Plan ticks in a worktree need their own watch, or a re-read on each intent change.
6. **The last commit subject** needs a new read-only git call in the worktree, through `runFixed` with fixed arguments and `safeArg`.
7. **Unreadable sources** (a worktree gone after merge, a missing plan) must be named, following the existing `warnings`/stale pattern in `buildDetail`.
