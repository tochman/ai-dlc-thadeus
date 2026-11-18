# Build Instructions: US-0030

- **Dependencies:** `npm ci` (Node from `.nvmrc`). No new dependencies in this work.
- **Environment:** none beyond the repository; no env vars or local services.
- **Build:** `npm run build` (electron-vite bundle, then electron-builder; on macOS it writes `dist/THADEUS-<version>-universal.dmg`, unsigned).
- **Verify:** the command exits 0 and the `.dmg` exists in `dist/`.
- **Lint and format:** `npx eslint .` (warnings allowed, errors fail) and `npx prettier --check .`.
- **Troubleshooting:** a stale `out/` or `dist/` can be removed and rebuilt; code signing is skipped locally (`identity` is null).
