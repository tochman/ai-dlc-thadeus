# Komponentinventering: aidlc-dash

Varje rubrik nedan är ett komponentnamn (används verbatim i `reverse-engineering-timestamp.md`). För renderarkomponenter listas vad de renderar, deras klassnamn, `data-testid`, tillgänglighetsmönster och tester som är kopplade till markup. Alla `data-testid` ska behållas.

Denna skanning (intent `261113-fullscreen-menu`) läste på djupet: App Shell, AppSettingsDialog, Preload Bridge, Main Entry, IPC Router, Settings Store och Packaging Config. Övriga avsnitt är från förra fullständiga skanningen (före designlyftet) och har bara fått korta noteringar där designlyftet syns.

## Renderare: skal och varumärke

### Theme Stylesheet
- **Fil**: `src/renderer/theme.css`.
- **Ansvar**: hela utseendet: färgtokens, radie- och fonttokens, layout, LCARS-block och ramar, taggar, animationer.
- **Efter designlyftet** (skummat): `--bg #05060a`, ny palett (skiffer, stålblå, korall, amber), klasser för vänsterarmen (`.app-arm`, `.lcars-block--<ton>`, `.lcars-tabbed`, `.lcars-tab`), glöd (`.is-breathing`, `.is-attn`) och rörelseregler `:root[data-motion='reduced'|'off']`. Tidigare beskrivning av `.elbow-top/-left/-bottom` och 13-tokenpaletten är inaktuell och inte omverifierad.

### App Shell
- **Fil**: `src/renderer/App.jsx` (350 rader). Beror på: Splash, AuctumMark, Lcars Primitives (`Bar`, `Frame`), AppSettingsDialog, ProjectView, `window.bridge`.
- **Renderar**: `div.app` > `Splash ready={restored}`; `header.app-header` (`div.app-brand` med `AuctumMark.app-mark` 46px och texten "Auctum" / "Aidlc control"; `div.app-header-main` med `Bar`, gren (`app-meta-label` "Gren", `app-branch`), `h1.app-title` "<projekt> • <vy>" eller "Inget projekt", `app-header-deco`); `nav.app-arm` (se nedan); `div.banner.banner-error.app-error[role=alert]`; `main.app-main` (tomt läge `div.empty-state` > `Frame` med `AuctumMark` 96px och knapp; en `div.project-pane` per projekt, dold med `hidden`); `AppSettingsDialog`.
- **Vänsterarmen** (`nav.app-arm[aria-label="Projekt och vyer"]`): per projekt `div.arm-project(.is-active)` med `button.lcars-block--active|--dark` (projektnamn, `title` = rot) och `span.arm-tools` (⚙ Projektinställningar, × Stäng); `+ Öppna`; `arm-spacer`; när ett projekt är aktivt: `ArmBlock` Intents/Uppsättning, Features (bara om `showFeatures`), Kostnad och Github (inaktiverade om projektet inte är AI-DLC); alltid `ArmBlock` Inställningar; `div.arm-foot` (stort dekorativt märke, "<n> intents" eller "Auctum").
- **Åtgärder (kodvägar som en meny ska dela)**:

  | Åtgärd | Kod i `App.jsx` |
  |--------|-----------------|
  | Öppna projekt | `addProject()` (rad 146-157): `pickProject`, byter till befintlig flik eller `openPath(dir)` |
  | Stäng projekt | `closeTab(projectId)` (159-168): tar bort fliken, väljer sista kvarvarande, `closeProject` |
  | Byt projekt | `setActiveId(projectId)` |
  | Vy Intents / Features | `setUiOf(active.projectId, { view })` (264-271) |
  | Kostnad / Github | `togglePanel('cost' | 'github')` (183): växlar panelen; från Features byter den först till Intents |
  | Projektinställningar | `setActiveId(id); setSettingsFor(id)` (243-246) |
  | Inställningar | `setAppSettingsOpen(true)` (291) |
  | Animationer | `saveAnimations(next)` (170-173) |

