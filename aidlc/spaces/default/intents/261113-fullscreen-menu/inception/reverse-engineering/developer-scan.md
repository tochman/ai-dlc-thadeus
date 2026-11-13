# Utvecklarskanning: aidlc-dash (fokuserad, US-0404)

## Developer Code Scan Results

Fokuserad skanning för intent `261113-fullscreen-menu` (US-0404: helskärm och egen appmeny) mot commit `fec505b24db5db906c25efb2c170119078bbff16`. Den befintliga kodkunskapsbasen var STALE (byggd före designlyftet); bara filerna nedan lästes på djupet.

### Scan Coverage
- **Analyzed deeply**:
  - `src/main/index.js`
  - `src/main/ipc.js`
  - `src/main/settings.js`
  - `src/preload/index.js`
  - `src/renderer/App.jsx`
  - `src/renderer/AppSettingsDialog.jsx`
  - `electron-builder.yml`
  - `package.json`
- **Skimmed only**:
  - `src/renderer/` (filförteckning; exportrader i `Lcars.jsx`, `tokens.js`, `TerminalContext.jsx`; grep i `ProjectView.jsx` och `theme.css` efter `TerminalProvider`, `onMeta`, `data-motion`)
  - `tests/main/`, `tests/renderer/` (filförteckning: `settings.test.js` och `AppShell.test.jsx` finns)
  - `docs/features/epic-04-branding-and-desktop.md` (US-0404 läst som krav, inte som kod)
  - tidigare djupt analyserat område `./` (från intent `261113-living-lcars`, ej omverifierat)
- **Left out**:
  - `node_modules/`
  - `out/`
  - `dist/`
  - `tests/.tmp/`
  - AI-DLC:s egen installation (`.claude/`, `aidlc/` med flera)

### Packages Found
- `aidlc-dash` (productName `Auctum AIDLC Control`, version `0.1.1`) — Electron-skrivbordsapp — JavaScript (ESM) och JSX — skrivskyddad AI-DLC-konsol med inbäddad terminal

### Build System
- **Type**: npm + electron-vite (bygger `out/`) + electron-builder (paketerar till `dist/`)
- **Config Files**: `package.json`, `electron-builder.yml` (övriga, t.ex. `electron.vite.config.mjs`, oförändrade enligt tidigare store)
- **Build Dependencies**: `build:mac` / `build:linux` = `electron-vite build && electron-builder --mac|--linux`; `postinstall` = `electron-builder install-app-deps && node scripts/fix-pty-perms.cjs`

### APIs Discovered
- Electron IPC (invoke) — `src/main/ipc.js` / `src/preload/index.js` — 28 kanaler via `call(channel)` (oförändrat antal)
- Electron IPC (push main → renderare) — `src/preload/index.js` — 6 prenumerationer via `subscribe(channel)`: `features:changed`, `project:changed`, `project:detected`, `project:watchError`, `pty:data`, `pty:exit`
- Ingen meny-IPC och ingen `Menu`-användning finns i `src/` (grep efter `Menu`, `fullscreen`, `setFullScreen` gav inga träffar)

### Frameworks & Libraries
- electron — ^45.3.1 — runtime (devDependency)
- react, react-dom — ^19.3.1 — UI
- electron-builder — ^26.18.0 — paketering
- electron-vite — ^6.0.0, vite — ^8.3.8 — bygge
- vitest — ^5.1.0, @testing-library/react — ^16.3.3, jsdom — ^29.1.1 — test
- Övriga runtime-beroenden oförändrade (xterm, node-pty, chokidar, react-markdown, remark-gfm, @tanstack/react-virtual 3.14.24, @fontsource/antonio)

### Test Coverage
- **Test Directories**: `tests/main/` (15 filer, nu även `theme.test.js`), `tests/renderer/` (13 filer, nu även `AppShell.test.jsx`, `IntentDetail.test.jsx`, `TerminalPanel.test.jsx`)
- **Test Frameworks**: Vitest (projekt `main`/node, `renderer`/jsdom), Testing Library React
- **Coverage Config**: absent (enligt tidigare store; ej omverifierat)

### Code Quality Indicators
- **Linting**: ingen ESLint/Prettier i `package.json`
- **CI/CD**: `.github/workflows/release.yml` (ej omläst)
- **Documentation**: kommentarer med krav-ID:n (FR1.2, FR1.5, FR4.2, FR4.6, FR8.4, EPIC-06 FR3.1) och `ponytail:`-markeringar

### Technical Debt Signals
- `errorText()` är kopierad igen: `App.jsx:11-13` och `AppSettingsDialog.jsx:10` (samma regex som i övriga renderarfiler).
- `App.jsx` (350 rader) bär nu hela app-skalet: sidhuvud, vänsterarm, flikhantering, UI-tillstånd per projekt, rörelseläge och inställningsdialog. Menykommandon som ska dela kodvägar hamnar här.
- Åtgärderna i armen är inline-lambdor i JSX (`onClick={() => setUiOf(...)}`, `togglePanel`), inte namngivna funktioner; menyn kan inte anropa dem utan att de lyfts ut.
- Terminalens flikval och omstart (`TerminalProvider` / `useTerminal()`) ligger per projekt inne i `ProjectView.jsx`, under App; App når dem inte i dag.
- Ingen dev-meny och ingen meny alls: Electrons standardmeny visas (Reload, DevTools, Electron-länkar).

