# Komponentinventering: aidlc-dash

Varje rubrik nedan är ett komponentnamn (används verbatim i `reverse-engineering-timestamp.md`). För renderarkomponenter listas vad de renderar, deras klassnamn, `data-testid`, tillgänglighetsmönster och tester som är kopplade till markup. Alla `data-testid` ska behållas.

Denna skanning (intent `261113-question-popup`) läste på djupet: App Shell, AppSettingsDialog, TerminalContext, useProject Hook, Preload Bridge, Main Entry, IPC Router, Settings Store, Project Service, File Watcher och Audit Parser. App Menu, DocsDialog och ProjectView är skummade. Övriga avsnitt är från tidigare skanningar och inte omverifierade.

## Renderare: skal och varumärke

### Theme Stylesheet
- **Fil**: `src/renderer/theme.css`.
- **Ansvar**: hela utseendet: färgtokens, radie- och fonttokens, layout, LCARS-block och ramar, taggar, animationer.
- **Efter designlyftet** (skummat tidigare): `--bg #05060a`, ny palett (skiffer, stålblå, korall, amber), klasser för vänsterarmen (`.app-arm`, `.lcars-block--<ton>`, `.lcars-tabbed`, `.lcars-tab`), glöd (`.is-breathing`, `.is-attn`) och rörelseregler `:root[data-motion='reduced'|'off']`. Inte omläst.

### App Shell
- **Fil**: `src/renderer/App.jsx` (433 rader). Beror på: Splash, AuctumMark, Lcars Primitives (`Bar`, `Frame`), AppSettingsDialog, DocsDialog, ProjectView, `window.bridge`.
- **Renderar**: `div.app` > `Splash ready={restored}`; `header.app-header` (`div.app-brand` med `AuctumMark.app-mark` 46px och "Auctum" / "Aidlc control"; `div.app-header-main` med `Bar`, gren, `h1.app-title` "<projekt> • <vy>" eller "Inget projekt", `app-header-deco`, knappen `button.lcars-block.lcars-block--sm.app-fullscreen` "Helskärm"/"Lämna helskärm" med `aria-pressed`); `nav.app-arm`; `div.banner.banner-error.app-error[role=alert]`; `main.app-main` (tomt läge i `Frame`; en `div.project-pane` per projekt, dold med `hidden`); `AppSettingsDialog`; `DocsDialog`.
- **Vänsterarmen** (`nav.app-arm[aria-label="Projekt och vyer"]`): per projekt `div.arm-project(.is-active)` med `button.lcars-block--active|--dark` (projektnamn, `title` = rot, `onClick` = `setActiveId`) och `span.arm-tools` (⚙ Projektinställningar, × Stäng); `+ Öppna`; `arm-spacer`; när ett projekt är aktivt: `ArmBlock` Intents/Uppsättning, Features (bara om `showFeatures`), Kostnad och Github (inaktiverade om projektet inte är AI-DLC); alltid `ArmBlock` Inställningar; `div.arm-foot`.
- **Namngivna åtgärder (delas av arm och meny, `menuCommands` rad 235-244)**:

  | Åtgärd | Kod i `App.jsx` |
  |--------|-----------------|
  | Öppna projekt | `openProject()` (163-174): `pickProject`, byter till befintlig flik eller `openPath(dir)` |
  | Stäng projekt | `closeTab(projectId)` (176-185), `closeActiveProject()` (202-204) |
  | Byt projekt | `setActiveId(projectId)` (armens projektblock, rad 317) |
  | Vy Intents / Features | `showView(next)` (205-207) |
  | Kostnad / Github | `togglePanel('cost' | 'github')` (209-212) |
  | Projektinställningar | `openProjectSettings(projectId)` (214-218) |
  | Inställningar | `openAppSettings()` (213) |
  | Terminal Claude / Shell / Starta om | `runTerminal(action)` (219-221): `terminalCommand = {seq+1, action, projectId: active.projectId}` |
  | Dokumentation | `openDocs()` (223-233) |
  | Animationer | `saveAnimations(next)` (187-190) |
  | Helskärm | `toggleFullscreen()` (257-259) |

