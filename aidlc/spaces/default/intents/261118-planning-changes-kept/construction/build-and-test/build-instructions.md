# Build Instructions: US-0608

## Prerequisites

- Node from `.nvmrc`, `npm ci` (installs `@playwright/test`, added by this work as a devDependency).
- git on the PATH (the sync tests and the end-to-end tests use real repositories in temp folders).
- No environment variables for a normal build. `THADEUS_E2E_USER_DATA` is set only by `tests/e2e/planning.spec.js`, to a temp folder.

## Build

```bash
npx electron-vite build        # main, preload and renderer into out/
npm run build:mac              # packaged .dmg (macOS, release only)
```

Verify: the command exits 0 and `out/main/index.js` exists (the end-to-end tests launch it).

## Checks before merge

```bash
npx vitest run tests/ --coverage          # full suite, 80% line floor in vitest.config.mjs
npx eslint .                              # 0 errors required
npx prettier --check .
npx playwright test                       # after the build; on Linux: xvfb-run -a npx playwright test
```

## Troubleshooting

- Ubuntu 24.04 runners need `sysctl -w kernel.apparmor_restrict_unprivileged_userns=0` before Electron starts (in `verify`).
- The e2e needs `net.isOnline()` to be true.
- `out/renderer/assets/*` file names change on every build; they are build output, not source.