- **Tillstånd**: `tabs`, `activeId`, `error`, `restored`, `settingsFor`, `appSettingsOpen`, `animations`, `ui[projectId] = {view, cost, github}` (standard `UI_DEFAULT`), `meta[projectId] = {showFeatures, intentCount}` (rapporteras av ProjectView via `onMeta`), `branch`.
- **Exporterar**: `motionMode(saved)`; sätter `document.documentElement.dataset.motion` i `useLayoutEffect`.
- **data-testid**: `project-tabs` (på `nav.app-arm`), `project-tabs-tab`, `project-settings-open`, `project-tabs-close`, `project-tabs-add`, `project-view-switch-intents`, `project-view-switch-features`, `arm-cost`, `arm-github`, `app-settings-open`, `app-error-dismiss`, `empty-state-open`.
- **Tillgänglighet**: `aria-current` (`true` på aktivt projekt, `page` på aktiv vy), `aria-expanded` på Kostnad/Github, `aria-label` och `title` på ⚙ och ×, `role="alert"` på felbannern, `aria-hidden` på dekor.
- **Tester**: `tests/renderer/AppShell.test.jsx` (finns; innehåll ej omläst).
- **Ansvar i övrigt**: återställer öppna flikar och animationsläge från inställningar, sparar flikläget vid varje ändring efter återställningen, byter flik när AI-DLC dyker upp i en mapp, läser grenen för det aktiva projektet.

### AppSettingsDialog
- **Fil**: `src/renderer/AppSettingsDialog.jsx`. Props: `open`, `onClose`, `value` (gällande läge), `onChange(id)` (returnerar promise).
- **Renderar**: native `dialog.settings-dialog[aria-labelledby=app-settings-title]` (`showModal` när `open`) > `h2` "Inställningar", `fieldset.settings-group` "Animationer" med `div.lcars-radio-group` av `label.lcars-block--active|--mid` som omsluter `input[type=radio].sr-only` (Full, Dämpad, Av), hjälptext `p.muted.settings-help`, felrad `p.refresh-error[role=alert]`, `div.setup-actions` med Stäng.
- **data-testid**: `app-settings-dialog`, `app-settings-animations-full|reduced|off`, `app-settings-close`.
- **Beteende**: Esc fångas i `onCancel` och stänger via App:s state; ett misslyckat sparande visas som "Inställningen kunde inte sparas: …". Innehållet renderas bara när `open`.
- **Relevans för US-0404**: naturlig plats för en helskärmsknapp eller "Helskärm vid start"; dialogen har i dag bara animationsvalet.

### Lcars Primitives
- **Fil**: `src/renderer/Lcars.jsx` (skummad: bara exporterna lästa). Exporterar `Bar({segs})`, `Frame({children})`, `Hairlines`, `progressStates`, `dotsLabel`, `Dots`, `Readout`. App-skalet använder `Bar` i sidhuvudet och `Frame` i tomt läge.

### Splash
- **Fil**: `src/renderer/Splash.jsx`. Exporterar `APP_NAME`, `SPLASH_MIN_MS` 900, `SPLASH_MAX_MS` 4000, `SPLASH_FADE_MS` 300.
- **Renderar**: `div.splash(.is-leaving)` > `AuctumMark.splash-mark` (160px, ej dekorativ), `div.splash-name`, `div.splash-bar[aria-hidden]` > `span` (animerad stapel).
- **data-testid**: `splash`.
- **Tester kopplade till markup**: `Splash.test.jsx` kräver `role="img"` med namnet `Auctum`, texten `Auctum AIDLC Control` och att `className` innehåller `is-leaving` under uttoningen.