- **Menykommandon**: `bridge.onMenuCommand` (rad 161) anropar `menuCommandRef.current`, som bara kör kommandon som finns i `menuCommands` (`Object.hasOwn`) och vitlistar argument med `pick(value, allowed, fn)`. `sendMenuState({hasProject, isAidlc, showFeatures})` skickas när något av dem ändras (251-255).
- **"Svara i Claude" för ett annat projekt**: `runTerminal` läser `active` ur closure och riktar sig alltid mot det aktiva projektet; för att byta projekt och öppna dess Claude-flik i samma steg behöver koden sätta `setActiveId(id)` och `setTerminalCommand({seq, action: 'claude', projectId: id})` direkt.
- **Tillstånd**: `tabs`, `activeId`, `error`, `restored`, `settingsFor`, `appSettingsOpen`, `animations`, `ui[projectId] = {view, cost, github}`, `meta[projectId] = {showFeatures, intentCount}`, `branch`, `fullscreen`, `terminalCommand`, `docs`.
- **Exporterar**: `motionMode(saved)`; sätter `document.documentElement.dataset.motion` i `useLayoutEffect`.
- **data-testid**: `project-tabs` (på `nav.app-arm`), `project-tabs-tab`, `project-settings-open`, `project-tabs-close`, `project-tabs-add`, `project-view-switch-intents`, `project-view-switch-features`, `arm-cost`, `arm-github`, `app-settings-open`, `fullscreen-toggle`, `app-error-dismiss`, `empty-state-open`.
- **Tillgänglighet**: `aria-current` (`true` på aktivt projekt, `page` på aktiv vy), `aria-expanded` på Kostnad/Github, `aria-pressed` på helskärmsknappen, `aria-label` och `title` på ⚙ och ×, `role="alert"` på felbannern, `aria-hidden` på dekor.
- **Fokus och notiser**: inga `focus`/`blur`/`visibilitychange`-lyssnare och ingen `Notification`.
- **Tester**: `tests/renderer/AppShell.test.jsx` (finns; innehåll ej omläst).

### AppSettingsDialog
- **Fil**: `src/renderer/AppSettingsDialog.jsx` (90 rader). Props: `open`, `onClose`, `value` (gällande läge), `onChange(id)` (returnerar promise).
- **Renderar**: native `dialog.settings-dialog[aria-labelledby=app-settings-title]` (`showModal` när `open`, `close` annars; fallback via `open`-attributet i jsdom) > `h2` "Inställningar", `fieldset.settings-group` med `legend` "Animationer" och `div.lcars-radio-group` av `label.lcars-block--active|--mid` som omsluter `input[type=radio].sr-only[name=app-animations]` (Full, Dämpad, Av, från `OPTIONS`), hjälptext `p.muted.settings-help`, felrad `p.refresh-error[role=alert]`, `div.setup-actions` med Stäng.
- **data-testid**: `app-settings-dialog`, `app-settings-animations-full|reduced|off`, `app-settings-close`.
- **Beteende**: Esc fångas i `onCancel` (`preventDefault`) och stänger via App:s state; ett misslyckat sparande visas som "Inställningen kunde inte sparas: …". Innehållet renderas bara när `open`; felraden nollställs när dialogen öppnas.
- **Relevans för US-0505**: naturlig plats för ett andra `fieldset` "Frågor och godkännanden" med samma radiomönster (Popup och notis / Bara popup / Av). I dag tar dialogen bara ett värde och en `onChange`; ett andra val kräver nya props.

### DocsDialog
- **Fil**: `src/renderer/DocsDialog.jsx` (skummad). Props: `doc {name, content} | null`, `onClose`.
- **Renderar**: native `dialog.settings-dialog.docs-dialog[aria-labelledby=docs-dialog-title]` med `showModal`, Esc via `onCancel`, `h2` "<projekt> • docs/README.md" och innehållet via `FileContent`.
- **data-testid**: `docs-dialog` (övriga ej lästa).

### Lcars Primitives
- **Fil**: `src/renderer/Lcars.jsx` (skummad tidigare: bara exporterna lästa). Exporterar `Bar({segs})`, `Frame({children})`, `Hairlines`, `progressStates`, `dotsLabel`, `Dots`, `Readout`.

