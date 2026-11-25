# Build instructions

- **Dependencies:** `npm ci` (Node from `.nvmrc`). Nothing new.
- **Environment:** no variables or services.
- **Bundle:** `npx electron-vite build`, ends with `built in …`. The built-app tests need it first.
- **Checks:** `npx eslint . --max-warnings 0` and `npx prettier --check .` must both exit 0.
- **Suite:** `npx vitest run tests/ --coverage`.
- **Trouble:** do not run the built-app tests at the same time as the suite; timed tests slow down. `signIn.test.js` starts real shells with stand-in tools and is in the timed list.
