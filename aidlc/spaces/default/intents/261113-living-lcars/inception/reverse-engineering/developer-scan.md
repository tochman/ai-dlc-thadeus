# Developer-skanning: aidlc-dash (full omskanning)

Intent: `261113-living-lcars` · Commit: `b30f69abec7775f2ceb0c67fb1765349cd88055f` · Datum: 2026-11-13 · Bredd: hela repot (`./`)

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `src/renderer/` (alla 28 filer, inklusive `theme.css` rad för rad, `index.html`, `main.jsx`)
  - `src/preload/index.js`
  - `src/main/` (`index.js`, `ipc.js`, `projectService.js`, `projectAccess.js`, `pty.js`, `exec.js`, `settings.js`, `watcher.js`, `git.js`, `setup.js`, `models.js`, `features.js`)
  - `src/main/parsers/` (`audit.js`, `pipeline.js`, `state.js` lästa helt; `intents.js`, `runtimeGraph.js`, `units.js`, `ledger.js`, `features.js` lästa till exporter och syfte)
  - `tests/renderer/` (alla 10 testfiler, med fokus på selektorer mot markup)
  - `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`, `.nvmrc`, `.gitignore` (projektets egen del), `README.md`
  - `.github/workflows/release.yml`
  - `docs/features/epic-04-branding-and-desktop.md`, `docs/FEATURES.md`
  - `build/icon.svg`
  - `scripts/` (`make-icon.cjs`, `fix-pty-perms.cjs`, `check-glibc.mjs`)
- **Skimmed only**:
  - `tests/main/` (testsviter listade per `describe`, `icon.test.js` läst)
  - `tests/fixtures/` (filnamn och struktur)
  - `docs/features/` utom EPIC-04 (filnamn och översiktsrad)
  - `build/icons/`, `build/icon.png` (binära ikonfiler, ej öppnade)
- **Left out**:
  - `node_modules/` (beroenden)
  - `out/` (electron-vite-byggutdata)
  - `dist/` (electron-builder-paket)
  - `tests/.tmp/` (testutdata, gitignorerad)
  - `package-lock.json` (innehållet, endast närvaron noterad)
  - AI-DLC:s egen installation: `.claude/`, `aidlc/`, AI-DLC-blocket i `.gitignore`

### Packages Found
- `aidlc-dash` (productName "Auctum AIDLC Control", v0.1.1) — Electron-skrivbordsapp — JavaScript/JSX (ESM) — skrivskyddad "bridge console" för AI-DLC-projekt med inbäddad Claude-terminal
- Tre bundles via electron-vite: `src/main` (Node/Electron-huvudprocess), `src/preload` (contextBridge-API), `src/renderer` (React 19 SPA)

