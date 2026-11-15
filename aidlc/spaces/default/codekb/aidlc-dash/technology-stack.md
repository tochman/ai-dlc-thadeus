# Technology Stack

Versions are those resolved in `package-lock.json` at commit `2d111d6`, re-checked for the tooling rows at `bc1dd3d` (package 0.2.5); the ranges in `package.json` are caret ranges unless noted.

## Languages and runtime

| Item | Version | Notes |
|---|---|---|
| JavaScript (ES modules, JSX) | ES2022+ | no TypeScript; JSDoc comments for shapes |
| Node.js | 22 (`.nvmrc`) | development and CI |
| Electron | 45.3.1 | main, preload (sandboxed), renderer |
| CSS | — | one stylesheet `src/renderer/theme.css`, tokens on `:root` |

## Application frameworks and libraries

| Library | Version | Used for | Where |
|---|---|---|---|
| React, react-dom | 19.3.1 | UI | renderer |
| @xterm/xterm | 6.0.0 | terminal rendering, buffer read by the picker reader | `TerminalPanel.jsx`, `pickerSmoke.test.jsx` |
| @xterm/addon-fit | 0.11.0 | terminal sizing | `TerminalPanel.jsx` |
| node-pty | 1.1.0 | pseudo terminals for agent and shell tabs (native, lazy loaded, asar-unpacked) | `src/main/pty.js` |
| chokidar | 4.0.3 | file watching | `src/main/watcher.js` |
| i18next | 27.1.1 | translation | `src/shared/i18n.js` |
| i18next-icu, intl-messageformat | 2.7.0, 12.1.5 | ICU plurals and placeholders | `src/shared/i18n.js` |
| react-i18next | 18.0.1 | `useTranslation`, provider | renderer |
| react-markdown, remark-gfm | 10.1.0, 4.0.1 | Markdown without raw HTML | `ArtifactReader.jsx` `FileContent` |
| @tanstack/react-virtual | 3.14.24 (pinned) | virtualised timeline | `Timeline.jsx` |
| monaco-editor, @monaco-editor/react | 0.57.0, 4.7.0 | in-app editor, diff editor (devDependencies, bundled by Vite, lazy) | `src/renderer/editor/` |
| @fontsource/antonio | 5.3.0 | LCARS display font | `main.jsx` |

## Build and packaging

| Tool | Version | Role |
|---|---|---|
| electron-vite | 6.0.0 | dev server and build of main, preload, renderer into `out/` |
| Vite | 8.3.8 | bundler under electron-vite and vitest |
| @vitejs/plugin-react | 6.3.0 | JSX |
| electron-builder | 26.18.0 | universal macOS .dmg (unsigned), Linux x64 .deb; `install-app-deps` on postinstall |
| GitHub Actions | `actions/checkout@v4`, `setup-node@v4`, `upload-artifact@v4`, `download-artifact@v4` | CI and release (`.github/workflows/release.yml`) |
| gh CLI | runner's / person's | release creation in CI; update check and download in the app |

## Testing

| Tool | Version | Role |
|---|---|---|
| vitest | 5.1.0 | test runner, two projects: `main` (node) and `renderer` (jsdom) |
| jsdom | 29.1.1 | DOM for renderer tests |
| @testing-library/react | 16.3.3 | component tests |

| @vitest/coverage-v8 | 5.1.0 | line coverage; CI enforces an 80% floor (`npx vitest run tests/ --coverage`) |

## Linting and formatting (added since `2d111d6`)

| Tool | Version | Config |
|---|---|---|
| eslint, @eslint/js, globals | 9.39.5, 9.39.5, 17.14.0 | `eslint.config.mjs` (flat config) |
| eslint-plugin-react, eslint-plugin-react-hooks, eslint-config-prettier | 7.37.5, 7.1.1, 10.1.8 | same |
| prettier | 3.10.1 | `.prettierrc.json` (width 160, single quotes, semicolons, no trailing commas); `.prettierignore` skips `docs/`, `*.md`, `*.css`, `tests/fixtures/`, AI-DLC folders |

All three run as separate steps in the `verify` job of `.github/workflows/release.yml`.

## External tools the app runs

`aidlc` (AI-DLC CLI, 2.x flags assumed in `configTables.js`), `git`, `gh`, `claude` (Claude Code), `opencode`, the login shell (`$SHELL`, else `/bin/zsh` on macOS, `/bin/bash` elsewhere), and on update `hdiutil`, `ditto`, `xattr`, `osascript`, `pkexec`/`dpkg`. All but the shell and the agent CLIs run through `runFixed()` without a shell; see `api-documentation.md` section 5.

## Platforms

- macOS: universal .dmg (`THADEUS-<v>-universal.dmg`), unsigned, userData `~/Library/Application Support/aidlc-dash`.
- Linux: x64 .deb (`thadeus_<v>_amd64.deb`), built on Ubuntu 22.04 so it runs on glibc 2.35 and newer.
- Windows: not targeted (menu and updater have no Windows path).

## Harness integration points (intent area)

| Harness | How the app talks to it today | What it does not use |
|---|---|---|
| Claude Code (`claude`) | pty only: spawn, keystrokes, screen reading of its picker (`picker.js`) | hooks (`Notification`, `Stop`, permission hooks), transcript files, any settings file |
| opencode (`opencode`) | pty only; `opencode models` for the model picker | its event API, server mode, plugins |
| AI-DLC | files (`aidlc/`), `aidlc` CLI, the ledger and inflight file AI-DLC's own hooks write | — |
