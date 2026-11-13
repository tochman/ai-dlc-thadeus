# Komponentinventering: aidlc-dash

Varje rubrik nedan är ett komponentnamn (används verbatim i `reverse-engineering-timestamp.md`). För renderarkomponenter listas vad de renderar, deras klassnamn, `data-testid`, tillgänglighetsmönster och tester som är kopplade till markup. Alla `data-testid` ska behållas.

Denna skanning (intent `261113-thadeus-name`, US-0406) läste på djupet: Theme Stylesheet, App Shell, Splash, AuctumMark, TerminalPanel, Renderer Entry, Main Entry, App Menu, Packaging Config, Release Pipeline och Project README, samt testerna som bär namnet (`menu.test.js`, `AppShell.test.jsx`, `Splash.test.jsx`). QuestionPopup och Question Service är skummade. Övriga avsnitt är från tidigare skanningar (senast vid commit `22bd721`) och inte omverifierade.

## Renderare: skal och varumärke

### Theme Stylesheet
- **Fil**: `src/renderer/theme.css` (883 rader; avsnittskarta i `code-structure.md`).
- **Ansvar**: hela utseendet: färgtokens, radie- och fonttokens, layout, LCARS-block och ramar, taggar, animationer.
- **Tokens** (`:root`, rad 7-57): `--bg #05060a`, skiffer `--slate-0`…`--slate-5`, `--slate-mark`, stål (`--steel-deep`, `--steel`, `--steel-text`, `--steel-light`, `--steel-meta`), korall (`--coral`, `--coral-soft`), `--amber #ff9e40`, `--white`, `--text`, `--text-2`, `--muted`, `--on-light #000`, `--alert #ff3b3b` (US-0505, obesvarad fråga), alfavarianter och `--backdrop`; ramanatomi `--arm 150px`, `--bar 18px`, `--frame 14px`, `--gap 6px`; typsnitt `--font-head` (Antonio), `--font-read`, `--font-mono`. Kommentaren på rad 1-6 anger att varje ljus/mörk-kombination uppfyller WCAG AA.
- **Namnets mått** (US-0406):
  - `.app-brand` (307-319): fast bredd `var(--arm)`, höjd 64 px, `justify-content: flex-end`, `gap: 8px`, `padding-right: 12px`, amber bakgrund, svart text, `border-radius: 40px 0 0 0`. Med märket 46 px återstår ungefär 84 px för texten.
  - `.app-brand-text` (321): 15 px, 700, `letter-spacing: 0.03em`, versaler, `line-height: 1`, kolumn; ingen kapning. `.app-brand-sub` (322): 10 px, 600, `letter-spacing: 0.08em`.
  - `.splash` (810-821): `padding: 40px`, `letter-spacing: 0.04em`, versaler; `.splash-cap`/`.splash-arm` 180 px; `.splash-center` centrerad kolumn med `gap: 26px`; `.splash-name-main` (834) 64 px, 700, `letter-spacing: 0.08em`; `.splash-name-sub` (835) 24 px, 600, `--steel`, `letter-spacing: 0.18em`, ingen `nowrap` (lång text radbryts); `.splash-line` (836) 360 px.
  - Verktyg som finns: `.sr-only` (91), `.lcars-label` (182) och `.app-title` (327) med `text-overflow: ellipsis`.
- **Övrigt**: klasser för vänsterarmen (`.app-arm`, `.lcars-block--<ton>`, `.lcars-tabbed`, `.lcars-tab`), glöd (`.is-breathing`, `.is-attn`), `.question-popup` med `.is-overdue` (796-806), rörelseregler `:root[data-motion='reduced'|'off']` (874-883).
- **Tester**: `tests/main/theme.test.js` (finns; ej omläst).

