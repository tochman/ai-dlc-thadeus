# Build instructions

- **Dependencies:** `npm ci` (Node from `.nvmrc`). US-0047 adds none.
- **Environment:** no env vars or services. The tests make their git repositories in a temporary folder.
- **Build:** `npx electron-vite build`, which bundles main, preload and renderer. The packaged `.dmg`/`.deb` belongs to the release workflow.
- **Verify:** `npm run lint` and `npx prettier --check .` both exit 0.
- **Troubleshooting:** a sync test that hits its 20 s limit on a busy machine is rerun alone before it is called a failure. The limit is never raised.
