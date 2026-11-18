# Build Instructions: v0.2.9 release

- Install: `npm ci`. Node comes from `.nvmrc`.
- Build: `npm run build`. Locally this produced `dist/THADEUS-0.2.9-universal.dmg`, unsigned (identity null).
- In CI, the release PR's `build-mac` and `build-linux` jobs in `.github/workflows/release.yml` build the `.dmg` and the `.deb`. The `.dmg` for the hand check comes from that run: `gh run download <run> -n mac` (FR3).
