# Build Instructions: US-0504

1. `npm ci` (no new dependency).
2. `npx vitest run tests/`
3. `npx eslint .` and `npx prettier --check .`
4. `npx electron-vite build`; the release `.dmg` comes from `.github/workflows/release.yml` on a tag.
