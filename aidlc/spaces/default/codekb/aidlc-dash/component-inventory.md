# Komponentinventering: aidlc-dash

Varje rubrik nedan är ett komponentnamn (används verbatim i `reverse-engineering-timestamp.md`). För renderarkomponenter listas vad de renderar, deras klassnamn, `data-testid`, tillgänglighetsmönster och tester som är kopplade till markup. Alla `data-testid` ska behållas vid omdesignen (US-0403).

## Renderare: skal och varumärke

### Theme Stylesheet
- **Fil**: `src/renderer/theme.css` (fullständig avsnittskarta i `code-structure.md`).
- **Ansvar**: hela utseendet: 13 färgtokens, radie- och fonttokens, layout, LCARS-ramar, taggar, animationer.
- **Layoutprimitiver**: `.panel`, `.elbow-top`, `.elbow-left`, `.elbow-bottom`, `.app-header`- och `.terminal-panel`-radierna (30px i yttre hörn) som tillsammans bildar en yttre ram runt app-skalet; `.project-body` (grid), `.sidebar`, `.content`.
- **Animationer**: `splash-load` (splash-stapel), `pulse` (`.live-dot`, `.stage.is-current .stage-marker`, `.dag-node.unit-running rect`), `flash` (`.event.is-new .event-row`, 4 s), `transition: opacity` på `.splash`. Allt stängs av under `prefers-reduced-motion`. Ingen glöd (`box-shadow`/`filter`) finns ännu.
- **Hårdkodade färger i filen** (utanför `:root`): `.banner-error` `#2a1416`, `.banner-warn` `#2a2014`, `.settings-dialog::backdrop` `rgba(0,0,0,0.6)`, `@keyframes flash` `#3a2f12`.

### App Shell
- **Fil**: `src/renderer/App.jsx`. Beror på: Splash, AuctumMark, ProjectView, `window.bridge`.
- **Renderar**: `div.app` > `Splash`, `header.app-header.elbow-top` (`h1.app-title` med `AuctumMark.app-mark` dekorativ och appnamnet; `nav.project-tabs` med `div.project-tab(.is-active)` per projekt: flikknapp, `button.project-tab-settings` "⚙", `button.project-tab-close` "×"; `button.btn.btn-accent` "+ Öppna projekt"), `div.banner.banner-error`, `main.app-main` (tomt läge `div.empty-state.panel` med `AuctumMark.empty-state-mark` 64px; en `div.project-pane` per projekt, dold med `hidden`).
- **data-testid**: `project-tabs`, `project-tabs-tab`, `project-settings-open`, `project-tabs-close`, `project-tabs-add`, `app-error-dismiss`, `empty-state-open`.
- **Tillgänglighet**: `role="tablist"` med `aria-label="Projekt"`, flikar `role="tab"` + `aria-selected`; stäng har `aria-label`; felbanner `role="alert"`. Avvikelse: tablisten innehåller även icke-flikknappar.
- **Tester**: inga direkta.
- **Ansvar i övrigt**: återställer öppna flikar från inställningar, sparar dem vid varje ändring, byter flik när AI-DLC dyker upp i en mapp.

### Splash
- **Fil**: `src/renderer/Splash.jsx`. Exporterar `APP_NAME`, `SPLASH_MIN_MS` 900, `SPLASH_MAX_MS` 4000, `SPLASH_FADE_MS` 300.
- **Renderar**: `div.splash(.is-leaving)` > `AuctumMark.splash-mark` (160px, ej dekorativ), `div.splash-name`, `div.splash-bar[aria-hidden]` > `span` (animerad stapel).
- **data-testid**: `splash`.
- **Tester kopplade till markup**: `Splash.test.jsx` kräver `role="img"` med namnet `Auctum`, texten `Auctum AIDLC Control` och att `className` innehåller `is-leaving` under uttoningen.

