# Build Instructions: US-0604

- **Dependencies:** `npm ci` (Node from `.nvmrc`). No new dependency (NFR1).
- **Environment:** none; a project with `docs/FEATURES.md` and epic files shows the filters.
- **Build:** `npx electron-vite build`. The full package build (`npm run build`) runs at release time.
- **Verify:** the build prints `✓ built`.