### Splash
- **Fil**: `src/renderer/Splash.jsx`. Exporterar `APP_NAME`, `SPLASH_MIN_MS` 900, `SPLASH_MAX_MS` 4000, `SPLASH_FADE_MS` 300.
- **Renderar**: `div.splash(.is-leaving)` > `AuctumMark.splash-mark` (160px, ej dekorativ), `div.splash-name`, `div.splash-bar[aria-hidden]` > `span`.
- **data-testid**: `splash`.
- **Tester kopplade till markup**: `Splash.test.jsx` kräver `role="img"` med namnet `Auctum`, texten `Auctum AIDLC Control` och att `className` innehåller `is-leaving` under uttoningen.

### AuctumMark
- **Fil**: `src/renderer/AuctumMark.jsx`. Props: `size`, `className`, `decorative`.
- **Renderar**: inline-SVG (`viewBox="202 274 848 708"`) med två banor i `currentColor`.
- **Tillgänglighet**: `role="img" aria-label="Auctum"` eller `aria-hidden` när `decorative`.
- **Samma banor** finns i `build/icon.svg`.

## Renderare: projektvy

### ProjectView
- **Fil**: `src/renderer/ProjectView.jsx` (interna delar bl.a. `AidlcProject`, `SetupDone`, `ProjectContent`). Beror på: TerminalContext, useProject Hook, useFeatures Hook, IntentList, IntentDetail, CostPanel, RefreshPanel, SetupAidlc, FeaturesView, TerminalPanel, ProjectSettingsDialog.
- **Props** (skummat): `project`, `visible`, `view`, `onView`, `costOpen`, `onToggleCost`, `githubOpen`, `onToggleGithub`, `settingsOpen`, `onCloseSettings`, `onMeta`, `terminalCommand`. Rapporterar `{showFeatures}` och `{intentCount}` uppåt via `onMeta`. `TerminalProvider` monteras här, per projekt.
- **terminalCommand** (rad 125-133, skummad): `ProjectContent` kör en effekt per nytt `terminalCommand`; om `projectId` matchar körs `terminal.restart(terminal.view.active)` för `restart`, annars `terminal.show(action)`.
- **Tidigare beskrivning** (ej omverifierad): `div.project-view` med `SetupDone`, `div.project-body` > `aside.sidebar` och `section.content`, därefter FeaturesView, TerminalPanel och ProjectSettingsDialog.
- **data-testid** (tidigare): `project-space-select`, `setup-aidlc-done`, `setup-aidlc-doctor`, `setup-aidlc-first-work`, `setup-aidlc-feature-docs-run`.

### IntentList
- **Fil**: `src/renderer/IntentList.jsx`. Exporterar `sortIntents`, `filterIntents`. Beror på: Renderer Utilities, ResumeButton.
- **Renderar**: `div.intent-list` > rubrik, `div.filters`, `ul.intent-rows[role=listbox]` > `li` > `button.intent-row.status-<status>(.is-selected)[role=option]`; ResumeButton under raden.
- **data-testid**: `intent-list`, `intent-list-search`, `intent-list-status-filter`, `intent-list-scope-filter`, `intent-list-sort`, `intent-list-row`, `intent-list-row-cost`, `intent-list-row-status`.
- **Tester kopplade till markup**: `IntentList.test.jsx` läser `.intent-slug` i varje rad; texterna `Aktiv`, `Saknas i intents.json` och `6/10` hämtas med `getByText`.

### IntentDetail
- **Fil**: `src/renderer/IntentDetail.jsx`. Beror på: Pipeline, Timeline, BoltDag, ArtifactReader, CostTab, ResumeButton.
- **Renderar**: `article.intent-detail` > sidhuvud, `div.detail-tabs[role=tablist]` (fem flikar), `div.detail-body[role=tabpanel]`.
- **data-testid**: `intent-detail`, `intent-detail-tab-pipeline`, `-timeline`, `-units`, `-cost`, `-files`, `intent-detail-story-link`.

### Pipeline
- **Fil**: `src/renderer/Pipeline.jsx` (intern `StageRow`).
- **Statusvärden** (`status-*`): `not-started`, `in-progress`, `awaiting-approval`, `revising`, `done`, `skipped`, `unknown`.
- **data-testid**: `pipeline`, `pipeline-stage`, `pipeline-stage-cost`, `pipeline-stage-file`.

