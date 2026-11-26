# Code Summary: health check on the start screen (US-0805)

## Files

| Part | New | Changed |
|---|---|---|
| Shared | `src/shared/health.js`, `src/shared/installCommands.js` | `locales/sv.json`, `locales/en.json` |
| Main | – | `tools.js` (`noAnswer`), `speckitSetup.js` (`INSTALL_HINT` from the table), `ipc.js` (page keys) |
| Renderer | `HealthCheck.jsx` | `App.jsx`, `ProjectView.jsx` (`banner`), `SettingsView.jsx` (`onToolsChanged`), `SignIn.jsx`, `theme.css` |
| Tests | `installCommands`, `health`, `toolsNoAnswer`, `HealthCheck`; e2e `healthCheck.spec.js`, `standInTools.js` | `ipc`, `SignIn`, `AppShell`, `ProjectView`, `SettingsView`; the four earlier e2e specs |

No dependency, configuration or IPC channel was added.

## Decisions

- `healthOf` takes `checking` as a list of ids, so a slow check of an optional tool does not hold "ready" back.
- The status `checking` also covers a scan that gave no answer; the view then says "The tools could not be checked."
- "Check again" also shows on the folded line, so the focus stays when the list folds. The announcement is always mounted in `App.jsx`, since the line goes when everything is ready.
- Coral marks only what counts. An optional missing tool has a grey strip.

## Tests

| Check (developer's run) | Result |
|---|---|
| The unit command and `toolsNoAnswer.test.js` | 14 files, 349 passed |
| ESLint, Prettier, `electron-vite build` | clean |
| All Playwright specs | 28 passed; `healthCheck.spec.js` again after its last formatting: 4 passed |

Red before Green: steps 6, 8, 10 and 15 failed on their assertions. Steps 2, 4, 12 and 13 failed as a missing module, so their assertions were not seen to fail one by one. Step 19's tests were written after the code and found a layout fault (the mark squeezed to nothing), now fixed.

Not executed in this stage: the full suite with coverage (Build and Test's). Every test written was run.

## Deviations and notes

1. Step 6's tests are in `tests/main/toolsNoAnswer.test.js`: an AI-DLC hook refused the edit of `tools.test.js`. Build and Test adds the file to the unit command.
2. While looking for a fault in the stand-ins, `planning.spec.js` ran once with its old tool paths; that start may have run the real `specify --version`. Reverted.
3. When "Check again" in the line above a project makes everything ready, the line goes (FR3.3) and the focus falls to the page. The result is still announced.
4. `signIn.spec.js` can no longer show that an agent tab's start checks only its own tool: the start's scan checks all three. It allows 1 or 2 Claude Code checks and at most 1 of `gh`.
5. Some `AppAlerts.test.jsx` tests log a warning, as their mock bridge has no `getTools`.
6. The Linux command's box was measured on macOS, with the Linux text placed in it.
7. With a chosen path that is gone, the reason reads "The file does not answer --version: spawn … ENOENT", as Settings › Tools says it (FR4.6).
