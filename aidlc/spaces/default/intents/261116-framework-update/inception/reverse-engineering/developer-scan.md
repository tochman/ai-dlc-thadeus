# Developer Code Scan: US-0504 (framework update)

Focused scan at `60bf0d6` for intent `framework-update` (express, Minimal depth). Code read only; no tests, builds or app runs. The `aidlc` CLI was asked only `--version` and `--help` for `config`, `update` and `version`.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - src/main/setup.js
  - src/main/tools.js
  - src/main/git.js
  - src/main/pty.js
  - src/renderer/RefreshPanel.jsx
  - src/renderer/SetupAidlc.jsx
  - tests/main/setup.test.js
  - tests/main/tools.test.js
  - tests/renderer/RefreshPanel.test.jsx
- **Skimmed only**: `docs/features/epic-05-workflow-control.md` (US-0502, US-0503, US-0504 text); imports seen but not opened: `src/main/exec.js`, `src/main/projectAccess.js`, `src/shared/harnesses.js`, `src/renderer/TerminalContext.jsx`, `src/renderer/ArtifactReader.jsx`, `src/renderer/format.js`
- **Left out**: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`; AI-DLC's install and workspace (`.claude/`, `.aidlc/`, `.opencode/`, `aidlc/`, AGENTS.md, opencode.json)

### Packages Found
- `thadeus` (repo `aidlc-dash`) — Electron desktop app — JavaScript ESM + JSX — one package; unchanged from the store.

### Build System
- **Type**: npm + electron-vite (unchanged; not re-read)
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`
- **Build Dependencies**: none new in the area

### APIs Discovered
- IPC (used by the area, defined in `ipc.js`, not re-read): `setup:info`, `setup:run`, `git:status`, `git:fetch`, `git:remoteChanges`, `git:showRemote`, `git:conflicts`, `tools:info`; the renderer types into the shell tab with `terminal.type('shell', cmd, {submit: false})` (`RefreshPanel.jsx:138`), which ends in `pty.js` `writeSession` (`pty.js:104`).
- External commands in the area (all `runFixed`, no shell): `aidlc --version` (`setup.js:74`, `tools.js:78` via `probeTool`), `aidlc --project-dir <root> config --harness <id> --dry-run` (`setup.js:81`), `aidlc config project --show --json [--harness]` (`setup.js:44`), `aidlc --project-dir <root> config --harness <id> --yes` plus plugin/preset steps (`setup.js:107-110`, 120 s each), git read-only commands (`git.js`).

### Frameworks & Libraries
- React 19, react-i18next, node-pty (lazy) — unchanged versions; no new library needed for US-0504.

### Test Coverage
- **Test Directories**: `tests/main/` (setup 11 cases, tools 3), `tests/renderer/` (RefreshPanel 2)
- **Test Frameworks**: vitest; injectable `exec` fakes keyed on `"<file> <args>"` (`setup.test.js:10`, `fakeExec`); renderer mocks `useTerminal` and `window.bridge`
- **Coverage Config**: present (not re-read)

### Code Quality Indicators
- **Linting**: ESLint + Prettier in CI (unchanged)
- **CI/CD**: `.github/workflows/release.yml` (unchanged)
- **Documentation**: every module header and exported function names its story and FR ids

### Technical Debt Signals
- `RefreshPanel.test.jsx` terminal double has no `anyBusy`, so it exercises only the fallback branch of `working` (`RefreshPanel.jsx:98`).
- `errorText()` duplicated again in both renderer files of the area.
- `setup.js` `runSetup` runs `aidlc config --yes` itself in main (US-0802 changed US-0503's typed design); US-0504's AC asks for the typed path instead, so the two patterns sit side by side.
- `parsePreview` reads counts, `conflict:` lines and `Note:` lines only; it does not list per-file `update` lines (`setup.js:21-32`).

## Handoff Summary
- **Intent-relevant finding**: everything US-0504 needs already has a pattern in the area. Version: `aidlc --version` via `runFixed` (`setup.js:74`; output `aidlc 2.11.3 (runtime 2.11.3)`). Preview: `aidlc --project-dir <root> config --harness <id> --dry-run` parsed by `parsePreview` (`setup.js:81`). Typing for Enter: `terminal.type('shell', cmd, {submit: false})` (`RefreshPanel.jsx:138`). Running-workflow gate: `terminal.anyBusy()` or an intents-folder write in the last 5 min via `lastIntentChangeAt` (`RefreshPanel.jsx:8,96-98`), with the `github.wait` message. CLI surface for a newer release: `aidlc update --check` (exit 5 = newer, 0 = current), `aidlc update --dry-run`, `aidlc update`; project refresh: `aidlc config` (`--dry-run`, `--pin`, `--download`); `aidlc version --json` prints binary and selected runtime.
- **Risks / follow-up**: (1) `runFixed` evidently rejects a non-zero exit (setup reads `err.stdout`, `setup.js:83`), so exit 5 from `update --check` must be read as "newer", not an error; `exec.js` was not opened. (2) `update --check` does network and refreshes machine-level release metadata; it is not project-read-only, so call it only on a person's press, like `git fetch`. (3) Whether the config dry run names each `.claude/` file it would update is unknown; `parsePreview` would need a per-file reader, and a sample output is needed. (4) `aidlc update` changes the machine install and `aidlc config` changes the project; the story names both, and which one the button types is open. (5) With several harnesses, `config` needs `--harness` (`setup.js:35-40`).
