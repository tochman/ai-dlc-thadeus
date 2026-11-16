# Code Summary: US-0507 Agent progress

Inputs: `inception/requirements-analysis/requirements.md` and the code knowledge base `aidlc/spaces/default/codekb/aidlc-dash/`.

## Created

- `src/main/parsers/agentProgress.js`: `progressRows(events, {running, nowMs})`, `planSteps(text)`, `severityCounts(record)`, `FINISHED_KEEP_MS` (60 s). Unit builds open on `WORKTREE_CREATED`/`BOLT_STARTED` and close on `BOLT_COMPLETED`/`BOLT_FAILED`; reviews pair `REVIEW_REQUESTED`/`REVIEW_COMPLETED` by `Request Id`; other agents come from `workingAgents()`, minus those a build or review row covers. A Code Generation agent with no Unit is a build row.
- `src/main/agentProgress.js`: `loadAgentProgress(root, space, dirName, {exec, nowMs})` adds plan steps (worktree plan, then the record plan), the last commit subject and review severities. An unreadable worktree, plan or review record is named in `unreadable`.
- `src/renderer/AgentProgress.jsx`: the section: summary sentence, one focusable row per piece of work, empty sentence.
- Tests: `tests/main/agentProgress.test.js` (7), `tests/main/units.test.js` (2), `tests/main/agentProgressLoad.test.js` (3).

## Changed

- `src/main/parsers/units.js`: `Bolt slug` events count (FR6.1).
- `src/main/git.js`: `lastCommitSubject(cwd)`, `git log -1 --format=%s`.
- `src/main/watcher.js`: `watchIntents` takes `worktreesDir`; a Unit plan in `.aidlc/worktrees/bolt-*/…` reports its intent.
- `src/main/projectService.js`: exports `loadAuditEvents`, `inflightCount`, `assertName`.
- `src/main/ipc.js` (`agents:progress`, `worktreesDir`), `src/preload/index.js` (`getAgentProgress`).
- `src/renderer/TokenDetail.jsx` (section, `refreshKey`, one recheck timer while a finished row shows), `IntentDetail.jsx` (`refreshKey={detail}`), `theme.css`, `sv.json`/`en.json` (`tokenDetail.progress.*`).
- Tests: `tests/main/watcher.test.js` (+1), `tests/renderer/TokenDetail.test.jsx` (+4, bridge mock gets `getAgentProgress`).

## Decisions

- `Review Record` in real audits already starts with `.aidlc-engine/` (relative to the record), so the loader joins it to the record and adds `.aidlc-engine/` only when it is missing.
- An open build or review shows only while the inflight file has entries, so a bolt whose end event never came does not show forever.
- The worktree plan path is still unconfirmed on a live worktree (requirements open question); a finished Unit falls back to the record plan.
