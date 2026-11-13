# Kodstruktur: aidlc-dash

## Katalogöversikt

```
src/
  main/          Electron-huvudprocess (Node, ESM): index.js (userData, fönster), menu.js (appmeny, About), ipc.js,
                 settings.js, questions.js + notify.js (US-0505), tjänster
    parsers/     rena parsers för AI-DLC-filer (används även av renderaren)
  preload/       contextBridge-API (window.bridge)
  renderer/      React-SPA: komponenter (.jsx), Lcars.jsx, tokens.js, hooks, hjälpare, theme.css, index.html
tests/
  main/          Vitest, node-miljö (18 filer)
  renderer/      Vitest + Testing Library, jsdom (14 filer)
  fixtures/      exempelprojekt, audit-shards, ledger, feature-dokument
scripts/         ikongenerering, node-pty-rättigheter, glibc-kontroll
build/           ikonkällor (icon.svg, icon.png, icons/NxN.png)
docs/            FEATURES.md, en fil per epic, screenshots/
.github/workflows/release.yml
package.json, electron-builder.yml, README.md
```

## Filklassificering

| Kategori | Filer |
|----------|-------|
| Configuration | `package.json` (namn, `productName`, version, skript, beroenden), `electron-builder.yml` (appId, productName, mål, Linux-binärnamn), `electron.vite.config.mjs`, `vitest.config.mjs`, `.nvmrc`, `src/renderer/index.html` (CSP, `<title>`) |
| Entry | `src/main/index.js` (userData-låset, fönster via `windowOptions()`, Dock-ikon i dev, helskärmshändelser, livscykel) |
| Controller/Handler | `src/main/ipc.js`, `src/main/menu.js`, `src/preload/index.js` |
| Service/UseCase | `src/main/projectService.js`, `features.js`, `git.js`, `setup.js`, `models.js`, `pty.js`, `watcher.js`, `questions.js`, `notify.js` |
| Repository/DAO | `src/main/projectAccess.js` (rotbegränsad läsning), `src/main/settings.js` (enda skrivningen) |
| Utility/Helper | `src/main/exec.js`, `src/main/parsers/*.js`, `src/renderer/format.js`, `terminalControl.js`, `featureDocsPrompt.js`, `tokens.js` |
| UI-komponenter | `src/renderer/*.jsx` (24 filer inklusive `main.jsx`, bl.a. `App.jsx`, `Splash.jsx`, `AuctumMark.jsx`, `TerminalPanel.jsx`, `QuestionPopup.jsx`, `AppSettingsDialog.jsx`, `DocsDialog.jsx`, `Lcars.jsx`, `TerminalContext.jsx`), hooks `useProject.js`, `useFeatures.js` |
| Static/Asset | `src/renderer/theme.css`, `build/icon.svg`, `build/icon.png`, `build/icons/`, `docs/screenshots/` |
| CI/CD | `.github/workflows/release.yml` |
| Documentation | `README.md`, `docs/FEATURES.md`, `docs/features/*.md` |
| Test | `tests/main/*.test.js` (18), `tests/renderer/*.test.jsx` (14), `tests/fixtures/` |

## Main-processen i detalj

