# Build Instructions: US-0211 Reprice recorded tokens

## Dependencies

- Node from `.nvmrc`; `npm ci` installs everything, including `@vitest/coverage-v8`. Nothing new was added by this story.

## Environment

- No environment variables are needed. An optional price override is read from the project settings field `ratesPath`, or from `env.AIDLC_MODEL_RATES` in `.claude/settings.local.json` / `.claude/settings.json` of the opened project. The app's own table ships in `src/main/data/model-rates.json`.

## Build

```bash
npx electron-vite build      # bundles main, preload and renderer into out/
npm run build                # full macOS package (electron-builder), release only
```

## Verify

- `npx electron-vite build` exits 0 and writes `out/`.
- `npx eslint .` gives no errors; `npx prettier --check .` reports all files formatted.

## Troubleshooting

- Prettier fails in CI but not locally: run `npx prettier --write <files>` on the files CI names (this happened once on PR #68).
- The renderer bundle warns about `editor.api` size (Monaco); that warning is old and harmless.
