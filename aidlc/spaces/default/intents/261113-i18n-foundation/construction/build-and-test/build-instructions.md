# Build Instructions: US-0701 i18n foundation and English

## Dependencies

- Node version from `.nvmrc`, with npm.
- `npm install`. This installs the four new runtime dependencies, `i18next`, `react-i18next`, `i18next-icu` and `intl-messageformat`, and runs the existing `postinstall` (electron-builder native deps and the node-pty permissions fix).

## Environment

- No environment variables or local services are needed.
- The language files are plain JSON under `src/shared/locales/`. Both the main process and the renderer import them, so no copy step is needed.
- The chosen language is stored as `language` in the app's own `settings.json` under Electron's `userData`. Delete the key to go back to Automatic.

## Build

| Step | Command | What it does |
|------|---------|--------------|
| Bundle | `npx electron-vite build` | Builds main, preload and renderer into `out/` |
| Package (macOS) | `npm run build` | Bundle plus electron-builder `--mac` |
| Develop | `npm run dev` | electron-vite dev server with hot reload |

## Verify

- `npx electron-vite build` exits 0. `out/main/index.js` and `out/renderer/assets/index-*.js` contain the language keys, for example `"menu"` and `"intents"`.
- Run `npm run dev`. Open Settings and switch "Språk / Language" to English. The view and the menu bar switch at once, with no restart.

## Troubleshooting

- **Main process fails with "Cannot find module 'i18next'":** run `npm install`. Main loads `i18next` and `i18next-icu` from `node_modules` (electron-vite `externalizeDeps`).
- **A text shows its key, such as `intents.resume`:** the key is missing in both files. `tests/main/i18nKeys.test.js` names it.
