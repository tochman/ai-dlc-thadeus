# Build Instructions: Release v0.2.14

No new dependencies or build steps. As before:

- Install: `npm ci`
- Run in development: `npm run dev`
- Build the app for the end-to-end tests: `npx electron-vite build`
- Build the macOS app: `npm run build` (electron-builder, universal `.dmg` in CI via `npm run build:mac`)
- README screenshots: `npm run screenshots` (writes `docs/screenshots/`)
