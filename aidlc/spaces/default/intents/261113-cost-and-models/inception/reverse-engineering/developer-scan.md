# Developer Code Scan: aidlc-dash

Intent: `261113-cost-and-models` (EPIC-02 Cost & Models). Bredd: full skanning (NO_STORE, första skanningen). Djup: Minimal. Commit: `22831024f1bd53ebe8854335fc065d27a77bad42`.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `src/main/` (index.js, ipc.js, projectAccess.js, projectService.js, watcher.js, pty.js, settings.js)
  - `src/main/parsers/` (state.js, audit.js, runtimeGraph.js, intents.js, pipeline.js, units.js)
  - `src/preload/index.js`
  - `src/renderer/` (alla .jsx/.js samt index.html)
  - `tests/main/`, `tests/renderer/`
  - `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`, `.nvmrc`
  - `.github/workflows/release.yml`
  - `README.md`, `docs/FEATURES.md`, `docs/features/epic-02-cost-and-models.md`
  - `.gitignore` (projektets egen del, efter AI-DLC:s markerade block)
- **Skimmed only**:
  - `src/renderer/theme.css` (endast storlek och roll)
  - `tests/fixtures/` (fixturprojekt, audit-shards, trasig JSON)
  - `docs/features/epic-01-bridge-console-mvp.md`, `epic-03-audit-timeline.md`, `epic-04-branding-and-desktop.md` (rubriker och status)
- **Left out**:
  - `node_modules/` (beroenden)
  - `out/` (electron-vite byggutdata, git-ignorerad)
  - `dist/` (electron-builder paket, git-ignorerad)
  - `package-lock.json` (innehållet; filen finns)
  - `.claude/`, `aidlc/`, AI-DLC:s markerade block i `.gitignore` (AI-DLC:s egen installation och arbetsyta)

### Packages Found
- aidlc-dash ("Auctum AIDLC Control") — Electron-skrivbordsapp, ett enda npm-paket — JavaScript (ESM) + JSX — skrivskyddad konsol för AI-DLC-projekt med inbäddad terminal
  - `src/main` — Electron huvudprocess (Node): IPC, filåtkomst, parsning, filbevakning, pty
  - `src/preload` — contextBridge-API `window.bridge`
  - `src/renderer` — React 19-UI

