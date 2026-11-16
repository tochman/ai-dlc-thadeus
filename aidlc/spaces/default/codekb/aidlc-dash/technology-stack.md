# Technology Stack

Versions are the ones locked in `package-lock.json` at `721e051`. The `package.json` ranges for the renderer libraries were re-checked at `f46cb71` and are unchanged.

## Languages and Runtime

| Item | Version | Notes |
|---|---|---|
| JavaScript (ES modules) and JSX | ES latest | no TypeScript; JSDoc types in places |
| Node.js | 22 (`.nvmrc`) | CI uses `node-version-file` |
| Electron | 45.3.1 | main, preload, sandboxed renderer (Chromium) |
| POSIX sh | n/a | `.thadeus/hooks/dialog.sh`, tested under dash in CI |
| CSS | n/a | one stylesheet, `src/renderer/theme.css`, LCARS tokens |

## Frameworks and Libraries (runtime)

| Library | Version | Purpose |
|---|---|---|
| react, react-dom | 19.3.1 | renderer UI; `createPortal` is available but not used yet |
| @xterm/xterm, @xterm/addon-fit | 6.0.0, ^0.11 | terminal tabs |
| node-pty | 1.1.0 | ptys (native, unpacked from asar) |
| chokidar | 4.0.3 | file watching |
| i18next, i18next-icu, react-i18next, intl-messageformat | 27.1.1, 2.7.0, 18.0.1, ^12.1 | translation with ICU |
| react-markdown, remark-gfm | 10.1.0, ^4.0 | Markdown in the artifact reader and replies |
| @visx/* (axis, grid, group, responsive, scale, shape, tooltip) | 4.0.0 | token charts; `@visx/tooltip` is used only by the "Tokens over time" chart |
| @tanstack/react-virtual | 3.14.24 | the virtualised timeline |
| @fontsource/antonio | ^5.3 | LCARS font |

No tooltip or positioning library (floating-ui, popper, radix, tippy) is installed. Placement inside the window would be done with DOM measurement, or with `@visx/tooltip`'s `TooltipWithBounds` export (documented by visx; not checked in `node_modules`, which the scan does not open).

## Build and Tooling (dev)

| Tool | Version | Purpose |
|---|---|---|
| electron-vite, vite, @vitejs/plugin-react | 6.0.0, 8.3.8, ^6.3 | bundling of the three processes |
| electron-builder | 26.18.0 | dmg and deb packaging |
| vitest, @vitest/coverage-v8 | 5.1.0 | tests (projects `main`, `scripts`, `renderer`) and coverage |
| jsdom, @testing-library/react | 29.1.1, ^16.3 | renderer tests; jsdom does no layout, so `getBoundingClientRect` returns zeros unless it is stubbed |
| eslint (flat), eslint-plugin-react, eslint-plugin-react-hooks, eslint-config-prettier, globals | 9.39.5 | lint |
| prettier | 3.10.1 | formatting (width 160, single quotes, semicolons) |
| monaco-editor, @monaco-editor/react | 0.57.0, ^4.7 | editor, bundled and lazy-loaded |

## External Programs Used at Run Time

The app calls `aidlc` (AI-DLC CLI), `git`, `gh` (updater fallback), the agent CLIs `claude` and `opencode`, and the login shell (`$SHELL`). It calls them only through `runFixed` or the pty, with paths from Tools Registry.

## Platforms

macOS universal (unsigned `.dmg`) and Linux x64 `.deb`, built on ubuntu-22.04 to keep the glibc floor at 2.35. Windows is not targeted.
