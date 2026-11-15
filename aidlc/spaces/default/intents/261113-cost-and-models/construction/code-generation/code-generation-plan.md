# Kodgenereringsplan — EPIC-02 Kostnad och modeller

## Summary

- Builds: uppskattad kostnad per intent, stage, agent och modell från AI-DLC:s `usage-ledger.json`, en kostnadspanel för projektet, konfigurerad och faktisk modell per agent, och livekostnad
- Touches: `src/main/parsers/ledger.js`, `src/main/models.js`, `src/main/projectService.js`, `src/main/watcher.js`, `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/` (useProject, IntentList, CostPanel, CostTab, IntentDetail, Pipeline, format, theme.css), `tests/`, `docs/features/epic-02-cost-and-models.md`, `docs/FEATURES.md`
- Tests: ca 12 nya Vitest-tester: ledger-tolkning, modellkällor, bevakning av ledgern och vyerna för kostnad och sortering

## Underlag

- Krav: `aidlc/spaces/default/intents/261113-cost-and-models/inception/requirements-analysis/requirements.md`, med FR1–FR6 och NFR1–NFR3.
- Kodbas: `aidlc/spaces/default/codekb/aidlc-dash/`:
  - `architecture.md`: huvudprocessen äger fil- och processåtkomst, och renderaren använder `window.bridge`
  - `api-documentation.md`: IPC-kanalerna
  - `code-structure.md`
- Ledgerformat (verifierat i a reference project):
  - `workflows` har nycklarna `intent:<uuid>` och `record:<space>/legacy`.
  - Varje nod har `totals`, `byStage`, `byModel` och `byAgent`, med `tokens` och `usd`.
  - `byStage[stage]` har egna `byModel` och `byAgent`.

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

Lagret "Data model / database" gäller inte här, eftersom appen inte har någon databas. Datamodellen är ledgerformatet, som tolkas i steg 3.

## Steg

- [ ] **Steg 1 — Verifiera testkörare och fixture** (NFR2)
  - Kör `npx vitest run tests/` för att få baslinjen (26 gröna).
  - Skapa `tests/fixtures/ledger/usage-ledger.json`, en liten syntetisk ledger med samma form som den riktiga (`schemaVersion: 3`). Den ska innehålla:
    - `workflows` med två `intent:<uuid>` som matchar fixture-intents i `tests/fixtures/project/.../intents.json`
    - en `record:default/legacy`
    - `byStage`, `byModel` och `byAgent`
    - en modell med tokens men `usd: 0`
  - Inga riktiga belopp eller transkriptsökvägar ska förekomma.

- [ ] **Steg 2 — Läsa ledgern och modellkällor (repository-lager)** (FR1.1, FR1.5, FR4.1, FR4.2, NFR2, NFR3)
  - `src/main/projectService.js`: `loadCost(root)` läser `aidlc/.aidlc-sessions/usage-ledger.json` via `readJsonSafe`, som är rotbegränsad. Den returnerar `{ available:false, reason }` om filen saknas eller är trasig, och returnerar senast giltiga resultat vid parsningsfel (FR5.3).
  - `src/main/models.js`, `getConfiguredModels(root, { exec })`:
    - Kör `execFile('aidlc', ['config','models','--show','--json','--harness','claude'], { cwd: root, timeout: 10000, env })`, med fasta argument och utan skal.
    - `env.PATH` är inloggningsskalets PATH. Den läses en gång via `execFile($SHELL, ['-l','-i','-c','printf %s "$PATH"'])`, en fast sträng utan indata, och cachas.
    - Vid fel, timeout eller ogiltig JSON läses `model:` ur `.claude/agents/aidlc-*-agent.md` via `projectAccess` (frontmatter-parser).
    - Funktionen returnerar `{ source: 'aidlc-config' | 'agent-files' | 'none', agents: [{ agent, model, effort }] }`.
    - Resultatet cachas per projekt-id. `exec` kan injiceras för test.