| Fil | Rader | Innehåll |
|-----|-------|----------|
| `src/main/index.js` (94) | 1-5 | importerar `app, BrowserWindow, shell`, `registerIpc/shutdown`, `applyMenu`, `getSettings/setSettings` |
| | 7-8 | kommentar om förra namnbytet och `app.setPath('userData', join(app.getPath('appData'), 'aidlc-dash'))` (före `whenReady`) |
| | 10-11 | `iconPath` (paketerad: `resourcesPath/icon.png`, dev: `build/icon.png`) |
| | 13-35 | exporterad ren `windowOptions(settings, platform)`: 1440x900, min 960x600, `fullscreenable`, `fullscreen: true` bara om sparat, `autoHideMenuBar`, `backgroundColor '#05060a'`, `title: 'Auctum AIDLC Control'` (rad 26), säkra `webPreferences` |
| | 37-65 | `createWindow()`, `setWindowOpenHandler`, `will-navigate`-spärr, `enter-/leave-full-screen`, laddning |
| | 67-94 | `whenReady`: Dock-ikon i dev, `registerIpc()`, `applyMenu(null)`, `open()`; `activate`; `before-quit`; `window-all-closed` |
| `src/main/menu.js` (166) | 1-8 | importer, `APP_NAME = 'Auctum AIDLC Control'` (rad 5), `AIDLC_DOCS_URL`, `ISSUES_URL` (repo `aidlc-dash`) |
| | 10-22 | `STATE_KEYS`, `menuState`, `parseMenuState`, `setMenuState` |
| | 24-137 | ren `buildMenuTemplate`: macOS-appmenyn (40-55: etikett, Om, Inställningar, Göm, Göm övriga, Visa alla, Avsluta, alla med `APP_NAME`), Arkiv (57-66, Linux: Inställningar och Avsluta), Redigera, Visa (Helskärm), Terminal, Fönster (bara macOS), Hjälp, Utveckling (bara dev) |
| | 139-152 | `targetWindow`, `send` (`menu:command`), `actions` (helskärm, rapportera problem) |
| | 154-166 | `applyMenu(win)`: `app.setAboutPanelOptions({applicationName: APP_NAME, applicationVersion: app.getVersion()})` (rad 156), bygger och sätter menyn |
| `src/main/ipc.js` | – | ej omläst; har vuxit med US-0505 (`questions:list`, `questions:activeProject`, push `questions:changed`, import av `notifyQuestions`). Radnummer från tidigare skanningar gäller inte längre |
| `src/main/questions.js` (59), `src/main/notify.js` (43) | – | ej djuplästa (US-0505); `notify.js` skapar `Notification` med titeln "<projekt>: Claude väntar på ditt svar" och skickar `questions:focus` vid klick |
| `src/main/projectService.js`, `parsers/audit.js`, `watcher.js`, `settings.js` | – | se `component-inventory.md` (från skanningen vid commit `22bd721`, ej omlästa) |

## App-skalet i detalj (`src/renderer/App.jsx`, 506 rader)

| Rader | Innehåll |
|-------|----------|
| 1-21 | importer (ProjectView, AuctumMark, Splash, AppSettingsDialog, DocsDialog, QuestionPopup, `Bar`/`Frame`), `bridge`, `UI_DEFAULT`, `errorText()`, exporterad `motionMode()` |
| 23-43 | `ArmBlock` |
| 45-73 | state: `tabs`, `activeId`, `error`, `restored`, `settingsFor`, `appSettingsOpen`, `animations`, `ui`, `meta`, `branch`, `fullscreen`, `terminalCommand`, `docs`, `alertSettings`, `questions`, `popupOpen`, `popupFocus`; refs `recentRef`, `menuCommandRef`, `seenQuestionsRef`, `questionAlertsRef`; `data-motion` |
| 75-131 | `openPath`, återställning (läser även `questionAlerts`, `notificationSound`), `onProjectDetected`, spara flikar |
| 133-167 | gren, `reportMeta`, `setUiOf`, helskärmsläge |
| 169-222 | väntande frågor (US-0505): `listQuestions`, `onQuestions`, `onQuestionFocus`, `setActiveProject`, `popupQuestions`, `closePopup`, `answerInClaude`, `saveAlertSettings` |
| 224-323 | `onMenuCommand`, namngivna åtgärder, `menuCommands`, `sendMenuState`, `toggleFullscreen` |
| 325-370 | `header.app-header`: märkesblocket (329-335: `AuctumMark` 46 px, "Auctum" / "Aidlc control"), `Bar`, gren, `h1.app-title`, dekor, `fullscreen-toggle` |
| 372-443 | `nav.app-arm` (armens fot 439-442 med dekorativt märke och "Auctum" eller antal intents) |
| 445-491 | felbanner, `main.app-main` (tomläge med `AuctumMark` 96 px, en `project-pane` per projekt) |
| 493-503 | `AppSettingsDialog` (animationer och notisval), `DocsDialog`, `QuestionPopup` |

## Splash och märke

| Fil | Rader | Innehåll |
|-----|-------|----------|
| `src/renderer/Splash.jsx` (64) | 1-8 | importer, `APP_NAME = 'Auctum AIDLC Control'`, `SPLASH_MIN_MS` 900, `SPLASH_MAX_MS` 4000, `SPLASH_FADE_MS` 300 |
| | 12-33 | tidslogik (min, max, uttoning) |
| | 36-63 | markup: `splash-top`, `splash-mid` > `splash-arm` och `splash-center` (`AuctumMark` 300 px, dekorativ `splash-name` "Auctum"/"Aidlc control", `sr-only` `APP_NAME`, `splash-line`), `splash-bottom` |
| `src/renderer/AuctumMark.jsx` (19) | 1-19 | inline-SVG, `role="img" aria-label="Auctum"` eller `aria-hidden` |

