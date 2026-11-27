# Build Instructions — US-0056 The planning sync never commits a file in the middle of a merge

- Dependencies: `npm ci`; nothing new.
- Environment: nothing new.
- Build: `npx electron-vite build` (bundles into `out/`); `npm run build` also makes the `.dmg` and is for releases.
- Verify: the build exits 0; `npx eslint .` and `npx prettier --check .` exit 0.
- Troubleshooting: use `electron-vite`, not bare `vite build`.
