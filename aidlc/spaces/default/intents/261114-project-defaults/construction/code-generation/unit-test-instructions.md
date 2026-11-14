# Unit Test Instructions — US-0902 Code Generation

## Scope

- **Test strategy**: Minimal (requirement-driven unit tests, one per requirement, happy-path floor per component)
- **Test methodology**: test-after
- **Applicable test files**: `tests/main/tools.test.js`, `tests/main/settings.test.js`, `tests/main/pty.test.js`, `tests/renderer/SettingsView.test.jsx`, `tests/renderer/AppShell.test.jsx`

## Test Runner Command

Verify the existing test runner configuration and record the exact unit-scoped command:

```bash
npx vitest run tests/main/tools.test.js tests/main/settings.test.js tests/main/pty.test.js tests/renderer/SettingsView.test.jsx tests/renderer/AppShell.test.jsx
```

## Obligations

- One verifiable test per requirement at the narrowest effective level
- At least one happy-path unit test per component
- Keep the existing test suite green
- This scope adds no extra new-test floor beyond the selected test strategy

## Step 1 — Verify the test runner

Run the existing runner once to confirm it works:

```bash
npx vitest run tests/main/settings.test.js
```

Keep it green. Record the exact command above for scoped execution.

## Step 2 — Data model tests

Extend `tests/main/settings.test.js` with one case:

- A valid `toolPaths` and `defaultProjectFolder` survive a write and a re-read
- `setSettings` never drops them when the tabs are saved
- A relative path, a non-string or a NUL byte is dropped (FR7.1)

Run the file's command and keep it green.

## Step 3 — Repository/data access tests

New `tests/main/tools.test.js`, with an injected `exec` and a temp folder:

- A saved path wins and is reported as `source: 'saved'`, an automatic one is resolved from PATH (`aidlc`, `claude`) and the shell is `$SHELL` (FR2.1)
- A tool that cannot answer `--version` is reported as not found with its reason, never as an empty version (FR2.1, A3)
- `validateTool` rejects a missing file, a non-executable file and a failing `--version`, and accepts an executable that answers (FR2.3)

Also extend `tests/main/pty.test.js` with one case:

- A saved `claude` path and a saved shell path are the ones spawned, and no saved path leaves today's `claude` and `$SHELL` (FR2.4). Run and keep green.