### Timeline
- **Fil**: `src/renderer/Timeline.jsx` (intern `EventRow`). Beror på `@tanstack/react-virtual`, `NOISY_EVENTS` från Audit Parser.
- **Renderar**: filter, `div.timeline-scroll` > `ol.events` > `li.event.cat-<kategori>(.is-new)[data-index]` > `button.event-row` och `dl.event-fields` (visar `fields`).
- **Kategorier**: `stage`, `subagent`, `gate`, `human`, `unit`, `error`, `guard`, `other`.
- **data-testid**: `timeline`, `timeline-noise-toggle`, `timeline-type-filter`, `timeline-stage-filter`, `timeline-jump-newest`, `timeline-jump-stage`, `timeline-new-counter`, `timeline-scroll`, `timeline-event`.
- **Tillgänglighet**: `aria-setsize`/`aria-posinset`, `aria-expanded`, beskrivande `aria-label` per rad, piltangenter/Home/End.

### BoltDag
- **Fil**: `src/renderer/BoltDag.jsx`. SVG med `path.dag-edge` och `g.dag-node.unit-<pending|running|done>`; `role="img"` med `aria-label`.
- **data-testid**: `bolt-dag`, `bolt-dag-empty`.

### ArtifactReader
- **Fil**: `src/renderer/ArtifactReader.jsx`. Exporterar `FileContent` (används av RefreshPanel, FeaturesView och DocsDialog).
- **data-testid**: `artifact-reader`, `artifact-reader-file`, `artifact-reader-reveal`, `artifact-reader-open-editor`.

### CostPanel
- **Fil**: `src/renderer/CostPanel.jsx` (interna `CostChart`, `ScopeTable`). Öppnas från armens Kostnad-block (`costOpen`).
- **data-testid**: `cost-panel`, `cost-panel-toggle`, `cost-panel-legacy`, `cost-panel-models`, `cost-panel-agents`, `cost-panel-scopes`.

### CostTab
- **Fil**: `src/renderer/CostTab.jsx`. Exporterar `CostLabel`, `CostTable`, `ModelTable`.
- **data-testid**: `cost-tab`, `cost-tab-unavailable`, `cost-tab-stages`, `cost-tab-agents`, `cost-tab-models`, `model-table`, `model-mismatch`.

### RefreshPanel
- **Fil**: `src/renderer/RefreshPanel.jsx`. Exporterar `WAIT_MESSAGE`, `PULL`, `FROM_MAIN`. Öppnas från armens Github-block (`githubOpen`).
- **data-testid**: `refresh-panel`, `refresh-panel-toggle`, `refresh-panel-status`, `refresh-panel-update`, `refresh-panel-badge`, `refresh-panel-details`, `refresh-panel-detail-list`, `refresh-panel-remote-file`, `refresh-panel-pull`, `refresh-panel-from-main`, `refresh-panel-choice`, `refresh-panel-choice-rebase`, `refresh-panel-choice-merge`, `refresh-panel-conflicts`, `refresh-panel-conflict-list`.

### ResumeButton
- **Fil**: `src/renderer/ResumeButton.jsx`. Exporterar `BUSY_MESSAGE`, `resumeLabel`.
- **Renderar**: `span.resume` > `button.btn.btn-accent.resume-button`, `span.resume-message[role=status]`.
- **data-testid**: `intent-resume`.

### SetupAidlc
- **Fil**: `src/renderer/SetupAidlc.jsx`. Exporterar `INSTALL_URL`, `FAILED_MESSAGE`.
- **data-testid**: `project-not-aidlc`, `setup-aidlc-start`, `setup-aidlc-checks`, `setup-aidlc-preview`, `setup-aidlc-note`, `setup-aidlc-advanced`, `setup-aidlc-plugin`, `setup-aidlc-preset-<preset>`, `setup-aidlc-missing`, `setup-aidlc-feature-docs`, `setup-aidlc-run`, `setup-aidlc-failed`.

