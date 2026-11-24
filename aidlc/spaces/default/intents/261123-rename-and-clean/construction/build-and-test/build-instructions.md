# Build instructions

- **Dependencies:** `npm ci` (Node from `.nvmrc`). Nothing new was added by US-0508 or US-0043.
- **Environment:** no env vars or services. The app writes `.thadeus/intent-names.json` inside the opened project only when a person renames an intent.
- **Build:** `npx electron-vite build`, which bundles main, preload and renderer into `out/`. The packaged `.dmg`/`.deb` (`npm run build:mac`, `npm run build:linux`) is part of the release workflow, not this story workflow.
- **Verify:**
  - `npx eslint . --max-warnings 0` exits 0 (new in US-0043).
  - `npx prettier --check .` passes.
- **Troubleshooting:** a lint warning now fails `npm run lint` and CI. Fix it at its cause, as US-0043 did. Never add a rule switch.
