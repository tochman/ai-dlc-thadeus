# Build Instructions: v0.2.4

## Prerequisites

- Node from `.nvmrc`, and npm.
- macOS for `build:mac`; Linux (or CI's `build-linux` job) for `build:linux`.

## Install

```bash
npm ci
```

`postinstall` rebuilds native modules (`node-pty`) for Electron and fixes the pty helper's permissions.

`monaco-editor` and `@monaco-editor/react` are devDependencies (US-1001). electron-vite bundles them into the renderer, so the packaged app ships no `node_modules/monaco-editor`.

## Build

| Purpose | Command | Output |
|---------|---------|--------|
| Bundle only (main, preload, renderer) | `npx electron-vite build` | `out/` |
| macOS app (`.dmg`, unsigned) | `npm run build:mac` | `dist/` |
| Linux app (`.deb`) | `npm run build:linux` | `dist/` |
| Development | `npm run dev` | live app |

## Verify the build

- `npx electron-vite build` ends with `✓ built`.
- `out/renderer/assets/` contains `index-*.js` (the startup chunk, about 2.2 MB) and the lazily loaded Monaco chunks: `editor.api-*.js`, `MonacoPane-*.js`, `workers-*.js`, the language modes and the worker files.
- For a packaged build, `npx asar list dist/mac-universal/THADEUS.app/Contents/Resources/app.asar` lists the worker files under `out/renderer/assets/`.

## Troubleshooting

- **node-pty fails to load:** run `npm rebuild` or `npx electron-builder install-app-deps`. The terminal tab shows the load error, and the rest of the app keeps working.
- **The editor is stuck on "Loading…":** Monaco must come from the bundle (`loader.config({ monaco })`), never the CDN. Check `src/renderer/editor/monacoSetup.js`, and that the CSP in `src/renderer/index.html` has `worker-src 'self' blob:`.
- **`git pull` refuses:** pull is set to rebase, and the workflow keeps uncommitted files under `aidlc/`. Use `git fetch` and `git merge --ff-only origin/main`.
