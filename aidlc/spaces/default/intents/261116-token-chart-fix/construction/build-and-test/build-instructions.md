# Build Instructions: US-0024 Token chart fix

- Dependencies: `npm install`. Nothing new.
- Bundle: `npx electron-vite build` → `out/`. Full macOS package: `npm run build` (not run here; the `.dmg` is checked by hand before a release tag).
- Verify: `npx vitest run tests/` passes; `npx vitest run tests/ --coverage` exits 0; `npx prettier --check .` and `npx eslint .` show no errors.
- Troubleshooting: the jsdom notice `HTMLCanvasElement's getContext() … not implemented` is harmless.