### AuctumMark
- **Fil**: `src/renderer/AuctumMark.jsx`. Props: `size`, `className`, `decorative`.
- **Renderar**: inline-SVG (`viewBox="202 274 848 708"`) med två banor i `currentColor`; färgen kommer från klassen.
- **Tillgänglighet**: `role="img" aria-label="Auctum"` eller `aria-hidden` när `decorative`.
- **Samma banor** finns i `build/icon.svg`.

## Renderare: projektvy

### ProjectView
- **Fil**: `src/renderer/ProjectView.jsx` (interna delar bl.a. `AidlcProject`, `SetupDone`, `ProjectContent`). Beror på: TerminalContext, Renderer Hooks, IntentList, IntentDetail, CostPanel, RefreshPanel, SetupAidlc, FeaturesView, TerminalPanel, ProjectSettingsDialog.
- **Efter designlyftet** (skummat): vyväxlaren ligger nu i App-skalets vänsterarm (`project-view-switch-intents|features`). ProjectView tar emot `view`, `onView`, `costOpen`, `onToggleCost`, `githubOpen`, `onToggleGithub`, `settingsOpen`, `onCloseSettings`, `visible` och rapporterar `{showFeatures}` och `{intentCount}` uppåt via `onMeta`. `TerminalProvider` monteras här, per projekt.
- **Tidigare beskrivning** (ej omverifierad): `div.project-view` med `SetupDone`, `div.project-body` > `aside.sidebar` (space-väljare, varningsbanner, CostPanel, RefreshPanel, IntentList) och `section.content` (IntentDetail), därefter FeaturesView, TerminalPanel och ProjectSettingsDialog.
- **data-testid** (tidigare): `project-space-select`, `setup-aidlc-done`, `setup-aidlc-doctor`, `setup-aidlc-first-work`, `setup-aidlc-feature-docs-run`.

### IntentList
- **Fil**: `src/renderer/IntentList.jsx`. Exporterar `sortIntents`, `filterIntents`. Beror på: Renderer Utilities, ResumeButton.
- **Renderar**: `div.intent-list` > rubrik, `div.filters` (sök, status, scope, sortering), `ul.intent-rows[role=listbox]` > `li` > `button.intent-row.status-<status>(.is-selected)[role=option]` med slug, taggar, kostnad, metadata och flaggor; ResumeButton under raden.
- **data-testid**: `intent-list`, `intent-list-search`, `intent-list-status-filter`, `intent-list-scope-filter`, `intent-list-sort`, `intent-list-row`, `intent-list-row-cost`, `intent-list-row-status`.
- **Tester kopplade till markup**: `IntentList.test.jsx` läser `.intent-slug` i varje rad; texterna `Aktiv`, `Saknas i intents.json` och `6/10` hämtas med `getByText`.

### IntentDetail
- **Fil**: `src/renderer/IntentDetail.jsx`. Beror på: Pipeline, Timeline, BoltDag, ArtifactReader, CostTab, ResumeButton.
- **Renderar**: `article.intent-detail` > sidhuvud (titel, "Live", stale-tagg, ResumeButton, fakta, begäran, feature-länkar, varningar), `div.detail-tabs[role=tablist]` (fem flikar), `div.detail-body[role=tabpanel]`.
- **data-testid**: `intent-detail`, `intent-detail-tab-pipeline`, `-timeline`, `-units`, `-cost`, `-files`, `intent-detail-story-link`.
- **Tester**: `tests/renderer/IntentDetail.test.jsx` finns nu (ej omläst).

### Pipeline
- **Fil**: `src/renderer/Pipeline.jsx` (intern `StageRow`).
- **Renderar**: `div.pipeline` > en sektion per fas med `ol.stages` > `li.stage.status-<status>(.is-muted)(.is-current)` > `button.stage-row` och `ul.stage-file-list`.
- **Statusvärden** (`status-*`): `not-started`, `in-progress`, `awaiting-approval`, `revising`, `done`, `skipped`, `unknown`.
- **data-testid**: `pipeline`, `pipeline-stage`, `pipeline-stage-cost`, `pipeline-stage-file`.

