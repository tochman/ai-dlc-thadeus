# Code Quality Assessment

## Tests

- **Runner**: vitest 5.1.0 with three projects. `main` runs in node (`tests/main/**/*.test.js`). `scripts` runs the timed hook-script tests in node after the others, with up to 2 retries. `renderer` runs in jsdom with Swedish i18n (`tests/renderer/**/*.test.jsx`).
- **Size** (last full scan, `721e051`): 72 main and 39 renderer files, 3 helpers and 95 fixtures; 1071 `it`/`test` call sites by static count. No tests were run in either scan.
- **Coverage**: v8, with an 80% line floor across `src/**` and `.opencode/plugins/*.js`, plus per-file floors for the agent-dialog modules (`vitest.config.mjs`). CI runs `npx vitest run tests/ --coverage`.
- **Cost and token tests**: `tests/main/ledger.test.js` (5 cases on `summarizeLedger` and `compareModels`, fixture `tests/fixtures/ledger/usage-ledger.json`), `parsers.test.js` (audit merge of `tests/fixtures/audit/machine-a.md` and `machine-b.md`), `ipc.test.js` (`project:cost` with a mocked service), `watcher.test.js`, `tokenReadings.test.js`; renderer `CostPanel`, `TokenView`, `TokenDetail`, `TokenDetailChartSize`, `IntentList`, `tokenFlow`.
- **Gaps relevant now**: no `CostTab` test file; the two-machine audit fixtures carry no cost fields; nothing tests cost without a ledger beyond `{available: false}`.

## Lint, Format, CI

| Check | State |
|---|---|
| ESLint 9 flat config | in CI (`npx eslint .`) |
| Prettier | in CI (`npx prettier --check .`) |
| Secret scan | gitleaks on every PR commit |
| Build | the mac universal dmg and the Linux deb on every PR; the glibc check on Linux |

`team.md` still says coverage, ESLint and Prettier are "not set up yet". That is out of date: all three run in `.github/workflows/release.yml`.

## Quality Ratings

| Aspect | Rating | Evidence |
|---|---|---|
| Naming clarity | good | intent-revealing names; story ids in the headers |
| Function size | fair | most are small and pure; `ipc.js`, `agentHooks.js` and `App.jsx` are large |
| Error handling | good | never-throw readers, the last good value, root confinement, warnings shown |
| Test presence | good | coverage floors; gaps above |
| Duplication | fair | `debounce` is written twice in `watcher.js` (`debounce()` and inline in `watchIntents`) |
| Dead code | good | few TODO/`eslint-disable` lines |

## Technical Debt

- `ponytail:` comments mark known ceilings, among them the unbounded caches in `projectService.js` and the unlocked read-modify-write in `tokenReadings.js` `recordReading`.
- `.thadeus/tokens/<intent>.json` is written into the project but is neither ignored nor committed, so it shows as untracked.
- `parsers/agentProgress.js` imports `projectService.js`; parsers were Node-free before.
- `.opencode/plugins/thadeus-dialog.js` is app-owned code inside a harness folder.

## Brownfield Notes for US-0209

1. **Cost is ledger-only today.** `project:cost` returns `{available: false}` without a ledger, so a machine that never ran the work shows no cost at all. The audit rollups must make cost available on their own.
2. **Repeated stage completions are cumulative.** Summing every `STAGE_COMPLETED` over-counts: 261113-cost-and-models gives 33.22 summed, 23.39 taking the last per stage, 23.86 on `WORKFLOW_COMPLETED` (261113-bridge-console-mvp: 36.99, 24.94, 25.56). `WORKFLOW_COMPLETED` is the intent total and is never added to the stages. Observed from the data; confirm in requirements.
3. **Double counting with the ledger.** The local shard and the ledger cover the same work. `aidlc/.aidlc-clone-id` (gitignored) equals the local shard's suffix, so the local shard can be skipped where the ledger has the intent. The ledger has no host field.
4. **Precision differs.** Audit `Tokens By Model/Agent` are rounded (`71k`, `13.4M`) and `Cache Write` is not split, while `IntentCost.tokens` carries `cacheCreate5m`/`cacheCreate1h`. Totals (`Tokens In/Out`, `Cache Read/Write`, `Cost USD`) are exact.
5. **Liveness.** A pulled shard produces `project:changed` with its dir name but no `costChanged`; `useProject` reloads cost only on `costChanged || indexChanged`.
6. **Token readings** (`.thadeus/tokens/`) are cumulative and local; adding another machine's total would show as a jump in "Tokens over time".
7. **Real test data**: `261113-living-lcars/audit/` holds `thomas-comlabs-993a8cefd12a.md` (one `STAGE_COMPLETED` and one `WORKFLOW_COMPLETED` with cost) beside the local shard.
8. **Parsing**: `parseAudit` keeps values as strings; a multi-line value continues on following lines, so the rollup reader should parse only the first line of each field.

## Brownfield Notes for US-0507 (delivered, kept for reference)

- Unit status now also comes from `WORKTREE_CREATED`/`BOLT_*` by `Bolt slug` (`units.js`).
- Worktree paths from `runtime-graph.json` are absolute and must pass `resolveInRoot` before a read; plan ticks live in the worktree's `code-generation-plan.md`; findings by severity only in the review record JSON.
- `watchIntents` watches the worktree plans; `.aidlc-engine/` stays ignored except `active-directive.json`.
