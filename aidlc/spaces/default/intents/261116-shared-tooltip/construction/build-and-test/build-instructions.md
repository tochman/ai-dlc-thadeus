# Build Instructions: US-0414

- **Setup:** Node from `.nvmrc`, then `npm ci`. No new dependency, environment variable or service.
- **Build:** `npx electron-vite build` bundles main, preload and renderer into `out/`. The `.dmg`/`.deb` packaging is release work.
- **Verify:**
  - `npx vitest run tests/ --coverage`: the full suite, with the 80% line floor.
  - `npx eslint .` and `npx prettier --check .`: the CI steps.
- **Troubleshooting:** jsdom's `HTMLCanvasElement getContext` warning is expected. If a native module fails to load, run `npm ci` again.