### Build System
- **Type**: npm + electron-vite (Vite 8) för bygge, electron-builder för paketering (mac universal dmg, linux deb)
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`, `.nvmrc` (Node 22)
- **Build Dependencies**: renderer → main/parsers/audit.js (Timeline importerar `NOISY_EVENTS`); main → node-pty (native, asarUnpack), chokidar; `postinstall` bygger om native-moduler för Electron

### APIs Discovered
- Electron IPC invoke (`ipcMain.handle`) — `src/main/ipc.js` — 15 kanaler (`project:*` 7, `shell:*` 2, `settings:*` 2, `pty:*` 4)
- Electron IPC push (`webContents.send`) — `ipc.js`, `pty.js` — 4 händelser (`project:changed`, `project:watchError`, `pty:data`, `pty:exit`)
- Preload-API `window.bridge` — `src/preload/index.js` — 15 anrop + 4 prenumerationer + `platform`
- Inga HTTP-API:er; inga nätverksanrop

### Frameworks & Libraries
- Electron — ^45.3.1 — skrivbordsruntime
- React / react-dom — ^19.3.1 — UI
- chokidar — ^4.0.3 — filbevakning
- node-pty — ^1.1.0 — terminalsessioner
- @xterm/xterm ^6.0.0, @xterm/addon-fit ^0.11.0 — terminal-UI
- react-markdown ^10.1.0, remark-gfm ^4.0.1 — artefaktvisning
- @fontsource/antonio ^5.3.0 — typsnitt
- electron-vite ^6.0.0, vite ^8.3.8, @vitejs/plugin-react ^6.3.0 — bygge
- electron-builder ^26.18.0 — paketering
- vitest ^5.1.0, @testing-library/react ^16.3.3, jsdom ^29.1.1 — test

### Test Coverage
- **Test Directories**: `tests/main/` (4 filer: parsers, projectAccess, projectService, watcher), `tests/renderer/` (2 filer: IntentList, Splash), `tests/fixtures/`
- **Test Frameworks**: Vitest med två projekt (node för main, jsdom för renderer), Testing Library
- **Coverage Config**: absent

### Code Quality Indicators
- **Linting**: ingen ESLint- eller Prettier-konfiguration
- **CI/CD**: `.github/workflows/release.yml` (endast vid versionstagg: verify + vitest, bygg mac/linux, GitHub Release). Ingen CI på PR/push.
- **Documentation**: README (svenska) med säkerhetsmodell; epics under `docs/features/`; korta, syftesförklarande kommentarer i varje modul

### Technical Debt Signals
- `errorText`-hjälparen är kopierad i 4 renderer-filer (App.jsx, useProject.js, ArtifactReader.jsx, TerminalPanel.jsx)
- Inga tester för `ipc.js`, `pty.js`, `settings.js`, preload och de flesta renderer-komponenter
- Ingen linter, ingen coverage, ingen CI före merge (org.md kräver det för `feature`-liknande scopes)
- Medvetna förenklingar markerade `ponytail:`: obegränsad cache i `projectService.js:12`, ingen virtualisering i `Timeline.jsx:6`
- `TerminalPanel.jsx:100-108` skriver `sessionRef.current` under render (sidoeffekt i render)
- Dokumentationsglapp: `epic-01-bridge-console-mvp.md` säger "Byggd, ej releasad" medan `FEATURES.md` säger "Released in v0.1.0"; README nämner bara macOS-bygge trots linux-mål
- `electron-builder.yml` pekar ut `buildResources: build` men mappen finns inte (ingen ikon; EPIC-04)

## Handoff Summary
- **Intent-relevant finding**: Hela dataflödet för EPIC-02 finns redan och har tydliga anslutningspunkter: `watchIntents` bevakar bara `aidlc/spaces/<space>/intents` (`ipc.js:33-34`, `watcher.js:33`), så `aidlc/.aidlc-sessions/usage-ledger.json` ligger utanför och läses inte av appen i dag (ingen träff på `usage-ledger` eller `.aidlc-sessions` i `src/`). Ledgern kan läsas med befintliga `readJsonSafe` (`projectAccess.js:40`, behåller senast giltiga värde-mönstret från `projectService.js:81,146`), skickas via en ny `project:*`-kanal i `ipc.js` + `preload/index.js`, och laddas om i `useProject.js:69-75` via en ny flagga i `project:changed`. Pipeline-raden visar redan agent och tid (`Pipeline.jsx:33-37`), vilket är platsen för kostnad och modell (US-0202, US-0204).
- **Risks / follow-up**:
  - US-0204 kräver att main kör `aidlc config models --show --json`; i dag startar main bara processer via node-pty (`pty.js`), inget `child_process`. Ny kapabilitet med säkerhetspåverkan (inloggningsmiljö, fast kommando).
  - US-0203 CSV-export blir en andra skrivning; README och `settings.js:1-2` lovar att inställningsfilen är den enda fil appen skriver.
  - Ledgern är git-ignorerad (`.gitignore` AI-DLC-blocket, `aidlc/.aidlc-sessions/`) och finns bara på maskinen som körde arbetet; nyckelformatet `record:<space>/<dirName>` är obekräftat (epic-02, rad 27).
  - Ingen diagrambibliotek finns; `BoltDag.jsx` ritar SVG för hand, vilket är mönstret för stapeldiagrammet i US-0203.
  - `IntentList` har filtrering men ingen sortering (US-0201 kräver sortering på kostnad).
