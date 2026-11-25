# Build instructions

- **Dependencies:** `npm ci` (Node from `.nvmrc`). Nothing new.
- **Environment:** no variables or services.
- **Bundle:** `npx electron-vite build`, ends with `built in …`. The built-app tests need it first.
- **Checks:** `npx eslint . --max-warnings 0` and `npx prettier --check .` must both exit 0.
- **Trouble:** do not run the built-app tests at the same time as the suite; timed tests slow down.
