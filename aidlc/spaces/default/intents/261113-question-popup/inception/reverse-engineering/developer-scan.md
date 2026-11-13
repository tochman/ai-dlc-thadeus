## Developer Code Scan Results

Fokuserad skanning för intent `261113-question-popup` (US-0505: väntande frågor och godkännanden som LCARS-popup och systemnotis). Repo: projektroten `aidlc-dash` (oregistrerad), commit `22bd72191b37afd2377cf61d8dcc007132d963f5`. Djup: Minimal.

### Scan Coverage
- **Analyzed deeply**:
  - src/main/parsers/audit.js
  - src/main/projectService.js
  - src/main/watcher.js
  - src/main/index.js
  - src/main/ipc.js
  - src/main/settings.js
  - src/preload/index.js
  - src/renderer/App.jsx
  - src/renderer/useProject.js
  - src/renderer/AppSettingsDialog.jsx
  - src/renderer/TerminalContext.jsx
- **Skimmed only**:
  - src/main/menu.js (exporter och `send`/`targetWindow`)
  - src/renderer/ProjectView.jsx (hur `terminalCommand` tas emot, rad 125-133)
  - src/renderer/DocsDialog.jsx (dialogmönstret)
  - src/main/parsers/intents.js (`mergeIntents`, fälten i en intent-rad)
  - tests/main/, tests/renderer/ (bara fillistor)
  - AI-DLC:s auditformat (`.claude/knowledge/aidlc-shared/audit-format.md`, raderna för `DECISION_RECORDED`, `STAGE_AWAITING_APPROVAL`, `QUESTION_ANSWERED`, `GATE_APPROVED`, `GATE_REJECTED`), läst som referens för händelsernas fält, inte som projektkod
- **Left out**:
  - node_modules/
  - out/
  - dist/
  - tests/.tmp/
  - AI-DLC:s egen installation (`.claude/`, `aidlc/` m.fl.)

### Packages Found
- aidlc-dash — Electron-skrivbordsapp — JavaScript (ESM) + JSX — AI-DLC-konsol "Auctum AIDLC Control" (oförändrat sedan förra skanningen; se codekb)

### Build System
- **Type**: npm + electron-vite (main, preload, renderer till `out/`), electron-builder för paket
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `electron-builder.yml`, `vitest.config.mjs` (inte omlästa i denna skanning)
- **Build Dependencies**: renderaren importerar rena moduler från `src/main/parsers/` (t.ex. `NOISY_EVENTS` från `audit.js`)

### APIs Discovered
- Electron IPC invoke — `src/main/ipc.js` / `src/preload/index.js` — 32 kanaler (28 från tidigare + `window:toggleFullscreen`, `window:isFullscreen`, `menu:state`, `app:openDocsUrl` från US-0404)
- Electron IPC push — `src/preload/index.js` — 8 prenumerationer (6 tidigare + `window:fullscreen`, `menu:command`)
- Inga HTTP- eller nätverks-API:er

### Frameworks & Libraries
- electron — ^45.3.1 — fönster, IPC, meny; `Notification` används inte någonstans i `src/`
- chokidar — ^4.0.3 — filbevakning (`watcher.js`)
- react — ^19.3.1 — UI
(versioner från förra skanningen; `package.json` inte omläst)

### Test Coverage
- **Test Directories**: `tests/main/` (17 filer, nu även `menu.test.js` och `windowOptions.test.js`), `tests/renderer/` (13 filer)
- **Test Frameworks**: Vitest, Testing Library React, jsdom
- **Coverage Config**: absent (enligt förra skanningen)
- Relevanta befintliga testfiler för US-0505: `parsers.test.js` (audit-parsern), `watcher.test.js`, `settings.test.js`, `projectService.test.js`, `AppShell.test.jsx`

### Code Quality Indicators
- **Linting**: ingen ESLint/Prettier (enligt förra skanningen)
- **CI/CD**: `.github/workflows/release.yml` (inte omläst)
- **Documentation**: korta kommentarer med krav-ID:n (FRx.y, US-xxxx) och `ponytail:`-förenklingar i alla lästa filer

### Technical Debt Signals
- `errorText()` dupliceras fortfarande (`App.jsx:12`, `useProject.js:6`, `AppSettingsDialog.jsx:10` m.fl.).
- `watcher.js` har två nästan likadana debounce-implementationer (`debounce()` rad 16-30 och inline i `watchIntents` rad 86-91).
- Main håller ingen modulreferens till fönstret: `createWindow()` (`index.js:37-65`) har `win` lokalt, `ipc.js` slår upp fönstret via `BrowserWindow.fromWebContents(event.sender)`, `menu.js:139` via `getFocusedWindow() ?? getAllWindows()[0]`.
- `projectService.js:12` obegränsade cacher per rot/space/intent (`ponytail:`-markerad).
- Inga TODO/FIXME eller `eslint-disable` i de lästa filerna.

