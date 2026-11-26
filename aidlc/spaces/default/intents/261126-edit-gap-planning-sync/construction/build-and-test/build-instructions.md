# Build Instructions: US-0051 and US-0053

## Setup

- Node from `.nvmrc`; `npm ci` installs the dependencies.
- No environment variables or local services. The planning-sync tests make their own git repositories in the OS temp folder.

## Build

```bash
npm run build
```

Writes `out/` (main, preload, renderer), which the built-app Playwright tests launch.

## Verify

```bash
npx vitest run tests/ --coverage
```

```bash
npx eslint .
```

```bash
npx prettier --check .
```

```bash
npx playwright test tests/e2e/speckitLayout.spec.js
```

## Troubleshooting

- An e2e test that opens an old layout: run `npm run build` again, because `out/` is what Playwright launches.
- A planning-sync test that times out on a loaded machine: the file gives real-git tests 20 s (`vi.setConfig`). Do not raise it; find out why it is slow.
