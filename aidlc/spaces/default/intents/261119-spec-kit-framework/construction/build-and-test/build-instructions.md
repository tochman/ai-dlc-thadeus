# Build instructions

- **Dependencies:** `npm ci` (Node from `.nvmrc`). New in this epic: `yaml` 2.x, used in the main process only (U7).
- **Environment:** no environment variables or services. The tests make their own temporary folders.
- **Bundle:** `npx electron-vite build`. Success ends with `built in …`, and `out/` holds main, preload and renderer.
- **Checks:** `npx eslint . --max-warnings 0` and `npx prettier --check .` must both exit 0.
- **macOS `.dmg` for the hand check:** `npm run build:mac` on the release commit writes the universal `.dmg` to `dist/`. This belongs to the v0.3.0 release, not to this work.
- **Published builds:** the tag `v0.3.0` drives `.github/workflows/release.yml`.

## Troubleshooting

- `node-pty` fails to load: run `npm ci` again (its `postinstall` fixes permissions).
- The end-to-end tests drive the built app, so run `npx electron-vite build` first.
- A wall-clock test is slow on a loaded machine: those in the `scripts` project retry twice. Do not run the end-to-end tests at the same time as the suite.