### FeaturesView
- **Fil**: `src/renderer/FeaturesView.jsx`. Exporterar `StatusBadge` (emoji-markör och text, aldrig bara färg).
- **data-testid**: `features-view`, `features-view-empty`, `features-view-setup`, `features-view-fallback`, `features-view-epic`, `features-view-story`, `features-view-story-detail`, `features-view-intent-link`, `features-view-reveal`, `features-view-open-editor`, `features-view-filter-status`, `features-view-filter-priority`.

### ProjectSettingsDialog
- **Fil**: `src/renderer/ProjectSettingsDialog.jsx`. Öppnas från armens ⚙.
- **Renderar**: native `dialog.settings-dialog` (`showModal`) > `form` med `fieldset.settings-group`, radioknappar, sökvägsfält, felrad, knappar.
- **data-testid**: `project-settings-dialog`, `project-settings-mode-auto|show|hide`, `project-settings-path`, `project-settings-setup`, `project-settings-save`, `project-settings-cancel`.
- **Tillgänglighet**: `aria-labelledby`, `aria-invalid`, `aria-describedby`, Esc stänger via `onCancel`.

### TerminalPanel
- **Fil**: `src/renderer/TerminalPanel.jsx` (intern `TermSession`). Beror på xterm, FitAddon, TerminalContext, `terminalControl.js`, `tokens.js`.
- **Renderar**: `section.terminal-panel(.is-collapsed)[aria-label=Terminal]` > separator, `div.terminal-bar` (flikar `claude`/`shell` med aktivitetsläge, fel, snabbåtgärder), `div.terminal-body`.
- **data-testid**: `terminal-panel-resize`, `terminal-panel-toggle`, `terminal-panel-tab-claude|shell`, `terminal-panel-state-claude|shell`, `terminal-panel-error`, `terminal-panel-quick-command`, `terminal-panel-restart-<kind>`.

### TerminalContext
- **Fil**: `src/renderer/TerminalContext.jsx` (105 rader). `TerminalProvider` och `useTerminal()` (API i `api-documentation.md`). Monteras per projekt i ProjectView; renderar ingen markup.
- **Tillstånd**: `sessions` (ref: flik → `{write, spawn, restart, focus, activity}`), `view {open, active}` (start `{open: true, active: 'claude'}`), `states` per flik (`exited` från start), `error`, `pending` per flik (text inskriven utan Enter, EPIC-04 FR3.6).
- **`show(tab)`** (rad 31-34): `setView({open: true, active: tab})` och `sessions[tab]?.focus()` – det är detta "Svara i Claude" ska landa i.
- **`run(tab, fn)`**: visar fliken, startar en avslutad session och väntar på första `idle` (`READY_TIMEOUT_MS`), kör `fn`, fokuserar; fel visas i terminalpanelen.
- **`type`/`sequence`** markerar `pending` när sista steget saknar Enter; `input(tab)` nollställer när personen skriver; `restart(tab)` startar om.
- **Flaggnamn**: `TAB_NAME = {claude: 'Claude', shell: 'Skalet'}` i felmeddelanden.

## Renderare: hooks och hjälpare

### useProject Hook
- **Fil**: `src/renderer/useProject.js` (133 rader). `useProject(projectId, initialSpace)`.
- **Returnerar**: `space, setSpace, intents, listWarning, selected, setSelected, detail, newKeys, error, cost, models, lastIntentChangeAt`.
- **Laddning**: `loadList(onlyDirs)` via `getIntents`; första valet blir den aktiva intenten, annars första. `loadDetail(dirName, {live})` via `getIntent`, avbryts om valet flyttat sig; vid `live` och samma intent räknas nya händelser som nycklar som inte fanns i förra detaljen och markeras 4 s (`HIGHLIGHT_MS`, `newKeys`).
- **Push**: `onProjectChanged` filtreras på `projectId` och `space`; listan läses om (alla vid `indexChanged`, annars `dirNames`), kostnaden vid `costChanged`/`indexChanged`, detaljen bara om den valda intenten finns i `dirNames` eller indexet ändrats. `lastIntentChangeAt` sätts när `dirNames` inte är tom. `onWatchError` ger felbanner.
- **Följd för US-0505**: audit-händelser i en icke-vald intent når aldrig renderaren; varje monterat projekt (även dolt) kör sin egen hook och får sina `project:changed`.

