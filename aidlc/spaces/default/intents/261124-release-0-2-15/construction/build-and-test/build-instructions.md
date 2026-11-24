# Build instructions

- **Dependencies:** `npm ci` (Node from `.nvmrc`). Nothing new in this release.
- **Bundle:** `npx electron-vite build`.
- **macOS `.dmg` for the hand check:** `npm run build:mac` on the release commit, which writes the universal `.dmg` to `dist/`. Open it, install it, start the app and check that About shows 0.2.15.
- **Published builds:** the tag `v0.2.15` drives `.github/workflows/release.yml`: verify, then build-mac (`.dmg`) and build-linux (`.deb`), then a release with `SHA256SUMS.txt`.
- **Verify:** `npx eslint . --max-warnings 0` and `npx prettier --check .` pass.
