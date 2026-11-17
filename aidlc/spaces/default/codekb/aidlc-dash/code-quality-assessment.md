# Code Quality Assessment

## Tests

- **Runner**: vitest 5.1.0 with three projects. `main` runs in node (`tests/main/**/*.test.js`). `scripts` runs the timed hook-script tests. `renderer` runs in jsdom with Swedish i18n (`tests/renderer/**/*.test.jsx`).
- **Size**: 85 entries in `tests/main` and 50 in `tests/renderer` at `2b5d6a4`. No tests were run in this scan.
- **Coverage**: v8, with an 80% line floor across `src/**` (`vitest.config.mjs`). CI runs `npx vitest run tests/ --coverage`.
- **Tests near US-0210**: `modelChoice.test.js` and `configuredModels.test.js` (an injected `exec`, so no real CLI runs), `aidlcWrite.test.js`, `aidlcConfig.test.js`, `settings.test.js`, `watcher.test.js`, `ipc.test.js`, `projectService.test.js`, `questions.test.js`; renderer `ProjectSettingsView.test.jsx`, `ConfigView.test.jsx`, `ProjectView.test.jsx`, `SettingsView.test.jsx`, `useProject.test.jsx`, `noNativeTitle.test.jsx`.

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
| Function size | fair | most functions are small and pure; `ipc.js` (1070 lines) and `agentHooks.js` (864) are large |
| Error handling | good | never-throw readers, CLI failures as values (`{ok: false, error}`), timeouts translated, the last good value kept |
| Input validation | good | the renderer's change objects are checked field by field against fixed tables before any command (`MODEL_FIELDS`, `CHANGE_FIELDS`); settings sanitised on every read |
| Test presence | good | 135 test entries, an injectable `exec` |
| Duplication | fair | the project-settings field list repeats in `settings.js` (twice) and `ipc.js`; the events are walked once per consumer |
| Dead code | good | no TODO/FIXME in the scanned files |

## Technical Debt

- `ponytail:` comments in the scanned files:
  - `settings.js`: project settings capped at 200 roots;
  - `projectService.js`: unbounded caches, one open dispatch per agent type and stage;
  - `modelChoice.js`: an alias takes the dearest price.
- `models.js` (the `getModels` used by `useProject`) reads Claude only, while `modelChoice.js` handles both table harnesses.
- `.thadeus/tokens/<intent>.json` is written into the project and shows as untracked.

## Brownfield Notes for US-0210

1. **A profile is efforts, not models.** In AI-DLC a saved profile is `{groups: {deciding|reviewing|writing-up: {effort}}}`. `--from <profile>` replaces `groups`; a preset name also sets `preset`, and a profile name clears it. Per-agent pins (`agents[a].model`, `.effort`) are left alone. A "stronger model" therefore cannot come from a profile alone. Requirements must choose between an effort-only profile and an app-side set of `--agent … --model` commands.
2. **`--from` is refused today.** `buildModelCommand` allows `agent | preset | group` only. Adding `from` must keep the table rule: accept a preset name or `^[a-z0-9][a-z0-9-]*$`, no other field, and keep the `--dry-run` preview.
3. **No profile list.** The app reads only `data.effective` from `config models --show --json`. Whether that output names the saved profiles is not known. Without it, the settings can only take a typed name, and an unknown one fails at run time (AI-DLC: "unknown model preset or profile").
4. **Which profile is active is not recorded by AI-DLC.** After `--from`, only the groups remain. The app must remember the profile it last applied per project (for example in its project settings), and should say that a change made elsewhere can make that out of date.
5. **New intent detection needs a baseline.** `watchSpace` reports `indexChanged` for any change to `intents.json` or a new folder, and also on the first load. Like `refreshQuestions`'s `startedWith`, the first list after opening must be the baseline, so that intents already running give no question. An intent can be in `intents.json` before its state file exists: take the plan from `plan ?? scope` once both are readable.
6. **End detection.** `inProgress()` already treats `complete`, `archived`, a `Complete…` state status and "all stages done" as ended. A deleted intent folder (`missingOnDisk`) also ends it. The app must remember which intents it switched for, or else every finished critical intent would trigger the economy switch, including old ones.
7. **Several intents.** "Critical wins until the last critical intent ends" means: switch back only when no intent the app switched for is still `inProgress`. Several open projects each have their own `--project` setting, so no global state is needed.
8. **Harness.** `--harness` must be a table harness (`claude`, `opencode`) installed in the project (`checkHarness`). Main does not resolve the agent tab's harness; it would use `settings.harness`, else the detection, or switch every installed table harness.
9. **Timing.** The watcher flushes within 300-800 ms of `intents.json` changing. AI-DLC applies a model change from the next step, so a prompt the person answers late may still miss the first stages. That is acceptable, but the question should say so.
10. **UI rules.** The question must be an LCARS dialog (not `window.confirm`, which `confirmHarnessSwitch` uses). Every text needs keys in both locale files. Tooltips only through `Tooltip`. The command and its output can be shown with the same parts as `ChangePanel`.
11. **A failure changes nothing else.** On a failed `run()`, the app must not update its remembered "active profile".

## Brownfield Notes for US-0303 (kept from the previous scan, not re-verified)

Those notes stay valid for any further velocity work:
- `runtime-graph.json` is git-ignored.
- The shards are per machine; pair events by `Stage`.
- Missing is not empty.
- An inherited `timeMs` can be `-Infinity`.
- Repeated stages sum their runs.
- Story history comes from `git log` and is often a zero span after a squash merge.
- A shallow clone has no tag dates.
- A running intent has no end event.
- An all-intents read costs about as much as `project:cost`.