### AuctumMark
- **Fil**: `src/renderer/AuctumMark.jsx`. Props: `size`, `className`, `decorative`.
- **Renderar**: inline-SVG (`viewBox="202 274 848 708"`) med två banor i `currentColor`; färgen kommer från klassen (`.app-mark`, `.splash-mark`, `.empty-state-mark`, alla `--amber`).
- **Tillgänglighet**: `role="img" aria-label="Auctum"` eller `aria-hidden` när `decorative`.
- **Samma banor** finns i `build/icon.svg` (amber `#ff9e40` på `#0b0b10`).

## Renderare: projektvy

### ProjectView
- **Fil**: `src/renderer/ProjectView.jsx` (interna delar `ViewSwitch`, `AidlcProject`, `SetupDone`, `ProjectContent`). Beror på: TerminalContext, Renderer Hooks, IntentList, IntentDetail, CostPanel, RefreshPanel, SetupAidlc, FeaturesView, TerminalPanel, ProjectSettingsDialog.
- **Renderar**: `div.project-view` > `SetupDone` (`div.panel.setup-done`), `div.view-switch` (knappar `detail-tab(.is-active)`), `div.project-mode` (`display: contents`, dold med `hidden` när Features visas) med `div.project-body` > `aside.sidebar.elbow-left` (space-väljare, varningsbanner, CostPanel, RefreshPanel, IntentList) och `section.content` (felbanner, IntentDetail eller "Välj en intent"); därefter FeaturesView, TerminalPanel, ProjectSettingsDialog.
- **data-testid**: `project-view-switch`, `project-view-switch-intents`, `project-view-switch-features`, `project-space-select`, `setup-aidlc-done`, `setup-aidlc-doctor`, `setup-aidlc-first-work`, `setup-aidlc-feature-docs-run`.
- **Tillgänglighet**: vyväxlaren är `role="group"` med `aria-pressed`.
- **Tester**: inga direkta.

### IntentList
- **Fil**: `src/renderer/IntentList.jsx`. Exporterar `sortIntents`, `filterIntents`. Beror på: Renderer Utilities, ResumeButton.
- **Renderar**: `div.intent-list` > `h2.section-title`, `div.filters` (sök, status, scope, sortering), `ul.intent-rows[role=listbox]` > `li` > `button.intent-row.status-<status>(.is-selected)[role=option]` med `span.intent-row-top` (`span.intent-slug`, `span.tag.tag-active` "Aktiv", `span.live-dot`, `span.intent-cost`), `span.intent-row-meta` (`span.status-text`, scope, datum, klara/körda), `span.intent-row-flags` (varningstaggar); ResumeButton under raden.
- **data-testid**: `intent-list`, `intent-list-search`, `intent-list-status-filter`, `intent-list-scope-filter`, `intent-list-sort`, `intent-list-row`, `intent-list-row-cost`, `intent-list-row-status`.
- **Tester kopplade till markup**: `IntentList.test.jsx:13` läser `.intent-slug` i varje rad; texterna `Aktiv`, `Saknas i intents.json` och `6/10` hämtas med `getByText`.

### IntentDetail
- **Fil**: `src/renderer/IntentDetail.jsx`. Beror på: Pipeline, Timeline, BoltDag, ArtifactReader, CostTab, ResumeButton.
- **Renderar**: `article.intent-detail` > `header.panel.elbow-top.intent-header` (`div.intent-title-row` med `h2`, `span.tag.tag-live` + `span.live-dot` "Live", stale-tagg, ResumeButton; `dl.facts` med Scope, Depth, Test strategy, Stages, Aktuell stage, Direktiv; `p.request-text`; `p.features-links`; varningsbanners), `div.detail-tabs[role=tablist]` (fem `button.detail-tab(.is-active)`), `div.detail-body[role=tabpanel]`.
- **data-testid**: `intent-detail`, `intent-detail-tab-pipeline`, `-timeline`, `-units`, `-cost`, `-files`, `intent-detail-story-link`.
- **Tester**: inga direkta. Det är här "Live"-indikatorn i sidhuvudet sitter (US-0402 "scanning light").

