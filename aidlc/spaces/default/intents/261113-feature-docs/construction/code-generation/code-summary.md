# Kodsammanfattning — EPIC-06 Feature Docs

Underlag: `requirements.md` för den här intenten och kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/`.

## Nya filer

- **`src/main/parsers/features.js`:** `parseOverview`, `parseEpic`, `storyIdsIn`, `statusOf` och `isValidFeaturesPath`. Rena funktioner som aldrig kastar fel.
- **`src/main/features.js`:** `loadFeatures`, `loadStoryLinks` och `featureWatchPaths`. All läsning går via `projectAccess`.
- **Renderaren:**
  - `src/renderer/FeaturesView.jsx` och `useFeatures.js`
  - `ProjectSettingsDialog.jsx` (`<dialog>` med `showModal`)
  - `featureDocsPrompt.js`
- **Testdata:** `tests/fixtures/features/`, med en översikt och två epic-filer, varav en avvikande.
- **Tester:**
  - `tests/main/features.test.js` (4)
  - `tests/main/settings.test.js` (2)
  - `tests/renderer/FeaturesView.test.jsx` (3)
  - `tests/renderer/ProjectSettingsDialog.test.jsx` (2)

## Ändrade filer

- **`src/main/watcher.js`:** `watchFiles`. Bevakar roten med ett filter, så att `docs/` också syns när mappen skapas efter start.
- **`src/main/settings.js`:** `projectSettings`, en skrivkö, `getProjectSettings` och `setProjectSettings`.
- **`src/main/ipc.js`:**
  - kanalerna `features:load`, `features:storyLinks`, `projectSettings:get` och `projectSettings:set`
  - push-kanalen `features:changed`
  - bevakning per projekt, som stängs vid `project:close`
- **`src/preload/index.js`:** fem nya anrop.
- **Renderaren:**
  - `ProjectView.jsx`: växeln, dialogen och knappen i `SetupDone`
  - `App.jsx`: kugghjulet
  - `IntentDetail.jsx`: länkar till storys
  - `SetupAidlc.jsx`: valet för feature-dokument
  - `theme.css`
- **Tester:** `tests/main/watcher.test.js` (+1) och `tests/renderer/SetupAidlc.test.jsx` (+1).
- **Dokument:** `docs/features/epic-06-feature-docs.md` och `docs/FEATURES.md`.

## Viktiga beslut

- **Dialogens plats:** dialogen renderas i `ProjectView`, där terminalen finns. `App.jsx` håller bara reda på vilken flik som har den öppen.
- **Inställningar:** `setProjectSettings` avvisar ogiltiga värden med ett fel. Vid läsning ersätts ogiltiga värden med standard.
- **Inställningarna skyddas:** `setSettings` ändrar aldrig `projectSettings`, så de finns kvar när flikarna sparas.
- **Uppdatering:** `features:changed` skickas också när inställningarna sparas, så vyn laddar om båda.
- **Intents-vyn:** den döljs bara medan Features visas, så den behåller sitt läge.

## Testtäckning

- 81/81 tester gröna, varav 13 nya. Bygget går igenom.
- Projektets riktiga dokument (EPIC-01 till EPIC-06) tolkas utan varningar på 8 ms (NFR1).

## Inte verifierat i det här steget

- Features-vyn, liveuppdateringen och dialogen i riktig Electron.
- Knappen "Skapa feature-beskrivningar" medan Claude startas om.

## Begränsningar (medvetna)

- Story-länkarna laddas om bara när intent-indexet ändras.
- Länkarna kommer bara från det aktiva spacet.
- "Klara storys" räknar bara ✅.
