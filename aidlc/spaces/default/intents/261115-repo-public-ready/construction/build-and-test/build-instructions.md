# Build Instructions: US-1101

## Prerequisites

- Node from `.nvmrc`; `npm ci` installs the locked dependencies (its `postinstall` rebuilds `node-pty` for Electron).
- `gitleaks` for the local secret scan (`brew install gitleaks`); CI uses `gitleaks/gitleaks-action@v2`.
- No environment variables or local services are needed to build or test.

## Build

```bash
npx electron-vite build                 # out/
node scripts/third-party-licenses.mjs   # build/THIRD_PARTY_LICENSES.txt (128 packages + Electron)
npm run build:mac                       # the three steps above plus electron-builder → dist/THADEUS-<v>-universal.dmg
npm run build:linux                     # same for the .deb
```

## Verify

- `out/main/index.js` exists; `build/THIRD_PARTY_LICENSES.txt` lists the packages and ends with Electron's licence.
- The packaged app ships `THIRD_PARTY_LICENSES.txt` in `Contents/Resources/`; About → LICENSES opens it.

## Troubleshooting

- A `.dmg` built from a work copy whose `node_modules` is a symlink misses packages (`readdirp`, `@formatjs/*`): build from a real `npm ci` install, or use CI's `mac` artifact.
- Screenshots: `npm run screenshots` rebuilds and recaptures `docs/screenshots/` from invented demo projects.
