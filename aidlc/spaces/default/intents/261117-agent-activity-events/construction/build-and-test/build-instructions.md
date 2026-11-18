# Build Instructions: US-0214

- **Install:** `npm ci` (Node from `.nvmrc`). No new dependency in this work.
- **Bundle:** `npx electron-vite build` (main, preload, renderer into `out/`).
- **Package (release only):** `npm run build:mac` / `npm run build:linux`; the `.dmg` is checked by hand before a tag.
- **Checks:** `npx vitest run tests/ --coverage`, `npx eslint .`, `npx prettier --check .`.
- **Hooks under test:** `.thadeus/hooks/dialog.sh` (POSIX sh) and `.opencode/plugins/thadeus-dialog.js` run inside the tests' temporary session folders; nothing to set up.
- **Troubleshooting:** if `dialog.sh` or `thadeus-dialog.js` match commit `53c397c`, an installed older app has rewritten them with "update hooks"; restore them from this branch before testing.
