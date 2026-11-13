# Developer Code Scan — aidlc-dash

Intent: `261113-workflow-control` (express, Minimal). Bredd: full omskanning av hela repot. Commit: `1c3ee0299f3ec945be42d788ba7b16c08d467ab0`. Datum: 2026-11-13.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `src/main/` (index.js, ipc.js, models.js, projectAccess.js, projectService.js, pty.js, settings.js, watcher.js)
  - `src/main/parsers/` (audit.js, intents.js, ledger.js, pipeline.js, runtimeGraph.js, state.js, units.js)
  - `src/preload/index.js`
  - `src/renderer/` (alla .jsx/.js-filer och index.html)
  - `scripts/` (check-glibc.mjs, make-icon.cjs)
  - `.github/workflows/release.yml`
  - `docs/FEATURES.md`, `docs/features/epic-05-workflow-control.md`
  - Rotfiler: `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`, `.nvmrc`, `README.md`, projektets egen del av `.gitignore`
  - `tests/main/`, `tests/renderer/` (testnamn, importer och vad som täcks)
- **Skimmed only**:
  - `src/renderer/theme.css` (selektorer och CSS-variabler, inte varje regel)
  - `docs/features/` epic-01, -02, -03, -04, -06 (rubriker och status)
  - `tests/fixtures/` (struktur: fiktivt AI-DLC-projekt, ledger, audit-shards, `plain-folder`)
  - `build/` (electron-builders `buildResources`: icon.svg, icon.png, icons/ – källresurser, ingen kod)
- **Left out**:
  - `node_modules/`
  - `out/` (electron-vite-utdata)
  - `dist/` (electron-builder-utdata)
  - `package-lock.json` (innehållet)
  - `.git/`
  - AI-DLC:s egen installation: `.claude/`, `aidlc/`, AI-DLC:s markerade block i `.gitignore`

### Packages Found
- `aidlc-dash` (produktnamn "Auctum AIDLC Control", v0.1.1) — Electron-skrivbordsapp — JavaScript (ESM) + JSX — skrivskyddad konsol över AI-DLC-projekt med inbäddad `claude`- och skalterminal. Ett enda paket, ingen monorepo.

### Build System
- **Type**: npm + electron-vite 6 (Vite 8) för bundling, electron-builder 26 för paketering (macOS universal .dmg, Linux x64 .deb)
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `electron-builder.yml`, `vitest.config.mjs`, `.nvmrc` (Node 22)
- **Build Dependencies**: `src/main/index.js` → `out/main`, `src/preload/index.js` → `out/preload`, `src/renderer/index.html` → `out/renderer`; beroenden externaliseras (node-pty, chokidar laddas från `node_modules`); `postinstall` bygger om node-pty för Electron; `node-pty` packas upp ur asar.

### APIs Discovered
- Electron IPC (`ipcMain.handle`) — `src/main/ipc.js` — 17 request/response-kanaler (`project:*` 9, `shell:*` 2, `settings:*` 2, `pty:*` 4)
- Electron IPC push (`webContents.send`) — `src/main/ipc.js`, `src/main/pty.js` — 4 händelser (`project:changed`, `project:watchError`, `pty:data`, `pty:exit`)
- Preload-brygga `window.bridge` — `src/preload/index.js` — 21 namngivna funktioner (17 anrop + 4 prenumerationer) + `platform`
- Extern process — `src/main/models.js` — `aidlc config models --show --json --harness claude` via `execFile` (inget skal), samt inloggningsskal-PATH-probe
- Inga HTTP-endpoints, ingen databas.

### Frameworks & Libraries
- electron — ^45.3.1 — skrivbordsruntime
- react / react-dom — ^19.3.1 — renderar-UI
- @xterm/xterm — ^6.0.0, @xterm/addon-fit — ^0.11.0 — terminalvy
- node-pty — ^1.1.0 — pseudoterminal (lazy-laddad)
- chokidar — ^4.0.3 — filbevakning
- react-markdown — ^10.1.0, remark-gfm — ^4.0.1 — artefaktläsare
- @fontsource/antonio — ^5.3.0 — typsnitt
- vitest ^5.1.0, @testing-library/react ^16.3.3, jsdom ^29.1.1 — test

