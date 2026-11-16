# Build Instructions: US-0208

- **Dependencies:** `npm ci` (Node from `.nvmrc`). New: seven `@visx/*` packages (axis, grid, group, responsive, scale, shape, tooltip), NFR1.
- **Environment:** none. Readings are written to the opened project's `.thadeus/tokens/` while the app watches it.
- **Build:** `npx electron-vite build`. The full package build (`npm run build`) runs at release time.
- **Verify:** the build prints `✓ built`.
