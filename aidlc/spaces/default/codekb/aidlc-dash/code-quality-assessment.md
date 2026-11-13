# Code Quality Assessment — aidlc-dash

## Testtäckning

- **Ramverk**: Vitest med två projekt (`main` i Node, `renderer` i jsdom), Testing Library React.
- **Testfiler**: 20 (`tests/main/` 12, `tests/renderer/` 8). Nytt sedan förra skanningen: `tests/renderer/Timeline.test.jsx` (EPIC-03); `tests/main/ptyPerms.test.js` hör till `scripts/fix-pty-perms.cjs`. Antalet testfall är inte omräknat.
- **Täckt** (enligt fillistor och förra skanningen): alla parsers, `projectAccess` (inkl. `..`/absolut/symlänk-avvisning), `projectService` mot fixtureprojekt, ledger-sammanfattning och modelljämförelse, `getConfiguredModels` med injicerad exec, pty lazy-load-fel och rättigheter, watcher (debounce, ignorering, ledger, `watchForAidlc`), glibc-skriptet, ikonfilen, `IntentList`, `CostPanel`, `Splash`, `Timeline`, samt EPIC-05: `git`, `setup`, `RefreshPanel`, `ResumeButton`, `SetupAidlc`, `terminalControl`.
- **Otäckt** (ingen testfil finns): `ipc.js`, `settings.js`, `index.js`, `preload/index.js`, `useProject.js`, `App.jsx`, `ProjectView.jsx` (inklusive `SetupDone` och bytet från icke-AI-DLC till AI-DLC), `TerminalPanel.jsx`, `IntentDetail.jsx`, `Pipeline.jsx`, `BoltDag.jsx`, `ArtifactReader.jsx` (inklusive `FileContent`).
- **Coverage-konfiguration**: saknas (ingen provider, ingen tröskel).

## Lint och formatering

Ingen ESLint- eller Prettier-konfiguration. Stilen är ändå enhetlig (2 blanksteg, enkla citattecken, semikolon, ~120 tecken; `SetupAidlc.jsx` har några längre rader).

## CI/CD

`.github/workflows/release.yml`: på PR mot `main` och på tagg `v*.*.*` körs `npx vitest run tests/`, sedan mac- och linux-bygge (med glibc-kontroll); på tagg skapas GitHub Release med `gh`. Taggen måste matcha `package.json`-versionen. Ingen lint-körning. (Från tidigare skanning, inte omläst.)

## Dokumentation

- `README.md` (svenska): syfte, kom igång, säkerhetsmodell.
- `docs/FEATURES.md` + epic-filer med stories och acceptanskriterier; EPIC-02, EPIC-03 och EPIC-05 🚧 byggda, ej releasade; EPIC-06 📋 Planned.
- Varje modul börjar med en syfteskommentar; FR-nummer i kommentarer kopplar till epic-dokumenten.

## Snabbedömning

| Område | Betyg | Kommentar |
|---|---|---|
| Namngivning | good | självförklarande, konsekvent |
| Funktionsstorlek | good | små funktioner; `TerminalPanel.jsx` och `SetupAidlc.jsx` störst |
| Felhantering | good | fel loggas och visas, läsning tål halvskrivna filer, inga tysta fångster utom medvetna (`exists`, `prettyJson`) |
| Testnärvaro | fair | logik väl täckt, IPC, inställningar och flera vyer otestade |
| Duplicering | fair | se teknisk skuld |
| Död kod | good | ingen hittad |

## Teknisk skuld

| # | Signal | Plats |
|---|---|---|
| TD1 | `errorText` (tar bort IPC-prefixet) kopierad i flera filer | `App.jsx:8-10`, `ArtifactReader.jsx:6`, `SetupAidlc.jsx:14`, `useProject.js`, `TerminalPanel.jsx`; `setup.js:14` har en egen timeoutvariant |
| TD2 | Skalval dubblerat (kan ha flyttat till `exec.js` med EPIC-05; ej omverifierat) | `pty.js`, `models.js` |
| TD3 | Renderaren importerar från main-mappen | `Timeline.jsx`, `CostTab.jsx` |
| TD4 | Obegränsade cacher (`ponytail:`) | `projectService.js` |
| TD5 | ~~Tidslinje utan virtualisering, tak 1500~~ åtgärdat av EPIC-03 (`useVirtualizer`, ytligt verifierat) | `Timeline.jsx` |
| TD6 | Osäker agent/modell-attribuering lämnas tom (`ponytail:`) | `ledger.js` |
| TD7 | Ingen linter, ingen coverage | rot |
| TD8 | `FEATURES.md` anger EPIC-02, EPIC-03 och EPIC-05 som byggda men ej releasade | `docs/FEATURES.md` |
| TD9 | ~~Ny-markering på antal~~ åtgärdat av EPIC-03 (`newKeys`, ytligt verifierat) | `useProject.js`, `Timeline.jsx` |
| TD10 | ~~`seq` som React-nyckel~~ åtgärdat av EPIC-03 (`key = <source>#<index>`, ytligt verifierat) | `audit.js:31-37` |
| TD11 | Markeringstimer rensas aldrig (inte omverifierat efter EPIC-03) | `useProject.js` |
| TD12 | Tidsstämplar sorteras som strängar | `audit.js` |
| TD13 | Alla shards läses om helt vid varje liveuppdatering | `projectService.js` |
| TD14 | `setSettings` läser–slår ihop–skriver utan serialisering; samtidiga anrop kan tappa en ändring | `settings.js:29-34`, anropas från `App.jsx:63-73` |
| TD15 | `sanitize` tar tyst bort okända nycklar | `settings.js:12-18` |
| TD16 | `exists` svarar `false` för alla fel, även sökvägar utanför roten | `projectAccess.js:67-74` |

