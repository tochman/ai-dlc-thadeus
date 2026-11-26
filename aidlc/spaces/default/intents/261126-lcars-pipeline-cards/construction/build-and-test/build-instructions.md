# Build Instructions — US-0412 LCARS pipeline cards

## Prerequisites

- Node as pinned in `.nvmrc`; dependencies with `npm ci`. No new dependency in this work.
- No environment variables or local services are needed for the build or the tests.

## Build

```bash
npx electron-vite build
```

Bundles main, preload and renderer into `out/`. The full `npm run build` also packages a macOS `.dmg` with electron-builder; that is the release check by hand, not part of this stage.

## Verify

- The build ends with `✓ built in …` and exit code 0.
- `npm run lint` (ESLint, `--max-warnings 0`) and `npm run format:check` (Prettier) exit 0.

## Troubleshooting

- A stale `out/` folder never affects the tests; vitest reads `src/` directly.
- Large-chunk warnings for Monaco and the renderer bundle are expected and existed before this work.
