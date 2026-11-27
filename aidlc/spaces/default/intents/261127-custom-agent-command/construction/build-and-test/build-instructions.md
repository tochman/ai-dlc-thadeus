# Build Instructions: US-0806

## Install

```bash
npm ci
```

Node from `.nvmrc`. No new dependency in this story.

## Build

```bash
npx electron-vite build
```

Output in `out/`. A packaged app (`npm run build:mac`, `npm run build:linux`) is only needed for a release.

## Verify

- `npm run lint` and `npm run format:check` exit 0.
- `npx vitest run tests/ --coverage` exits 0 with lines at or above 80%.
- `npx playwright test` after the build drives the built app.

## Troubleshooting

- Playwright fails to launch on Linux: run under `xvfb-run -a` and allow unprivileged user namespaces, as `release.yml` does.
- The `scripts` project's timed hook tests are retried twice; a single retry in the log is not a failure.