## theme.css (883 rader)

| Rader | Innehåll |
|-------|----------|
| 1-57 | kommentar om tokens och AA-kontrast; `:root`-tokens: bakgrund, skiffer 0-5, `--slate-mark`, stål, korall, amber, text, `--on-light`, `--alert` (US-0505), alfavarianter, `--backdrop`, ramanatomi (`--arm` 150 px, `--bar`, `--frame`, `--gap`), typsnitt |
| 58-147 | bas, `[hidden]`, `.sr-only` (91), knappar, fält |
| 148-294 | LCARS-primitiver: `.lcars-block` (151) och toner, `.lcars-label` (182, kapning med ellips), `.lcars-tabbed`, `.lcars-bar`, `.lcars-frame`, chips, readout, prickar, taggar |
| 295-409 | app-skalet: `.app` (296, grid med `--arm`-kolumn), `.app-header`, `.app-brand` (307-319), `.app-mark`, `.app-brand-text` (321), `.app-brand-sub` (322), `.app-header-row`, `.app-title` (327, kapning med ellips), `.app-fullscreen`, vänsterarmen, `.arm-foot`, tomläge, banners (374) |
| 410-675 | projektvy, kostnad, intent-lista och detalj, arbetsflödesstyrning, pipeline, tidslinje, units, artefaktläsare |
| 676-728 | konsolen i nedre armbågen: `.terminal-arm`, `.term-tab`, `.terminal-elbow` (dekorativt märke), panel och fot |
| 729-808 | sidopaneler, `.settings-dialog` (777), `.settings-group`, `.lcars-radio-group`, `.question-popup` (796-806, US-0505, korall ram, `.is-overdue` med `--alert`) |
| 809-839 | splash: `.splash` (padding 40 px, versaler), `.splash-cap`/`.splash-arm` 180 px, `.splash-center`, `.splash-mark`, `.splash-name`, `.splash-name-main` (64 px), `.splash-name-sub` (24 px, `letter-spacing` 0.18em), `.splash-line` (360 px), `.splash-bottom` |
| 841-883 | keyframes (`lcars-breathe`, `-attn`, `-dot`, `-sweep`, `-draw`, `-appear`, `-rise`, `-glow`, `-alert`, `-glow-steel`) och reglerna för `data-motion='reduced'|'off'` |

## Kodmönster

- Funktionskomponenter med hooks; inga klasskomponenter, ingen state-hanterare utöver React.
- Tillståndsklasser som strängar: `is-active`, `is-selected`, `is-current`, `is-muted`, `is-new`, `is-leaving`, `is-overdue`, `status-<status>`, `cat-<kategori>`, `unit-<status>`, `term-state-<state>`, `lcars-block--<ton>`.
- Fel från IPC rensas med en lokal `errorText()` och visas med `role="alert"`; lugna lägen med `role="status"`.
- Alla interaktiva element har `data-testid` i formen `<komponent>-<del>` (se `component-inventory.md`).
- Kommentarer refererar krav-ID:n (FRx.y, NFRx, US-xxxx) och `ponytail:`-förenklingar.
- Main-handlers är poster i ett `handlers`-objekt; preload-funktioner är `call(kanal)` eller `subscribe(kanal)`.
- Push från main till renderaren tas emot i en `useEffect` som returnerar avregistreringen (`bridge.onX(cb)`); nyare kanaler anropas valfritt (`bridge.onQuestions?.(…)`) så att en äldre preload inte kraschar App.
- Kommandon från main vitlistas med `Object.hasOwn(menuCommands, …)`; ett kommando till ett projekt längre ner i trädet skickas som ett prop-objekt med ökande `seq` (`terminalCommand`).
- Rena, testbara byggare i main (`windowOptions`, `buildMenuTemplate`, `parseMenuState`) skiljs från Electron-anropen (`createWindow`, `applyMenu`).
- Synlig märkestext är dekoration (`aria-hidden` på splashen) med en dold `sr-only`-text som bär namnet; märket självt har det tillgängliga namnet "Auctum".
- Appnamnet är strängkonstanter per fil (`APP_NAME` i `menu.js` och `Splash.jsx`), inte en delad modul.
- Inställningar vitlistas i `sanitize()`; ogiltiga eller saknade värden utelämnas så att standarden gäller.
- Renderaren importerar rena moduler från main (`parsers/audit.js`, `ledger.js`, `features.js`).
