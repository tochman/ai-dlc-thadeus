# Build Instructions: v0.2.3

## Prerequisites

- Node from `.nvmrc`, npm.
- For US-0407 at run time: the `gh` CLI, logged in with access to `tochman/aidlc-dash` (`gh auth status`).
- For US-0904's opencode section: `opencode` on PATH (optional; without it the section is read-only).

## Install

```bash
npm ci
```

`postinstall` rebuilds node-pty for Electron and fixes its spawn-helper permissions.

## Build

```bash
npx electron-vite build        # compiles main, preload and renderer into out/
npm run build:mac              # out/ + universal THADEUS-0.2.3-universal.dmg in dist/
npm run build:linux            # out/ + thadeus_0.2.3_amd64.deb in dist/ (on Linux / CI)
```

## Verify

- `npx electron-vite build` ends with three `✓ built` lines (main, preload, renderer).
- `npx vitest run tests/` runs the full suite.
- `npm run dev` starts the app; the configuration view shows the change panels, and Hjälp/app menu shows "Sök efter uppdatering…".

## Troubleshooting

- **The update check says gh is missing or logged out:** run `gh auth login`. The app keeps running either way.
- **A node-pty error at start:** run `npm ci` again so `postinstall` rebuilds the native module for the current Electron.
- **"Kunde inte sätta Dock-ikonen" when running a script from `tests/.tmp`:** harmless. The icon path is resolved relative to the script folder.
