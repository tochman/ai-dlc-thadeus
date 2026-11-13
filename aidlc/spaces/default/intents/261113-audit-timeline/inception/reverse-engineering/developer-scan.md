## Developer Code Scan Results

Fokuserad skanning av repot `aidlc-dash` (oregistrerat projektrotsrepo) för intent `261113-audit-timeline` (EPIC-03), commit `9caa35d30a5b06ff657e4867ffe42be1d51496ce`, djup Minimal. Den befintliga kunskapsbasen var STALE (byggd före EPIC-05); allt utanför fokusområdet bevaras från den och märks som ytligt.

### Scan Coverage
- **Analyzed deeply**:
  - src/renderer/Timeline.jsx
  - src/main/parsers/audit.js
  - src/main/watcher.js
  - src/renderer/useProject.js
  - src/main/projectService.js
  - tests/main/parsers.test.js
  - tests/main/projectService.test.js
  - tests/main/watcher.test.js
- **Skimmed only**:
  - tests/main/ (övriga testfiler: bara namn och antal testfall)
  - tests/renderer/ (namn och antal testfall; sökt efter Timeline/useProject, inga träffar)
  - tests/fixtures/audit/ (filnamn och antal block)
  - src/renderer/IntentDetail.jsx, src/renderer/ProjectView.jsx (bara raderna som skickar `newSeqFrom`/`events` till Timeline)
  - src/renderer/theme.css (bara `.event.is-new`-animationen)
  - src/preload/index.js (bara kanalnamnen)
  - EPIC-05-tillägg: src/main/exec.js, src/main/git.js, src/main/setup.js, src/renderer/RefreshPanel.jsx, src/renderer/ResumeButton.jsx, src/renderer/SetupAidlc.jsx, src/renderer/TerminalContext.jsx, src/renderer/terminalControl.js (bara inledande kommentar)
  - docs/features/epic-03-audit-timeline.md, docs/FEATURES.md (krav och status)
- **Left out**:
  - node_modules/
  - out/
  - dist/
  - tests/.tmp/
  - AI-DLC:s egen installation (.claude/, aidlc/, AI-DLC-blocket i .gitignore)

### Packages Found
- aidlc-dash — Electron-skrivbordsapp — JavaScript (ESM) + JSX — konsol för AI-DLC-projekt (oförändrat sedan förra skanningen; `package.json` lästes inte om)

### Build System
- **Type**: npm + electron-vite (oförändrat enligt befintlig store, inte omverifierat)
- **Config Files**: `vitest.config.mjs` (läst: projekten `main`/node och `renderer`/jsdom), övriga se store
- **Build Dependencies**: inga nya i fokusområdet

### APIs Discovered
- Electron IPC — `src/preload/index.js` — 29 kanaler (namn skummade). Nya sedan förra skanningen: `git:fetch`, `git:status`, `git:remoteChanges`, `git:showRemote`, `git:conflicts`, `setup:info`, `setup:command`, `project:detected` (push).
- Fokusytan för EPIC-03: `project:intent` returnerar `events[]` med form `{timestamp, event, title, fields, source, seq, category}`; push `project:changed {projectId, space, dirNames[], indexChanged, costChanged}`.

### Frameworks & Libraries
- React — ^19 (enligt store) — tidslinjen är ren React utan virtualiseringsbibliotek
- chokidar — ^4 (enligt store) — filbevakning i `watcher.js`
- Inget fönstrings-/virtualiseringsbibliotek används i fokusfilerna

### Test Coverage
- **Test Directories**: `tests/main/` (12 filer), `tests/renderer/` (7 filer); 61 testfall totalt
- **Test Frameworks**: Vitest, Testing Library React, jsdom
- **Coverage Config**: absent
- Fokusrelevant: `parsers.test.js` täcker `parseAudit` (okända typer, fält) och `mergeAudits` (tidsordning över två shards, stabil ordning vid lika tidsstämplar). `watcher.test.js` täcker debounce, ignorering av `.aidlc-engine/`, ledger och `watchForAidlc`. `projectService.test.js` laddar detalj men med `events: []` (audit-fixturerna ligger utanför fixture-trädet). **Inga tester** för `Timeline.jsx` eller `useProject.js` (ingen träff i `tests/`).

