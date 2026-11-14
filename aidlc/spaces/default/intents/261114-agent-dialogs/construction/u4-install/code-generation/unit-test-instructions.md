# Unit Test Instructions: u4-install

## Framework setup

- **Runner:** vitest 5.1.x as installed, with the projects in `vitest.config.mjs`: `main` (node, `tests/main/**/*.test.js`), `scripts` (node, the real-time tests in `TIMED`, run after the others) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale through `tests/renderer/setup-i18n.js`).
- **Changed in plan Step 2:** `tests/main/agentHooksGuard.test.js` joins `TIMED`; per-file 80% line entries for `src/main/agentHooks.js`, `src/renderer/AgentHooksStrip.jsx`, `AgentHooksPreview.jsx` and `AgentHooksSection.jsx`. `@vitest/coverage-v8`, ESLint and Prettier are already set up. No new dependency.
- **Shells for the guard test:** `tests/helpers/shells.js` (`SHELLS`: `sh`, plus `dash` when installed; `THADEUS_REQUIRE_DASH=1` in CI makes a missing dash fail).
- **Prerequisites:** `npm ci`. Symbolic links must be creatable in the test temp folder (macOS and Linux allow it).
- **Built side by side:** this Unit's worktree holds u1–u3 but not u5-notifications. Every command below passes on u1–u3's code plus this Unit's.

## Runnable before the first test-first cycle (plan Step 2)

```bash
npx vitest run tests/main/fileWrite.test.js tests/main/watcher.test.js tests/main/agentIpc.test.js tests/main/dialogScript.test.js
```

These files must be green on the unchanged tree before the first Red step.

## This Unit's tests, file by file

Each Red step records the failing output of its exact command.

| Plan step | Component | Command |
|---|---|---|
| 4–6 | AtomicWriter `src/main/fileWrite.js`, PathWatcher `src/main/watcher.js` | `npx vitest run tests/main/fileWrite.test.js tests/main/watcher.test.js` |
| 7–12 | Ownership, canonical release, paths, SettingsSplicer `src/main/agentHooks.js` | `npx vitest run tests/main/agentHooks.test.js` |
| 13–15 | HookInstaller status, preview, apply, watch | `npx vitest run tests/main/agentHooksInstaller.test.js` |
| 16 | The installed guard commands (real time) | `npx vitest run tests/main/agentHooksGuard.test.js` |
| 17–19 | IPC, source choice, preload | `npx vitest run tests/main/agentHooksIpc.test.js tests/main/agentIpc.test.js tests/main/preload.test.js` |
| 20 | Install to source choice (integration) | `npx vitest run tests/main/agentHooksFlow.test.js` |
| 21–23 | M7 strip, M8 preview, Project settings section, locale keys | `npx vitest run tests/renderer/AgentHooksStrip.test.jsx tests/renderer/AgentHooksPreview.test.jsx tests/renderer/AgentHooksSection.test.jsx tests/renderer/ProjectView.test.jsx tests/renderer/ProjectSettingsDialog.test.jsx tests/main/i18nKeys.test.js` |

## The whole Unit in one run

```bash
npx vitest run tests/main/fileWrite.test.js tests/main/watcher.test.js tests/main/agentHooks.test.js tests/main/agentHooksInstaller.test.js tests/main/agentHooksGuard.test.js tests/main/agentHooksIpc.test.js tests/main/agentIpc.test.js tests/main/preload.test.js tests/main/agentHooksFlow.test.js tests/main/i18nKeys.test.js tests/renderer/AgentHooksStrip.test.jsx tests/renderer/AgentHooksPreview.test.jsx tests/renderer/AgentHooksSection.test.jsx tests/renderer/ProjectView.test.jsx tests/renderer/ProjectSettingsDialog.test.jsx
```

## Expected coverage targets

- **Project floor:** 80% line coverage of the whole project (Testing Contract, team rule), measured by Build and Test on the full suite. A run of this Unit's files alone does not judge it.
- **This Unit's files:** at least 80% line coverage of each file it creates or changes (u1 NFR8.2). Checked with its own command, with nothing after it, because a threshold exit stops the line:

```bash
npx vitest run tests/main/fileWrite.test.js tests/main/agentHooks.test.js tests/main/agentHooksInstaller.test.js tests/main/agentHooksIpc.test.js tests/main/agentHooksFlow.test.js tests/renderer/AgentHooksStrip.test.jsx tests/renderer/AgentHooksPreview.test.jsx tests/renderer/AgentHooksSection.test.jsx --coverage --coverage.include=src/main/agentHooks.js --coverage.include=src/main/fileWrite.js --coverage.include=src/renderer/AgentHooksStrip.jsx --coverage.include=src/renderer/AgentHooksPreview.jsx --coverage.include=src/renderer/AgentHooksSection.jsx
```

If it exits non-zero only on a threshold with every selected test passing, record that with the results; it is not a failed test. Never change a threshold to make it pass.

## Mocking and stubbing

- **File system:** real temporary project folders under the test temp folder, one per test, removed after. Failure injection (`ENOSPC`, `EACCES`, `EROFS`, unlink failure) through `vi.spyOn` on `node:fs/promises` for one call only; the order test wraps `fs` in a recorder.
- **Watcher:** the real `watchFiles` on the temporary folder for the watch tests; elsewhere a fake that captures `onChange`.
- **Store and channel:** u1's fake channel and fake pty; a fake installer (`isCurrent`, `onStatus`) for the `agentIpc` tests.
- **Renderer:** `window.bridge.agentHooks` stubbed (`status`, `preview`, `apply`, `cancel`, `onChanged`); a deferred promise for the busy-state tests; keyboard events only for M8.
- **Timing:** tolerances are CI bounds (PD31, PD33, RD30), not targets; no real clock is faked in the guard test.

## Test data

- `tests/fixtures/agent-hooks/` (plan Step 3) holds the settings fixtures, each copied into the temporary project before a test. The 1 MB fixture is generated by a helper from `aidlc.json` padded with a large non-app string.
- Expected bytes come from the `?raw` imports of `.thadeus/hooks/dialog.sh` and `.opencode/plugins/thadeus-dialog.js`, never copies.
- Link cases are created with `fs.symlink` in the temporary project.
