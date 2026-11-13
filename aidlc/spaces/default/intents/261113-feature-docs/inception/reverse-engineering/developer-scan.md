## Developer Code Scan Results

Fokuserad skanning för intent `261113-feature-docs` (EPIC-06 Feature Docs, US-0601 och US-0602) i repot `aidlc-dash`, commit `10ede6fbc461891368af3418e1b3a74a88c9722c`, djup Minimal. Inga tester, byggen eller program kördes.

### Scan Coverage
- **Analyzed deeply**:
  - src/renderer/ProjectView.jsx
  - src/renderer/SetupAidlc.jsx
  - src/renderer/ArtifactReader.jsx
  - src/renderer/App.jsx
  - src/main/settings.js
  - src/main/setup.js
  - src/main/ipc.js
  - src/main/projectAccess.js
  - src/preload/index.js
- **Skimmed only**:
  - docs/ (`docs/FEATURES.md` och `docs/features/epic-06-feature-docs.md` lästa för formatet; övriga epic-filer bara listade)
  - package.json (beroendeversioner och skript)
  - src/renderer/Timeline.jsx, src/renderer/useProject.js, src/main/parsers/audit.js, src/renderer/IntentDetail.jsx (sökning efter EPIC-03:s `useVirtualizer`, `key`, `newKeys`)
  - src/main/watcher.js (sökning efter `chokidar.watch`-anropen)
  - tests/main/, tests/renderer/ (bara fillistor)
  - .gitignore
- **Left out**:
  - node_modules/
  - out/
  - dist/
  - tests/.tmp/
  - AI-DLC:s egen installation (`.claude/`, `aidlc/`, AI-DLC-blocket i `.gitignore`)

### Packages Found
- aidlc-dash — Electron-skrivbordsapp (ett npm-paket, v0.1.1) — JavaScript/JSX (ESM) — konsol för AI-DLC-projekt; oförändrat sedan förra skanningen.

