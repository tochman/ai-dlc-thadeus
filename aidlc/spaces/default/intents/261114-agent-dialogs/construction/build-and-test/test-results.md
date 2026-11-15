# Test Results: US-0506 agent dialogs

Run 2026-11-15 on the development Mac, branch `feat/US-0506` (u1–u5 landed), after the US-0010 retry fix. Commands from `build-instructions.md` and the per-unit `construction/<unit>/code-generation/unit-test-instructions.md`; built files per each `code-summary.md` and `code-generation-plan.md`.

## Commands

| Command | Exit | Result |
|---|---|---|
| `npx electron-vite build` | 0 | built in 10.5 s |
| `npm run lint` | 0 | 0 errors, 22 warnings (react-hooks/exhaustive-deps and similar, pre-existing kinds) |
| `npm run format:check` | 0 | all files formatted |
| `npm run coverage` (= `vitest run tests/ --coverage`, full suite) | 0 | 100 files, **1255 passed**, 0 failed, 0 skipped; 80.8 s |
| `npx vitest run tests/main/dialogScript.test.js tests/main/dialogScriptReply.test.js tests/main/watcher.test.js` (US-0010) | 0 | 75 passed |

The per-unit commands are subsets of the full suite, which ran once and holds every one of them.

## Coverage (`@vitest/coverage-v8`, full suite)

| Measure | Value | Floor |
|---|---|---|
| Lines, all measured source | **89.25%** (5650/6330) | 80% |
| Statements / branches / functions | 86.98% / 79.79% / 81.99% | none |
| Per-file thresholds in `vitest.config.mjs` (agent*.js, agentText, agentOrder, alertPlan, AgentDialog, ReplyPage, LatestMessageStrip, AgentHooks*, plugin) | all ≥ 80% (lowest `AgentHooksPreview.jsx` 88.05%) | 80% each |
| `src/renderer/App.jsx` | 76.24% whole file; **95.2%** of the 62 statements this story changed (3 uncovered: lines 185, 214, 251) | touched code 80% (u1 NFR8.2, u5 NFR8.51) |

Other touched files: `notify.js` 100, `settings.js` 100, `SettingsView.jsx` 90, `ipc.js` 98.5, `questions.js` 98.7, `pty.js` 96.3, `watcher.js` 91.6, `fileWrite.js` 98.2, `preload/index.js` 90.

## Failures

None in any command. The earlier flaky wall-clock tests (197 ms against 100 ms once under load) are handled by US-0010: up to two retries, limits unchanged.

## Targets not verified here

15 targets need a person and the real harnesses on the release Mac (or Ubuntu). No later stage of this plan owns them (Performance Validation and Deployment Execution are skipped), so they are `Unverified`. See `build-and-test-summary.md`.

**Accepted failure (2026-11-15).** No in-stage or code fix exists for these (they need a person and the real harnesses). The person chose "Accept failure": the 15 stay `Unverified` and are to be run by hand before the release pull request. Loop-backs used: 0/3.
