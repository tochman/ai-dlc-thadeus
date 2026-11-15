# Build Instructions — US-0411 Pipeline cards

- **Dependencies:** `npm ci` (Node from `.nvmrc`). This work adds none.
- **Environment:** no env vars, config files or local services needed.
- **Build:** `npm run build` (`electron-vite build && electron-builder --mac`), which writes `dist/THADEUS-<version>-universal.dmg`. Code signing is skipped locally.
- **Verify:** the command exits 0 and the `.dmg` is in `dist/`. Run `npm run dev` to see the cards in the app.
- **Style:** `npx eslint .` (CI) and `npx prettier --check .`.
- **Troubleshooting:** the first build downloads Electron. The "duplicate dependency references" notice from electron-builder is harmless.
