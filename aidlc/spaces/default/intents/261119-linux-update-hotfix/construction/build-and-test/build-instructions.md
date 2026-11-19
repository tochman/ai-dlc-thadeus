# Build Instructions: US-0034 (v0.2.12)

- **Prerequisites:** Node from `.nvmrc`, then `npm ci`.
- **Bundle:** `npx electron-vite build`.
- **Packages:**
  - macOS: `npm run build:mac` (universal `.dmg`).
  - Linux: `npm run build:linux` (`.deb`).
  - CI builds both on the `v0.2.12` tag (`.github/workflows/release.yml`).
- **Checks:** `npx eslint src tests`, `npx prettier --check .`, `npx vitest run tests/ --coverage`.