### App Shell
- **Fil**: `src/renderer/App.jsx` (506 rader, radkarta i `code-structure.md`). Beror på: Splash, AuctumMark, Lcars Primitives (`Bar`, `Frame`), AppSettingsDialog, DocsDialog, QuestionPopup, ProjectView, `window.bridge`.
- **Renderar**: `div.app` > `Splash ready={restored}`; `header.app-header` (`div.app-brand` med `AuctumMark.app-mark` 46 px och `span.app-brand-text` > "Auctum" och `span.app-brand-sub` "Aidlc control" (rad 329-335, inte `aria-hidden`); `div.app-header-main` med `Bar`, gren, `h1.app-title` "<projekt> • <vy>" eller "Inget projekt", `app-header-deco`, knappen `fullscreen-toggle`); `nav.app-arm`; felbanner; `main.app-main` (tomläge i `Frame` med `AuctumMark` 96 px; en `div.project-pane` per projekt); `AppSettingsDialog`; `DocsDialog`; `QuestionPopup`.
- **Vänsterarmen** (`nav.app-arm[aria-label="Projekt och vyer"]`): per projekt `div.arm-project(.is-active)` med projektblock och `span.arm-tools` (⚙, ×); `+ Öppna`; när ett projekt är aktivt: Intents/Uppsättning, Features (bara om `showFeatures`), Kostnad, Github; alltid Inställningar; `div.arm-foot` med dekorativt `AuctumMark` 128 px och "<n> intents" eller "Auctum" (rad 441) när projektet inte är AI-DLC.
- **Namngivna åtgärder (delas av arm och meny, `menuCommands` rad 299-308)**:

  | Åtgärd | Kod i `App.jsx` |
  |--------|-----------------|
  | Öppna projekt | `openProject()` (227-238) |
  | Stäng projekt | `closeTab(projectId)` (240-249), `closeActiveProject()` (266-268) |
  | Byt projekt | `setActiveId(projectId)` (armens projektblock, rad 381) |
  | Vy Intents / Features | `showView(next)` (269-271) |
  | Kostnad / Github | `togglePanel('cost' | 'github')` (273-276) |
  | Projektinställningar | `openProjectSettings(projectId)` (278-282) |
  | Inställningar | `openAppSettings()` (277) |
  | Terminal Claude / Shell / Starta om | `runTerminal(action)` (283-285) |
  | Dokumentation | `openDocs()` (287-297) |
  | Animationer | `saveAnimations(next)` (251-254) |
  | Frågor och notiser | `saveAlertSettings(partial)` (219-222) |
  | Svara i Claude | `answerInClaude(q)` (214-218): stänger popupen, `setActiveId(q.projectId)`, `terminalCommand` med `action: 'claude'` |
  | Helskärm | `toggleFullscreen()` (321-323) |

- **Väntande frågor** (rad 169-206): `listQuestions` vid start och `onQuestions` vid ändring; bara ett id som inte setts förut och inte är `early` öppnar popupen, och aldrig när `questionAlerts` är `off`; `onQuestionFocus` öppnar popupen på en viss fråga; `setActiveProject(activeId)` vid varje projektbyte; popupen stänger sig själv när ingen ny fråga väntar längre.
- **Tillstånd**: `tabs`, `activeId`, `error`, `restored`, `settingsFor`, `appSettingsOpen`, `animations`, `ui[projectId] = {view, cost, github}`, `meta[projectId] = {showFeatures, intentCount}`, `branch`, `fullscreen`, `terminalCommand`, `docs`, `alertSettings {questionAlerts, notificationSound}`, `questions`, `popupOpen`, `popupFocus`.
- **Exporterar**: `motionMode(saved)`; sätter `document.documentElement.dataset.motion` i `useLayoutEffect`.
- **data-testid**: `project-tabs` (på `nav.app-arm`), `project-tabs-tab`, `project-settings-open`, `project-tabs-close`, `project-tabs-add`, `project-view-switch-intents`, `project-view-switch-features`, `arm-cost`, `arm-github`, `app-settings-open`, `fullscreen-toggle`, `app-error-dismiss`, `empty-state-open`.
- **Tillgänglighet**: `aria-current` (`true` på aktivt projekt, `page` på aktiv vy), `aria-expanded` på Kostnad/Github, `aria-pressed` på helskärmsknappen, `aria-label` och `title` på ⚙ och ×, `role="alert"` på felbannern, `aria-hidden` på dekor. Sidhuvudets märke är det enda namngivna märket utanför splashen och tomläget (armens fot är dekorativ).
- **Tester**: `tests/renderer/AppShell.test.jsx` (175 rader, 5 tester): vänsterarmen och vyer, `data-motion`, märket i sidhuvudet (rad 118-126: `getByRole('img', { name: 'Auctum' })` och `getByText('Aidlc control')` inom `banner`; armens märke får inte ha `role="img"`), helskärmsknappen, menykommandon. Mockar `ProjectView` och de bridge-metoder testerna behöver (inga fråge-API:er, vilket fungerar tack vare `?.`).

