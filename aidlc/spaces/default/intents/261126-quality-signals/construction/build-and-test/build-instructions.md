# Build Instructions — US-1305 Quality signals next to cost

## Dependencies

`npm ci` (Node as pinned by the repository). No new dependency in this story.

## Environment

Nothing new: no env vars, config files or local services. The quality signals are read from the project's own `aidlc/` folder at run time.

## Build

```bash
npx electron-vite build     # main, preload and renderer bundles into out/
npm run build               # full macOS package (electron-vite + licenses + electron-builder), release only
```

## Verify

- `npx electron-vite build` exits 0 and writes `out/main`, `out/preload`, `out/renderer`.
- `npm run lint` (ESLint, `--max-warnings 0`) and `npx prettier --check .` exit 0.

## Troubleshooting

- `npx vite build` alone fails: this is an Electron project, use `electron-vite`.
- A renderer test can time out under full-suite load (seen once with `SpeckitFeatures.test.jsx`); rerun it alone before treating it as a failure.