## Handoff Summary
- **Intent-relevant finding**:
  - **Auditparsern behåller alla fält**: `parseBlock` (`audit.js:9-29`) lyfter ut bara `Timestamp` och `Event`; varje annan `**Nyckel**: värde`-rad hamnar ordagrant i `fields` (även flerradiga värden, rad 22-23). Alltså finns `Question Id`, `Question Type`, `Options`, `Decision`, `Details` och `Stage` redan i `event.fields` som strängar (`Options` är otolkad text). Varje händelse får `key` `<shard>#<index>` (rad 37), `timeMs` (ärvs från föregående block i samma shard om tidsstämpeln saknas, rad 41-47) och `seq` efter sammanslagning; `projectService.loadAuditEvents` (`projectService.js:131-137`) läser alla `*.md` i `<intent>/audit/` (flera shards per intent) och lägger till `category` (`DECISION_RECORDED` → `human`, `STAGE_AWAITING_APPROVAL` → `gate`).
  - **Audit laddas bara per intent i detaljen**: `loadIntentList` läser bara `aidlc-state.md` och beskrivningen (`summarizeIntent`, rad 58-71: `currentStage`, `stateStatus`, `done`, `executed`); audit-händelser kommer bara via `project:intent` (`buildDetail`). Det finns inget "öppna frågor"-API.
  - **Hur uppdateringar når renderaren**: `watchIntents` (`watcher.js:70-139`) bevakar hela `intents/`-mappen för en space; en ändring i `<intent>/audit/*.md` ger `dirNames: [intent]`. `ipc.js:104-122` skickar `project:changed {projectId, space, dirNames, indexChanged, costChanged}` till det `webContents` som öppnade projektet – utan händelseinnehåll. `useProject.js:113-130` läser om listan och detaljen **bara för den valda intenten**; `newKeys` (rad 64-71) räknas mot förra detaljen för samma intent.
  - **Alla öppna projekt bevakas**, inte bara det aktiva: varje `project:open` startar `watchSpace` (`ipc.js:137`), och App håller alla `ProjectView` monterade (`App.jsx:406-426`), så varje projekts `useProject` får sina `project:changed`. Men bara en space per projekt (den renderaren tittar på, `ipc.js:106`) och bara AI-DLC-projekt.
  - **Projektbyte och Claude-fliken**: `setActiveId(projectId)` byter projekt (`App.jsx:317`). Terminalmenyn går via `runTerminal(action)` (`App.jsx:219-221`), som sätter `terminalCommand {seq, action, projectId}` för **det aktiva** projektet; `ProjectContent` (`ProjectView.jsx:130-133`, skummad) kör `terminal.show('claude')` när `projectId` matchar, och `show` (`TerminalContext.jsx:31-34`) öppnar panelen, väljer fliken och fokuserar sessionen. `runTerminal` läser `active` ur closure, så "Svara i Claude" för ett annat projekt behöver sätta `projectId` direkt (`setActiveId(id)` + `setTerminalCommand({seq, action:'claude', projectId:id})`).
  - **Inställningar**: `sanitize()` (`settings.js:24-41`) vitlistar nycklar; mönster: `animations` via `Set` (rad 11, 31) och `fullscreen` som boolean (rad 33), båda utelämnas när de är ogiltiga. En ny nyckel (t.ex. "Popup och notis / Bara popup / Av") måste läggas till där, annars tas den bort tyst. `setSettings` slår ihop seriellt (rad 52-69).
  - **Ingen Electron `Notification`** och **ingen fokusdetektering** finns (inga `focus`/`blur`-lyssnare, ingen `isFocused`, ingen `document.hasFocus`/`visibilitychange`). Enda fönsterhändelserna är `enter-/leave-full-screen` (`index.js:56-57`). Notisklick måste alltså visa/fokusera fönstret i main och skicka ett kommando till renderaren, enligt `menu:command`-mönstret (main → renderare, `subscribe` i preload, vitlistad dispatch i `App.jsx:235-247`).
  - **Dialoger**: `AppSettingsDialog`, `DocsDialog` och `ProjectSettingsDialog` är native `<dialog>` med `showModal()`, `aria-labelledby`, Esc via `onCancel` + `preventDefault` + `onClose`, innehåll renderat bara när öppen, fel med `role="alert"`, LCARS-radio som `label.lcars-block` runt `input.sr-only`.
- **Risks / follow-up**:
  - Frågan "har ett senare svar" kan inte matchas på `Question Id` för alla svar: enligt auditformatet bär `DECISION_RECORDED` och `STAGE_AWAITING_APPROVAL` `Question Id`, men `QUESTION_ANSWERED`, `GATE_APPROVED` och `GATE_REJECTED` bär bara `Stage` (och `Unit`); matchning blir på `Stage` (+ `Unit`) och ordning (`timeMs`/`seq`), med `Question Id` där det finns (t.ex. `QUESTION_REPLIED`).
  - Frågor i icke-valda intents och i dolda projekt syns inte i renderaren i dag; antingen härleds öppna frågor i main (vid `project:changed` per intent i `dirNames`) och skickas som ny push, eller så läser renderaren detaljen för varje ändrad intent. Main-varianten krävs ändå för notiser när fönstret saknar fokus.
  - En `showModal()`-popup tar fokus från terminalen medan personen skriver; överväg icke-modal `dialog.show()` eller `role="alertdialog"` med tydlig fokushantering.
  - Main har ingen fönsterreferens på modulnivå; notisklick behöver `BrowserWindow.getAllWindows()[0]` eller en sparad referens, och `win.show()`/`focus()` före kommandot.
  - Bevakningen gäller bara den space renderaren visar per projekt; frågor i andra spaces ger ingen händelse.
