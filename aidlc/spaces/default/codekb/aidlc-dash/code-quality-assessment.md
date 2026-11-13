# Kodkvalitet: aidlc-dash

## Snabbedömning

| Aspekt | Betyg | Kommentar |
|---|---|---|
| Namngivning | good | tydliga verb+substantiv, svenska UI-texter |
| Funktionsstorlek | good | små funktioner; största filen är `TerminalPanel.jsx` (215 rader) |
| Felhantering | good | IPC loggar och kastar vidare; trasig JSON ger senaste giltiga värde |
| Testnärvaro | fair | parsers, projectAccess, projectService, watcher och två komponenter testas; IPC, pty, settings, preload och de flesta vyer saknar tester |
| Duplicering | fair | `errorText` kopierad i 4 renderer-filer |
| Död kod | good | inga TODO/FIXME, inga avstängda linterregler |

## Tester

- Vitest 5 med projekten `main` (node, `tests/main/**/*.test.js`) och `renderer` (jsdom, `tests/renderer/**/*.test.jsx`); körs med `npm test` / `npx vitest run tests/`.
- 6 testfiler: `parsers`, `projectAccess`, `projectService`, `watcher`, `IntentList`, `Splash`. Testnamnen hänvisar till EPIC-01:s krav (`FR7.4` osv.).
- Fixturer: ett AI-DLC-fixturprojekt under `tests/fixtures/project/`, audit-shards, en trasig JSON och en vanlig mapp. Watcher-testet skriver till `tests/.tmp/` (git-ignorerad).
- Ingen coverage-konfiguration.

## Lint, formatering och CI

- Ingen ESLint- eller Prettier-konfiguration.
- CI finns bara vid versionstagg (`release.yml`): taggkontroll, `npm ci`, vitest, bygg och release. Ingen körning på PR eller push. org.md kräver CI före merge och 80 % radtäckning för `feature`/`mvp`-scopes.

## Dokumentation

README (svenska) beskriver start, bygge och säkerhetsmodell. Epics under `docs/features/`. Varje modul inleds med en kommentar om syfte. Glapp: `epic-01-bridge-console-mvp.md` säger "Byggd, ej releasad" medan `FEATURES.md` säger "Released in v0.1.0"; README nämner bara macOS-bygge trots linux-målet.

## Teknisk skuld

- `errorText` duplicerad (App.jsx, useProject.js, ArtifactReader.jsx, TerminalPanel.jsx).
- `TerminalPanel.jsx:100-108` sätter `sessionRef.current` under render.
- Medvetna förenklingar (`ponytail:`): obegränsade cacher i `projectService.js:12`; ingen virtualisering, max 1500 rader i `Timeline.jsx:6` (EPIC-03).
- `electron-builder.yml` anger `buildResources: build` men mappen saknas (ingen appikon; EPIC-04).

## Påverkan för EPIC-02 (Cost & Models)

| Story | Anslutningspunkt i dag | Gap |
|---|---|---|
| US-0201 kostnad per intent | `loadIntentList`/`summarizeIntent` (`projectService.js:55-103`), `IntentList.jsx`, `IntentDetail.jsx` | ledgern läses inte; `IntentList` saknar sortering |
| US-0202 uppdelning | `Pipeline.jsx:33-37` visar redan agent och varaktighet per stage; `IntentDetail` `TABS` | ny flik "Kostnad"; ledger-parser |
| US-0203 projektöversikt | inget projektvy-läge i dag; `BoltDag.jsx` visar handritad SVG | ny vy; CSV-export blir en andra skrivning (README och `settings.js:1-2` lovar en enda) |
| US-0204 modeller per agent | `runtimeGraph.js` har `agent` per stage | main kan inte köra icke-interaktiva kommandon (bara node-pty); `.claude/agents/*.md` kan läsas via `readText` |
| US-0205 livekostnad | `watchIntents` (`watcher.js:33`) bevakar bara `aidlc/spaces/<space>/intents` (`ipc.js:33-34`); `project:changed` bär `{dirNames, indexChanged}` | `aidlc/.aidlc-sessions/usage-ledger.json` ligger utanför; behöver bevakning och ny flagga; `readJsonSafe` ger "senaste giltiga"-mönstret |

Ledgern är git-ignorerad (AI-DLC:s `.gitignore`-block) och finns bara på maskinen som körde arbetet. Nyckelformatet `record:<space>/<dir>` är obekräftat enligt epic-filen.

## Testbaslinje

Ingen testkörning i denna skanning (endast läsning). Baslinjen tas före Code Generation.