### Timeline
- **Fil**: `src/renderer/Timeline.jsx` (intern `EventRow`). Beror på `@tanstack/react-virtual`, `NOISY_EVENTS` från `src/main/parsers/audit.js`.
- **Renderar**: filter, `div.timeline-scroll` > `ol.events` > `li.event.cat-<kategori>(.is-new)[data-index]` (absolut, inline `transform`) > `button.event-row` och `dl.event-fields`.
- **Kategorier**: `stage`, `subagent`, `gate`, `human`, `unit`, `error`, `guard`, `other`.
- **data-testid**: `timeline`, `timeline-noise-toggle`, `timeline-type-filter`, `timeline-stage-filter`, `timeline-jump-newest`, `timeline-jump-stage`, `timeline-new-counter`, `timeline-scroll`, `timeline-event`.
- **Tillgänglighet**: `aria-setsize`/`aria-posinset`, `aria-expanded`, beskrivande `aria-label` per rad, piltangenter/Home/End.
- **Tester kopplade till markup**: `Timeline.test.jsx` använder `.event.is-new`, `.event-row`, `.event-fields`, `[aria-posinset]`.

### BoltDag
- **Fil**: `src/renderer/BoltDag.jsx`.
- **Renderar**: `div.bolt-dag` > SVG med `path.dag-edge` och `g.dag-node.unit-<pending|running|done>`. Fast nodstorlek 200x64.
- **data-testid**: `bolt-dag`, `bolt-dag-empty`.
- **Tillgänglighet**: SVG `role="img"` med `aria-label`.

### ArtifactReader
- **Fil**: `src/renderer/ArtifactReader.jsx`. Exporterar `FileContent` (används av RefreshPanel och FeaturesView).
- **Renderar**: `div.artifact-reader` (grid) > filträd och `div.file-view` (sökväg, två knappar, markdown eller kodblock). Länkar blir `span.md-link`; `skipHtml`.
- **data-testid**: `artifact-reader`, `artifact-reader-file`, `artifact-reader-reveal`, `artifact-reader-open-editor`.

### CostPanel
- **Fil**: `src/renderer/CostPanel.jsx` (interna `CostChart`, `ScopeTable`). Beror på CostTab-exporterna.
- **Renderar**: `section.cost-panel` > toggle, `div.cost-panel-body` (totaler, SVG-staplar, tabeller, ModelTable). Öppnas nu också från armens Kostnad-block (`costOpen`).
- **data-testid**: `cost-panel`, `cost-panel-toggle`, `cost-panel-legacy`, `cost-panel-models`, `cost-panel-agents`, `cost-panel-scopes`.
- **Tester kopplade till markup**: `CostPanel.test.jsx` hämtar rader med `closest('tr')`.

### CostTab
- **Fil**: `src/renderer/CostTab.jsx`. Exporterar `CostLabel`, `CostTable`, `ModelTable`.
- **data-testid**: `cost-tab`, `cost-tab-unavailable`, `cost-tab-stages`, `cost-tab-agents`, `cost-tab-models`, `model-table`, `model-mismatch`.

### RefreshPanel
- **Fil**: `src/renderer/RefreshPanel.jsx`. Exporterar `WAIT_MESSAGE`, `PULL`, `FROM_MAIN`. Öppnas nu också från armens Github-block (`githubOpen`).
- **data-testid**: `refresh-panel`, `refresh-panel-toggle`, `refresh-panel-status`, `refresh-panel-update`, `refresh-panel-badge`, `refresh-panel-details`, `refresh-panel-detail-list`, `refresh-panel-remote-file`, `refresh-panel-pull`, `refresh-panel-from-main`, `refresh-panel-choice`, `refresh-panel-choice-rebase`, `refresh-panel-choice-merge`, `refresh-panel-conflicts`, `refresh-panel-conflict-list`.
- **Tester kopplade till markup**: `getByRole('status')` förväntar exakt ett statuselement med `WAIT_MESSAGE`.

