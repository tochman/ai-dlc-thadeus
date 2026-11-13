# Kodstruktur: aidlc-dash

## Katalogöversikt

```
src/
  main/          Electron-huvudprocess (Node, ESM): index.js (fönster), menu.js (appmeny), ipc.js, settings.js, tjänster
    parsers/     rena parsers för AI-DLC-filer (används även av renderaren)
  preload/       contextBridge-API (window.bridge)
  renderer/      React-SPA: komponenter (.jsx), Lcars.jsx, tokens.js, hooks, hjälpare, theme.css, index.html
tests/
  main/          Vitest, node-miljö (17 filer)
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
| Entry | `src/main/index.js` (fönster via `windowOptions()`, userData-sökväg, Dock-ikon i dev, helskärmshändelser, livscykel) |
| Controller/Handler | `src/main/ipc.js`, `src/main/menu.js`, `src/preload/index.js` |
| Service/UseCase | `src/main/projectService.js`, `features.js`, `git.js`, `setup.js`, `models.js`, `pty.js`, `watcher.js` |
| Repository/DAO | `src/main/projectAccess.js` (rotbegränsad läsning), `src/main/settings.js` (enda skrivningen) |
| Utility/Helper | `src/main/exec.js`, `src/main/parsers/*.js`, `src/renderer/format.js`, `terminalControl.js`, `featureDocsPrompt.js`, `tokens.js` |
| UI-komponenter | `src/renderer/*.jsx` (24 filer, bl.a. `App.jsx`, `AppSettingsDialog.jsx`, `DocsDialog.jsx`, `Lcars.jsx`, `TerminalContext.jsx`), hooks `useProject.js`, `useFeatures.js` |
| Static/Asset | `src/renderer/theme.css`, `build/icon.svg`, `build/icon.png`, `build/icons/` |
| Test | `tests/main/*.test.js` (17), `tests/renderer/*.test.jsx` (13), `tests/fixtures/` |

## Main-processen i detalj (fokusområde US-0505)

| Fil | Rader | Innehåll |
|-----|-------|----------|
| `src/main/index.js` (94) | 1-11 | importerar `app, BrowserWindow, shell`, `registerIpc/shutdown`, `applyMenu`, `getSettings/setSettings`; låser userData till `aidlc-dash`; `iconPath` |
| | 13-35 | exporterad ren `windowOptions(settings, platform)`: 1440x900, min 960x600, `fullscreenable`, `fullscreen: true` bara om sparat, `autoHideMenuBar`, `backgroundColor '#05060a'`, säkra `webPreferences` |
| | 37-65 | `createWindow()` (async, läser inställningar), `setWindowOpenHandler`, `will-navigate`-spärr, `enter-/leave-full-screen` → `setSettings({fullscreen})`, `window:fullscreen`, `applyMenu(win)`; laddning |
| | 67-94 | `whenReady`: Dock-ikon i dev, `registerIpc()`, `applyMenu(null)`, `open()`; `activate`; `before-quit`; `window-all-closed` |
| `src/main/ipc.js` (255) | 26-122 | projekttabell `projects`, `closeWatcher`, `syncFeaturesWatch`, `watchForSetup`, `watchSpace` (en `watchIntents` per projekt, push `project:changed`/`project:watchError`) |
| | 124-236 | `handlers`-objektet: en post per kanal, sist `window:*`, `menu:state`, `app:openDocsUrl` |
| | 238-255 | `registerIpc()` (loggar och kastar vidare fel), `shutdown()` |
| `src/main/projectService.js` (206) | 11-35 | fasmappar, cacher (`ponytail:`), `LEDGER_PATH`, `intentsDir`, `assertName`, `readTextOrNull` |
| | 37-106 | `listSpaces`, `detectProject`, `summarizeIntent`, `loadIntentList(root, space, onlyDirs)` |
| | 108-167 | `walkFiles`, `listArtifacts`, `loadAuditEvents` (alla `audit/*.md`), `buildDetail` |
| | 169-206 | `loadCost`, `loadIntentDetail` (senaste-giltiga-fallback) |
| `src/main/parsers/audit.js` (70) | 1-29 | `FIELD`/`TITLE`-regex, `NOISY_EVENTS`, `parseBlock` (Timestamp/Event lyfts ut, övriga fält ordagrant, flerradiga värden) |
| | 31-58 | `parseAudit` (`index`, `key`), `withTimes` (`timeMs`), `mergeAudits` (sortering, `seq`) |
| | 60-70 | `categoryOf` |
| `src/main/watcher.js` (165) | 1-62 | `isIgnored`, `debounce`, `watchFiles` (feature-dokument) |
| | 64-139 | `watchIntents` (intents-mappen + ledger, `dirNames`/`indexChanged`/`costChanged`) |
| | 141-165 | `watchForAidlc` |
| `src/main/settings.js` (93) | 8-41 | `DEFAULTS`, `PROJECT_DEFAULTS`, vitlistor `FEATURE_DOCS`, `ANIMATIONS`, `sanitizeProject()`, `sanitize()` (inkl. `fullscreen`) |
| | 43-93 | `getSettings()`, seriell skrivkö `update()`, `setSettings()`, `get/setProjectSettings()` |

## App-skalet i detalj (`src/renderer/App.jsx`, 433 rader)

| Rader | Innehåll |
|-------|----------|
| 1-20 | importer (ProjectView, AuctumMark, Splash, AppSettingsDialog, DocsDialog, `Bar`/`Frame`), `UI_DEFAULT`, `errorText()`, exporterad `motionMode()` |
| 22-42 | `ArmBlock` |
| 44-65 | state: `tabs`, `activeId`, `error`, `restored`, `settingsFor`, `appSettingsOpen`, `animations`, `ui`, `meta`, `branch`, `fullscreen`, `terminalCommand`, `docs`; refs `recentRef`, `menuCommandRef`; `data-motion` |
| 67-136 | `openPath`, återställning, `onProjectDetected`, spara flikar, läsa gren |
| 138-161 | `reportMeta`, `setUiOf`, helskärmsläge (`isFullscreen` + `onFullscreen`), `onMenuCommand` → `menuCommandRef` |
| 163-259 | namngivna åtgärder: `openProject`, `closeTab`, `saveAnimations`, härledda värden, `closeActiveProject`, `showView`, `togglePanel`, `openAppSettings`, `openProjectSettings`, `runTerminal`, `openDocs`, `menuCommands`, `sendMenuState`, `toggleFullscreen` |
| 261-306 | `header.app-header` (märke, `Bar`, gren, `h1.app-title`, dekor, `fullscreen-toggle`) |
| 308-379 | `nav.app-arm` |
| 381-433 | felbanner, `main.app-main` (tomt läge, en `project-pane` per projekt med `terminalCommand`), `AppSettingsDialog`, `DocsDialog` |

## theme.css

Avsnittskartan från en äldre skanning gäller inte längre: designlyftet har gjort filen betydligt längre, bytt `--bg` till `#05060a` och lagt till `:root[data-motion='reduced'|'off']`-regler samt klasser som `.lcars-block`, `.lcars-tabbed`, `.app-arm`, `.is-breathing`, `.is-attn`. Filen är inte omläst på djupet sedan dess.

## Kodmönster

- Funktionskomponenter med hooks; inga klasskomponenter, ingen state-hanterare utöver React.
- Tillståndsklasser som strängar: `is-active`, `is-selected`, `is-current`, `is-muted`, `is-new`, `is-leaving`, `status-<status>`, `cat-<kategori>`, `unit-<status>`, `term-state-<state>`, `lcars-block--<ton>`.
- Fel från IPC rensas med en lokal `errorText()` och visas med `role="alert"`; lugna lägen med `role="status"`.
- Alla interaktiva element har `data-testid` i formen `<komponent>-<del>` (se `component-inventory.md`).
- Kommentarer refererar krav-ID:n (FRx.y, NFRx, US-xxxx) och `ponytail:`-förenklingar.
- Main-handlers är poster i ett `handlers`-objekt; preload-funktioner är `call(kanal)` eller `subscribe(kanal)`.
- Push från main till renderaren tas emot i en `useEffect` som returnerar avregistreringen (`bridge.onX(cb)`); kommandon från main vitlistas med `Object.hasOwn(menuCommands, …)`.
- Ett kommando till ett projekt längre ner i trädet skickas som ett prop-objekt med ökande `seq` (`terminalCommand`), så samma kommando två gånger ger två körningar.
- Inställningar vitlistas i `sanitize()`; ogiltiga eller saknade värden utelämnas så att standarden gäller.
- Renderaren importerar rena moduler från main (`parsers/audit.js`, `ledger.js`, `features.js`).