### Build System
- **Type**: npm + electron-vite + electron-builder (oförändrat)
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml` (bara `package.json` öppnad i denna körning)
- **Build Dependencies**: `postinstall` kör nu även `node scripts/fix-pty-perms.cjs` (nytt skript, ytligt sett i `package.json`).

### APIs Discovered
- Electron IPC `ipcMain.handle` — `src/main/ipc.js:84-162` — 24 request/response-kanaler i en handler-tabell; alla fel loggas och kastas vidare (`:164-175`).
- IPC push — `ipc.js:54,75,79` — `project:detected {projectId, detection}`, `project:changed {projectId, space, dirNames, indexChanged, costChanged}`, `project:watchError`; `pty:data`/`pty:exit` från pty.js.
- Preload-brygga — `src/preload/index.js:14-45` — `window.bridge` med 24 anrop, 5 prenumerationer och `platform` (29 kanaler). Ingen generisk invoke.
- Inga kanaler för katalogläsning (`listDir`) eller existenskontroll (`exists`) exponeras; renderaren kan bara läsa en namngiven fil via `project:file`.

### Frameworks & Libraries
- React / React DOM — ^19.3.1 — UI
- react-markdown — ^10.1.0 — Markdown i `ArtifactReader.jsx`
- remark-gfm — ^4.0.1 — GFM (tabeller, uppgiftslistor) i `FileContent`
- @tanstack/react-virtual — 3.14.24 (exakt version) — fönstrad tidslinje (EPIC-03, ytligt)
- chokidar — ^4.0.3 — filbevakning
- electron — ^45.3.1 — `app`, `dialog`, `shell`, `ipcMain`, `contextBridge`

### Test Coverage
- **Test Directories**: `tests/main/` (12 filer, nu även `ptyPerms.test.js`), `tests/renderer/` (8 filer, nu även `Timeline.test.jsx`), `tests/fixtures/`
- **Test Frameworks**: Vitest, Testing Library React, jsdom
- **Coverage Config**: absent (oförändrat enligt förra skanningen)
- Fokusfilerna `settings.js`, `ipc.js`, `App.jsx`, `ProjectView.jsx`, `ArtifactReader.jsx` och `preload/index.js` har inga egna testfiler. `setup.js`, `projectAccess.js` och `SetupAidlc.jsx` har det (`setup.test.js`, `projectAccess.test.js`, `SetupAidlc.test.jsx`; bara fillistor sedda).

### Code Quality Indicators
- **Linting**: ingen ESLint/Prettier-konfiguration (oförändrat)
- **CI/CD**: `.github/workflows/release.yml` (inte omläst)
- **Documentation**: varje fokusfil börjar med en syfteskommentar; FR-nummer i kommentarer (`FR1.5`, `FR4.2`–`FR4.8`, `FR6.4`, `FR8.4`). `docs/FEATURES.md` anger EPIC-03 som byggt men ej releasat och EPIC-06 som planerat.

### Technical Debt Signals
- `errorText` som tar bort Electrons prefix "Error invoking remote method" finns kopierad i `App.jsx:8-10`, `ArtifactReader.jsx:6` och `SetupAidlc.jsx:14`; `setup.js:14` har en egen variant för timeout.
- `setSettings` (`settings.js:29-34`) gör läs–slå ihop–skriv utan serialisering. Två samtidiga anrop kan tappa den ena ändringen. I dag skriver bara `App.jsx:63-73`, så det märks inte.
- `sanitize` (`settings.js:12-18`) behåller bara `openProjects`, `recentProjects` och `activeProject`; en ny nyckel tas tyst bort.
- `exists` (`projectAccess.js:67-74`) svarar `false` för alla fel, även för en sökväg utanför roten.
- `SetupAidlc` håller sina val i lokalt tillstånd; komponenten avmonteras när projektet blir AI-DLC (`ProjectView.jsx:100`), så valen finns inte kvar efter uppsättningen.
- Inga TODO/FIXME/HACK, inga `eslint-disable`, inga hårdkodade hemligheter i fokusfilerna. `INSTALL_URL` (`SetupAidlc.jsx:6`) är en publik länk.

## Handoff Summary
- **Intent-relevant finding**:
  - **Vyval**: `ProjectContent` (`ProjectView.jsx:83-104`) väljer `AidlcProject` när `project.detection.isAidlc` är sann, annars `SetupAidlc`; `TerminalPanel` visas alltid. `AidlcProject` (`:11-62`) har sidopanel (space-val, CostPanel, RefreshPanel, IntentList) och innehållsyta som bara visar `IntentDetail` eller "Välj en intent i listan." Det finns ingen vyväxling, ingen projektmeny och ingen inställningsvy i `App.jsx` (`:99-163`); en Features-vy och inställningen Automatiskt/Visa/Dölj behöver ny plats i UI:t.
  - **Inställningar**: `settings.js` skriver `userData/settings.json` via `settings:get`/`settings:set` (`ipc.js:155-156`, `preload/index.js:27-28`). `sanitize` tar bort okända nycklar, så en ny per-projekt-nyckel (t.ex. nyckel = projektrot, som `App.jsx` redan använder via `info.root`, realpath från `openRoot`) måste läggas till där. `App.jsx:63-73` skriver om inställningarna efter varje flikändring med just de tre nycklarna; sammanslagningen i `setSettings` bevarar andra nycklar, men läs–skriv-loppet är inte serialiserat.
  - **Uppsättningskommandon**: `buildSetupCommand` (`setup.js:72-84`) bygger en `&&`-kedja (`git init -b main`, `aidlc --project-dir . config --harness claude --yes`, plugins, modellnivå) och validerar varje val; `SetupAidlc.initiate` (`SetupAidlc.jsx:134-142`) skriver den i shell-fliken utan Enter. När AI-DLC dyker upp (watcher → `project:detected` → `App.jsx:54-60`) visar `SetupDone` (`ProjectView.jsx:65-81`) knappar som skriver i claude-fliken efter `terminal.restart('claude')`. Det är den naturliga platsen för US-0601:s förfrågan till Claude, men valet måste lyftas ur `SetupAidlc` till `ProjectContent` för att överleva bytet.
  - **Markdown**: `FileContent({rel, content})` (`ArtifactReader.jsx:24-34`, exporterad) renderar `.md` med react-markdown + remark-gfm och `skipHtml`; länkar blir `<span class="md-link">` utan navigering, bilder blir text. GFM-uppgiftslistor bör bli inaktiverade checkboxar (biblioteksstandard; inte verifierat i appen). `FileView` med "Visa i Finder"/"Öppna i editor" är inte exporterad.
  - **Läsåtkomst**: `project:file` → `readText(root, rel)` (`ipc.js:129`, `projectAccess.js:35-37`) läser vilken rotrelativ fil som helst, alltså även `docs/FEATURES.md` eller `FEATURES.md` i roten. Absoluta sökvägar, `..` och symlänkar ut ur roten avvisas (`:25-33`). `shell:openInEditor` tillåter `.md` (`ipc.js:24,133-140`). Det finns ingen IPC för att lista `docs/features/` eller fråga om en fil finns; epic-filer får hittas via länkarna i översiktstabellen eller via en ny kanal.
  - **Bevakning**: `watchSpace` (`ipc.js:64-82`) bevakar bara `intentsDir(space)` och ledgern; `watchForSetup` (`:43-61`) bara roten fram till `aidlc/spaces/` (enligt `watcher.js:106`, `depth: 2`, ytligt). Ändringar under `docs/` syns inte. Live-uppdatering (US-0602) kräver en ny bevakare, som också måste stängas i `closeWatcher` (`:34-40`) och en ny push-händelse eller ett nytt fält i `project:changed`.
- **Risks / follow-up**:
  - US-0602 säger att vyn visas "next to the intents" även för projekt som inte satts upp via konsolen, men ett projekt utan `aidlc/spaces/` visar bara `SetupAidlc`. Om Features-vyn ska finnas där är ett krav som behöver klargöras.
  - AC nämner "app's settings" och "project menu"; ingetdera finns i dag.
  - Ny IPC kräver ändring i både `ipc.js` och `preload/index.js` (smal brygga, avsiktligt).
  - Appen får inte skriva projektfiler: `projectAccess.js` saknar skrivanrop och ska förbli så; all skapning sker via terminalen.
  - EPIC-03 har landat sedan förra skanningen (ytligt): `Timeline.jsx` använder `useVirtualizer` från `@tanstack/react-virtual`, händelser har `key = <source>#<index>` (`audit.js:31-37`) och `useProject` exponerar `newKeys` i stället för `newSeqFrom`. Kunskapsbasens tidslinjeprosa ska uppdateras som ytlig kunskap.