### Pipeline
- **Fil**: `src/renderer/Pipeline.jsx` (intern `StageRow`).
- **Renderar**: `div.pipeline` > en `section.phase.panel.elbow-left` per fas med `h3.section-title` och `ol.stages` > `li.stage.status-<status>(.is-muted)(.is-current)` > `button.stage-row` (`span.stage-marker[aria-hidden]`, `span.stage-slug`, `span.status-text`, taggar "Aktuell"/"Avvikelse", `span.stage-agent`, `span.stage-time`, `span.stage-duration`, `span.stage-cost`, `span.stage-files`) och `ul.stage-file-list`.
- **Statusvärden** (`status-*`): `not-started`, `in-progress`, `awaiting-approval`, `revising`, `done`, `skipped`, `unknown`. Markörfärg: done blå, in-progress grön, awaiting-approval amber, revising röd.
- **data-testid**: `pipeline`, `pipeline-stage`, `pipeline-stage-cost`, `pipeline-stage-file`.
- **Tester**: inga direkta. Kandidat för punktindikatorn i US-0403.

### Timeline
- **Fil**: `src/renderer/Timeline.jsx` (intern `EventRow`). Beror på `@tanstack/react-virtual`, `NOISY_EVENTS` från `src/main/parsers/audit.js`.
- **Renderar**: `div.timeline` > två `div.filters` (brus-kryssruta, typ, stage, räknare; "Till senaste", hopp till stage, `btn-accent timeline-new-counter`), `div.timeline-scroll` > `ol.events` (höjd inline) > `li.event.cat-<kategori>(.is-new)[data-index]` (absolut, inline `transform: translateY`) > `button.event-row` (`span.event-time`, `span.tag.cat-tag`, `span.event-type` + `span.tag.tag-new`, `span.event-title`) och `dl.event-fields`.
- **Kategorier**: `stage`, `subagent`, `gate`, `human`, `unit`, `error`, `guard`, `other`.
- **data-testid**: `timeline`, `timeline-noise-toggle`, `timeline-type-filter`, `timeline-stage-filter`, `timeline-jump-newest`, `timeline-jump-stage`, `timeline-new-counter`, `timeline-scroll`, `timeline-event`.
- **Tillgänglighet**: `aria-setsize`/`aria-posinset`, `aria-expanded`, beskrivande `aria-label` per rad, piltangenter/Home/End.
- **Tester kopplade till markup**: `Timeline.test.jsx` använder `.event.is-new`, `.event-row`, `.event-fields`, `[aria-posinset]`. Komponenten själv söker `[data-index] .event-row` och `classList.contains('event-row')` för fokus, så `event-row` och `data-index` är funktionella.

### BoltDag
- **Fil**: `src/renderer/BoltDag.jsx`.
- **Renderar**: `div.bolt-dag.panel` > SVG med `marker#dag-arrow`, `path.dag-edge`, `g.dag-node.unit-<pending|running|done>` (`rect` rx 16, `text.dag-name`, `text.dag-meta`, `title`). Fast nodstorlek 200x64.
- **data-testid**: `bolt-dag`, `bolt-dag-empty`.
- **Tillgänglighet**: SVG `role="img"` med `aria-label`. **Tester**: inga.

### ArtifactReader
- **Fil**: `src/renderer/ArtifactReader.jsx`. Exporterar `FileContent` (används av RefreshPanel och FeaturesView).
- **Renderar**: `div.artifact-reader` (grid) > `nav.file-tree.panel.elbow-left` (`h4.file-group`, `button.link(.is-selected)`), `div.file-view` (`code.file-path`, två `btn`, `div.markdown` eller `pre.code-block`). Länkar blir `span.md-link`, bilder `[bild: alt]`; `skipHtml`.
- **data-testid**: `artifact-reader`, `artifact-reader-file`, `artifact-reader-reveal`, `artifact-reader-open-editor`.
- **Tillgänglighet**: `aria-current` på vald fil. **Tester**: indirekt via FeaturesView (`h1` i fallback).

