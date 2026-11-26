# Build Instructions: US-0050

## Setup

Node from `.nvmrc`; `npm ci`. No environment variables or services.

## Build

```bash
npm run build
```

Writes `out/`, which the built-app tests launch.

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
npx playwright test tests/e2e/motion.spec.js tests/e2e/intentLayout.spec.js tests/e2e/speckitLayout.spec.js
```

## Troubleshooting

- A motion test that finds no animation: the built app is stale; run `npm run build` again.
- The frame-time test (p95 ≤ 20 ms) is sensitive to machine load; rerun on an idle machine before raising anything (the limit is the story's 60 fps target and is not raised).
