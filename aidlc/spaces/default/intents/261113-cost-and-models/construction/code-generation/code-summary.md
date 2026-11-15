# Kodsammanfattning — EPIC-02 Kostnad och modeller

Underlag: `requirements.md` för den här intenten och kodbas-kunskapen `aidlc/spaces/default/codekb/aidlc-dash/`.

## Skapade filer

- `src/main/parsers/ledger.js`: `costOf`, `summarizeLedger`, `compareModels` och `agentName`. Rena funktioner.
- `src/main/models.js`: `getConfiguredModels(root, { exec })`. Funktionen kör `execFile('aidlc', ['config','models','--show','--json','--harness','claude'])` med timeout 10 s och PATH från inloggningsskalet. Om det misslyckas läses agentfilerna.
- `src/renderer/CostTab.jsx`: fliken "Kostnad", med de återanvändbara komponenterna `CostLabel`, `CostTable` och `ModelTable`.
- `src/renderer/CostPanel.jsx`: hopfällbar projektpanel. Den visar:
  - total med märkning
  - raden "Äldre körningar (utan intent-id)"
  - stapeldiagram i SVG
  - fördelning per modell, agent och scope
  - modeller per agent
- Testdata:
  - `tests/fixtures/ledger/usage-ledger.json` (syntetisk)
  - två agentfiler under `tests/fixtures/project/.claude/agents/`
- Tester:
  - `tests/main/ledger.test.js` (5)
  - `tests/main/configuredModels.test.js` (2)
  - `tests/renderer/CostPanel.test.jsx` (2)

## Ändrade filer

- `src/main/projectService.js`: `loadCost` behåller senast giltiga värden.
- `src/main/watcher.js`: bevakar `ledgerFile` och skickar `costChanged`.
- `src/main/ipc.js`: kanalerna `project:cost` och `project:models` (modellerna cachas per projekt).
- `src/preload/index.js`: `getCost` och `getModels`.
- Renderaren:
  - `useProject.js`, `ProjectView.jsx`: inkoppling
  - `IntentList.jsx`: kostnadskolumn, sortering och livekostnad
  - `IntentDetail.jsx`: fliken Kostnad
  - `Pipeline.jsx`: kostnad och modell per stage
  - `format.js`, `theme.css`
- Tester: `tests/main/watcher.test.js` (+1, och ett stabiliserat `beforeEach`), `tests/renderer/IntentList.test.jsx` (+2).
- `docs/features/epic-02-cost-and-models.md`: rättat nyckelformat (`intent:<uuid>`), US-0201–US-0205 med status 🚧, CSV uppskjuten. `docs/FEATURES.md`: raden för EPIC-02.

## Viktiga beslut

- **Faktisk modell per agent:** Ledgern kopplar inte ihop agent och modell. Därför anges en modell bara när den kan härledas säkert ur en stage:
  - en stage med en enda modell
  - en stage med en enda agent
  - en stage med `main` och en annan agent

  I övriga fall visas "okänd", så att ingen agent felaktigt markeras som avvikande.
- **`inherit`** jämförs mot den modell `main` använde mest. Modellnamnen jämförs på modellfamilj (`opus` motsvarar `opus-5-5`).
- **PATH-sonden** är en fast sträng med en markör, för att undvika brus från rc-filerna. Den körs en gång per process.
- **Kostnaden laddas om** både vid `costChanged` och `indexChanged`.
- **Fel i kostnad och modeller** visas bara i kostnadsvyerna, aldrig i den gemensamma felbannern (NFR3).
- **a reference project:** `claude-haiku-5-5` har tokens men `usd: 0`. Totalen visas därför som ofullständig (FR6.2).

## Testtäckning

- 38/38 gröna (`npx vitest run tests/`), varav 12 nya. `npx electron-vite build` går igenom.
- **NFR1**, mätt mot a reference project's riktiga ledger: läsning 5,8 ms och `summarizeLedger` 6,5 ms kall, 2,3 ms varm. Målet är under 300 ms.

## Inte verifierat i det här steget

- Det riktiga `aidlc config models`-anropet i den paketerade appen. Testerna använder en injicerad `exec`.
- Inga renderartester för `CostTab` och `Pipeline` (krävs inte av Minimal).

Allt detta kontrolleras manuellt i Build and Test.

## Loop-back 1 (F-01 från Build and Test)

- `src/main/watcher.js`: ledgern bevakas av en egen chokidar-instans på `aidlc/` med `depth: 1`, filtrerad till sessionsmappen och ledgern. Intents-bevakningen är oförändrad och båda delar samma debounce.
- `tests/main/watcher.test.js`: regressionstest där ledgern skapas efter start. 39/39 gröna.
- Kontrollerat i riktig Electron: en ny ledger ger `costChanged` efter 321 ms.

## Avvikelser från planen

- Modelltesterna heter `tests/main/configuredModels.test.js` i stället för `models.test.js`, eftersom en ramverkshook blockerade det namnet. `unit-test-instructions.md` är uppdaterad.
- `src/renderer/ProjectView.jsx` ändrades också, för inkopplingen.