### ResumeButton
- **Fil**: `src/renderer/ResumeButton.jsx`. Exporterar `BUSY_MESSAGE`, `resumeLabel`.
- **Renderar**: `span.resume` > `button.btn.btn-accent.resume-button`, `span.resume-message[role=status]`.
- **data-testid**: `intent-resume`.

### SetupAidlc
- **Fil**: `src/renderer/SetupAidlc.jsx`. Exporterar `INSTALL_URL`, `FAILED_MESSAGE`.
- **data-testid**: `project-not-aidlc`, `setup-aidlc-start`, `setup-aidlc-checks`, `setup-aidlc-preview`, `setup-aidlc-note`, `setup-aidlc-advanced`, `setup-aidlc-plugin`, `setup-aidlc-preset-<preset>`, `setup-aidlc-missing`, `setup-aidlc-feature-docs`, `setup-aidlc-run`, `setup-aidlc-failed`.
- **Tester kopplade till markup**: `setup-aidlc-missing` måste innehålla ett `a` med `href` till installationsanvisningen.

### FeaturesView
- **Fil**: `src/renderer/FeaturesView.jsx`. Exporterar `StatusBadge`. Beror på `parsers/features.js`, `FileContent`.
- **data-testid**: `features-view`, `features-view-empty`, `features-view-setup`, `features-view-fallback`, `features-view-epic`, `features-view-story`, `features-view-story-detail`, `features-view-intent-link`, `features-view-reveal`, `features-view-open-editor`, `features-view-filter-status`, `features-view-filter-priority`.
- **Status**: `StatusBadge` visar emoji-markör och text (📋/🚧/✅), aldrig bara färg.

### ProjectSettingsDialog
- **Fil**: `src/renderer/ProjectSettingsDialog.jsx`. Öppnas från armens ⚙ (App sätter `settingsFor`, ProjectView får `settingsOpen`).
- **Renderar**: native `dialog.settings-dialog` (`showModal`) > `form` med `fieldset.settings-group`, radioknappar, sökvägsfält, felrad, knappar.
- **data-testid**: `project-settings-dialog`, `project-settings-mode-auto|show|hide`, `project-settings-path`, `project-settings-setup`, `project-settings-save`, `project-settings-cancel`.
- **Tillgänglighet**: `aria-labelledby`, `aria-invalid`, `aria-describedby`, Esc stänger via `onCancel`.

### TerminalPanel
- **Fil**: `src/renderer/TerminalPanel.jsx` (intern `TermSession`). Beror på xterm, FitAddon, TerminalContext, `terminalControl.js`, `tokens.js`.
- **Renderar**: `section.terminal-panel(.is-collapsed)[aria-label=Terminal]` > separator, `div.terminal-bar` (visa/dölj, flikar `claude`/`shell` med aktivitetsläge, fel, snabbåtgärder), `div.terminal-body` > sessioner.
- **data-testid**: `terminal-panel-resize`, `terminal-panel-toggle`, `terminal-panel-tab-claude|shell`, `terminal-panel-state-claude|shell`, `terminal-panel-error`, `terminal-panel-quick-command`, `terminal-panel-restart-<kind>`.
- **Tester**: `tests/renderer/TerminalPanel.test.jsx` finns nu (ej omläst).

### TerminalContext
- **Fil**: `src/renderer/TerminalContext.jsx`. `TerminalProvider` och `useTerminal()` (API i `api-documentation.md`). Monteras per projekt i ProjectView. Delar flikval (`setView`), aktivitet och `restart(tab)` mellan terminalen och vyer som skriver in kommandon. Renderar ingen markup. Menyposterna "Terminal: Claude, Shell, Starta om flik" (US-0404) motsvarar `setView('claude'|'shell')` och `restart(tab)`.

