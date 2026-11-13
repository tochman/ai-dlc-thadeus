# Technology Stack: aidlc-dash

Versions are from `package.json` as skimmed in this scan (commit `4b5b8c6`).

## Languages and runtime

| Part | Choice | Version |
|------|--------|---------|
| Language | JavaScript (ESM), JSX; CommonJS in two scripts | – |
| Node | `.nvmrc` (read by CI through `node-version-file`) | 22 |
| Desktop runtime | Electron | ^45.3.1 |
| Styling | plain CSS, one global file (`theme.css`), CSS custom properties; `tokens.js` reads them in JS | – |
| Translations | JSON locale files with ICU MessageFormat texts (`src/shared/locales/`) | – |

## Frameworks and libraries (runtime)

| Library | Version | Used for |
|---------|---------|----------|
| react, react-dom | ^19.3.1 | UI |
| i18next | ^27.1.1 | translation instance per process (US-0701) |
| i18next-icu | ^2.7.0 | ICU MessageFormat (placeholders, plurals) |
| react-i18next | ^18.0.1 | `I18nextProvider`, `useTranslation()` |
| intl-messageformat | ^12.1.5 | ICU parsing; used directly by `tests/main/i18nKeys.test.js` to compare placeholders |
| @xterm/xterm | ^6.0.0 | terminal in the renderer |
| @xterm/addon-fit | ^0.11.0 | terminal size |
| node-pty | ^1.1.0 | pseudo-terminals (native, loaded lazily, `asarUnpack`) |
| chokidar | ^4.0.3 | file watching |
| react-markdown | ^10.1.0 | artifacts without raw HTML |
| remark-gfm | ^4.0.1 | tables, checkboxes |
| @tanstack/react-virtual | 3.14.24 (pinned) | virtualised timeline |
| @fontsource/antonio | ^5.3.0 | heading and label font (400, 600, 700), bundled locally |

No animation, icon, menu, notification or component libraries. The app menu and About panel use Electron's `Menu` and `app.setAboutPanelOptions`; system notifications use Electron's `Notification`. US-0801 needs no new dependency: harness detection fits `fs` through `projectAccess` and `child_process.execFile` through `runFixed`.

## External programs the app depends on

| Program | Where | Required |
|---------|-------|----------|
| `$SHELL` (zsh on macOS, bash elsewhere, as fallback) | `pty.js`, `exec.loginPath` | yes: both terminal tabs and the PATH probe |
| `claude` (Claude Code CLI) | agent tab (`pty.js:24`) | for the agent tab today; the only harness CLI the app knows |
| `aidlc` | `setup.js`, `models.js` | for setup and the model table; missing is handled |
| `git` | `git.js`, `setup.js` | for the Github panel and setup; missing is handled |

Candidate CLIs named by US-0801: `opencode`, `codex`, `kiro-cli` (each read with `--version`).

## Build and packaging

| Tool | Version | Role |
|------|---------|------|
| electron-vite | ^6.0.0 | builds main, preload, renderer into `out/`; `dev` sets `ELECTRON_RENDERER_URL` |
| vite | ^8.3.8 | bundler; JSON locale files are imported as modules into both bundles |
| @vitejs/plugin-react | ^6.3.0 | JSX |
| electron-builder | ^26.18.0 | `.dmg` (universal, unsigned) and `.deb` (x64); output in `dist/` |

Package identity (from `package.json`): `name: thadeus`, `productName: THADEUS`, `version: 0.2.0`, author Auctum Solutions AB, homepage `https://github.com/tochman/aidlc-dash`. `electron-builder.yml` was not re-read.

## CI

GitHub Actions (`.github/workflows/release.yml`, earlier scan): `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`, `gh release create`. Runners ubuntu-latest, macos-latest, ubuntu-22.04.

## Test

| Tool | Version |
|------|---------|
| vitest | ^5.1.0 (projects `main`/node and `renderer`/jsdom; renderer setup `tests/renderer/setup-i18n.js`) |
| @testing-library/react | ^16.3.3 |
| jsdom | ^29.1.1 |

## Typography and colour

- Headings, labels, buttons, blocks and the app name: Antonio in capitals (`--font-head`).
- Body text: system font (`--font-read`); numbers and code: `--font-mono`. The terminal uses `ui-monospace, "SF Mono", Menlo, monospace` at 13 px with the token-based `xtermTheme()`.
- Palette: background `#05060a`, slate, steel blue, coral, `--alert #ff3b3b`; Auctum amber `#ff9e40` for the mark and the primary action.

## Platforms

macOS (universal) and Ubuntu 22.04 or later. No Windows target: `pty.js` and `exec.js` assume a POSIX login shell (`-l -i -c`).