### CostPanel
- **Fil**: `src/renderer/CostPanel.jsx` (interna `CostChart`, `ScopeTable`). Beror på CostTab-exporterna.
- **Renderar**: `section.cost-panel` > `button.cost-panel-toggle` (`span.section-title`, `span.cost-panel-total`, pil ▾/▸), `div.cost-panel-body` (`p.cost-total`, `p.cost-legacy`, `figure.cost-chart` med SVG-staplar, tabeller `table.cost-table`, ModelTable).
- **data-testid**: `cost-panel`, `cost-panel-toggle`, `cost-panel-legacy`, `cost-panel-models`, `cost-panel-agents`, `cost-panel-scopes`.
- **Tester kopplade till markup**: `CostPanel.test.jsx` hämtar rader med `closest('tr')`, så tabellstrukturen måste bestå.

### CostTab
- **Fil**: `src/renderer/CostTab.jsx`. Exporterar `CostLabel`, `CostTable`, `ModelTable`.
- **Renderar**: `div.cost-tab` > `div.cost-total`, tre `table.cost-table` (`tr.is-top`, `td.missing-price`), `div.model-table`.
- **data-testid**: `cost-tab`, `cost-tab-unavailable`, `cost-tab-stages`, `cost-tab-agents`, `cost-tab-models`, `model-table`, `model-mismatch`.
- **Tillgänglighet**: `th scope="col"`, `caption`, `ⓘ` med `role="img"` och `aria-label`.

### RefreshPanel
- **Fil**: `src/renderer/RefreshPanel.jsx`. Exporterar `WAIT_MESSAGE`, `PULL`, `FROM_MAIN`.
- **Renderar**: `section.refresh-panel` > `button.cost-panel-toggle` (återanvänder kostnadspanelens klass), `div.refresh-body` med `dl.refresh-status`, knappar, `p.refresh-badge`, `ul.refresh-list`, `div.refresh-choice`, `div.refresh-remote-file`, konfliktlista.
- **data-testid**: `refresh-panel`, `refresh-panel-toggle`, `refresh-panel-status`, `refresh-panel-update`, `refresh-panel-badge`, `refresh-panel-details`, `refresh-panel-detail-list`, `refresh-panel-remote-file`, `refresh-panel-pull`, `refresh-panel-from-main`, `refresh-panel-choice`, `refresh-panel-choice-rebase`, `refresh-panel-choice-merge`, `refresh-panel-conflicts`, `refresh-panel-conflict-list`.
- **Tester kopplade till markup**: `getByRole('status')` förväntar exakt ett statuselement med `WAIT_MESSAGE`.

### ResumeButton
- **Fil**: `src/renderer/ResumeButton.jsx`. Exporterar `BUSY_MESSAGE`, `resumeLabel`.
- **Renderar**: `span.resume` > `button.btn.btn-accent.resume-button`, `span.resume-message[role=status]`.
- **data-testid**: `intent-resume`.
- **Tester kopplade till markup**: knappen måste vara ett `BUTTON`-element; `getByRole('status')`.

### SetupAidlc
- **Fil**: `src/renderer/SetupAidlc.jsx`. Exporterar `INSTALL_URL`, `FAILED_MESSAGE`.
- **Renderar**: `div.panel.empty-state.setup-panel[role=status]` > rubrik, `ul.setup-checks`, `div.setup-preview`, `details.setup-advanced` (fieldsets), `div.setup-feature-docs`, `div.setup-actions`, felrader `p.refresh-error`.
- **data-testid**: `project-not-aidlc`, `setup-aidlc-start`, `setup-aidlc-checks`, `setup-aidlc-preview`, `setup-aidlc-note`, `setup-aidlc-advanced`, `setup-aidlc-plugin`, `setup-aidlc-preset-<preset>`, `setup-aidlc-missing`, `setup-aidlc-feature-docs`, `setup-aidlc-run`, `setup-aidlc-failed`.
- **Tester kopplade till markup**: `setup-aidlc-missing` måste innehålla ett `a` med `href` till installationsanvisningen.