### AppSettingsDialog
- **Fil**: `src/renderer/AppSettingsDialog.jsx` (ej omläst sedan US-0505). Props enligt `App.jsx:493-501`: `open`, `onClose`, `value` (rörelseläge), `onChange(id)`, `questionAlerts`, `notificationSound`, `onSave(partial)`.
- **Renderar** (från förra skanningen, före US-0505): native `dialog.settings-dialog[aria-labelledby=app-settings-title]` > `h2` "Inställningar", `fieldset.settings-group` "Animationer" med `div.lcars-radio-group` (Full, Dämpad, Av), hjälptext, felrad `p.refresh-error[role=alert]`, Stäng. US-0505 har lagt till val för frågor och notisljud; markupen för dem är inte läst.
- **data-testid** (kända): `app-settings-dialog`, `app-settings-animations-full|reduced|off`, `app-settings-close`.
- **Beteende**: Esc fångas i `onCancel` och stänger via App:s state; ett misslyckat sparande visas i dialogen.

### DocsDialog
- **Fil**: `src/renderer/DocsDialog.jsx` (skummad). Props: `doc {name, content} | null`, `onClose`.
- **Renderar**: native `dialog.settings-dialog.docs-dialog[aria-labelledby=docs-dialog-title]` med `showModal`, Esc via `onCancel`, `h2` "<projekt> • docs/README.md" och innehållet via `FileContent`.
- **data-testid**: `docs-dialog` (övriga ej lästa).

### QuestionPopup
- **Fil**: `src/renderer/QuestionPopup.jsx` (112 rader, skummad: bara användningen i `App.jsx:503` och CSS-klasserna lästa). Props: `open`, `questions`, `focus {id} | null`, `onAnswer(q)`, `onClose`.
- **Utseende**: `.settings-dialog.question-popup` med korall ram, `.question-popup-head`, `-early`, `-where`, `-text`, `-options`, `-pager`; `.is-overdue` gör huvudet `--alert`-rött och pulserande (statiskt under Dämpad).
- **Tester**: `tests/renderer/QuestionPopup.test.jsx` (finns; ej omläst). Inget appnamn i komponenten enligt grep.

### Lcars Primitives
- **Fil**: `src/renderer/Lcars.jsx` (skummad tidigare: bara exporterna lästa). Exporterar `Bar({segs, className})`, `Frame({children})`, `Hairlines`, `progressStates`, `dotsLabel`, `Dots`, `Readout`.

### Splash
- **Fil**: `src/renderer/Splash.jsx` (64 rader). Exporterar `APP_NAME = 'Auctum AIDLC Control'` (rad 5), `SPLASH_MIN_MS` 900, `SPLASH_MAX_MS` 4000, `SPLASH_FADE_MS` 300. Ingen annan fil importerar `APP_NAME`.
- **Renderar**: `div.splash(.is-leaving)[data-testid=splash]` > `div.splash-top[aria-hidden]` (`span.splash-cap`, `Bar`); `div.splash-mid` > `div.splash-arm[aria-hidden]` (tre `span`) och `div.splash-center` > `AuctumMark size={300} className="splash-mark"` (inte dekorativ, alltså `role="img"` "Auctum"), `div.splash-name[aria-hidden]` > `span.splash-name-main` "Auctum" och `span.splash-name-sub` "Aidlc control", `span.sr-only` `{APP_NAME}`, `div.splash-line[aria-hidden]`; `Bar.splash-bottom`.
- **Mönster**: den synliga tvåradiga texten är dekoration; namnet läses en gång från den dolda `sr-only`-texten. Inga fokuserbara element; slutar fånga pekare under uttoningen.
- **Tester**: `tests/renderer/Splash.test.jsx` (45 rader, 4 tester): rad 14-18 kräver `getByRole('img', { name: 'Auctum' })` och `getByText('Auctum AIDLC Control')` (exakt text, träffar `sr-only`); övriga tester gäller tidsgränserna och `is-leaving`.
- **US-0406**: ny `APP_NAME`, ny synlig text (kortnamn, utskrivet namn, tagline) och en `sr-only`-text som bär det fullständiga namnet; märkets `role="img"`-kontrakt står kvar.