- [ ] **Steg 3 — Ledger-logik (affärslogik)** (FR1.2–FR1.4, FR2.1–FR2.4, FR3.1–FR3.4, FR4.3–FR4.5, FR6.2)
  - `src/main/parsers/ledger.js`:
    - `costOf(node)` ger `{ usd, tokens: { input, output, cacheWrite, cacheRead }, missingPrice }`, där `missingPrice` är sant när tokens > 0 och usd = 0.
    - `summarizeLedger(ledger, intents)` ger:
      - `project`: total, `byModel`, `byAgent`, `legacy` och `complete:false` om någon modell saknar pris
      - `perIntent[dirName]`: total, `byStage`, `byAgent`, `byModel` och `stageModels[stage]`
      - `byScope[scope]`: total, antal och snitt
      - `timeline[]`: per intent, sorterad på datumprefix

      Koppling sker via `intent:<uuid>` ↔ `uuid` i `intents.json`. En intent utan post ger `null` (FR1.4).
    - `compareModels(configured, perIntentOrProject)` markerar agenter vars faktiska modell skiljer sig från den konfigurerade. `inherit` jämförs mot huvudsessionens modell, alltså agenten `main` (FR4.3–FR4.5).
  - Inga priser räknas fram. Bara `usd` från ledgern används (FR2.4).

- [ ] **Steg 4 — Tester för ledger och modeller**
  - `tests/main/ledger.test.js`:
    1. En intent kopplas via uuid och får rätt total och tokens. En intent utan post får `null`.
    2. Legacy-raden finns och ingår i projektets total.
    3. `missingPrice` markeras och projektet blir `complete:false`.
    4. `byScope` ger rätt snitt, och `timeline` sorteras på datum.
    5. `compareModels` markerar en avvikelse och tolkar `inherit` som sessionens modell.
  - `tests/main/models.test.js`:
    1. Giltig JSON från en injicerad `exec` ger `source: 'aidlc-config'`.
    2. Om `exec` kastar eller timeout inträffar läses agentfilerna i en fixture, och resultatet blir `source: 'agent-files'`.
  - Kör `npx vitest run tests/main/ledger.test.js tests/main/models.test.js`.

- [ ] **Steg 5 — IPC och bevakning (API-lager)** (FR5.1, FR4.1)
  - `src/main/watcher.js` bevakar även `aidlc/.aidlc-sessions/usage-ledger.json`. En ändring där ger `{ costChanged: true }` i samma debouncade `project:changed`-händelse.
  - `src/main/ipc.js` får två nya kanaler: `project:cost` (`loadCost` plus `summarizeLedger` med projektets intents) och `project:models` (`getConfiguredModels`). Projekt-id valideras som för befintliga kanaler.
  - `src/preload/index.js` får `getCost` och `getModels` som namngivna funktioner.

- [ ] **Steg 6 — Test för bevakning av ledgern**
  - Utöka `tests/main/watcher.test.js` så att en skrivning till en ledger-fil i den temporära katalogen ger ett `changed`-anrop med `costChanged: true`.
  - Kör `npx vitest run tests/main/watcher.test.js`.

