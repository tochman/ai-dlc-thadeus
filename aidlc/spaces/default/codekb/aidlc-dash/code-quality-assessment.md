# Code Quality Assessment — aidlc-dash

## Testtäckning

- **Ramverk**: Vitest med två projekt (`main` i Node, `renderer` i jsdom), Testing Library React.
- **Testfiler**: 12 (`tests/main/` 9, `tests/renderer/` 3), ungefär 49 testfall.
- **Täckt**: alla parsers, `projectAccess` (inkl. `..`/absolut/symlänk-avvisning), `projectService` mot fixtureprojekt, ledger-sammanfattning och modelljämförelse, `getConfiguredModels` med injicerad exec, pty lazy-load-fel, watcher (debounce, ignorering, ledger), glibc-skriptet, ikonfilen, `IntentList`, `CostPanel`, `Splash`.
- **Otäckt**: `ipc.js`, `settings.js`, `index.js`, `useProject.js`, `App.jsx`, `ProjectView.jsx`, `TerminalPanel.jsx`, `IntentDetail.jsx`, `Pipeline.jsx`, `Timeline.jsx`, `BoltDag.jsx`, `ArtifactReader.jsx`.
- **Coverage-konfiguration**: saknas (ingen provider, ingen tröskel).

## Lint och formatering

Ingen ESLint- eller Prettier-konfiguration. Stilen är ändå enhetlig (2 blanksteg, enkla citattecken, semikolon, ~120 tecken).

## CI/CD

`.github/workflows/release.yml`: på PR mot `main` och på tagg `v*.*.*` körs `npx vitest run tests/`, sedan mac- och linux-bygge (med glibc-kontroll); på tagg skapas GitHub Release med `gh`. Taggen måste matcha `package.json`-versionen. Ingen lint-körning.

## Dokumentation

- `README.md` (svenska): syfte, kom igång, säkerhetsmodell.
- `docs/FEATURES.md` + sex epic-filer med stories och acceptanskriterier.
- Varje modul börjar med en syfteskommentar; FR-nummer i kommentarer kopplar till epic-dokumenten.

## Snabbedömning

| Område | Betyg | Kommentar |
|---|---|---|
| Namngivning | good | självförklarande, konsekvent |
| Funktionsstorlek | good | små funktioner; `TerminalPanel.jsx` (215 rader) störst |
| Felhantering | good | fel loggas och visas, läsning tål halvskrivna filer, inga tysta fångster utom medvetna (fit före layout) |
| Testnärvaro | fair | logik väl täckt, IPC och flera vyer otestade |
| Duplicering | fair | se teknisk skuld |
| Död kod | good | ingen hittad |

## Teknisk skuld

| # | Signal | Plats |
|---|---|---|
| TD1 | `errorText` kopierad fyra gånger | `App.jsx:8`, `useProject.js:6`, `TerminalPanel.jsx:12`, `ArtifactReader.jsx:6` |
| TD2 | Skalval dubblerat | `pty.js:35`, `models.js:27` |
| TD3 | Renderaren importerar från main-mappen | `Timeline.jsx:3`, `CostTab.jsx:2` |
| TD4 | Obegränsade cacher (`ponytail:`) | `projectService.js:12` |
| TD5 | Tidslinje utan virtualisering, tak 1500 (`ponytail:`) | `Timeline.jsx:6` (EPIC-03 US-0301) |
| TD6 | Osäker agent/modell-attribuering lämnas tom (`ponytail:`) | `ledger.js:50` |
| TD7 | Ingen linter, ingen coverage | rot |
| TD8 | `FEATURES.md` anger EPIC-02 som ej releasad/ej mergad | `docs/FEATURES.md` |

Inga TODO/FIXME/HACK, inga `eslint-disable`, inga hårdkodade hemligheter.

## Intent-relevanta luckor

Gäller EPIC-05; komponenterna listas i [component-inventory.md](component-inventory.md) § Intent-relevans.

1. **Ingen terminalåtkomst utanför `TerminalPanel`**: `claudeRef` är lokal (`TerminalPanel.jsx:129`); `insert` finns bara för claude-fliken och skickar aldrig Enter (`TerminalPanel.jsx:100-108`).
2. **Ingen upptagen/ledig-signal**: inget i pty-flödet avgör om Claude strömmar eller väntar på svar.
3. **Ingen omdetektering**: `detectProject` körs bara i `project:open` och watchern startas bara för AI-DLC-projekt (`ipc.js:66-69`), så "Initiera AI-DLC" kan inte växla vy automatiskt i dag.
4. **Ingen git-integration**: inget git-anrop finns; `models.js` är mönstret för `execFile` utan skal med inloggnings-PATH och timeout.
5. **Skrivskyddsprincipen**: alla nya ändrande åtgärder måste gå via terminalen; `projectAccess.js` ska förbli utan skrivanrop.