### useFeatures Hook
- `src/renderer/useFeatures.js` (ej omläst): feature-dokument, projektinställningar och story-länkar; prenumererar på `features:changed`.

### Renderer Utilities
- `src/renderer/format.js`: statusetiketter, tid, varaktighet, kostnad, tokens, `stagePosition`.
- `src/renderer/terminalControl.js`: `createActivity`, `waitFor`, `runSequence`, `withEnter`, `READY_TIMEOUT_MS`.
- `src/renderer/featureDocsPrompt.js`: begäran som skrivs in i claude-fliken.
- `src/renderer/tokens.js`: `token(name)`, `xtermTheme()`.
- `src/renderer/main.jsx`, `index.html`: monterar `App`, laddar Antonio och `theme.css`; CSP.

## Preload och main

### Preload Bridge
- **Fil**: `src/preload/index.js` (57 rader).
- **Mönster**: `call(channel)` = `(...args) => ipcRenderer.invoke(channel, ...args)`; `subscribe(channel)` = registrerar en lyssnare som skickar bara payload och returnerar `removeListener`. Inget generiskt `invoke`/`send`.
- **API**: `platform` plus 32 invoke-funktioner och 8 prenumerationer (lista i `api-documentation.md`), inklusive US-0404:s `toggleFullscreen`, `isFullscreen`, `onFullscreen`, `sendMenuState`, `onMenuCommand`, `openDocsUrl`. Ingen notis- eller fokusfunktion.

### Main Entry
- **Fil**: `src/main/index.js` (94 rader).
- **userData**: `app.setPath('userData', <appData>/aidlc-dash)`.
- **Ikon**: `iconPath` = `process.resourcesPath/icon.png` när `app.isPackaged`, annars `build/icon.png`; till `BrowserWindow` bara på Linux; Dock-ikon via `app.dock.setIcon` bara på macOS i dev. (Samma `iconPath` kan användas för en `Notification` på Linux.)
- **`windowOptions(settings, platform)`** (exporterad, ren): 1440x900, min 960x600, `fullscreenable: true`, `fullscreen: true` bara när `settings.fullscreen === true` (ett uttryckligt `false` skulle stänga av helskärm på macOS), `autoHideMenuBar: true`, `backgroundColor '#05060a'`, `title 'Auctum AIDLC Control'`, säkra `webPreferences`. Testas i `windowOptions.test.js`.
- **`createWindow()`** (async): läser inställningar, skapar fönstret, `setWindowOpenHandler` (http(s) till OS-webbläsaren, nekar nya fönster), `will-navigate`-spärr, `enter-/leave-full-screen` → `setSettings({fullscreen})`, `window:fullscreen` till renderaren och `applyMenu(win)`; laddar `ELECTRON_RENDERER_URL` eller `out/renderer/index.html`. Returnerar `win`, som bara skickas vidare till `applyMenu`; ingen modulreferens sparas.
- **Livscykel**: `whenReady` → Dock-ikon → `registerIpc()` → `applyMenu(null)` → `open()` (`createWindow().then(applyMenu)`); `activate` öppnar ett nytt fönster om inget finns; `before-quit` → `shutdown()`; `window-all-closed` avslutar utom på macOS.
- **Fokus och notiser**: inga `focus`/`blur`-lyssnare, ingen `Notification`.

### App Menu
- **Fil**: `src/main/menu.js` (skummad). Exporterar `AIDLC_DOCS_URL`, `ISSUES_URL`, `parseMenuState`, `setMenuState`, `buildMenuTemplate({isMac, isPackaged, state, fullscreen, send, actions})`, `applyMenu(win)`.
- **Sändning**: `send(payload)` skickar `menu:command` till `getFocusedWindow() ?? getAllWindows()[0]` efter `isDestroyed()`-kontroll. Ett notisklick kan använda samma mönster för att nå fönstret.
- **Tester**: `tests/main/menu.test.js`.

