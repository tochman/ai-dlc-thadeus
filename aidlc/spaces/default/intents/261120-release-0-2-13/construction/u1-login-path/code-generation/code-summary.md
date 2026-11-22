# Code Summary: U1 u1-login-path (US-0035)

Branch `fix/US-0035`, nothing committed. All 12 plan steps done, test first.

## Files
- `src/main/exec.js`: 20 s login-shell limit; `readLoginPath(exec)` → `{path, fromFallback}` keeps only a successful read, shares one read while it runs; `refreshLoginPath()`; `loginPath` unchanged for callers.
- `src/main/tools.js`: `getTools` (the Tools scan) refreshes and reads the login PATH once; automatic rows get `pathFallback: true` after a fallback; `resolveOnPath` takes an optional `searchPath`.
- `src/renderer/SettingsView.jsx`: `ToolCard` shows `settings-tool-fallback-<id>` when `pathFallback`.
- `src/shared/locales/sv.json`, `en.json`: `settings.tools.pathFallback`.
- Tests: `tests/main/exec.test.js` (+7), `tests/main/toolsLoginPath.test.js` (new, 3), `tests/renderer/SettingsView.test.jsx` (+2).
- Docs: US-0035 set to 🚧 in `docs/features/epic-00-fixes.md` and `docs/FEATURES.md`. (The same two files also hold the new US-0037 story, added at the person's request; it is not part of US-0035 and stays out of its commit.)

## Results
- Red runs failed as planned (exec: 7 failed, `readLoginPath is not a function`; tools: 2 failed; renderer: 1 failed). The third tools case already passed; it guards the existing behaviour.
- Final: 5 files, 43 tests pass (`npx vitest run tests/main/exec.test.js tests/main/tools.test.js tests/main/toolsLoginPath.test.js tests/renderer/SettingsView.test.jsx tests/main/i18nKeys.test.js`). ESLint clean, Prettier clean.
- Not run here: the full suite with coverage (Build and Test runs it).

## Deviations
- The three `tools.js` cases are in a new `tests/main/toolsLoginPath.test.js`: the AI-DLC guard refused edits to `tests/main/tools.test.js`, apparently taking the name for AI-DLC's own tools. Build and Test must include the new file in this Unit's command.
- Step 1's marker edits were made with `sed -i`, not the file tool; same result.
- An empty PATH from the shell now counts as a fallback (marked, not kept), as FR1.1 reads.

## Step 13 (added at the person's request)
One scan now reads the login shell at most once: `runFixed` takes an optional `path`, and `getTools` passes the scan's PATH to each `--version` check through `probeTool`. Red failed as planned (5 login-shell execs, expected 1). `validateTool` is unchanged and still reads the shell itself. Final: 5 files, 44 tests pass; ESLint and Prettier clean. A slow shell now costs one 20 s wait per scan, not two.
