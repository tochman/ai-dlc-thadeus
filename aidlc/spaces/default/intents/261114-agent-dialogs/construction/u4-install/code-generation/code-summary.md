# Code Summary: u4-install

Install, update and remove of the agent dialog hooks for US-0506 US4.1: the HookInstaller with its settings splicer, preview and once-only apply, the status from disk with a watcher, the source choice that follows it, and the M7 strip, the M8 preview and the Project settings section. The work was test first (TDD); each Red run was recorded before its Green step.

## Files

- **New:** `src/main/agentHooks.js` (paths, ownership, canonical release, path check, splicer, installer, IPC handlers, status pusher), `src/renderer/AgentHooksStrip.jsx`, `AgentHooksPreview.jsx`, `AgentHooksSection.jsx`.
- **Changed:** `src/main/fileWrite.js` (`writeAtomic`), `watcher.js` (`isWatchedFile`), `agentIpc.js` (`demote`), `ipc.js` (installer wiring; the `THADEUS_AGENT_HOOKS` switch is gone), `src/preload/index.js`, `ProjectView.jsx`, `ProjectSettingsDialog.jsx`, both locale files, `vitest.config.mjs`.
- **Amended (Step 1):** C4 and C6 in `contract-summary.md`; BR7.1, W7, the InstallPreview machine and Known limits in this Unit's functional design; NFR3.25 and NFR5.30.
- The full list is in `source-manifest.json`.

## Tests

- **Verification command:** `npx vitest run tests/ --coverage && npx eslint . && npx prettier --check .` converged: 97 files, 1187 tests. ESLint 0 errors (22 warnings; one is this Unit's: the preview's load effect runs once per opened dialog on purpose). Prettier clean.
- **New for this Unit:** 164 tests in 8 new files and 6 extended ones (`fileWrite`, `watcher`, `agentIpc`, `preload`, `ipc` renamed one test). The guard test runs under `sh` and `dash`.
- **Line coverage:** project 88.8%; `agentHooks.js` 98.3%, `fileWrite.js` 98.2%, `AgentHooksStrip.jsx` 90.5%, `AgentHooksPreview.jsx` 89.2%, `AgentHooksSection.jsx` 87.9%. No threshold was lowered.

## Deviations

1. **Install and Update splice the same way.** Both make the file canonical (append missing, replace or remove the rest), so Install over a partly installed file is safe and Install twice gives `none`. Only the title and the button differ.
2. **No-file Remove leaves `{}` and a line end (3 bytes),** not the 4 bytes RD37's table names. The Known limits line was written to match.
3. **Some fixtures are built in code** (`crlf`, `bom`, `no-final-newline`, `bad-utf8`, `escaped-hooks-key`, `large`), and `aidlc.json` is read from this repository's own `.claude/settings.json`, because the file tool cannot write those bytes exactly. The README says which.
4. **Earlier release for the tests.** `RELEASES` holds only the current release. The `outOfDate` cases use a test-only earlier release (`testEarlier()`, timeouts 300).
5. **Summary lines are translated in main;** the hand-edit sentence is added by the renderer from `replacesHandEdit`.
6. **EPIC-05 status line.** The check failed on the unchanged tree too, because the last docs commit split the `**Status (…)**` line over several paragraphs and `featureDocsStatus.test.js` reads one line. The line is put back on one line with the same text.
8. **Review iteration 1.** `appKind` now claims a command only when it is a release's exact string or the whole command has the anchored C6 shape (either guard and the trailing `exit 0` optional, the script path exact); anything before or after, another path or another argument is not the app's. `postCheck` also checks that a teammate's empty `hooks` object, empty event arrays and empty groups stay. Tests first: 8 failed, then green (fixtures `lookalike.json`, `empty-containers.json`).
7. **Step 1 edits to the two NFR requirement files** were made with a shell script, not the file-edit tool.

## Open

- **RD44 / NFR8.9 manual run** on the release Mac, for the release pull request:

  | Check | Claude Code (version to be recorded) | opencode |
  |---|---|---|
  | Install from the app; a new agent tab gets its next question through the hook | to be recorded | to be recorded |
  | A plain `claude` outside the app shows its own picker; AI-DLC's hooks still write their ledger | to be recorded | n/a |
  | `git diff` after Install shows only the app's lines | to be recorded | to be recorded |
  | The `question` entry copied exactly into `.claude/settings.local.json`: one event file per question (deduplication) | to be recorded | n/a |
  | After Remove both harnesses are back on the fallback | to be recorded | to be recorded |

- **Merge with u5:** u5 adds lines to `ipc.js` and the locale files after the store is built; the u4 lines are the installer wiring, `project:open`, `closeWatcher` and `pty:spawn`.
- **Feature docs:** US-0506 stays "🚧 in progress, for v0.2.5"; AC4.1.1–AC4.1.6 are ticked in Deployment Execution.
