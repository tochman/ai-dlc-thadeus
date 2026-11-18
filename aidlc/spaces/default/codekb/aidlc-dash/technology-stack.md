# Technology Stack

The versions are the ones locked in `package-lock.json` at `721e051`. This run (`39a3dbf`) re-read `package.json`: the ranges below still hold, and no dependency was added. The lock file was not re-read.

## Languages and Runtime

| Item | Version | Notes |
|---|---|---|
| JavaScript (ES modules) and JSX | ES latest | no TypeScript; JSDoc types in places |
| Node.js | 22 (`.nvmrc`) | CI uses `node-version-file` |
| Electron | 45.3.1 | main, preload, sandboxed renderer (Chromium) |
| POSIX sh | n/a | `.thadeus/hooks/dialog.sh` (POSIX plus `sleep 0.1` and `head -c`) |
| CSS | n/a | one stylesheet, `src/renderer/theme.css`, LCARS tokens |

## Frameworks and Libraries (runtime)

| Library | Version | Purpose |
|---|---|---|
| react, react-dom | 19.3.1 | renderer UI; `createPortal` in `Tooltip.jsx` |
| @xterm/xterm, @xterm/addon-fit | 6.0.0, ^0.11 | terminal tabs |
| node-pty | 1.1.0 | ptys (native, unpacked from asar) |
| chokidar | 4.0.3 | file watching (`watcher.js`), the feature-docs watch included |
| i18next, i18next-icu, react-i18next, intl-messageformat | 27.1.1, 2.7.0, 18.0.1, ^12.1 | translation with ICU |
| react-markdown, remark-gfm | 10.1.0, ^4.0 | Markdown in the artifact reader and replies |
| @visx/* | 4.0.0 | token and velocity charts |
| @tanstack/react-virtual | 3.14.24 | the virtualised timeline |
| @fontsource/antonio | ^5.3 | LCARS font |

No date library is installed; `Date` and `Intl` are used. Release planning uses only Node built-ins (`node:crypto` for sha1/sha256 and UUIDs, `node:fs`).

## Build and Tooling (dev)

| Tool | Version | Purpose |
|---|---|---|
| electron-vite, vite, @vitejs/plugin-react | 6.0.0, 8.3.8, ^6.3 | bundling of the three processes; `out/` is the build |
| electron-builder | 26.18.0 | dmg and deb packaging |
| vitest, @vitest/coverage-v8 | 5.1.0 | tests and coverage |
| jsdom, @testing-library/react | 29.1.1, ^16.3 | renderer tests; jsdom does no layout |
| eslint (flat), eslint-plugin-react, eslint-plugin-react-hooks, eslint-config-prettier, globals | 9.39.5 | lint |
| prettier | 3.10.1 | formatting (width 160, single quotes, semicolons) |
| monaco-editor, @monaco-editor/react | 0.57.0, ^4.7 | editor, bundled and lazy-loaded |

No end-to-end tool is installed. US-0608 names Playwright's Electron support (`_electron.launch`) as the likely choice; it would be a new dev dependency. On the ubuntu runner it also needs a built app (`electron-vite build`) and a display (`xvfb-run`).

## External Programs Used at Run Time

The app calls `aidlc` (the AI-DLC CLI), `git`, `gh` (the updater's fallback, plus release planning's protection check and pull requests), the agent CLIs `claude` and `opencode`, and the login shell (`$SHELL`). It calls them only through `runFixed` or the pty, with paths from the Tools Registry. Release planning needs `git worktree` and `rebase`; `git merge-tree --write-tree` (US-1201) needs git 2.38 or later. `gh` must be signed in for the protected-`main` path; without it the release list offers the pull request by hand.

Agent progress depends on the hook payloads of Claude Code and of opencode 2.1.4's V2 events (kept from `0ebb196`).

## Platforms

macOS universal (unsigned `.dmg`) and Linux x64 `.deb`, built on ubuntu-22.04 to keep the glibc floor at 2.35. Windows is not targeted.