## Renderare: hooks och hjälpare

### Renderer Hooks
- `src/renderer/useProject.js`: intent-lista, vald intent, detalj, kostnad, modeller, `newKeys` (4 s markering av nya audit-händelser); prenumererar på `project:changed` och `project:watchError`.
- `src/renderer/useFeatures.js`: feature-dokument, projektinställningar och story-länkar; prenumererar på `features:changed`.

### Renderer Utilities
- `src/renderer/format.js`: statusetiketter, tid, varaktighet, kostnad, tokens, `stagePosition`.
- `src/renderer/terminalControl.js`: `createActivity`, `waitFor`, `runSequence`, `withEnter`. Testas i `terminalControl.test.jsx`.
- `src/renderer/featureDocsPrompt.js`: begäran som skrivs in i claude-fliken.
- `src/renderer/tokens.js` (nytt med designlyftet; skummat): `token(name)` läser en CSS-variabel, `xtermTheme()` bygger xterm-temat från tokens.
- `src/renderer/main.jsx`, `index.html`: monterar `App`, laddar Antonio och `theme.css`; CSP.

## Preload och main

### Preload Bridge
- **Fil**: `src/preload/index.js` (50 rader).
- **Mönster**: `call(channel)` = `(...args) => ipcRenderer.invoke(channel, ...args)`; `subscribe(channel)` = registrerar en lyssnare som skickar bara payload och returnerar `removeListener`. Inget generiskt `invoke`/`send`.
- **API**: `platform` plus 28 invoke-funktioner och 6 prenumerationer (lista i `api-documentation.md`). Ingen meny- eller fönsterfunktion.

### Main Entry
- **Fil**: `src/main/index.js` (68 rader).
- **userData**: `app.setPath('userData', <appData>/aidlc-dash)` så sparade flikar överlever att productName bytts till "Auctum AIDLC Control".
- **Ikon**: `iconPath` = `process.resourcesPath/icon.png` när `app.isPackaged`, annars `build/icon.png`; skickas till `BrowserWindow` bara på Linux; Dock-ikon via `app.dock.setIcon` bara på macOS i dev.
- **Fönster** (`createWindow()`): 1440x900, min 960x600, `backgroundColor '#05060a'` (samma som `--bg`, FR1.2), `title 'Auctum AIDLC Control'`, `webPreferences { preload, contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true }`. Ingen `autoHideMenuBar`, ingen helskärmsoption, inga fönsterhändelser. Returnerar `win`, men anroparna sparar det inte.
- **Navigering**: `setWindowOpenHandler` öppnar `http(s)` med `shell.openExternal` och nekar alltid nya fönster; `will-navigate` blockerar navigering bort från sidan.
- **Laddning**: `ELECTRON_RENDERER_URL` (electron-vite dev) eller `out/renderer/index.html`.
- **Livscykel**: `whenReady` → `registerIpc()` → `createWindow()`; `activate` skapar nytt fönster om inget finns; `before-quit` → `shutdown()`; `window-all-closed` avslutar utom på macOS.
- **Meny**: ingen. `Menu` importeras inte, så Electrons standardmeny gäller.

### IPC Router
- **Fil**: `src/main/ipc.js` (240 rader).
- **Ansvar**: projekttabell (`Map` projectId → `{root, space, watcher, setupWatcher, featuresWatcher, featuresKey, sender, models, setupInfo}`), bevakningsstart per space (`watchSpace`), bevakning efter AI-DLC-uppsättning (`watchForSetup`), feature-bevakning (`syncFeaturesWatch`), `handlers`-objekt med 28 kanaler, `registerIpc()` som loggar och kastar vidare fel, `shutdown()` som dödar alla pty och stänger bevakningar.
- **Push**: `p.sender.send(kanal, payload)` efter `isDestroyed()`-kontroll; sändaren är det `webContents` som öppnade projektet.
- **Fönsteråtkomst**: `BrowserWindow.fromWebContents(event.sender)` i `project:pick`.

