# Kodstruktur: aidlc-dash

## Katalogöversikt

```
src/
  main/          Electron-huvudprocess (Node, ESM): index.js (fönster), ipc.js, settings.js, tjänster
    parsers/     rena parsers för AI-DLC-filer (används även av renderaren)
  preload/       contextBridge-API (window.bridge)
  renderer/      React-SPA: komponenter (.jsx), Lcars.jsx, tokens.js, hooks, hjälpare, theme.css, index.html
tests/
  main/          Vitest, node-miljö (15 filer)
  renderer/      Vitest + Testing Library, jsdom (13 filer)
  fixtures/      exempelprojekt, audit-shards, ledger, feature-dokument
scripts/         ikongenerering, node-pty-rättigheter, glibc-kontroll
build/           ikonkällor (icon.svg, icon.png, icons/NxN.png)
docs/            FEATURES.md och en fil per epic
.github/workflows/release.yml
```

## Filklassificering

| Kategori | Filer |
|----------|-------|
| Configuration | `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`, `.nvmrc`, `src/renderer/index.html` (CSP) |
| Entry | `src/main/index.js` (fönster, userData-sökväg, Dock-ikon i dev, livscykel) |
| Controller/Handler | `src/main/ipc.js`, `src/preload/index.js` |
| Service/UseCase | `src/main/projectService.js`, `features.js`, `git.js`, `setup.js`, `models.js`, `pty.js`, `watcher.js` |
| Repository/DAO | `src/main/projectAccess.js` (rotbegränsad läsning), `src/main/settings.js` (enda skrivningen) |
| Utility/Helper | `src/main/exec.js`, `src/main/parsers/*.js`, `src/renderer/format.js`, `terminalControl.js`, `featureDocsPrompt.js`, `tokens.js` |
| UI-komponenter | `src/renderer/*.jsx` (23 filer, bl.a. `App.jsx`, `AppSettingsDialog.jsx`, `Lcars.jsx`), hooks `useProject.js`, `useFeatures.js` |
| Static/Asset | `src/renderer/theme.css`, `build/icon.svg`, `build/icon.png`, `build/icons/` |
| Test | `tests/main/*.test.js` (15), `tests/renderer/*.test.jsx` (13), `tests/fixtures/` |

## Main-processen i detalj (fokusområde US-0404)

| Fil | Rader | Innehåll |
|-----|-------|----------|
| `src/main/index.js` | 1-9 | importerar `app, BrowserWindow, shell` (ingen `Menu`); låser userData till `aidlc-dash`; `iconPath` beroende på `app.isPackaged` |
| | 11-44 | `createWindow()`: `BrowserWindow` 1440x900, min 960x600, `backgroundColor '#05060a'`, `title`, Linux-ikon, säkra `webPreferences`; `setWindowOpenHandler` (http(s) till OS-webbläsaren), `will-navigate`-spärr; `loadURL(ELECTRON_RENDERER_URL)` i dev, annars `loadFile` |
| | 46-68 | `whenReady`: Dock-ikon i dev på macOS, `registerIpc()`, `createWindow()`, `activate`; `before-quit` kör `shutdown()`; `window-all-closed` avslutar utom på macOS |
| `src/main/ipc.js` | 25-121 | projekttabell `projects` (Map), bevakning av intents, uppsättning och feature-dokument |
| | 123-221 | `handlers`-objektet: en post per kanal |
| | 223-240 | `registerIpc()` (loggar och kastar vidare fel), `shutdown()` |
| `src/main/settings.js` | 8-39 | `DEFAULTS`, `PROJECT_DEFAULTS`, vitlistor `FEATURE_DOCS` och `ANIMATIONS`, `sanitizeProject()`, `sanitize()` |
| | 41-91 | `getSettings()`, seriell skrivkö `update()`, `setSettings()`, `get/setProjectSettings()` |

## App-skalet i detalj (`src/renderer/App.jsx`, 350 rader)

| Rader | Innehåll |
|-------|----------|
| 1-19 | importer (ProjectView, AuctumMark, Splash, AppSettingsDialog, `Bar`/`Frame` från `Lcars.jsx`), `UI_DEFAULT {view:'intents', cost:false, github:false}`, `errorText()`, exporterad `motionMode()` |
| 21-41 | `ArmBlock`: `button.lcars-block--<light|tone>` med `aria-current`/`aria-expanded`; tänd variant omsluts av `.lcars-tabbed` med `.lcars-tab` |
| 43-60 | state: `tabs`, `activeId`, `error`, `restored`, `settingsFor`, `appSettingsOpen`, `animations`, `ui`, `meta`, `branch`; `data-motion` i `useLayoutEffect` |
| 62-131 | `openPath`, återställning från inställningar, `onProjectDetected`, spara flikar, läsa gren |
| 133-183 | `reportMeta`, `setUiOf`, `addProject`, `closeTab`, `saveAnimations`, härledda värden (`active`, `activeUi`, `isAidlc`, `view`, `firstLabel`), `togglePanel` |
| 185-222 | `header.app-header` (märke, `Bar`, gren, `h1.app-title`, dekor) |
| 224-298 | `nav.app-arm` (projektblock med ⚙/×, + Öppna, vyblock, Kostnad, Github, Inställningar, `arm-foot`) |
| 300-347 | felbanner, `main.app-main` (tomt läge i `Frame`, en `project-pane` per projekt), `AppSettingsDialog` |

## theme.css

Avsnittskartan från förra skanningen (375 rader, äldre palett) gäller inte längre: designlyftet har gjort filen betydligt längre (rörelsereglerna ligger kring rad 849-856), bytt `--bg` till `#05060a` och lagt till `:root[data-motion='reduced'|'off']`-regler samt klasser som `.lcars-block`, `.lcars-tabbed`, `.app-arm`, `.is-breathing`, `.is-attn`. Filen är inte omläst på djupet i denna skanning.

## Kodmönster

- Funktionskomponenter med hooks; inga klasskomponenter, ingen state-hanterare utöver React.
- Tillståndsklasser som strängar: `is-active`, `is-selected`, `is-current`, `is-muted`, `is-new`, `is-leaving`, `status-<status>`, `cat-<kategori>`, `unit-<status>`, `term-state-<state>`, `lcars-block--<ton>`.
- Fel från IPC rensas med en lokal `errorText()` och visas med `role="alert"`; lugna lägen med `role="status"`.
- Alla interaktiva element har `data-testid` i formen `<komponent>-<del>` (se `component-inventory.md`).
- Kommentarer refererar krav-ID:n (FRx.y, NFRx, US-xxxx) och `ponytail:`-förenklingar.
- Main-handlers är poster i ett `handlers`-objekt; preload-funktioner är `call(kanal)` eller `subscribe(kanal)`.
- Renderaren importerar rena moduler från main (`parsers/audit.js`, `ledger.js`, `features.js`).