- [ ] **Steg 7 — Gränssnitt (frontend)** (FR1.2–FR1.6, FR2.1–FR2.3, FR3.1–FR3.4, FR4.6, FR5.2, FR6.1–FR6.3)
  - `src/renderer/format.js` får `formatUsd(n)` (2 decimaler), `formatTokens(n)` och konstanten `COST_LABEL = 'Uppskattad kostnad (API-pris)'`, med en förklarande text.
  - `src/renderer/useProject.js` hämtar kostnad och modeller vid start och laddar om kostnaden när `costChanged` kommer.
  - `IntentList.jsx`:
    - kostnadskolumn med "–" och tooltip när posten saknas
    - sorteringsval för datum (standard), kostnad och namn
    - löpande kostnad bredvid live-indikatorn
  - `CostPanel.jsx` är en ny hopfällbar panel överst i intent-listan. Den visar:
    - total med `COST_LABEL` och en info-tooltip
    - fördelning per modell och per agent, där "pris saknas" markeras och totalen märks som ofullständig
    - per scope (total och snitt)
    - raden "Äldre körningar (utan intent-id)"
    - ett stapeldiagram över tid i ren SVG
    - modeller per agent (konfigurerad och faktisk, källan angiven och avvikelser markerade)
  - `CostTab.jsx` är en ny flik "Kostnad" i `IntentDetail.jsx`. Den visar tabeller per stage, agent och modell med USD, andel och tokens, där största posten framhävs. Den visar också deltagande agenters modeller.
  - `Pipeline.jsx` visar kostnad och modell per stage bredvid varaktigheten, när ledgern har dem.
  - `theme.css` får stilar i befintligt tema och `data-testid` på nya interaktiva element.
  - Saknas ledgern visar panelen och fliken en kort förklaring, och resten av vyn påverkas inte (FR1.5).

- [ ] **Steg 8 — Tester för gränssnittet**
  - `tests/renderer/IntentList.test.jsx`: utöka med sortering på kostnad och visning av "–" för en intent utan kostnad.
  - `tests/renderer/CostPanel.test.jsx`: panelen visar "Uppskattad kostnad (API-pris)", "pris saknas" för en modell utan pris och legacy-raden.
  - Kör `npx vitest run tests/renderer/IntentList.test.jsx tests/renderer/CostPanel.test.jsx`.

- [ ] **Steg 9 — Prestanda och bygge** (NFR1)
  - Mät tiden för `summarizeLedger` mot a reference project's riktiga ledger med ett tillfälligt Node-kommando som inte sparas. Målet är under 300 ms, och värdet noteras i code-summary.
  - Kör hela sviten med `npx vitest run tests/` och `npx electron-vite build`.

- [ ] **Steg 10 — Dokumentation**
  - `docs/features/epic-02-cost-and-models.md`:
    - rätta nyckelformatet till `intent:<uuid>` och `record:<space>/legacy`
    - status 🚧 för US-0201, US-0202, US-0204 och US-0205
    - US-0203 utan CSV, som markeras som uppskjuten (Q2)
    - bocka av byggda acceptanskriterier
  - `docs/FEATURES.md`: status för EPIC-02.

- [x] **Steg 11 — Rättelse F-01: ledger som skapas efter start** (FR5.1, Loop-back 1 från Build and Test, valt av användaren som "Retry with fix")
  - `src/main/watcher.js`: bevaka inte `usage-ledger.json` som exakt sökväg, eftersom chokidar v4 inte märker en fil eller mapp som saknas när bevakningen startar. Bevaka i stället mappen `aidlc/`, alltså ledgerns farförälder, med `depth: 1` (eller en `ignored`-funktion som bara släpper igenom `.aidlc-sessions/` och ledgern) och sätt `costChanged` när en händelse gäller just ledgerns sökväg. Bevakningen av intents ska vara oförändrad.
  - `tests/main/watcher.test.js`: nytt test där bevakningen startas utan `.aidlc-sessions/`, och mappen och ledgern sedan skapas. Testet förväntar exakt ett `changed` med `costChanged: true` efter debounce.
  - Kör `npx vitest run tests/main/watcher.test.js` och hela sviten `npx vitest run tests/`.

## Spårbarhet

| Steg | Krav |
|------|------|
| 2–4 | FR1.1–FR1.5, FR2.4, FR3.1–FR3.4, FR4.1–FR4.5, FR6.2, NFR2, NFR3 |
| 5–6 | FR4.1, FR5.1, FR5.3 |
| 7–8 | FR1.2–FR1.6, FR2.1–FR2.3, FR3.1–FR3.4, FR4.6, FR5.2, FR6.1–FR6.3 |
| 9 | NFR1 |
| 10 | Feature-dokumentet ska uppdateras |
