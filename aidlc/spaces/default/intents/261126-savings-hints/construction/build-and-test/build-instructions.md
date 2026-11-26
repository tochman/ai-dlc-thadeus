# Build Instructions — US-1302 Savings hints

## Prerequisites

- Node as pinned for the project, `npm ci` from the repository root (its `postinstall` rebuilds the native modules for Electron).
- No new dependencies, environment variables or services for this story.

## Build

```bash
npx electron-vite build
```

Builds `out/main`, `out/preload` and `out/renderer`. Packaging (`npm run build`, which adds `electron-builder --mac`) is the release pull request's job, not this story's.

## Checks

```bash
npx eslint . --max-warnings 0
npx prettier --check .
npx vitest run tests/ --coverage
```

## Troubleshooting

- A native module error at start: run `npm ci` again so `postinstall` rebuilds for Electron.
- `tests/main/fileWrite.test.js` fails when a new module imports `writeAtomic`: add it to the list there with the reason its write path is safe.