### IPC Router
- **Fil**: `src/main/ipc.js` (255 rader).
- **Projekttabell**: `Map` projectId → `{root, space, watcher, setupWatcher, featuresWatcher, featuresKey, sender, models, setupInfo}`; `sender` är det `webContents` som öppnade projektet.
- **Bevakning**: `project:open` startar `watchSpace(projectId, activeSpace)` för AI-DLC-projekt, annars `watchForSetup`; `project:intents` byter space vid behov. Alltså bevakas **alla öppna projekt**, men bara en space per projekt. `watchSpace` skickar `project:changed` och `project:watchError`.
- **Handlers**: 32 kanaler i `handlers`-objektet; `window:toggleFullscreen`/`window:isFullscreen` via `BrowserWindow.fromWebContents(event.sender)`; `menu:state` godtar bara det `parseMenuState` accepterar och bygger om menyn; `app:openDocsUrl` öppnar en fast adress.
- **`registerIpc()`** loggar och kastar vidare fel; **`shutdown()`** dödar alla pty och stänger bevakningar.

### Project Service
- **Fil**: `src/main/projectService.js` (206 rader).
- **Detektering**: `detectProject(root)` kräver `aidlc/spaces/` med minst en space; aktiv space från `aidlc/active-space`, annars `default`, annars första.
- **Intent-lista**: `loadIntentList(root, space, onlyDirs)` slår ihop `intents.json` (en halvskriven fil behåller förra indexet), mappar på disk och `active-intent` via `mergeIntents`, och läser per intent `aidlc-state.md` (`currentStage`, `stateStatus`, `done`, `executed`, `stateScope`) och `project-description.json` (`request`). Bara `onlyDirs` läses om; övriga från cache. **Läser inte audit.**
- **Detalj**: `loadIntentDetail` → `buildDetail`: `aidlc-state.md`, `runtime-graph.json` (förra giltiga vid halvskriven), `.aidlc-engine/active-directive.json`, `loadAuditEvents` (alla `*.md` i `<intent>/audit/`, sammanslagna med Audit Parser och med `category`), `unitStatuses`, artefaktfiler per fas (djup 3). Vid fel returneras förra detaljen med `stale: true`.
- **Kostnad**: `loadCost(root)` läser `usage-ledger.json`, aldrig kastande, med senaste-giltiga-fallback.
- **Cacher**: `listCache`, `detailCache`, `costCache` per process (`ponytail:` obegränsade).

### File Watcher
- **Fil**: `src/main/watcher.js` (165 rader).
- **`watchIntents({intentsDir, ledgerFile, onChange, onError, debounceMs = 300, maxWaitMs = 800})`**: chokidar på hela `intents/` (ignorerar `.aidlc-engine/` utom `active-directive.json`); en ändring direkt i `intents/` sätter `indexChanged`, en ändring under `<intent>/` (t.ex. `audit/*.md`) lägger intentens mappnamn i `dirNames`; dolda mappar ignoreras. Ledgern bevakas via sin farförälder (chokidar v4 missar mappar som saknas vid start, F-01) och sätter `costChanged`. Debounce med maxväntan.
- **`watchFiles({root, paths, ...})`**: bevakar `.md`-filer och mappar för feature-dokument.
- **`watchForAidlc({root, onFound})`**: anropar `onFound` en gång när första space-mappen dyker upp.
- **Tester**: `tests/main/watcher.test.js`.

### Audit Parser
- **Fil**: `src/main/parsers/audit.js` (70 rader). Ren modul, importeras av main och renderaren.
- **`parseAudit(text, source)`**: delar på `---`-rader; varje block med rubrik eller fält blir en händelse `{timestamp, event, title, fields, source, index, key}` där `key = <source>#<index>`. `Timestamp` och `Event` lyfts ut; alla andra `**Nyckel**: värde` sparas ordagrant i `fields`, och rader efter ett fält (som inte är tomma) läggs till som fortsättning med `\n`. Alla händelsetyper behålls.
- **`mergeAudits(files)`**: tolkar tid per shard (`timeMs`; ett block utan giltig tid ärver föregående i samma fil), sorterar på tid, källa och index och sätter `seq`.
- **`categoryOf(event)`**: `error` (ERROR/`_FAILED`), `gate` (`GATE_*` eller `APPROV`), `subagent`, `unit`, `guard`, `human` (`HUMAN_`/`QUESTION_`/`DECISION_`), `stage`, `other`.
- **`NOISY_EVENTS`**: `GUARD_DISABLED`, `SENSOR_PASSED`, `SENSOR_FIRED`, `GUARD_STOOD_ASIDE`.
- **Tolkar inte** `Options` (JSON-lista som sträng) eller paret fråga/svar; det är upp till användaren.
- **Tester**: `tests/main/parsers.test.js`.

