# Build Instructions: US-0033

## Prerequisites

Node from `.nvmrc`; `npm ci` once (nothing new to install for this work).

## Build

```bash
npx electron-vite build
```

Builds the main, preload and renderer bundles into `out/`. The packaged `.dmg` (`npm run build:mac`) is the release's manual check, not this story's.

## Verify

- Build exits 0 and ends with `✓ built in …`.
- `npm run coverage` (full suite with the 80% line floor in `vitest.config.mjs`), `npx eslint .` and `npx prettier --check .` exit 0.

## Troubleshooting

- A large-chunk warning from Vite on the Monaco bundles is expected.