### AuctumMark
- **Fil**: `src/renderer/AuctumMark.jsx` (19 rader). Props: `size` (standard 24), `className`, `decorative` (standard `false`).
- **Renderar**: inline-SVG (`viewBox="202 274 848 708"`, höjd `size * 708 / 848`) med två banor i `currentColor`.
- **Tillgänglighet**: `role="img" aria-label="Auctum"`, eller `aria-hidden` när `decorative`.
- **Används**: splash (300 px), sidhuvud (46 px), tomläge (96 px), armens fot (128 px, dekorativ), terminalens armbåge (96 px, dekorativ). Samma banor finns i `build/icon.svg`.
- **US-0406**: oförändrad (Auctum-symbolen står kvar).

## Renderare: projektvy

### ProjectView
- **Fil**: `src/renderer/ProjectView.jsx` (interna delar bl.a. `AidlcProject`, `SetupDone`, `ProjectContent`). Beror på: TerminalContext, useProject Hook, useFeatures Hook, IntentList, IntentDetail, CostPanel, RefreshPanel, SetupAidlc, FeaturesView, TerminalPanel, ProjectSettingsDialog.
- **Props** (skummat): `project`, `visible`, `view`, `onView`, `costOpen`, `onToggleCost`, `githubOpen`, `onToggleGithub`, `settingsOpen`, `onCloseSettings`, `onMeta`, `terminalCommand`. Rapporterar `{showFeatures}` och `{intentCount}` uppåt via `onMeta`. `TerminalProvider` monteras här, per projekt.
- **terminalCommand** (skummad): `ProjectContent` kör en effekt per nytt `terminalCommand`; om `projectId` matchar körs `terminal.restart(terminal.view.active)` för `restart`, annars `terminal.show(action)`.
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
- **Fil**: `src/renderer/TerminalPanel.jsx` (280 rader, intern `TermSession`). Props: `projectId`, `visible`. Beror på xterm, FitAddon, TerminalContext, `terminalControl.js` (`createActivity`), `tokens.js` (`xtermTheme`), AuctumMark, `Bar`.
- **Konstanter**: `QUICK_COMMANDS` (`/aidlc --status`, `/aidlc --doctor`, `/aidlc continue`), `KINDS` (`claude` "Claude", `shell` "Shell"), `STATE_LABEL` (Ledig, Arbetar, Avslutad).
- **Renderar**: `section.terminal-panel(.is-collapsed)[aria-label=Terminal]` > `div.terminal-resize[role=separator]` (dra eller pil upp/ned, 180 px till 60 % av fönstret), `div.terminal-arm` (`div.terminal-tabs[role=tablist]` med `button.lcars-block.term-tab[role=tab]` per flik, aktivitetsläge och `is-breathing` när Claude arbetar; `button.terminal-elbow` med dekorativt `AuctumMark` 96 px och "Dölj/Visa terminal"), `div.terminal-main` (`Bar`, `div.terminal-body` med en `TermSession` per flik, `div.terminal-foot` med snabbkommandon, "Väntar på din Enter" och fel).
- **data-testid**: `terminal-panel-resize`, `terminal-panel-toggle`, `terminal-panel-tab-claude|shell`, `terminal-panel-state-claude|shell`, `terminal-panel-pending-claude|shell`, `terminal-panel-error`, `terminal-panel-quick-command`, `terminal-panel-restart-<kind>`.
- **US-0406**: inget appnamn i panelen; märket är dekorativt och står kvar.

### TerminalContext
- **Fil**: `src/renderer/TerminalContext.jsx` (105 rader, förra skanningen). `TerminalProvider` och `useTerminal()` (API i `api-documentation.md`). Monteras per projekt i ProjectView; renderar ingen markup.
- **Tillstånd**: `sessions` (ref: flik → `{write, spawn, restart, focus, activity}`), `view {open, active}` (start `{open: true, active: 'claude'}`), `states` per flik, `error`, `pending` per flik.
- **`show(tab)`**: `setView({open: true, active: tab})` och `sessions[tab]?.focus()`.
- **`run(tab, fn)`**: visar fliken, startar en avslutad session och väntar på första `idle` (`READY_TIMEOUT_MS`), kör `fn`, fokuserar; fel visas i terminalpanelen.
- **Flaggnamn**: `TAB_NAME = {claude: 'Claude', shell: 'Skalet'}` i felmeddelanden.

## Renderare: hooks och hjälpare

