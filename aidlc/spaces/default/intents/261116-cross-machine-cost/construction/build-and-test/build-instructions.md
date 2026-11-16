# Build Instructions: US-0209

## Dependencies and environment

- Node from `.nvmrc`, then `npm ci`. Its postinstall rebuilds the native modules for Electron.
- No new dependency, environment variable or local service.

## Build

```bash
npx electron-vite build
```

This bundles main, preload and renderer into `out/`. The packaged `.dmg`/`.deb` (`npm run build:mac`, `build:linux`) is release work and is not built in this stage.

## Verification

```bash
npx vitest run tests/ --coverage   # full suite plus the 80% line floor in vitest.config.mjs
npx eslint .                       # CI step, blocks the merge
npx prettier --check .             # CI step, blocks the merge
```

## Troubleshooting

- A `HTMLCanvasElement's getContext()` warning in jsdom is expected and harmless.
- If a native module fails to load, run `npm ci` again so the postinstall rebuild runs.