### Project Service
`src/main/projectService.js`: projektdetektering, intent-lista och detalj med cacher, artefaktlistning per fas, audit-inläsning, ledger-läsning med senaste-giltiga-fallback.

### Project Access
`src/main/projectAccess.js`: `openRoot`, `resolveInRoot`, `readText`, `readJsonSafe`, `listDir`, `exists`. Inga skrivanrop.

### PTY Manager
`src/main/pty.js`: lat inladdning av node-pty, sessioner `claude` (`-l -i -c claude`) och `shell` (`-l`) i projektroten.

### Exec Runner
`src/main/exec.js`: `execFile` utan skal, timeout, PATH från inloggningsskalet.

### Settings Store
- **Fil**: `src/main/settings.js` (91 rader). Den enda fil appen skriver.
- **Fil på disk**: `<userData>/settings.json`.
- **`sanitize()`**: behåller `openProjects`, `recentProjects` (strängar, högst 50), `activeProject` (sträng eller `null`), `animations` (bara om `full | reduced | off`, annars utelämnad) och `projectSettings` (högst 200, via `sanitizeProject()`). Alla andra nycklar tas bort.
- **Läsning**: `getSettings()` ger standardvärden vid saknad fil (tyst) eller trasig fil (loggas).
- **Skrivning**: `update(change)` köar skrivningar seriellt; varje skrivning läser föregående resultat, så samtidiga ändringar av olika nycklar överlever (FR3.5). `setSettings(partial)` slår ihop över nuvarande värden men rör aldrig `projectSettings`. `setProjectSettings(root, partial)` validerar `featureDocs` och `featuresPath` och kastar med svenskt felmeddelande.
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
`src/main/parsers/`: `state.js`, `pipeline.js`, `audit.js` (`categoryOf`, `NOISY_EVENTS`), `intents.js`, `runtimeGraph.js`, `units.js`, `ledger.js`, `features.js` (även `DEFAULT_FEATURES_PATH`, `isValidFeaturesPath` som `settings.js` använder).

## Bygg, CI och test

### Packaging Config
- **Filer**: `package.json`, `electron-builder.yml`.
- **Identitet**: `name aidlc-dash`, `productName Auctum AIDLC Control` (i båda filerna), `version 0.1.1`, `appId se.auctum.aidlc-control`, `author Auctum Solutions AB <info@auctum.se>`, `homepage https://github.com/tochman/aidlc-dash`, `main out/main/index.js`.
- **Skript**: `dev` (`electron-vite dev`), `build`/`build:mac`/`build:linux`, `test` (`vitest run tests/`), `icon`, `postinstall`.
- **Paketering**: `files: out/**, package.json`; `extraResources` `build/icon.png` → `icon.png`; `asarUnpack node-pty`; `publish: null`; macOS `dmg` universal, kategori developer-tools, `identity: null`; Linux `deb` x64, kategori Development, ikonmapp `build/icons`, `executableName auctum-aidlc-control`, `synopsis`.
- **Relevans för US-0404**: "Om Auctum AIDLC Control" kan läsa namn och version från `app.getName()` / `app.getVersion()` (från `package.json`); "Rapportera problem" kan bygga på `homepage` + `/issues`.

### Build Scripts
`scripts/make-icon.cjs` (renderar `build/icon.svg` till PNG med Electron), `scripts/fix-pty-perms.cjs` (postinstall), `scripts/check-glibc.mjs` (Linux-paketkontroll).

### Release Pipeline
`.github/workflows/release.yml`: tester, macOS- och Linux-bygge, release på tagg.

### Test Suite
`tests/main/` (15 filer), `tests/renderer/` (13 filer), `tests/fixtures/`. Se `code-quality-assessment.md`.
