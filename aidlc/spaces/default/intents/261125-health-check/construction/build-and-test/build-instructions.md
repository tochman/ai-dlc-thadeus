# Build Instructions: health check (US-0805)

Nothing new to install: this story adds no dependency and no configuration.

1. `npm ci` (Node from `.nvmrc`). Its `postinstall` rebuilds `node-pty` for Electron.
2. `npx electron-vite build`: writes `out/`, which the Playwright tests start.
3. For a package: `npm run build:mac` or `npm run build:linux`. These are not needed for this story; the release pull request builds them.

Check the build: `npx electron-vite build` ends with `✓ built`.

Troubleshooting:
- If the Playwright tests start an old app, `out/` is stale. Build again.
- The e2e tests start real login shells. A slow shell startup file can push a check towards its 20 s limit.
