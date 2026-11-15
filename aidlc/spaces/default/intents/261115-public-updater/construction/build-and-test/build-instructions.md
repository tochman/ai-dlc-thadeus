# Build Instructions: US-0413

- **Dependencies:** `npm ci` (Node from `.nvmrc`). This work adds no dependency (NFR1).
- **Environment:** none. The update check needs no token or `gh`; `gh` is only the fallback.
- **Build:** `npx electron-vite build` (main, preload, renderer bundles). The full package build is `npm run build` (adds the licence file and `electron-builder --mac`) and runs at release time.
- **Verify:** the build prints `✓ built`, and `out/main/index.js` exists.
- **Troubleshooting:** a worktree whose `node_modules` is a symlink misses packages when packaging; take the `.dmg` from the CI artifact instead (`gh run download <run> -n mac`).