### Code Quality Indicators
- **Linting**: ingen ESLint/Prettier (enligt store)
- **CI/CD**: `.github/workflows/release.yml` (enligt store, inte omläst)
- **Documentation**: syfteskommentar överst i varje fokusfil; FR-nummer i kommentarer (`FR7.2`, `FR7.3`, `NFR1`)

### Technical Debt Signals
- `Timeline.jsx:6` — `MAX_ROWS = 1500` med `ponytail:`-kommentar; inga rader äldre än de 1500 senaste efter filter kan nås (US-0301).
- `Timeline.jsx:48-51` — filtrering, `slice(-MAX_ROWS)` och `reverse()` körs om vid varje rendering (inte memoiserat) och alla synliga rader renderas som DOM.
- `audit.js:39-44` — `seq` är index efter sortering på tidsstämpel; en händelse med äldre tidsstämpel (annan maskins shard) flyttar `seq` för alla senare händelser. Sorteringen är `localeCompare` på strängar: saknad tidsstämpel blir `''` och hamnar först, och tidsstämplar med olika zonformat (`Z` mot `+01:00`) sorteras inte kronologiskt.
- `useProject.js:48-51` — "nytt" avgörs av antal: `newSeqFrom = prev.events.length` när antalet ökat. Det markerar de N sista enligt tidsordning, inte de faktiskt nya (US-0302). Ingen markering om antalet är oförändrat eller minskar.
- `useProject.js:50` — `setTimeout` rensas aldrig: vid två uppdateringar inom 4 s nollställer den första timern den andra markeringen i förtid, och timern körs efter avmontering.
- `Timeline.jsx:79` + `:9` — `key={e.seq}`; när `seq` förskjuts följer en expanderad rads `open`-tillstånd fel händelse.
- `projectService.js:131-137` — alla audit-shards läses och tolkas om helt vid varje liveuppdatering (ingen inkrementell läsning); `detailCache` obegränsad (`ponytail:` rad 12).

## Handoff Summary
- **Intent-relevant finding**: Den nya-händelse-markeringen bygger på antal och sorteringsindex, inte på en stabil identitet. `mergeAudits` (`src/main/parsers/audit.js:39-44`) sätter `seq` som position efter tidssortering; `useProject` (`src/renderer/useProject.js:48-51`) sätter `newSeqFrom = prev.events.length`; `Timeline` (`src/renderer/Timeline.jsx:79`) markerar `e.seq >= newSeqFrom`. En äldre händelse från en annan shard hamnar mitt i listan, men markeringen träffar de senaste raderna. Raden-taket är `MAX_ROWS = 1500` (`Timeline.jsx:6`, tillämpas `:50`) och allt renderas utan fönstring. En stabil nyckel finns nära till hands: `source` plus blockets position i sin shard (`parseAudit`, `audit.js:31-36`, sparar i dag inte positionen) förutsätter att shards bara växer i slutet.
- **Risks / follow-up**: (1) `seq` används också som React-nyckel; byts identiteten måste nyckeln, `newSeqFrom`-propen genom `ProjectView.jsx:52` och `IntentDetail.jsx:108`, och `.event.is-new`-animationen (`theme.css:267`, 4 s, samma som `HIGHLIGHT_MS`) ändras samtidigt. (2) `unitStatuses(graph.boltDag, events)` (`projectService.js:162`) konsumerar samma händelselista; ändrad form får inte bryta den. (3) Liveflödet säger bara vilken intent som ändrats (`watcher.js:73-74`), aldrig vilken shard; hela listan läses om, så nyhet måste räknas ut genom jämförelse i renderaren eller i `buildDetail`. (4) Varken `Timeline` eller `useProject` har tester; express/Minimal kräver minst ett krav-drivet test per story. (5) Inget virtualiseringsbibliotek finns; AC kräver att valet motiveras i planen. (6) EPIC-05-tilläggen är bara skummade och beskrivs ytligt i storen.