Inga TODO/FIXME/HACK, inga `eslint-disable`, inga hårdkodade hemligheter i fokusfilerna.

## Intent-relevanta luckor

Gäller EPIC-06; komponenterna listas i [component-inventory.md](component-inventory.md) § Intent-relevans.

1. **Ingen plats för vyn** (US-0602): `ProjectContent` (`ProjectView.jsx:83-104`) har två lägen, AI-DLC-vyn och `SetupAidlc`. AI-DLC-vyns innehållsyta visar bara `IntentDetail` eller "Välj en intent i listan." (`:46-58`). Det finns ingen vyväxling, ingen projektmeny och ingen inställningsvy (`App.jsx:99-163`). Features-vyn, valet "Sätt upp feature-beskrivningar" och inställningen behöver nya UI-ytor.
2. **Projekt utan AI-DLC** (US-0602, första AC): ett sådant projekt visar bara `SetupAidlc`, men AC säger "whether or not it was set up through the console". Om "set up through the console" betyder AI-DLC uppsatt på annat sätt räcker AI-DLC-vyn; ska vyn också finnas utan `aidlc/spaces/` måste `ProjectContent` ändras. Behöver klargöras i kraven.
3. **Inställningar per projekt** (US-0602): `sanitize` behåller bara tre nycklar (`settings.js:12-18`), så en ny nyckel (t.ex. per projektrot: läge `auto|show|hide` och valfri sökväg) måste läggas till och saneras där. Projektroten är realpath från `openRoot`, samma värde som `openProjects` redan lagrar. Läs–skriv-loppet (TD14) bör serialiseras om en inställningsvy skriver samtidigt som `App.jsx` sparar flikar.
4. **Läsa dokumenten** (US-0602): `project:file` läser valfri rotrelativ fil via `resolveInRoot`, så `docs/FEATURES.md`, `FEATURES.md` i roten och länkade epic-filer går att läsa utan ny kanal. En användarangiven sökväg måste vara rotrelativ; absoluta sökvägar och `..` avvisas. Det finns ingen kanal för att lista `docs/features/` eller fråga om en fil finns; i dag tolkas ett läsfel (`ENOENT`) som "saknas". Epic-filer kan hittas via länkarna i översiktstabellen; relativa länkar (`features/epic-…md`) måste lösas mot översiktsfilens mapp.
5. **Rendering** (US-0602): `FileContent` (`ArtifactReader.jsx:24-34`) är exporterad och ger samma Markdown som artefaktläsaren (GFM, ingen rå HTML). Länkar blir icke-klickbara `<span>`, så navigering mellan översikt, epic och story måste byggas i vyn. GFM-uppgiftslistor renderas som inaktiverade checkboxar enligt biblioteksstandard (inte verifierat i appen). `FileView` med "Visa i Finder"/"Öppna i editor" är inte exporterad; `shell:openInEditor` tillåter redan `.md`.
6. **Tolkning av formatet** (US-0602): ingen parser finns. En ren parser i `src/main/parsers/` (samma mönster som de andra, testbar i Node) med reserv till rå Markdown passar AC "never crashes and never shows a blank view".
7. **Live** (US-0602): bevakarna täcker bara intents-mappen och ledgern (`ipc.js:64-82`) respektive roten fram till `aidlc/spaces/` (`ipc.js:43-61`). Ändringar under `docs/` ger ingen händelse. En ny bevakare per projekt behövs, med stängning i `closeWatcher` (`ipc.js:34-40`), och en ny push-kanal eller ett nytt fält, i både `ipc.js` och `preload/index.js`.
8. **Uppsättningsvalet** (US-0601): `buildSetupCommand` (`setup.js:72-84`) bygger bara skalkommandon för shell-fliken, medan förfrågan till Claude ska skrivas i claude-fliken *efter* uppsättningen. Den naturliga platsen är `SetupDone` (`ProjectView.jsx:65-81`), som redan skriver i claude efter `terminal.restart('claude')`. Valet ligger i `SetupAidlc`:s lokala tillstånd och försvinner när komponenten avmonteras (`ProjectView.jsx:100`), så det måste lyftas till `ProjectContent`. Om `docs/FEATURES.md` redan finns kan `getSetupInfo` svara på det med `exists` (huvudprocessen), eftersom dialogen ska visa "Feature-beskrivningar finns redan".
9. **Tester**: `settings.js`, `ipc.js`, `ProjectView.jsx` och `ArtifactReader.jsx` saknar tester; `setup.test.js` och `SetupAidlc.test.jsx` finns och kan utökas.