## Handoff Summary
- **Intent-relevant finding**:
  - **Fönstret** (`src/main/index.js:11-44`): `new BrowserWindow({ width 1440, height 900, minWidth 960, minHeight 600, backgroundColor '#05060a', title 'Auctum AIDLC Control', icon (bara Linux), webPreferences { preload, contextIsolation, nodeIntegration false, sandbox, webSecurity } })`. Ingen `autoHideMenuBar`, ingen `fullscreen`/`fullscreenable`, inga lyssnare på `enter-full-screen`/`leave-full-screen`, ingen `close`-hantering. `createWindow()` returnerar `win`, men returvärdet används inte (`whenReady` och `activate` anropar den utan att spara fönstret). Ingen `Menu` importeras eller sätts; `electron` importerar bara `app, BrowserWindow, shell`.
  - **Dev mot paketerat**: `app.isPackaged` används redan för ikonvägen (`index.js:9`) och Dock-ikonen i dev (`index.js:48`). Dev-läget syns också via `process.env.ELECTRON_RENDERER_URL` (`index.js:38`). Båda passar för att visa en "Utveckling"-meny bara i dev.
  - **Inställningar** (`src/main/settings.js`): `sanitize()` vitlistar nycklar. `animations` (designlyftet) läggs bara till när värdet finns i `ANIMATIONS` (`settings.js:11,31`), annars utelämnas nyckeln. En ny `fullScreen`-boolesk nyckel måste läggas till på samma sätt i `sanitize()`, annars tas den bort tyst. `setSettings(partial)` slår ihop över nuvarande värden via en seriell skrivkö (`settings.js:51-67`), så main kan själv spara `fullScreen` utan att krocka med renderarens `openProjects`-skrivningar. `getSettings()` går att anropa från main före `createWindow()`, så fönstret kan skapas i helskärm direkt.
  - **Push-kanaler** (`src/preload/index.js:6-12,44-49`): mönstret är `subscribe(channel)` som returnerar avregistrering; main skickar med `sender.send(...)` efter `isDestroyed()`-kontroll (`ipc.js:46-48,114`). En menykanal (t.ex. `menu:command` med `{ command }`) följer samma mönster: en rad i preload, `win.webContents.send` i main. En invoke-kanal (t.ex. `window:toggleFullScreen`) läggs i `handlers`-objektet i `ipc.js:123-221`; `BrowserWindow.fromWebContents(event.sender)` används redan i `project:pick` (`ipc.js:125`).
  - **Armens åtgärder** (`src/renderer/App.jsx`): öppna projekt = `addProject()` (`146-157`); stäng projekt = `closeTab(projectId)` (`159-168`); vyer = `setUiOf(active.projectId, { view: 'intents' | 'features' })` (`264-271`); Kostnad/Github = `togglePanel('cost' | 'github')` (`183`, `272-288`); Inställningar = `setAppSettingsOpen(true)` (`291`); Projektinställningar = `setActiveId(id); setSettingsFor(id)` (`243-246`). Features visas bara när `activeMeta.showFeatures`, Kostnad/Github är `disabled` när projektet inte är AI-DLC (`isAidlc`). Dessa villkor är de som menyns aktiveringslägen måste spegla; main känner inte till dem i dag.
  - **Inställningsdialogen** (`AppSettingsDialog.jsx`): en native modal `dialog` med en `fieldset` "Animationer" av `lcars-block`-radioknappar (`data-testid` `app-settings-animations-<id>`). En helskärmsknapp eller "Helskärm vid start" passar som ännu en `fieldset` eller ett block här; dialogen tar i dag bara `value`/`onChange` för animationer.
  - **Namn för "Om …"**: `productName: Auctum AIDLC Control` i både `package.json:3` och `electron-builder.yml:2`; `version 0.1.1`, `homepage https://github.com/tochman/aidlc-dash` (bas för "Rapportera problem" → `/issues`), `author Auctum Solutions AB`. `app.getName()` ger productName; userData är fastlåst till `aidlc-dash` (`index.js:6`), så ett namnbyte påverkar inte sparade inställningar.
  - **Externa länkar**: `setWindowOpenHandler` skickar `http(s)` till `shell.openExternal` (`index.js:30-33`); Hjälp-menyn kan anropa `shell.openExternal` direkt i main.
- **Risks / follow-up**:
  - Menyn byggs i main men aktiveringsläget (projekt öppet, AI-DLC, Features synlig) finns bara i renderaren: antingen skickar renderaren tillståndet till main (ny invoke-kanal) och main bygger om menyn, eller så är menyposter alltid aktiva och renderaren ignorerar kommandon som inte gäller. Kravet "inaktiverade utan öppet projekt" kräver det första.
  - "Terminal: Claude, Shell, Starta om flik" måste nå `useTerminal()` i det aktiva projektets `ProjectView`; App behöver en väg ned (t.ex. en prop eller en händelse som ProjectView lyssnar på).
  - `Cmd/Ctrl+W` som "Stäng projekt" ersätter fönsterstängning; utan eget menyval stänger standardrollen `close` fönstret.
  - Redigera-menyn måste behålla rollerna `undo/redo/cut/copy/paste/selectAll`, annars slutar kopiera/klistra in fungera i fält och i xterm på macOS.
  - Helskärmsläget måste sparas från main (`enter-full-screen`/`leave-full-screen` eller vid `close`), eftersom `before-quit` redan kör `shutdown()` och fönstret kan stängas utan renderarens hjälp.
  - `tests/main/settings.test.js` täcker `sanitize()`; den nya nyckeln bör få ett test där.