### FeaturesView
- **Fil**: `src/renderer/FeaturesView.jsx`. Exporterar `StatusBadge`. Beror på `parsers/features.js`, `FileContent`.
- **Renderar**: `div.features-view` > varningsbanners och antingen `div.panel.features-empty`, `div.file-view` (fallback) eller `div.project-body` > `aside.sidebar.elbow-left` (epics som `button.intent-row`) och `section.content` > `div.features-epic` (`header.panel.elbow-top`, filter, storys som `button.intent-row`, `div.file-view.features-story`).
- **data-testid**: `features-view`, `features-view-empty`, `features-view-setup`, `features-view-fallback`, `features-view-epic`, `features-view-story`, `features-view-story-detail`, `features-view-intent-link`, `features-view-reveal`, `features-view-open-editor`, `features-view-filter-status`, `features-view-filter-priority`.
- **Status**: `StatusBadge` visar emoji-markör och text (📋/🚧/✅), aldrig bara färg.
- **Tester kopplade till markup**: `getByRole('status')` för varningen; `h1` i fallback-markdown.

### ProjectSettingsDialog
- **Fil**: `src/renderer/ProjectSettingsDialog.jsx`.
- **Renderar**: native `dialog.panel.settings-dialog` (`showModal`) > `form` med `fieldset.settings-group`, radioknappar, sökvägsfält, `p.refresh-error`, `div.setup-actions`.
- **data-testid**: `project-settings-dialog`, `project-settings-mode-auto|show|hide`, `project-settings-path`, `project-settings-setup`, `project-settings-save`, `project-settings-cancel`.
- **Tillgänglighet**: `aria-labelledby`, `aria-invalid`, `aria-describedby`, Esc stänger via `onCancel`. Plats för en framtida "Animationer"-inställning, men den hör globalt hemma (app-inställningar), inte per projekt.

### TerminalPanel
- **Fil**: `src/renderer/TerminalPanel.jsx` (intern `TermSession`). Beror på xterm, FitAddon, TerminalContext, `terminalControl.js`.
- **Renderar**: `section.terminal-panel.elbow-bottom(.is-collapsed)[aria-label=Terminal]` > `div.terminal-resize[role=separator]`, `div.terminal-bar` (visa/dölj, `div.terminal-tabs[role=tablist]` med `button.detail-tab` + `span.term-state.term-state-<idle|busy|exited>`, `span.term-error`, `div.quick-actions`), `div.terminal-body` (inline höjd) > `div.term-session` > `div.term-status`, `div.term-host`.
- **data-testid**: `terminal-panel-resize`, `terminal-panel-toggle`, `terminal-panel-tab-claude|shell`, `terminal-panel-state-claude|shell`, `terminal-panel-error`, `terminal-panel-quick-command`, `terminal-panel-restart-<kind>`.
- **Hårdkodade färger**: xterm-temat `THEME` (`#0b0b10`, `#e8e6f0`, `#ff9c3a`, `#4a3f6b`) och fontfamilj i JS, utanför `theme.css`.
- **Tillgänglighet**: separator kan flyttas med pil upp/ned. **Tester**: inga direkta.

### TerminalContext
- **Fil**: `src/renderer/TerminalContext.jsx`. `TerminalProvider` och `useTerminal()` (API i `api-documentation.md`). Delar flikval och aktivitet mellan terminalen och vyer som skriver in kommandon. Renderar ingen markup.

## Renderare: hooks och hjälpare

