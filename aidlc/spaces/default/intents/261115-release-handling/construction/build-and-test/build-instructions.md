# Build Instructions — US-0603

## Dependencies

`npm ci` (Node from `.nvmrc`). No new dependency in this story.

## Build

```bash
npx electron-vite build
```

Builds the main, preload and renderer bundles into `out/`. Packaging (`npm run build`, which adds `electron-builder --mac`) is for the release workflow, not this story.

## Verify

- The build ends with `✓ built in …` and no error.
- `npx eslint .` reports 0 errors.
- `npx prettier --check .` reports "All matched files use Prettier code style!".

## Troubleshooting

- A Prettier failure on new files: `npx prettier --write <files>`, then check again.
- `node-pty` errors after a Node change: `npm ci` reruns `postinstall` (`electron-builder install-app-deps`).
