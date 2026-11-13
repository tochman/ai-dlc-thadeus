# Kodgenereringsplan — EPIC-03 Audit Timeline

Underlag:
- `inception/requirements-analysis/requirements.md` (FR1–FR3, NFR1–NFR3)
- kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/` (fokuserad skanning av `Timeline.jsx`, `parsers/audit.js` och `useProject.js`)

Express, Minimal, inga enheter. Ett nytt beroende: `@tanstack/react-virtual` (Q1: A).

## Steg

- [x] **Steg 1 — Beroende** (FR1.2)
  - Kör `npm install @tanstack/react-virtual@3.14.24 --save-exact`. Den versionen publicerades 2026-10-29 och är alltså minst två veckor gammal.
  - Kontrollera att `package.json` och `package-lock.json` får exakt den versionen och att inget annat ändras.

- [x] **Steg 2 — Stabil nyckel och korrekt kronologi i parsern** (FR2.1, FR3.1, FR3.2)
  - `src/main/parsers/audit.js`:
    - `parseAudit(text, source)` ger varje behållet block `index` (0, 1, 2 … i filens ordning bland de behållna blocken) och `key: \`${source}#${index}\``.
    - `mergeAudits(files)` sorterar på `timeMs`, som är `Date.parse(timestamp)`. En händelse utan giltig tidsstämpel ärver föregångarens `timeMs` i samma fil, eller `-Infinity` om den är först i filen. Lika `timeMs` avgörs av `source` och sedan `index`. `seq` sätts som förut efter sorteringen och behålls för bakåtkompatibilitet.
    - `timeMs` exporteras inte till renderaren som egen logik. Fältet följer bara med händelsen.
  - Inga andra filer använder `seq` utöver `Timeline.jsx`. Det är kontrollerat med grep.

- [x] **Steg 3 — Tester för parsern** (FR2.1, FR3.1, FR3.2)
  - `tests/main/parsers.test.js` får tre nya fall:
    - nycklarna blir `a.md#0`, `a.md#1` och är unika mellan filer
    - blandade tidszoner (`2026-11-13T10:00:00Z` och `2026-11-13T10:30:00+01:00`) sorteras kronologiskt
    - en händelse utan tidsstämpel hamnar direkt efter sin föregångare i samma fil, inte först
  - Kör `npx vitest run tests/main/parsers.test.js`.

- [x] **Steg 4 — Nya händelser bestäms av nycklar** (FR2.2, FR2.5)
  - `src/renderer/useProject.js`: ersätt `newSeqFrom` med `newKeys`, ett `Set` eller `null`.
    - Vid en liveuppdatering av samma intent är `newKeys` mängden av nycklar i `next.events` som saknas i `prev.events`.
    - Timern ligger i en `useRef`. Den rensas när en ny markering startar, och då slås nya nycklar ihop med de som fortfarande är markerade. Den rensas också vid avmontering och vid byte av intent.
    - Exportera `newKeys` i stället för `newSeqFrom`.
  - `src/renderer/ProjectView.jsx` och `src/renderer/IntentDetail.jsx` skickar `newKeys` vidare till `Timeline`.

