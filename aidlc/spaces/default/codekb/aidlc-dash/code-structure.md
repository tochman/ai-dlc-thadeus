# Kodstruktur: aidlc-dash

## Katalogöversikt

```
src/
  main/            Electron huvudprocess (Node, ESM)
    parsers/       rena tolkningsfunktioner utan I/O
  preload/         contextBridge-API
  renderer/        React 19-UI, index.html, theme.css
tests/
  main/            Vitest, node-miljö
  renderer/        Vitest, jsdom
  fixtures/        fixturprojekt (aidlc/-träd), audit-shards, trasig JSON
docs/              FEATURES.md + epics under features/
.github/workflows/ release.yml
```

Varje komponents ansvar och beroenden finns i `component-inventory.md`; bibliotek i `technology-stack.md`.

## Filklassificering

| Kategori | Filer |
|---|---|
| Configuration | `src/main/index.js`, `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`, `.nvmrc` |
| Controller/Handler | `src/main/ipc.js`, `src/preload/index.js` |
| Service/UseCase | `src/main/projectService.js`, `src/main/watcher.js`, `src/main/pty.js` |
| Repository/DAO | `src/main/projectAccess.js` (skrivskyddad), `src/main/settings.js` (enda skrivaren) |
| Model/Entity (parsers) | `src/main/parsers/*.js` |
| Utility/Helper | `src/renderer/format.js`, `src/renderer/useProject.js` (datahook) |
| Static/Asset (vyer) | `src/renderer/*.jsx`, `index.html`, `theme.css` |
| Test | `tests/main/*.test.js`, `tests/renderer/*.test.jsx`, `tests/fixtures/` |

## Kodmönster

- **Ingen TypeScript**; JSDoc-typer på några publika funktioner (`watcher.js`, `pipeline.js`).
- **Parsers är rena funktioner** (text/JSON in, objekt ut) och testas med fixturer; I/O ligger i `projectService`.
- **Felhantering**: IPC-wrappern loggar och kastar vidare (`ipc.js:96-107`); renderern rensar Electrons prefix med `errorText` och visar banner. `readJsonSafe` kastar aldrig.
- **Senaste giltiga värde**: moduler-nivåns `Map`-cacher i `projectService` används när en fil är halvskriven.
- **Namngivning**: camelCase, verb+substantiv; UI-texter och felmeddelanden på svenska; `data-testid` i kebab-case på interaktiva element.
- **Krav-ID i kommentarer och testnamn** (`FR7.2`, `NFR2`), spårbart mot EPIC-01.
- **Medvetna förenklingar** märks `ponytail:` (`projectService.js:12`, `Timeline.jsx:6`).

## Beroenden mellan moduler

Inga cirkulära importer. Enda korsningen mellan processlager: `renderer/Timeline.jsx` → `main/parsers/audit.js`. Full graf i `dependencies.md`.