### Build System
- **Type**: npm + electron-vite 6 (Vite 8) + electron-builder 26; Node 22 (`.nvmrc`)
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`, `electron-builder.yml`, `.nvmrc`
- **Build Dependencies**: renderer → preload-API (`window.bridge`) → IPC → main; renderer importerar även rena moduler från main (`../main/parsers/audit.js`, `ledger.js`, `features.js`) som bundlas in i renderaren

### APIs Discovered
- Electron IPC (invoke) — `src/main/ipc.js` / `src/preload/index.js` — 28 kanaler (`project:*`, `shell:*`, `settings:*`, `pty:*`, `git:*`, `setup:*`, `features:*`, `projectSettings:*`)
- Electron IPC (push-händelser) — main → renderer — 6 kanaler (`project:changed`, `project:detected`, `project:watchError`, `features:changed`, `pty:data`, `pty:exit`)
- Ingen HTTP-server och inga nätverks-API:er; externa kommandon (`git`, `aidlc`) körs via `execFile` utan skal

### Frameworks & Libraries
- electron — ^45.3.1 — skrivbordsruntime
- react / react-dom — ^19.3.1 — UI
- @xterm/xterm — ^6.0.0, @xterm/addon-fit — ^0.11.0 — terminal i renderaren
- node-pty — ^1.1.0 — pseudoterminaler i main (laddas lat)
- chokidar — ^4.0.3 — filbevakning
- react-markdown — ^10.1.0, remark-gfm — ^4.0.1 — artefaktvisning utan rå HTML
- @tanstack/react-virtual — 3.14.24 — virtualiserad tidslinje
- @fontsource/antonio — ^5.3.0 — rubrikfont (vikter 400, 700)
- vitest — ^5.1.0, @testing-library/react — ^16.3.3, jsdom — ^29.1.1 — test

### Test Coverage
- **Test Directories**: `tests/main/` (14 filer, node-miljö), `tests/renderer/` (10 filer, jsdom), `tests/fixtures/`
- **Test Frameworks**: Vitest (två projekt: `main`, `renderer`), Testing Library React
- **Coverage Config**: absent (ingen coverage-tröskel konfigurerad)
- Renderarkomponenter utan test: `App.jsx`, `ProjectView.jsx`, `IntentDetail.jsx`, `Pipeline.jsx`, `BoltDag.jsx`, `ArtifactReader.jsx`, `CostTab.jsx` (indirekt via CostPanel), `TerminalPanel.jsx`, `TerminalContext.jsx`, `AuctumMark.jsx` (indirekt via Splash)

### Code Quality Indicators
- **Linting**: ingen ESLint- eller Prettier-konfiguration i repot
- **CI/CD**: `.github/workflows/release.yml` (vitest på PR och tagg, macOS universal `.dmg`, Linux `.deb` på ubuntu-22.04 med glibc-kontroll, GitHub Release på `v*.*.*`)
- **Documentation**: `README.md` (svenska), `docs/FEATURES.md` + epic-filer; korta, ändamålsenliga kommentarer med krav-ID:n (FRx, NFRx, US-xxxx)

### Technical Debt Signals
- Hårdkodade färger utanför tokens: `TerminalPanel.jsx:17-22` (xterm-tema `#0b0b10`, `#e8e6f0`, `#ff9c3a`, `#4a3f6b`, nära men inte lika med tokens), `src/main/index.js:18` (`backgroundColor: '#0b0b10'`), `theme.css:134-135` (banner-bakgrunder `#2a1416`, `#2a2014`), `theme.css:364` (`rgba(0,0,0,0.6)`), `theme.css:371` (`@keyframes flash` från `#3a2f12`), `build/icon.svg` (`#0b0b10`, `#ff9e40`)
- Magiska tal i layout: `grid-template-columns` för `.stage-row` (9 kolumner), `.event-row`, `.project-body` (340px), `.artifact-reader` (280px); elbow-mått (6/8/22/30px) upprepade i flera regler
- Klasser i JSX utan CSS-regel: `is-collapsed`, `detail-body`, `intent-header`, `phase`, `timeline`, `features-story`, `setup-feature-docs`
- `.intent-row` återanvänds för epics och storys i `FeaturesView.jsx`; en omdesign av intentraden slår igenom där
- `role="tablist"` på `.project-tabs` innehåller även knappar som inte är flikar (inställningar, stäng, lägg till); flikar saknar `aria-controls`
- `errorText()` duplicerad i 9 renderarfiler
- Inga TODO/FIXME/HACK eller `eslint-disable`; fyra medvetna `ponytail:`-förenklingar (cacher, porcelain-sökvägar, story-länkar, inställningstak)
- `settings.js` `sanitize()` vitlistar nycklar: en ny appinställning (t.ex. "Animationer" i US-0402) försvinner tyst om den inte läggs till där

## Handoff Summary
- **Intent-relevant finding**: Hela utseendet bor i en fil, `src/renderer/theme.css` (375 rader): 13 färgtokens på `:root` (rad 4-23) i den gamla amber/lavendel/blå-paletten, tre elbow-primitiver (`.elbow-top`, `.elbow-left`, `.elbow-bottom`, rad 82-84) byggda med `border` + `border-radius`, fyra keyframes (`splash-load`, `pulse`, `flash`; `pulse` används av `.live-dot`, `.stage.is-current .stage-marker`, `.dag-node.unit-running rect`) och en global `prefers-reduced-motion`-regel (rad 373-375) som stänger av all animation och transition. Inga komponenter använder CSS-moduler eller inline-färger, utom xterm-temat i `TerminalPanel.jsx:17-22` och fönsterbakgrunden i `src/main/index.js:18`.
- **Risks / follow-up**:
  - Tester som är kopplade till markup och bryts av en omdesign om klasserna byts: `IntentList.test.jsx:13` (`.intent-slug`), `Splash.test.jsx:25` (`is-leaving` i `className`), `Splash.test.jsx:16` (`role="img"` med namnet `Auctum` på splashmärket), `Timeline.test.jsx:53,56,77` (`.event.is-new`, `.event-row`, `.event-fields`), `FeaturesView.test.jsx:70` (`h1` i fallback-markdown), `SetupAidlc.test.jsx:94` (`a` i saknat-verktyg-texten). `Timeline.jsx:106,126-128` söker själv `[data-index] .event-row` och `classList.contains('event-row')`, så klassen `event-row` är funktionell, inte bara stil.
  - Alla `data-testid` (listade i `component-inventory.md`) ska behållas enligt US-0403.
  - Tidslinjens rader placeras absolut med inline `transform: translateY(...)` (`Timeline.jsx:203`); en "slide in"-animation på `transform` krockar med virtualiseraren och bör använda `opacity`/pseudoelement.
  - `role="status"`-element används flitigt och flera tester hämtar `getByRole('status')`; dekorativa element som läggs till måste vara `aria-hidden` för att inte skapa fler träffar.
