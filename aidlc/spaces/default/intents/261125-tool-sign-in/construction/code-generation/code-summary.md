# Code Summary: see whether each tool is signed in, and sign in from the app (US-0804)

All 13 plan steps are built, test first. Nothing is committed yet.

## Files

- **New:** `src/shared/signIn.js` (ids, sign-in command, `shellQuote`), `src/main/parsers/signIn.js` (the answers, pure), `src/main/signIn.js` (`checkSignIn`), `src/renderer/SignIn.jsx` (the row's line, the copy form, the agent tab's line)
- **Changed:** `src/main/exec.js`, `pty.js`, `ipc.js`, `platforms/index.js`, `src/preload/index.js`, `src/renderer/App.jsx`, `ProjectView.jsx`, `SettingsView.jsx`, `TerminalPanel.jsx`, `ToolRows.jsx`, `terminalControl.js`, `theme.css`, both locale files, `vitest.config.mjs` (the `TIMED` list only)
- **Tests:** new `signInParsers`, `signIn`, `signInCommand`, `SignIn` and `tests/e2e/signIn.spec.js`; extended `exec`, `ipc`, `preload`, `platforms`, `updater`, `TerminalPanel`, `AppShell` and `tests/e2e/intentLayout.spec.js`

## Key decisions

- Claude Code's `loggedIn` decides for exit 0 and 1; any other exit is "unknown". Without the marker from the login shell, the answer is "unknown" whatever the shell printed.
- Anything token-like is hidden: known prefixes, JWTs, values after words such as `token:`, a login in a URL, long hex, and runs of 40 or more. A GitHub name has at most 39.
- An older scan of the tools can no longer replace newer rows.
- The polite regions are always in the page, so an answer is announced and focus is not moved.

## Tests

- 91 new: 88 vitest, 3 Playwright. The Reds failed first, except guards on behaviour already there (a page without the call, a start that does not wait, a failed start).
- The unit's two commands together, run again by the conductor on the final code: 18 files, 396 passed. `signIn.spec.js` and `intentLayout.spec.js` on the built app, run by the developer on the final code: 15 passed.
- Line coverage of the four new files: 100%. ESLint and Prettier clean on the changed files.

**Not run in this stage:** the full suite with coverage and the other Playwright specs; Build and Test runs them. The real tools were not checked through the app.

## Deviations from the plan

1. **The real `claude` ran, against the brief.** In the first run of `signIn.test.js` the "not found" case found it on the PATH, and it ran `auth status` at least once, with an empty HOME and stdin closed, and answered signed out. The test now has its own PATH.
2. `signIn.test.js` is in `TIMED`: real shells and 3 s limits. No threshold changed.
3. A chosen path with a control character is not typed; the tool's name is used. A line break in it would be an Enter (FR3.4).
4. The `intentLayout` stand-in had no Red: the spec passed before the edit too. The edit is the precaution the plan names.

## Known limits

- A check has no project folder, so a key set only in a project's own settings is not seen. `exec` skips shell aliases, so a tool an agent tab starts through an alias is checked as the one on PATH.
- A request that shares a check started before a sign-in finished gets the old answer until the next read.
- A program left by a startup file can outlive the kill (`ponytail:` in `signIn.js`).
- An account text over 200 characters is cut, the plan included.
- The Playwright copy test writes the machine's clipboard and puts its text back; other content is not restored.