### Test Coverage
- **Test Directories**: `tests/main/` (9 filer, Node-miljö), `tests/renderer/` (3 filer, jsdom), `tests/fixtures/`
- **Test Frameworks**: Vitest (två projekt: `main`, `renderer`), Testing Library React
- **Coverage Config**: absent (ingen coverage-provider eller tröskel konfigurerad)

### Code Quality Indicators
- **Linting**: inget – ingen ESLint- eller Prettier-konfiguration i repot
- **CI/CD**: `.github/workflows/release.yml` (vitest på PR och tagg, mac- och linux-bygge, glibc-kontroll, GitHub Release på `v*.*.*`)
- **Documentation**: README (svenska) med kom igång och säkerhetsmodell; feature-dokument per epic under `docs/`; korta JSDoc-/syfteskommentarer överst i varje modul, med FR-hänvisningar

### Technical Debt Signals
- `errorText`-hjälparen är kopierad i fyra renderarfiler: `App.jsx:8`, `useProject.js:6`, `TerminalPanel.jsx:12`, `ArtifactReader.jsx:6`.
- Skalvalet (`process.env.SHELL || zsh/bash`) finns dubblerat i `pty.js:35` och `models.js:27`.
- Renderaren importerar direkt från huvudprocessens mapp: `Timeline.jsx:3` (`../main/parsers/audit.js`) och `CostTab.jsx:2` (`../main/parsers/ledger.js`). Fungerar eftersom modulerna är rena, men gränsen är implicit.
- Medvetna förenklingar markerade med `ponytail:`: obegränsade cacher (`projectService.js:12`), radtak 1500 utan virtualisering (`Timeline.jsx:6`), osäker agent/modell-attribuering (`ledger.js:50`).
- Ingen linter/formatterare; ingen coverage-mätning.
- Inga tester för `ipc.js`, `useProject.js`, `TerminalPanel.jsx`, `App.jsx`, `ProjectView.jsx`.
- `detectProject` körs bara en gång i `project:open` och watchern startas bara för AI-DLC-projekt (`ipc.js:66-69`); ett projekt som blir AI-DLC efter öppning upptäcks inte.
- `docs/FEATURES.md` anger EPIC-02 som "built, not released" trots att det är mergat till main (commit 1c3ee02).

## Handoff Summary
- **Intent-relevant finding**: Allt EPIC-05 behöver byggs ovanpå tre befintliga mekanismer. (1) Terminalinmatning: `TerminalPanel.jsx:100-108` exponerar `insert(text)` bara för claude-sessionen och bara till `TerminalPanel` själv via `claudeRef` (rad 129); snabbkommandona (rad 7, `/aidlc continue` m.fl.) skriver utan Enter. Det finns ingen signal för "Claude är ledig/upptagen", ingen insert i skalfliken och ingen väg från `IntentList`/`IntentDetail` till terminalen – en Fortsätt-knapp kräver att ref/kontext lyfts till `ProjectView.jsx`. (2) Status: `isInFlight` (`format.js:43`) kontrollerar `intents.json`-status `in-flight`; aktiv intent och stage-position finns redan i `mergeIntents` (`active`) och `mergePipeline` (`done`/`executed`, `current`), och `active-directive.json` läses i `projectService.js:151`. (3) Externa kommandon: `models.js` har mönstret `execFile` + fasta argument + inloggningsskalets PATH + timeout, som kan återanvändas för `git fetch`/`git show`/`aidlc --version`/`--dry-run`. Ingen git-kod finns ännu. För "Initiera AI-DLC" visas skärmen i `ProjectView.jsx:62-67`, men detekteringen görs bara vid öppning (`ipc.js:66`) och ingen watcher startas för icke-AI-DLC-mappar (`ipc.js:69`).
- **Risks / follow-up**: Appen lovar att aldrig skriva AI-DLC-filer (README, `projectAccess.js` saknar skrivanrop, `settings.js` är enda skrivaren) – EPIC-05 måste hålla det genom att bara skriva i terminalen. All filåtkomst går via `resolveInRoot`, och IPC-ytan är namngiven och smal (`preload/index.js`), så nya kanaler ska följa samma mönster. `pty:write` tar godtycklig sträng; att skicka Enter automatiskt (US-0501) är en ny beteendeklass jämfört med dagens "skriv utan att skicka". Ett git-anrop under en pågående stage kan ändra filer under motorn – kriteriet "aldrig under pågående arbetsflöde" kräver en upptagen-signal som inte finns i dag.