### Renderer Hooks
- `src/renderer/useProject.js`: intent-lista, vald intent, detalj, kostnad, modeller, `newKeys` (4 s markering av nya audit-händelser), `lastIntentChangeAt`; prenumererar på `project:changed` och `project:watchError`.
- `src/renderer/useFeatures.js`: feature-dokument, projektinställningar och story-länkar; prenumererar på `features:changed`.

### Renderer Utilities
- `src/renderer/format.js`: statusetiketter (`STAGE_STATUS_LABEL`, `UNIT_STATUS_LABEL`, `CATEGORY_LABEL`), tid, varaktighet, kostnad, tokens, `stagePosition`. Testas indirekt.
- `src/renderer/terminalControl.js`: `createActivity`, `waitFor`, `runSequence`, `withEnter`. Testas i `terminalControl.test.jsx`.
- `src/renderer/featureDocsPrompt.js`: begäran som skrivs in i claude-fliken.
- `src/renderer/main.jsx`, `index.html`: monterar `App`, laddar Antonio 400/700 och `theme.css`; CSP.

## Preload och main

### Preload Bridge
`src/preload/index.js`: `window.bridge` med 28 invoke-funktioner, 6 prenumerationer och `platform`.

### Main Entry
`src/main/index.js`: userData-sökväg `aidlc-dash`, `BrowserWindow` 1440x900 (min 960x600, `backgroundColor '#0b0b10'` hårdkodad), säkerhetsinställningar, navigeringsspärr, Dock-ikon i dev.

### IPC Router
`src/main/ipc.js`: handlers, projekttabell, bevakningsstart per space, setup-bevakning, feature-bevakning, nedstängning.

### Project Service
`src/main/projectService.js`: projektdetektering, intent-lista och detalj med cacher, artefaktlistning per fas, audit-inläsning, ledger-läsning med senaste-giltiga-fallback.

### Project Access
`src/main/projectAccess.js`: `openRoot`, `resolveInRoot`, `readText`, `readJsonSafe`, `listDir`, `exists`. Inga skrivanrop.

### PTY Manager
`src/main/pty.js`: lat inladdning av node-pty, sessioner `claude` (`-l -i -c claude`) och `shell` (`-l`) i projektroten.

### Exec Runner
`src/main/exec.js`: `execFile` utan skal, timeout, PATH från inloggningsskalet.

### Settings Store
`src/main/settings.js`: `settings.json` i userData, seriell skrivkö, vitlistande `sanitize()`.

### File Watcher
`src/main/watcher.js`: `watchIntents` (intents + ledger, debounce 300/800 ms), `watchFiles`, `watchForAidlc`.

### Git Reader
`src/main/git.js`: status, fetch, fjärrändringar, fjärrfil, konflikter; argumentkontroll.

### Setup Helper
`src/main/setup.js`: förutsättningar, förhandsvisning (`aidlc config --dry-run`), plugins, bygger uppsättningskommandot.

### Model Config Reader
`src/main/models.js`: `aidlc config models --show --json`, fallback till agentfilernas frontmatter.

### Feature Docs Loader
`src/main/features.js`: översikt och epic-filer, bevakningssökvägar, story-länkar.

### Parsers
`src/main/parsers/`: `state.js` (checkbox-status), `pipeline.js` (sammanslagning, `current`, mismatch), `audit.js` (block, `categoryOf`, `NOISY_EVENTS`), `intents.js`, `runtimeGraph.js`, `units.js`, `ledger.js` (kostnadssummering, `compareModels`), `features.js` (översikt, epic, statusmarkörer).

## Bygg, CI och test

### Build Scripts
`scripts/make-icon.cjs` (renderar `build/icon.svg` till PNG med Electron), `scripts/fix-pty-perms.cjs` (postinstall), `scripts/check-glibc.mjs` (Linux-paketkontroll).

### Release Pipeline
`.github/workflows/release.yml`: tester, macOS- och Linux-bygge, release på tagg.

### Test Suite
`tests/main/` (14 filer), `tests/renderer/` (10 filer), `tests/fixtures/`. Se `code-quality-assessment.md`.