### Project Access
`src/main/projectAccess.js`: `openRoot`, `resolveInRoot`, `readText`, `readJsonSafe`, `listDir`, `exists`. Inga skrivanrop.

### PTY Manager
`src/main/pty.js`: lat inladdning av node-pty, sessioner `claude` (`-l -i -c claude`) och `shell` (`-l`) i projektroten.

### Exec Runner
`src/main/exec.js`: `execFile` utan skal, timeout, PATH från inloggningsskalet.

### Settings Store
- **Fil**: `src/main/settings.js` (93 rader). Den enda fil appen skriver.
- **Fil på disk**: `<userData>/settings.json`.
- **`sanitize()`**: behåller `openProjects`, `recentProjects` (strängar, högst 50), `activeProject` (sträng eller `null`), `animations` (bara om i `ANIMATIONS`-mängden `full | reduced | off`, annars utelämnad), `fullscreen` (bara om boolean, annars utelämnad) och `projectSettings` (högst 200, via `sanitizeProject()`). Alla andra nycklar tas bort.
- **Läsning**: `getSettings()` ger standardvärden vid saknad fil (tyst) eller trasig fil (loggas). Anropas av både renderaren och `createWindow()`.
- **Skrivning**: `update(change)` köar skrivningar seriellt; `setSettings(partial)` slår ihop över nuvarande värden men rör aldrig `projectSettings`. `setProjectSettings(root, partial)` validerar och kastar med svenskt felmeddelande.
- **Mönster för en ny global inställning**: en `Set` med tillåtna värden (som `ANIMATIONS`) och en villkorlig spridning i `sanitize()`.
- **Tester**: `tests/main/settings.test.js`.

### Git Reader
`src/main/git.js`: status, fetch, fjärrändringar, fjärrfil, konflikter; argumentkontroll.

### Setup Helper
`src/main/setup.js`: förutsättningar, förhandsvisning (`aidlc config --dry-run`), plugins, bygger uppsättningskommandot.

### Model Config Reader
`src/main/models.js`: `aidlc config models --show --json`, fallback till agentfilernas frontmatter.

### Feature Docs Loader
`src/main/features.js`: översikt och epic-filer, bevakningssökvägar, story-länkar.

### Parsers
`src/main/parsers/`: `state.js`, `pipeline.js`, `audit.js` (se Audit Parser), `intents.js` (`mergeIntents`: `uuid, slug, dirName, scope, status, missingOnDisk, missingInIndex` och `active`), `runtimeGraph.js`, `units.js`, `ledger.js`, `features.js`.

## Bygg, CI och test

### Packaging Config
- **Filer**: `package.json`, `electron-builder.yml` (inte omlästa i denna skanning).
- **Identitet** (från förra skanningen): `name aidlc-dash`, `productName Auctum AIDLC Control`, `version 0.1.1` vid den skanningen (US-0404:s commit anger v0.2.0), `appId se.auctum.aidlc-control`, `author Auctum Solutions AB <info@auctum.se>`, `homepage https://github.com/tochman/aidlc-dash`, `main out/main/index.js`.
- **Skript**: `dev`, `build`/`build:mac`/`build:linux`, `test` (`vitest run tests/`), `icon`, `postinstall`.
- **Paketering**: `files: out/**, package.json`; `extraResources` `build/icon.png` → `icon.png`; `asarUnpack node-pty`; macOS `dmg` universal; Linux `deb` x64.
- **Relevans för US-0505**: `appId` styr notisernas avsändare på macOS i paketerad app; i dev visas notiser som Electron.

### Build Scripts
`scripts/make-icon.cjs`, `scripts/fix-pty-perms.cjs`, `scripts/check-glibc.mjs`.

### Release Pipeline
`.github/workflows/release.yml`: tester, macOS- och Linux-bygge, release på tagg.

### Test Suite
`tests/main/` (17 filer), `tests/renderer/` (13 filer), `tests/fixtures/`. Se `code-quality-assessment.md`.
