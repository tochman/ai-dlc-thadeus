# Build Instructions: US-0605

- **Dependencies:** `npm ci` (Node from `.nvmrc`). No new dependency (NFR2).
- **Environment:** none. A project with `docs/FEATURES.md` and, for planned releases, `docs/releases/X.Y.Z.md`.
- **Build:** `npx electron-vite build`. The full package build (`npm run build`) runs at release time.
- **Verify:** the build prints `✓ built`.