### useProject Hook
- **Fil**: `src/renderer/useProject.js` (133 rader, förra skanningen). `useProject(projectId, initialSpace)`.
- **Returnerar**: `space, setSpace, intents, listWarning, selected, setSelected, detail, newKeys, error, cost, models, lastIntentChangeAt`.
- **Laddning**: `loadList(onlyDirs)` via `getIntents`; `loadDetail(dirName, {live})` via `getIntent`; nya händelser markeras 4 s (`HIGHLIGHT_MS`, `newKeys`).
- **Push**: `onProjectChanged` filtreras på `projectId` och `space`; `onWatchError` ger felbanner.

### useFeatures Hook
- `src/renderer/useFeatures.js` (ej omläst): feature-dokument, projektinställningar och story-länkar; prenumererar på `features:changed`.

### Renderer Utilities
- `src/renderer/format.js`: statusetiketter, tid, varaktighet, kostnad, tokens, `stagePosition`.
- `src/renderer/terminalControl.js`: `createActivity`, `waitFor`, `runSequence`, `withEnter`, `READY_TIMEOUT_MS`.
- `src/renderer/featureDocsPrompt.js`: begäran som skrivs in i claude-fliken.
- `src/renderer/tokens.js`: `token(name)`, `xtermTheme()`.
- `src/renderer/main.jsx`: monterar `App`, laddar Antonio och `theme.css` (ej omläst).

