# Code Structure — aidlc-dash

## Kataloglayout

```
src/
  main/            huvudprocess (Node, ESM)
    parsers/       rena tolkningsfunktioner, inga Node-importer
  preload/         contextBridge-API
  renderer/        React-UI (JSX), CSS, index.html
scripts/           byggverktyg (glibc-kontroll, ikongenerering)
tests/
  main/            Vitest, Node-miljö
  renderer/        Vitest, jsdom
  fixtures/        fiktivt AI-DLC-projekt, ledger, audit-shards, plain-folder
docs/              FEATURES.md + features/epic-0X-*.md
build/             electron-builder-resurser (ikoner)
.github/workflows/ release.yml
```

## Filklassificering

| Kategori | Filer |
|---|---|
| Configuration | `src/main/index.js` (fönster, säkerhetsflaggor), `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`, `package.json` |
| Controller/Handler | `src/main/ipc.js` (IPC-handlers), `src/preload/index.js` (brygga) |
| Service/UseCase | `src/main/projectService.js`, `src/main/models.js`, `src/main/pty.js`, `src/main/watcher.js` |
| Repository/DAO | `src/main/projectAccess.js` (skrivskyddad rotinnesluten fil-I/O), `src/main/settings.js` (enda skrivaren) |
| Model/Parser | `src/main/parsers/{audit,intents,ledger,pipeline,runtimeGraph,state,units}.js` |
| UI (Static/Asset + vy) | `src/renderer/*.jsx`, `theme.css`, `index.html` |
| Utility/Helper | `src/renderer/format.js`, `src/renderer/useProject.js` (datahook) |
| Test | `tests/main/*.test.js`, `tests/renderer/*.test.jsx`, `tests/fixtures/` |
| Build-skript | `scripts/check-glibc.mjs`, `scripts/make-icon.cjs` |

## Kodmönster

- **ESM överallt** utom `scripts/make-icon.cjs` (CommonJS, körs av `electron`).
- **Rena parsers + I/O-tjänst**: parsers tar text/JSON och returnerar data; `projectService` gör all I/O. Parsermoduler som är fria från Node importeras även av renderaren (`Timeline.jsx`, `CostTab.jsx`).
- **Aldrig-kasta-läsning**: `readJsonSafe` returnerar `{ok, missing, error}`; tjänster behåller senaste goda värde.
- **Handler-tabell**: `ipc.js` har ett objekt `handlers` som registreras i en loop med gemensam fellogg.
- **Prenumeration med avregistrering**: preload `subscribe(channel)` returnerar en avregistreringsfunktion som hooks anropar i `useEffect`-städning.
- **Refs för imperativ terminal-API**: `TermSession` publicerar `{insert}` via `sessionRef` (endast claude-fliken).
- **`data-testid` på interaktiva element**, svenska UI-texter, status som text och färg.
- **Kommentarer med FR-nummer** kopplar kod till acceptanskriterier i epic-dokumenten.

## Beroendeschema (internt)

```
ipc.js -> projectAccess, projectService, parsers/ledger, models, settings, watcher, pty
projectService.js -> projectAccess, parsers/{intents,state,runtimeGraph,audit,pipeline,units}
models.js -> projectAccess, parsers/ledger
parsers/pipeline.js -> (typer från state, runtimeGraph)
App.jsx -> ProjectView, AuctumMark, Splash
ProjectView.jsx -> IntentList, IntentDetail, CostPanel, TerminalPanel, useProject
IntentDetail.jsx -> Pipeline, Timeline, BoltDag, ArtifactReader, CostTab, format
CostPanel.jsx -> CostTab, format
Timeline.jsx -> format, ../main/parsers/audit
CostTab.jsx -> ../main/parsers/ledger, format
```

Inga cirkulära beroenden hittades. Externa beroenden: se [dependencies.md](dependencies.md).
