# Build Instructions — US-0055 A failed replay is kept after a real planning commit

- Dependencies: `npm ci`; nothing new.
- Environment: nothing new.
- Build: `npx electron-vite build` (bundles into `out/`); the full package (`npm run build`) is for releases only.
- Verify: the build exits 0; `npm run lint` and `npx prettier --check .` exit 0.
- Troubleshooting: use `electron-vite`, not bare `vite build`.