### Renderer Entry
- **Fil**: `src/renderer/index.html` (15 rader).
- **Innehåll**: `<html lang="sv">`, `meta charset`, CSP (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws:; object-src 'none'; base-uri 'none'; form-action 'none'`), `<title>Auctum AIDLC Control</title>` (rad 9), `div#root`, `script type=module src=./main.jsx`.
- **US-0406**: `<title>` skriver över `BrowserWindow`-titeln när sidan laddats, så det är fönstrets synliga titel. CSP påverkas inte av namnbytet.

## Preload och main

### Preload Bridge
- **Fil**: `src/preload/index.js` (ej omläst; grep visar US-0505:s rader 58-61).
- **Mönster**: `call(channel)` = `(...args) => ipcRenderer.invoke(channel, ...args)`; `subscribe(channel)` registrerar en lyssnare som skickar bara payload och returnerar `removeListener`. Inget generiskt `invoke`/`send`.
- **API**: `platform` plus 34 invoke-funktioner och 10 prenumerationer (lista i `api-documentation.md`), inklusive US-0505:s `listQuestions`, `onQuestions`, `onQuestionFocus`, `setActiveProject`.

### Main Entry
- **Fil**: `src/main/index.js` (94 rader).
- **userData** (rad 7-8): kommentaren "productName changed to "Auctum AIDLC Control"; keep the old userData folder so saved tabs survive." och `app.setPath('userData', join(app.getPath('appData'), 'aidlc-dash'))`, på modulnivå före `whenReady`. Detta är låset som gör att inställningarna överlever ett namnbyte.
- **Ikon**: `iconPath` = `process.resourcesPath/icon.png` när `app.isPackaged`, annars `build/icon.png`; till `BrowserWindow` bara på Linux; Dock-ikon via `app.dock.setIcon` bara på macOS i dev.
- **`windowOptions(settings, platform)`** (exporterad, ren, rad 14-35): 1440x900, min 960x600, `fullscreenable: true`, `fullscreen: true` bara när `settings.fullscreen === true`, `autoHideMenuBar: true`, `backgroundColor '#05060a'`, `title: 'Auctum AIDLC Control'` (rad 26), säkra `webPreferences`. Testas i `windowOptions.test.js` (grep: testet hävdar inte titeln).
- **`createWindow()`** (async): läser inställningar, skapar fönstret, `setWindowOpenHandler`, `will-navigate`-spärr, `enter-/leave-full-screen` → `setSettings({fullscreen})`, `window:fullscreen` och `applyMenu(win)`; laddar `ELECTRON_RENDERER_URL` eller `out/renderer/index.html`. Ingen `page-title-updated`-lyssnare, så `<title>` vinner.
- **Livscykel**: `whenReady` → Dock-ikon → `registerIpc()` → `applyMenu(null)` → `open()`; `activate`; `before-quit` → `shutdown()`; `window-all-closed` avslutar utom på macOS.
- **US-0505**: `index.js` innehåller ingen notislogik; den ligger i `notify.js` och anropas från `ipc.js`.

### App Menu
- **Fil**: `src/main/menu.js` (166 rader). Exporterar `AIDLC_DOCS_URL`, `ISSUES_URL` (`https://github.com/tochman/aidlc-dash/issues`), `parseMenuState`, `setMenuState`, `buildMenuTemplate`, `applyMenu`. `APP_NAME = 'Auctum AIDLC Control'` (rad 5) exporteras inte.
- **macOS-appmenyn** (rad 40-55, bara när `isMac`): etikett `APP_NAME`; `{role: 'about', label: 'Om ' + APP_NAME}`, Inställningar… (`CmdOrCtrl+,`), `{role: 'hide', label: 'Göm ' + APP_NAME}`, Göm övriga, Visa alla, `{role: 'quit', label: 'Avsluta ' + APP_NAME}`.
- **Linux**: ingen appmeny och ingen About-post; Arkiv får Inställningar… och Avsluta (`Ctrl+Q`) utan namn (rad 64).
- **Övriga menyer**: Arkiv, Redigera, Visa (Intents, Features, Kostnad, Github, Helskärm, zoom), Terminal, Fönster (macOS), Hjälp (AI-DLC-dokumentation, Rapportera problem), Utveckling (bara dev).
- **About-panelen** (rad 156): `app.setAboutPanelOptions({ applicationName: APP_NAME, applicationVersion: app.getVersion() })` vid varje `applyMenu`. Inga `credits`, `copyright`, `website` eller `iconPath`.
- **Sändning**: `send(payload)` skickar `menu:command` till `getFocusedWindow() ?? getAllWindows()[0]` efter `isDestroyed()`-kontroll.
- **Tester**: `tests/main/menu.test.js` (95 rader, 4 tester) mockar `electron` och testar `buildMenuTemplate`/`parseMenuState`. Rad 83 kräver macOS-menyernas etiketter `['Auctum AIDLC Control', 'Arkiv', 'Redigera', 'Visa', 'Terminal', 'Fönster', 'Hjälp']`; rad 84 kräver att `'Om Auctum AIDLC Control'` har `role: 'about'`. "Göm …" och "Avsluta …" testas inte. `applyMenu` och About-panelen testas inte.
- **US-0406**: i paketerad macOS-app visar menyraden appens bundlenamn (`productName`) som fetstil appnamn, inte etiketten; etiketten och rollernas etiketter styr resten.

### IPC Router
- **Fil**: `src/main/ipc.js` (ej omläst; har vuxit med US-0505).
- **Projekttabell**: `Map` projectId → `{root, space, watcher, setupWatcher, featuresWatcher, featuresKey, sender, models, setupInfo}` (förra skanningen).
- **Bevakning**: `project:open` startar `watchSpace(projectId, activeSpace)` för AI-DLC-projekt, annars `watchForSetup`. Alla öppna projekt bevakas, en space per projekt.
- **Frågor** (grep): importerar `notifyQuestions` från `notify.js`; skickar `questions:changed` till alla avsändare; handlers `questions:list` och `questions:activeProject`.
- **`registerIpc()`** loggar och kastar vidare fel; **`shutdown()`** dödar alla pty och stänger bevakningar.

### Question Service
- **Filer**: `src/main/questions.js` (59 rader), `src/main/notify.js` (43 rader), skummade med grep (US-0505).
- **`notify.js`**: `notificationTitle(q)` = "<projektnamn>: Claude väntar på ditt svar"; `notificationBody(q)` = frågan eller "Godkännande: a → b", högst cirka 120 tecken; `new Notification({title, body, silent: notificationSound === false})`, håller referensen tills den stängs, skickar `questions:focus` med frågans id vid klick.
- **US-0406**: notistexten har inget appnamn, men macOS visar notisens avsändare från appens bundle; ett nytt `appId` betyder att notisbehörigheten måste ges igen.
- **Tester**: `tests/main/questions.test.js` (finns; ej omläst).

### Project Service
- **Fil**: `src/main/projectService.js` (206 rader vid commit `22bd721`).
- **Detektering**: `detectProject(root)` kräver `aidlc/spaces/` med minst en space; aktiv space från `aidlc/active-space`, annars `default`, annars första.
- **Intent-lista**: `loadIntentList(root, space, onlyDirs)` slår ihop `intents.json`, mappar på disk och `active-intent` via `mergeIntents`, och läser per intent `aidlc-state.md` och `project-description.json`. Läser inte audit.
- **Detalj**: `loadIntentDetail` → `buildDetail`: `aidlc-state.md`, `runtime-graph.json`, `.aidlc-engine/active-directive.json`, `loadAuditEvents`, `unitStatuses`, artefaktfiler. Vid fel returneras förra detaljen med `stale: true`.
- **Kostnad**: `loadCost(root)` läser `usage-ledger.json`, aldrig kastande.
- **Cacher**: `listCache`, `detailCache`, `costCache` per process (`ponytail:` obegränsade).

### File Watcher
- **Fil**: `src/main/watcher.js` (165 rader vid commit `22bd721`).
- **`watchIntents({intentsDir, ledgerFile, onChange, onError, debounceMs = 300, maxWaitMs = 800})`**: chokidar på hela `intents/`; ändringar direkt i `intents/` sätter `indexChanged`, under `<intent>/` läggs intentens mappnamn i `dirNames`; ledgern sätter `costChanged`.
- **`watchFiles({root, paths, ...})`**: feature-dokument. **`watchForAidlc({root, onFound})`**: första space-mappen.
- **Tester**: `tests/main/watcher.test.js`.

### Audit Parser
- **Fil**: `src/main/parsers/audit.js` (70 rader vid commit `22bd721`). Ren modul, importeras av main och renderaren.
- **`parseAudit(text, source)`**, **`mergeAudits(files)`**, **`categoryOf(event)`**, **`NOISY_EVENTS`**: se `api-documentation.md`.
- **Tester**: `tests/main/parsers.test.js`.

### Project Access
`src/main/projectAccess.js`: `openRoot`, `resolveInRoot`, `readText`, `readJsonSafe`, `listDir`, `exists`. Inga skrivanrop.

### PTY Manager
`src/main/pty.js`: lat inladdning av node-pty, sessioner `claude` (`-l -i -c claude`) och `shell` (`-l`) i projektroten.

### Exec Runner
`src/main/exec.js`: `execFile` utan skal, timeout, PATH från inloggningsskalet.

### Settings Store
- **Fil**: `src/main/settings.js` (förra skanningen; grep bekräftar US-0505:s nycklar på rad 13 och 38-39). Den enda fil appen skriver.
- **Fil på disk**: `<userData>/settings.json`, där userData är fastlåst till `aidlc-dash` av Main Entry.
- **`sanitize()`**: behåller `openProjects`, `recentProjects`, `activeProject`, `animations`, `fullscreen`, `questionAlerts` (vitlista `QUESTION_ALERTS`), `notificationSound` (boolean) och `projectSettings`. Alla andra nycklar tas bort.
- **Läsning/skrivning**: `getSettings()` ger standardvärden vid saknad eller trasig fil; `update(change)` köar skrivningar seriellt.
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
`src/main/parsers/`: `state.js`, `pipeline.js`, `audit.js` (se Audit Parser), `intents.js`, `runtimeGraph.js`, `units.js`, `ledger.js`, `features.js`.

## Bygg, CI och test

### Packaging Config
- **Filer**: `package.json` (44 rader), `electron-builder.yml` (43 rader).
- **Identitet**:

  | Nyckel | Fil:rad | Värde | Styr |
  |--------|---------|-------|------|
  | `name` | `package.json:2` | `aidlc-dash` | npm-namn, standardnamn för `.deb`-paketet och dess filnamn; `package-lock.json:2` och `:8` följer |
  | `productName` | `package.json:3`, `electron-builder.yml:2` | `Auctum AIDLC Control` | `.app`-namn och `CFBundleName` (Dock, Finder, menyraden), standardnamn för `.dmg`, Linux-startpostens `Name` och installationsmapp, `app.getName()` |
  | `version` | `package.json:4` | `0.2.0` | `app.getVersion()` (About-panelen), artefaktnamn, CI-kontroll mot taggen |
  | `description` | `package.json:6` | "Bridge console for AI-DLC projects: …" | paketbeskrivning, inget namn |
  | `author` | `package.json:7-10` | Auctum Solutions AB `<info@auctum.se>` | – |
  | `homepage` | `package.json:11` | `https://github.com/tochman/aidlc-dash` | repo, oförändrat |
  | `appId` | `electron-builder.yml:1` | `se.auctum.aidlc-control` | macOS `CFBundleIdentifier` |
  | `linux.executableName` | `electron-builder.yml:41` | `auctum-aidlc-control` | Linux-binär, `.desktop`-fil, ikonnamn |
  | `linux.maintainer`, `linux.synopsis` | `electron-builder.yml:42-43` | Auctum Solutions AB, "Read-only AI-DLC console …" | `.deb`-metadata, inget appnamn |

- **Artefaktnamn**: inget `artifactName` satt. `.dmg` följer electron-builders standard `${productName}-${version}-${arch}.${ext}` (i dag `Auctum AIDLC Control-0.2.0-universal.dmg`), `.deb` standard `${name}_${version}_${arch}.${ext}` (i dag `aidlc-dash_0.2.0_amd64.deb`).
- **Skript**: `dev`, `build` och `build:mac` (`electron-vite build && electron-builder --mac`), `build:linux`, `test` (`vitest run tests/`), `icon`, `postinstall`.
- **Paketering**: `directories.output: dist`, `buildResources: build`, `icon: build/icon.png`, `files: out/**, package.json`, `extraResources` `build/icon.png` → `icon.png`, `asarUnpack node_modules/node-pty/**`, `publish: null`; macOS `dmg` universal, `category public.app-category.developer-tools`, `x64ArchFiles` för node-pty, `identity: null` (osignerad, ingen notarisering); Linux `deb` x64, `category Development`, `icon: build/icons`, uteslutna node-pty-prebuilds för darwin och win32.
- **US-0406-risker**: se `code-quality-assessment.md` (appId, productName, deb-paketnamn, artefaktnamn).

### Build Scripts
`scripts/make-icon.cjs`, `scripts/fix-pty-perms.cjs`, `scripts/check-glibc.mjs`.

### Release Pipeline
- **Fil**: `.github/workflows/release.yml` (92 rader). Körs på taggar `v*.*.*` och på PR mot `main`; `permissions: contents: read` utom `release` (`contents: write`).
- **Jobb**: `verify` (ubuntu-latest: på tagg kontroll att taggen är `v` + `package.json`-versionen, `npm ci`, `npx vitest run tests/`); `build-mac` (macos-latest, `npm run build:mac` med `CSC_IDENTITY_AUTO_DISCOVERY: 'false'`, `upload-artifact` `mac` från `dist/*.dmg`); `build-linux` (ubuntu-22.04, `npm run build:linux`, `node scripts/check-glibc.mjs dist/linux-unpacked`, `upload-artifact` `linux` från `dist/*.deb`); `release` (bara på tagg, `download-artifact` till `artifacts/`, `gh release create "${GITHUB_REF_NAME}" artifacts/mac/*.dmg artifacts/linux/*.deb --title "Auctum AIDLC Control ${GITHUB_REF_NAME}" --generate-notes`).
- **Namn**: kommentaren på rad 1 och `--title` på rad 91. Globbarna beror bara på filändelsen; `dist/linux-unpacked` är electron-builders fasta mappnamn och påverkas inte av namnet.

### Project README
- **Fil**: `README.md` (57 rader, svenska med en engelsk Vision-lista).
- **Innehåll**: rubrik `# Auctum AIDLC Control` (rad 1); introduktion med namnet, repo `aidlc-dash` och Auctums logga (rad 3); skärmbilder från `docs/screenshots/`; Vision; Kom igång (Node 22, `npm install`, `npm run dev`, `npm run build`, `npx vitest run tests/`, Linux kräver Ubuntu 22.04, `npm run icon`); Gatekeeper: högerklick och Öppna (rad 41); användning (+ Öppna, Arkiv → Öppna projekt…, Helskärm, Menyn, Animationer); Säkerhet med inställningssökvägarna `~/Library/Application Support/aidlc-dash/settings.json` och `~/.config/aidlc-dash/settings.json` (rad 53).
- **US-0406**: rubrik och introduktion ska bära det nya namnet, det utskrivna namnet och taglinen; uppgraderingen (ta bort den gamla appen på macOS, ev. det gamla `.deb`-paketet) behöver en rad; sökvägarna är oförändrade så länge userData-låset står kvar.

### Test Suite
`tests/main/` (18 filer), `tests/renderer/` (14 filer), `tests/fixtures/`. Namnberoende tester: se `code-quality-assessment.md`.
