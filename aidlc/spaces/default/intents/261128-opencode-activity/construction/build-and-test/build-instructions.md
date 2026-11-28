# Build Instructions — US-0058

## Environment

Run from the repository root with the lockfile-installed dependencies. No external service or live opencode database is required for tests.

## Build

```bash
npx electron-vite build
```

This compiles and bundles the Electron main, preload, and renderer code without creating a platform installer. A zero exit code is the build pass criterion.

## Tests and quality checks

```bash
npx vitest run tests/ --coverage
npm run lint
npm run format:check
```

The full Vitest run must pass and report at least 80% line coverage for the configured source scope. Lint and formatting commands must exit successfully. No CI Pipeline stage runs in this quick-fix scope; CI execution is therefore not a Build and Test target.
