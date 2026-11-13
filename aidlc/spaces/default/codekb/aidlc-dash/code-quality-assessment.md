# Code Quality Assessment — aidlc-dash

## Testtäckning

- **Ramverk**: Vitest med två projekt (`main` i Node, `renderer` i jsdom), Testing Library React.
- **Testfiler**: 19 (`tests/main/` 12, `tests/renderer/` 7), 61 testfall.
- **Täckt**: alla parsers, `projectAccess` (inkl. `..`/absolut/symlänk-avvisning), `projectService` mot fixtureprojekt, ledger-sammanfattning och modelljämförelse, `getConfiguredModels` med injicerad exec, pty lazy-load-fel och rättigheter, watcher (debounce, ignorering, ledger, `watchForAidlc`), glibc-skriptet, ikonfilen, `IntentList`, `CostPanel`, `Splash`, samt EPIC-05: `git`, `setup`, `RefreshPanel`, `ResumeButton`, `SetupAidlc`, `terminalControl` (de senare ytligt räknade).
- **Audit-specifikt**: `parsers.test.js` kontrollerar okända typer/fält och sammanslagning av två shards i tidsordning med stabil ordning vid lika tidsstämplar. Ingen test täcker tidsstämpel saknas, blandade zonformat eller att `seq` förskjuts när en äldre händelse tillkommer. `projectService.test.js` laddar en detalj med `events: []` (audit-fixturerna ligger i `tests/fixtures/audit/`, utanför fixture-trädet).
- **Otäckt**: `ipc.js`, `settings.js`, `index.js`, **`useProject.js`**, `App.jsx`, `ProjectView.jsx`, `TerminalPanel.jsx`, `IntentDetail.jsx`, `Pipeline.jsx`, **`Timeline.jsx`**, `BoltDag.jsx`, `ArtifactReader.jsx`.
- **Coverage-konfiguration**: saknas (ingen provider, ingen tröskel).

## Lint och formatering

Ingen ESLint- eller Prettier-konfiguration. Stilen är ändå enhetlig (2 blanksteg, enkla citattecken, semikolon, ~120 tecken).

## CI/CD

`.github/workflows/release.yml`: på PR mot `main` och på tagg `v*.*.*` körs `npx vitest run tests/`, sedan mac- och linux-bygge (med glibc-kontroll); på tagg skapas GitHub Release med `gh`. Taggen måste matcha `package.json`-versionen. Ingen lint-körning. (Från förra skanningen, inte omläst.)

## Dokumentation

- `README.md` (svenska): syfte, kom igång, säkerhetsmodell.
- `docs/FEATURES.md` + epic-filer med stories och acceptanskriterier; EPIC-03 📋 Planned, EPIC-05 🚧 byggt, ej releasat.
- Varje modul börjar med en syfteskommentar; FR-nummer i kommentarer kopplar till epic-dokumenten.

## Snabbedömning

| Område | Betyg | Kommentar |
|---|---|---|
| Namngivning | good | självförklarande, konsekvent |
| Funktionsstorlek | good | små funktioner; `TerminalPanel.jsx` störst |
| Felhantering | good | fel loggas och visas, läsning tål halvskrivna filer, inga tysta fångster utom medvetna |
| Testnärvaro | fair | logik väl täckt, IPC och flera vyer otestade, däribland tidslinjen och dess datahook |
| Duplicering | fair | se teknisk skuld |
| Död kod | good | ingen hittad |

## Teknisk skuld

| # | Signal | Plats |
|---|---|---|
| TD1 | `errorText` kopierad i flera filer | `App.jsx`, `useProject.js:6`, `TerminalPanel.jsx`, `ArtifactReader.jsx` |
| TD2 | Skalval dubblerat (kan ha flyttat till `exec.js` med EPIC-05; ej omverifierat) | `pty.js`, `models.js` |
| TD3 | Renderaren importerar från main-mappen | `Timeline.jsx:3`, `CostTab.jsx` |
| TD4 | Obegränsade cacher (`ponytail:`) | `projectService.js:12` |
| TD5 | Tidslinje utan virtualisering, tak 1500 (`ponytail:`) | `Timeline.jsx:6`, tillämpas `:50` (EPIC-03 US-0301) |
| TD6 | Osäker agent/modell-attribuering lämnas tom (`ponytail:`) | `ledger.js` |
| TD7 | Ingen linter, ingen coverage | rot |
| TD8 | `FEATURES.md` anger EPIC-02 och EPIC-05 som byggda men ej releasade | `docs/FEATURES.md` |
| TD9 | Ny-markering på antal, inte identitet | `useProject.js:48-51`, `Timeline.jsx:79` (EPIC-03 US-0302) |
| TD10 | `seq` = sorteringsindex, används som React-nyckel | `audit.js:43`, `Timeline.jsx:79` |
| TD11 | Markeringstimer rensas aldrig | `useProject.js:50` |
| TD12 | Tidsstämplar sorteras som strängar | `audit.js:42` |
| TD13 | Alla shards läses om helt vid varje liveuppdatering | `projectService.js:131-137` |

Inga TODO/FIXME/HACK, inga `eslint-disable`, inga hårdkodade hemligheter i fokusfilerna.

## Intent-relevanta luckor

Gäller EPIC-03; komponenterna listas i [component-inventory.md](component-inventory.md) § Intent-relevans.

1. **Radtak och full rendering** (US-0301): `MAX_ROWS = 1500` (`Timeline.jsx:6`) klipper bort äldre händelser efter filter; alla kvarvarande rader blir DOM-noder. Filter, klipp och vändning körs om vid varje rendering (`:48-51`), inte memoiserat. Ingen scrollbehållare, inget "hoppa till", ingen bevarad scrollposition; tidslinjen monteras om vid flikbyte (`IntentDetail.jsx:108`).
2. **Varierande radhöjd** (US-0301): `EventRow` fäller ut en `<dl>` med alla fält; `open` är lokalt tillstånd per rad. En fönstrad lista måste mäta eller uppskatta höjder, och utfällt tillstånd måste överleva att raden lämnar och återkommer i fönstret (lyft till förälder, nyckel på stabil identitet).
3. **Tillgänglighet** (US-0301): i dag `<ol>`/`<li>` med `<button aria-expanded>` och vanlig tabbordning; ingen pil-navigering. Vid fönstring försvinner rader ur DOM, så position/antal måste anges (t.ex. `aria-setsize`/`aria-posinset`) och fokus hanteras.
4. **Identitet på antal** (US-0302): `newSeqFrom = prev.events.length` (`useProject.js:49`) och `seq >= newSeqFrom` (`Timeline.jsx:79`). En händelse med äldre tidsstämpel från en annan shard får ett `seq` mitt i listan, så fel rader blinkar och den nya blinkar inte. Oförändrat eller minskat antal ger ingen markering alls.
5. **Stabil nyckel saknas** (US-0302): `parseAudit` (`audit.js:31-36`) sparar inte blockets position; `source` finns. `source` + position i sharden är stabil så länge shards bara växer i slutet (AI-DLC:s audit-shards är append-only per klon).
6. **Timer** (US-0302): flera uppdateringar inom 4 s, och avmontering, hanteras inte (`useProject.js:50`); CSS-animationen (`theme.css:267`) är också 4 s.
7. **"N nya händelser"** (US-0302): finns inte; kräver att tidslinjen vet vilka nya händelser som ligger utanför synligt område, alltså samma fönsterberäkning som US-0301.
8. **Tester**: inga för `Timeline` eller `useProject`; jsdom saknar layout, så fönstringstester måste stubba mått.
