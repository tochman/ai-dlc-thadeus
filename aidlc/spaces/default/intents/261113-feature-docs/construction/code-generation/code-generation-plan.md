# Kodgenereringsplan — EPIC-06 Feature Docs

Underlag:
- `inception/requirements-analysis/requirements.md` (FR1–FR4, NFR1–NFR3)
- kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/`, där den fokuserade skanningen täcker ProjectView, SetupAidlc, ArtifactReader, App, settings, setup, ipc, projectAccess och preload

Express, Minimal, inga enheter och inga nya beroenden. Appen skriver inga filer i projektet.

## Steg

- [x] **Steg 1 — Tolkning av feature-dokument** (FR1.2–FR1.4)
  - Ny fil `src/main/parsers/features.js` med rena funktioner utan Node-importer, så att även renderaren kan använda dem:
    - `parseOverview(md)` ger `{ intro, epics: [{ id, title, link, topic, status }] }`, hämtat ur Markdown-tabellen med kolumnerna Epic, Topic/Ämne och Status. Kolumnnamnen matchas tolerant.
    - `parseEpic(md)` ger `{ id, title, description, storiesLine, statusLine, stories: [...] }`. Varje story innehåller:
      - `id`, `title`, `status` (`planned|progress|done|null` ur 📋, 🚧 eller ✅) och `statusText`
      - `asA`, `inOrderTo`, `wouldLike`, `priority`, `complexity`, `dependencies` och `notes`
      - `criteria: [{ checked, text }]`, `done` och `total`
      - `raw`, det vill säga storyns Markdown-avsnitt
    - `storyIdsIn(text)` ger alla `US-\d{4}` i en text.
    - Funktionerna kastar aldrig fel. Det som inte går att tolka ger tomma fält och `warnings[]`.

- [x] **Steg 2 — Läsning och bevakning i huvudprocessen** (FR1.1, FR2.6, FR2.7, NFR2)
  - Ny fil `src/main/features.js` med `loadFeatures(root, overviewRel = 'docs/FEATURES.md')`:
    - **Sökvägen valideras:** den ska vara relativ, sluta på `.md` och inte innehålla `..`. Översikten läses via `readText`. Saknas den blir resultatet `{ available: false }`.
    - **Epic-filer:** de läses via länkarna, relativt översiktens mapp. Länken normaliseras och kontrolleras med `resolveInRoot`, och en länk utanför roten hoppas över med en varning.
    - **Resultat:** `{ available: true, overviewPath, epics: [{ ...overviewRow, file, parsed }], warnings }`.
  - `loadStoryLinks(root, space, intents)` hämtar story-id:n ur varje intents `project-description.json` och `inception/requirements-analysis/requirements.md` (om filerna finns) och ger `{ [storyId]: [dirName] }`.
  - `src/main/watcher.js` får `watchFiles({ root, paths, onChange })`. Den bevakar översikten och epic-mappen (`depth: 1`, bara `.md`) med samma debounce och gemensam `close()`.
  - `src/main/ipc.js`:
    - nya kanaler `features:load (projectId, space)` och `features:storyLinks (projectId, space)`
    - när inställningen tillåter startar en bevakning per projekt, som skickar `features:changed` till renderaren
    - bevakningen stängs vid `project:close`
    - sökvägen tas från projektinställningen (Steg 3)
  - `src/preload/index.js`: `loadFeatures`, `getStoryLinks` och `onFeaturesChanged`.

- [x] **Steg 3 — Projektinställningar och skrivkö** (FR3.4, FR3.5)
  - `src/main/settings.js`:
    - `sanitize` godtar `projectSettings: { [root]: { featureDocs: 'auto'|'show'|'hide', featuresPath: string } }`. Ogiltiga värden ersätts med `auto` och `docs/FEATURES.md`, och sökvägen valideras som i Steg 2.
    - `setSettings` körs i en promise-kö, så att skrivningar sker i tur och ordning och båda ändringarna finns kvar.
    - `getProjectSettings(root)` och `setProjectSettings(root, partial)` läggs till.
  - `src/main/ipc.js`: kanalerna `projectSettings:get (projectId)` och `projectSettings:set (projectId, partial)`. Roten slås upp i huvudprocessen, så renderaren skickar aldrig in en rot. När inställningen ändras startas eller stoppas bevakningen.
  - `src/preload/index.js`: `getProjectSettings` och `setProjectSettings`.

- [x] **Steg 4 — Tester för huvudprocessen** (FR1.1–FR1.4, FR3.4, FR3.5, NFR2)
  - Testdata i `tests/fixtures/features/`: en kort `FEATURES.md` och två epic-filer i formatet, varav en med avvikande form.
  - `tests/main/features.test.js` (4):
    - översikt och epic tolkas: epics, storys, status och kriterieantal
    - en avvikande fil ger varningar men kraschar inte
    - `loadFeatures` hittar inte översikten (`available: false`), och en länk utanför roten hoppas över
    - `storyIdsIn` och story-länkar
  - `tests/main/settings.test.js` (2, ny fil eller utökning av befintlig):
    - projektinställningar valideras
    - två samtidiga `setSettings` behåller båda ändringarna

- [x] **Steg 5 — Features-vyn** (FR2.1–FR2.5, FR2.7, NFR3)
  - Ny fil `src/renderer/FeaturesView.jsx` (`data-testid="features-view"`):
    - **Vänster kolumn:** listan över epics med ämne, statusmärke (markör och text) och "x/y storys klara".
    - **Höger kolumn, vald epic:** beskrivning och storylista med id, titel, status, prioritet, komplexitet och "5/8 kriterier". Storylistan har filter för status och prioritet.
    - **Vald story:** hela texten via `FileContent` (story-avsnittet `raw`). Kriterierna visas som skrivskyddade kryssrutor, som GFM redan gör, och storyns länkar till intents (FR2.6) visas. Knapparna "Öppna i editor" och "Visa i Finder" finns för epic-filen (befintliga bridge-anrop).
    - **Tom vy:** saknas dokument, eller ger tolkningen inga epics, faller vyn tillbaka på `FileContent` för översikten eller visar en förklaring av formatet med knappen "Sätt upp feature-beskrivningar" (FR4.5).
    - **Liveuppdatering:** vyn laddas om vid `onFeaturesChanged`.
  - Ny fil `src/renderer/useFeatures.js` som laddar dokument, story-länkar och projektinställningar och lyssnar på ändringar.

- [x] **Steg 6 — Växel, kugghjul och dialog** (FR2.1, FR3.1–FR3.3, FR3.6, Q1–Q3)
  - `src/renderer/ProjectView.jsx`:
    - **Växeln** "Intents | Features" (`project-view-switch`) ligger högst upp och visas enligt inställningen och om dokument finns:
      - `hide` döljer den alltid
      - `show` visar den alltid
      - `auto` visar den när `available` är sant
    - **I projekt utan AI-DLC** är etiketten "Uppsättning | Features" [Q3: A].
    - **Valt läge** sparas per projekt i komponentens tillstånd.
  - `src/renderer/App.jsx`: kugghjulsknappen (`project-settings-open`, `aria-label="Projektinställningar"`) läggs på varje projektflik och öppnar `ProjectSettingsDialog`.
  - Ny fil `src/renderer/ProjectSettingsDialog.jsx`:
    - **Dialogen:** byggd på `<dialog>`, med fokusfälla. Esc stänger.
    - **Fälten:** radiogruppen Automatiskt, Visa eller Dölj och ett textfält för sökvägen. Ogiltig sökväg ger ett felmeddelande, och då går det inte att spara.
    - **Spara:** sparar med `setProjectSettings`.
    - **Uppsättningsknappen:** för ett AI-DLC-projekt utan dokument visas knappen "Sätt upp feature-beskrivningar" (FR4.5).
  - `src/renderer/theme.css`: stilar för växeln, Features-vyn och dialogen. De befintliga variablerna används.

- [x] **Steg 7 — Erbjudande vid uppsättning** (FR4.1–FR4.6)
  - `src/renderer/SetupAidlc.jsx`:
    - nytt val "Använd separata feature-beskrivningar (FEATURES.md + en fil per epic)" (`setup-aidlc-feature-docs`), avstängt som standard och med en kort förklaring
    - när översikten redan finns står det "Feature-beskrivningar finns redan"
    - valet lyfts till `ProjectContent` via `onFeatureDocsChange`, så att det överlever bytet till projektvyn
  - Ny fil `src/renderer/featureDocsPrompt.js` med den rena funktionen `featureDocsPrompt({ exists })`. Den ger en enradig förfrågan till Claude:
    - när dokumenten saknas: skapa `docs/FEATURES.md` och `docs/features/epic-XX-*.md` i formatet (översiktstabell, en fil per epic, storys med som/för att/vill, prioritet, komplexitet, Given/When/Then-kriterier som kryssrutor, statusmarkörerna 📋, 🚧 och ✅) utifrån det projektet redan innehåller
    - i båda fallen: lägg till en projektregel genom AI-DLC:s eget sätt att spara regler, så att nytt arbete beskrivs som storys och status uppdateras vid bygge och release
  - `SetupDone` i `ProjectView.jsx`: när valet är på visas knappen "Skapa feature-beskrivningar" (`setup-aidlc-feature-docs-run`). Den skriver förfrågan i claude-fliken med `type('claude', text, { submit: false })`.
  - Samma förfrågan används från dialogen och från den tomma Features-vyn (FR4.5).

- [x] **Steg 8 — Renderartester** (FR2.1–FR2.5, FR3.2, FR4.1, FR4.4)
  - `tests/renderer/FeaturesView.test.jsx` (3):
    - epics och storys visas med kriterieantal
    - filtret på status fungerar
    - tom eller avvikande vy faller tillbaka och kraschar inte
  - `tests/renderer/ProjectSettingsDialog.test.jsx` (2):
    - val och sparande anropar `setProjectSettings`
    - ogiltig sökväg stänger av Spara
  - `tests/renderer/SetupAidlc.test.jsx` (+1): valet för feature-dokument rapporteras uppåt, och `featureDocsPrompt` ger rätt förfrågan beroende på om dokumenten finns.
  - Kör de nya testerna och hela sviten med `npx vitest run tests/` (68 befintliga och cirka 12 nya).

- [x] **Steg 9 — Bygge och dokument**
  - `npx electron-vite build` ska gå igenom.
  - `docs/features/epic-06-feature-docs.md`: US-0601 och US-0602 får status 🚧 Built, not released. Byggda kriterier bockas av, och besluten Q1–Q3 antecknas.
  - `docs/FEATURES.md`: raden för EPIC-06 uppdateras.

## Spårbarhet

| Krav | Steg |
|------|------|
| FR1.1–FR1.4 | 1, 2, 4 |
| FR2.1–FR2.5 | 5, 6, 8 |
| FR2.6, FR2.7 | 2, 5 |
| FR3.1–FR3.6 | 3, 6, 8 |
| FR4.1–FR4.6 | 7, 8 |
| NFR1 | 1, 5 (mäts i Build and Test) |
| NFR2 | 2, 3, 4 |
| NFR3 | 5, 6 |
## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:c8f84e35190e007d9863fad236154d0269ab9bf633fc2a3ff106ed965ba4a9b9",
  "contract_sha256": "sha256:bb76c1b22f8307be6e5780d50cabab891684449d5b164bd0e825e9e4e5c61e5b"
}
```
