# Build Instructions: US-0213 + US-0026

- **Install:** `npm ci` (Node from `.nvmrc`). No new dependency in this work.
- **Bundle (used here):** `npx electron-vite build` bundles main, preload and renderer into `out/`.
- **Full package (before a release):** `npm run build` runs electron-vite, the third-party licence list, and `electron-builder --mac` for the `.dmg`. The team's manual `.dmg` check comes before the tag.
- **Run in development:** `npm run dev`.
- **Checks:** `npm run lint` (ESLint, errors block), `npm run format:check` (Prettier), `npm run coverage` (full suite with V8 coverage).
- **Hooks after updating:** the THADEUS hook files changed (`.thadeus/hooks/dialog.sh`, `.opencode/plugins/thadeus-dialog.js`, entries in `.claude/settings.json`). An existing install shows "hooks out of date" until it is updated through the hooks preview, and Claude Code must then be restarted for the new entries to load.
- **Troubleshooting:** "hooks out of date (dialog.sh edited by hand)" while working on the hook script is expected; apply the preview's Update. Large renderer chunks (Monaco) in the build output are normal.
