# Build Instructions — US-1303

- **Dependencies:** `npm ci` (Node from `.nvmrc`). No new dependency in this story.
- **Environment:** none needed; the feature reads `aidlc/`, the feature docs and the usage ledger, and writes only `.thadeus/story-links.json`.
- **Build (bundle):** `npx electron-vite build`. Output in `out/`.
- **Full packaged build:** `npm run build` (adds the licence list and `electron-builder --mac`); only needed for the release hand check.
- **Verify:** the bundle step ends with `✓ built in …`; then `npm run dev` and open a project's Features view and Cost view.
- **Troubleshooting:** a stale `out/` is overwritten by the next build; ESLint `npx eslint .` and Prettier `npx prettier --check .` must be clean before the pull request.
