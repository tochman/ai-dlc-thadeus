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
  main/            Vitest, Node-miljö (12 filer)
  renderer/        Vitest, jsdom (7 filer)
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
| Service/UseCase | `src/main/projectService.js`, `src/main/models.js`, `src/main/pty.js`, `src/main/watcher.js`, `src/main/git.js`*, `src/main/setup.js`* |
| Repository/DAO | `src/main/projectAccess.js` (skrivskyddad rotinnesluten fil-I/O), `src/main/settings.js` (enda skrivaren) |
| Model/Parser | `src/main/parsers/{audit,intents,ledger,pipeline,runtimeGraph,state,units}.js` |
| UI (Static/Asset + vy) | `src/renderer/*.jsx`, `theme.css`, `index.html` (nya sedan EPIC-05: `RefreshPanel.jsx`*, `ResumeButton.jsx`*, `SetupAidlc.jsx`*, `TerminalContext.jsx`*) |
| Utility/Helper | `src/renderer/format.js`, `src/renderer/useProject.js` (datahook), `src/renderer/terminalControl.js`*, `src/main/exec.js`* |
| Test | `tests/main/*.test.js`, `tests/renderer/*.test.jsx`, `tests/fixtures/` |
| Build-skript | `scripts/check-glibc.mjs`, `scripts/make-icon.cjs` |

\* Tillkommet med EPIC-05; klassificerat från filens inledande kommentar, inte djupläst.

## Kodmönster

- **ESM överallt** utom `scripts/make-icon.cjs` (CommonJS, körs av `electron`).
- **Rena parsers + I/O-tjänst**: parsers tar text/JSON och returnerar data; `projectService` gör all I/O. Parsermoduler som är fria från Node importeras även av renderaren (`Timeline.jsx` tar `NOISY_EVENTS` ur `parsers/audit.js`, `CostTab.jsx` tar ur `parsers/ledger.js`).
- **Aldrig-kasta-läsning**: `readJsonSafe` returnerar `{ok, missing, error}`; tjänster behåller senaste goda värde.
- **Cache per nyckel**: `projectService` håller `listCache`, `detailCache`, `costCache` (obegränsade `Map`, `ponytail:`); detalj byggs alltid om helt, cachen används bara som reserv vid fel.
- **Handler-tabell**: `ipc.js` har ett objekt `handlers` som registreras i en loop med gemensam fellogg.
- **Prenumeration med avregistrering**: preload `subscribe(channel)` returnerar en avregistreringsfunktion som hooks anropar i `useEffect`-städning.
- **Refs mot inaktuella closures**: `useProject` speglar `selected` och `detail` i refs så att push-händelser och asynkrona svar läser aktuellt värde och kastar svar för en intent som inte längre är vald.
- **Debounce med maxväntan**: `watcher.js` samlar ändringar i en `Set` och tömmer efter `min(300 ms, återstod av 800 ms)`.
- **`data-testid` på interaktiva element**, svenska UI-texter, status som text och färg.
- **Kommentarer med FR-nummer** kopplar kod till acceptanskriterier i epic-dokumenten.

## Beroendeschema (internt)

```
ipc.js -> projectAccess, projectService, parsers/ledger, models, settings, watcher, pty (+ git, setup sedan EPIC-05, ej omverifierat)
projectService.js -> projectAccess, parsers/{intents,state,runtimeGraph,audit,pipeline,units}
models.js -> projectAccess, parsers/ledger
git.js -> exec, projectAccess          (ytligt)
setup.js -> exec, git, projectAccess   (ytligt)
watcher.js -> chokidar, node:path
parsers/pipeline.js -> (typer från state, runtimeGraph)
App.jsx -> ProjectView, AuctumMark, Splash
ProjectView.jsx -> IntentList, IntentDetail, CostPanel, TerminalPanel, useProject
IntentDetail.jsx -> Pipeline, Timeline, BoltDag, ArtifactReader, CostTab, format
CostPanel.jsx -> CostTab, format
Timeline.jsx -> react, format, ../main/parsers/audit
useProject.js -> react, window.bridge
CostTab.jsx -> ../main/parsers/ledger, format
RefreshPanel.jsx / ResumeButton.jsx / SetupAidlc.jsx -> TerminalContext   (ytligt)
TerminalContext.jsx -> terminalControl                                     (ytligt)
```

Inga cirkulära beroenden hittades i fokusfilerna. Externa beroenden: se [dependencies.md](dependencies.md).
