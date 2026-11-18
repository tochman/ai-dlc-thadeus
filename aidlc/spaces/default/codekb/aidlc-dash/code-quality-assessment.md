# Code Quality Assessment

## Tests

- **Runner**: vitest 5.1.0 with three projects. `main` runs in node (`tests/main/**/*.test.js`). `scripts` runs the timed hook-script tests. `renderer` runs in jsdom with Swedish i18n (`tests/renderer/**/*.test.jsx`).
- **Size**: 85 entries in `tests/main` and 50 in `tests/renderer` at `2b5d6a4`. No tests were run in this scan.
- **Coverage**: v8, with an 80% line floor across `src/**` (`vitest.config.mjs`). CI runs `npx vitest run tests/ --coverage`.
- **Tests near US-0030**:
  - `tests/main/agentActivity.test.js` (the pure model);
  - `agentProgress.test.js` and `agentProgressLoad.test.js` (the audit rows and the plan reads; lines 101-115 cover a build with no Unit);
  - `agentEvents.test.js`, `agentEventsTyped.test.js`, `agentEventsReply.test.js`, `agentPermissions.test.js`, `agentAlertsFlow.test.js`, `agentHooksFlow.test.js`, `agentIpc.test.js`;
  - `tests/renderer/AgentProgress.test.jsx` and `TokenDetail.test.jsx`.
- **Tests near US-0210** (kept): `modelChoice.test.js`, `configuredModels.test.js`, `aidlcWrite.test.js`, `aidlcConfig.test.js`, `settings.test.js`, `watcher.test.js`, `ipc.test.js`, `projectService.test.js`, `questions.test.js`; renderer `ProjectSettingsView.test.jsx`, `ConfigView.test.jsx`, `ProjectView.test.jsx`, `SettingsView.test.jsx`, `useProject.test.jsx`, `noNativeTitle.test.jsx`.

## Lint, Format, CI

| Check | State |
|---|---|
| ESLint 9 flat config | in CI (`npx eslint .`) |
| Prettier | in CI (`npx prettier --check .`) |
| Secret scan | gitleaks on every PR commit |
| Build | mac universal dmg and Linux deb on every PR |

`team.md` still says that coverage, ESLint and Prettier are "not set up yet". That is out of date: all three run in `.github/workflows/release.yml`.

## Quality Ratings

| Aspect | Rating | Evidence |
|---|---|---|
| Naming clarity | good | intent-revealing names; story ids in the headers |
| Function size | fair | most functions are small and pure; `ipc.js` (1070 lines), `agentHooks.js` (864) and `agentEvents.js` (557) are large |
| Error handling | good | never-throw readers, CLI failures as values (`{ok: false, error}`), timeouts translated, the last good value kept; the hook script exits 0 on every failure |
| Input validation | good | the renderer's change objects are checked against fixed tables; hook payloads pass `IDENT` before they reach a row |
| Test presence | good | 135 test entries, an injectable `exec`, pure activity and progress models |
| Duplication | fair | the project-settings field list repeats in `settings.js` (twice) and `ipc.js`; the audit events are walked once per consumer |
| Dead code | good | no TODO/FIXME in the scanned files |

## Technical Debt

- `ponytail:` comments in the scanned files:
  - `parsers/agentProgress.js:69`: an open build or review whose end never came shows while any agent is in flight;
  - `projectService.js:158`: one open dispatch per agent type and stage;
  - `agentEvents.js:339-341`: a hook take not finished within 1 s is reported as sent;
  - `agentAdapters.js:320`: opencode field names from its docs, not a recorded run;
  - `settings.js`: project settings capped at 200 roots (kept);
  - `modelChoice.js`: an alias takes the dearest price (kept).
- `models.js` (the `getModels` used by `useProject`) reads Claude only, while `modelChoice.js` handles both table harnesses.
- `.thadeus/tokens/<intent>.json` is written into the project and shows as untracked.

## Brownfield Notes for US-0030

1. **A permission wait sticks on the main row.** The `permission` dialog kind becomes `{name: 'waiting', reason: 'permission'}` with no agent id (`agentEvents.js:26-33`, `:289-293`). So a subagent's PermissionRequest also marks the main row, as does a `notify` that is not `idle_prompt`. Only a later event on that same row clears it (`agentActivity.js:46`). A subagent's later events change only `main.lastMs` (`agentActivity.js:90-93`). An answer given in the app does not touch activity. `view()` never ages a wait (`agentActivity.js:111-112`), so "waiting for your permission (5 min)" can show long after the prompt closed.
2. **The step count disappears when the hooks are current.** `AgentProgress.jsx:183-189` swaps the audit rows (which carry `steps`) for the hook rows (which do not). The zero-Unit plan is read correctly (`agentProgress.js:30`; `agentProgressLoad.test.js:101-115`), so the story's "only per-Unit plans" hypothesis does not hold. A fix joins the two sources: a hook agent row's `agentType` (for example `aidlc-developer-agent`) ↔ an audit build row's agent (`agentName`) and stage.
3. **No words for the tool call or the task.** `dialog.sh` already copies the whole payload, so no hook change is needed. The adapter drops everything that is not identifier-shaped (`agentAdapters.js:269-301`). Showing `tool_input.description` and the Agent tool's task description means a new, deliberate text field: bounded in length, run through `src/shared/agentText.js`, and with the adapter tests' NFR2 assertions changed on purpose. The fallback stays `state.tool` "running {tool}".
4. **Linking a task to its agent row.** The main chat's PreToolUse for the Agent tool carries the description and its `tool_use_id`. The subagent row is keyed by `agent_id` from SubagentStart. Whether SubagentStart carries the description or the parent `tool_use_id` is not verified [assumption]. If it does not, pair them by order (the next SubagentStart after an open Agent tool on the same session).
5. **Staleness.** The row has `sinceMs` (when the state was entered) but not `lastMs` (when the row was last seen). Expose a last-seen time and let the view say "seen n min ago" for any state, waits and tools included. The renderer already ticks every second (`useNow`). Main's 30 s idle push is the only timer; a waiting or tool row needs no push to age if the age is computed in the view.
6. **UI rules.** Every new text needs keys in both locale files under `tokenDetail.progress`, in the LCARS look, and never colour alone. The `data-testid` values `agent-progress-main`, `agent-progress-agent` and `agent-progress-state` are what the tests read.

## Brownfield Notes for US-0210 (kept from the previous scan, not re-verified)

- A saved AI-DLC profile is efforts per group, not models; per-agent pins are left alone by `--from`.
- New intent detection needs a baseline like `refreshQuestions`'s `startedWith`; take the plan from `plan ?? scope`.
- End detection uses `inProgress()` plus `missingOnDisk`; the app must remember which intents it switched for.
- The question must be an LCARS dialog, not `window.confirm`; a failed run changes nothing else.

## Brownfield Notes for US-0303 (kept, not re-verified)

`runtime-graph.json` is git-ignored; the shards are per machine (pair events by `Stage`); missing is not empty; an inherited `timeMs` can be `-Infinity`; repeated stages sum their runs; story history from `git log` is often a zero span after a squash merge; a shallow clone has no tag dates; a running intent has no end event.