- [x] **Steg 5 — Virtualiserad tidslinje** (FR1.1–FR1.7, FR2.3, FR2.4, NFR2)
  - `src/renderer/Timeline.jsx`:
    - **Inget tak:** ta bort `MAX_ROWS` och `ponytail:`-kommentaren.
    - **Memoisering:** `visible` (filtrerad, nyast först) beräknas med `useMemo([events, showNoise, type, stage])`.
    - **Virtualisering:** en scrollbar behållare (`data-testid="timeline-scroll"`) använder `useVirtualizer` med `estimateSize` på cirka 34 px, `overscan: 10`, `getItemKey: (i) => visible[i].key` och `measureElement`, så att varierande höjd mäts.
    - **Rader:** varje rad är absolut positionerad via `transform`.
    - **Utfällda rader:** vilka rader som är utfällda lyfts till `Timeline` som ett `Set` av nycklar. Raderna avmonteras när de scrollas ur bild, och tillståndet ska ändå finnas kvar. Höjden mäts om när en rad fälls ut.
    - **Knappen "Till senaste"** (`timeline-jump-newest`) gör `scrollToIndex(0)`.
    - **"Till stage-start"** (`timeline-jump-stage`) är en select med stages. Ett val scrollar till den äldsta synliga händelsen för vald stage.
    - **Scrollankring:**
      - Om användaren är vid toppen (nyaste änden, `scrollTop < 40`) när nya händelser kommer, stannar listan vid toppen.
      - Annars räknas antalet nya rader som hamnar ovanför den första synliga raden. Scrollen justeras med deras uppmätta eller uppskattade höjd, så att samma händelse ligger kvar i bild.
    - **Markering av nytt:** `isNew = newKeys?.has(e.key)`. Raden får klassen `is-new` och en visuell etikett "ny" (`aria-label` innehåller "ny"), så att markeringen inte bara syns som färg.
    - **Räknare:** när nya nycklar finns som inte syns i det renderade fönstret visas knappen "N nya händelser" (`timeline-new-counter`). Ett klick scrollar till den första nya händelsen. Räknaren försvinner när alla nya har varit synliga eller när markeringen har löpt ut.
    - **Tangentbord:**
      - Listan har `role="list"`, och varje rad har `role="listitem"` med `aria-setsize` och `aria-posinset`.
      - Pil upp och ned flyttar fokus mellan radknapparna, med `scrollToIndex` och fokus efter rendering.
      - Enter eller mellanslag fäller ut raden (redan via knappen).
      - Home och End går till första och sista raden.
    - **Antal:** texten "X av Y händelser" visas som förut.
  - `src/renderer/theme.css`:
    - höjd för scrollbehållaren (`flex: 1` med `min-height: 0` i detaljvyn, eller `max-height: calc(100vh - …)`)
    - stil för räknaren och etiketten "ny"
    - de befintliga variablerna används

- [x] **Steg 6 — Renderartester för tidslinjen** (FR1.1, FR1.2, FR2.3, FR2.4)
  - Nytt test `tests/renderer/Timeline.test.jsx`. jsdom saknar layout, så måtten stubbas: `HTMLElement.prototype.getBoundingClientRect`, `offsetHeight` och `clientHeight` för scrollbehållaren, cirka 600 px. Alternativt används `initialRect`.
  - Fyra fall:
    - **Inget tak:** 3 000 händelser ger "3000 av 3000 händelser", och bara ett fönster renderas (färre än 100 `timeline-event`).
    - **Markering:** en ny händelse med äldre tidsstämpel, alltså en nyckel som inte fanns förut, markeras. Ingen annan rad får `is-new`.
    - **Räknaren:** syns när de nya händelserna ligger utanför fönstret.
    - **Utfällning:** en utfälld rad förblir utfälld efter att `events` har uppdaterats.
  - Kör testet och sedan hela sviten `npx vitest run tests/`.

- [x] **Steg 7 — Bygge och dokument**
  - `npx electron-vite build` ska gå igenom.
  - `docs/features/epic-03-audit-timeline.md`: US-0301 och US-0302 får status 🚧 Built, not released, byggda kriterier bockas av, och valet av `@tanstack/react-virtual` (Q1) antecknas.
  - `docs/FEATURES.md`: raden för EPIC-03 uppdateras.

## Spårbarhet

| Krav | Steg |
|------|------|
| FR1.1–FR1.7 | 1, 5, 6 |
| FR2.1 | 2, 3 |
| FR2.2, FR2.5 | 4 |
| FR2.3, FR2.4 | 5, 6 |
| FR3.1, FR3.2 | 2, 3 |
| NFR1 | 5 (mäts i Build and Test) |
| NFR2 | 5 |
| NFR3 | 3, 6 |
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
