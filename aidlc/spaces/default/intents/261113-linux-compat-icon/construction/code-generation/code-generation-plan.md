# Kodgenereringsplan — Bugfix: Linux 22.04 och Auctum-appikon

## Summary

- Builds: Linux-bygget körs på Ubuntu 22.04 med glibc-kontroll i CI, node-pty laddas först när en terminal startas, Auctum-appikonen för macOS och Linux, version 0.1.1
- Touches: `src/main/pty.js`, `src/main/index.js`, `.github/workflows/release.yml`, `electron-builder.yml`, `scripts/check-glibc.mjs`, `scripts/make-icon.cjs`, `build/icon.svg`, `build/icon.png`, `package.json`, `tests/main/`, `docs/features/epic-04-branding-and-desktop.md`, `README.md`
- Tests: 3 nya testfiler (6 tester): regressionstest för lazy-laddningen av terminalen, test av glibc-kontrollen och test av ikonfilen. Befintliga 20 tester ska fortsätta vara gröna.

## Underlag

- Krav: `aidlc/spaces/default/intents/261113-linux-compat-icon/inception/requirements-analysis/requirements.md` (FR1–FR3, NFR1–NFR2).
- Granskarens synpunkter R-01–R-04 är godkända som risk, men åtgärdas ändå här eftersom de är billiga:
  - R-01: riktat regressionstest
  - R-02: hörnfall i lazy-laddningen
  - R-03: `GLIBCXX` och mätbar FR1.3
  - R-04: ikonmarginal, avstämning med användaren och versionshöjning
- Kodbas: `aidlc/spaces/default/codekb/aidlc-dash/` (`architecture.md`, `code-structure.md`). `src/main/ipc.js` importerar `src/main/pty.js`, som i dag importerar `node-pty` direkt när modulen laddas.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "bugfix",
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
      "Include a targeted regression for the bug or vulnerability.",
      "Keep the existing test suite green."
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
  "input_sha256": "sha256:933f32e0a09112bec79e6ad9d9b07d8fa79b601a7b325fbe1f9a283f191ae54c",
  "contract_sha256": "sha256:8b88443a8c617567a1344d4ec2a14fc8e4e0abe702a4048e68bc207a690b0910"
}
```

Lagren "Data model / database" och "Repository" berörs inte av den här rättelsen. Lagret "Frontend" behöver ingen ändring, eftersom `TerminalPanel.jsx` redan visar fel från `pty:spawn` som "Kunde inte starta <flik>: <orsak>".

## Steg

- [x] **Steg 1 — Verifiera testkörare** (NFR2)
  - Kör `npx vitest run tests/` före ändringarna och notera baslinjen (20 gröna).

- [x] **Steg 2 — Terminalmodulen laddas vid behov (API-lager)** (FR2.1–FR2.3, R-02)
  - `src/main/pty.js`: ta bort den statiska `import ... from 'node-pty'`. Lägg till `async function loadPty()` som gör `await import('node-pty')` vid första `spawnSession` och cachar modulen när det lyckas.
  - Om laddningen misslyckas cachas ingenting, så nästa terminalflik försöker igen. Felet kastas som `Error('Terminalmodulen kunde inte laddas: <orsak>')` och loggas med `console.error` i huvudprocessen.
  - `spawnSession` blir `async`. `pty:spawn` i `src/main/ipc.js` returnerar redan ett promise, så felet når renderaren och visas i terminalpanelen på svenska.
  - `killSession`, `killProjectSessions`, `killAllSessions`, `writeSession` och `resizeSession` rör bara `sessions`-mappen. De laddar aldrig modulen och kastar inte när den saknas, eftersom mappen då är tom.

- [x] **Steg 3 — Regressionstest för lazy-laddningen** (R-01, FR2)
  - `tests/main/pty.test.js` (Node, Vitest). `node-pty` mockas med `vi.doMock`:
    1. Om modulen kastar vid import ska `spawnSession` avvisas med ett fel som börjar med "Terminalmodulen kunde inte laddas", och `killAllSessions()` och `killProjectSessions('x')` ska inte kasta.
    2. Efter ett misslyckat försök görs ett nytt laddningsförsök. Med en fungerande mock andra gången lyckas `spawnSession` och returnerar ett id.
    3. Att importera `src/main/pty.js` laddar inte `node-pty`. Mockens fabrik ska inte ha anropats innan `spawnSession` körs.
  - Kör `npx vitest run tests/main/pty.test.js`.

- [x] **Steg 4 — glibc-kontroll (affärslogik för bygget)** (FR1.2, FR1.3, R-03)
  - `scripts/check-glibc.mjs` (ESM, inga nya beroenden) exporterar:
    - `findVersions(buffer)`, som ger högsta `GLIBC_x.y` och högsta `GLIBCXX_3.4.z` som förekommer i en binär
    - `checkDir(dir, { glibc: '2.35', glibcxx: '3.4.30' })`, som går igenom alla ELF-filer (magic `\x7fELF`) under katalogen och returnerar överträdelser med fil och version. Den returnerar också alla sökvägar under `node-pty/prebuilds/` som innehåller `darwin-` eller `win32-`.
  - Gränserna är Ubuntu 22.04: glibc 2.35 och libstdc++ `GLIBCXX_3.4.30`.
  - När skriptet körs från kommandoraden (`node scripts/check-glibc.mjs dist/linux-unpacked`) skriver det ut varje överträdelse och avslutar med kod 1 om det finns någon.

- [x] **Steg 5 — Test av glibc-kontrollen** (R-01, R-03)
  - `tests/main/check-glibc.test.js`:
    1. `findVersions` på en syntetisk buffer med `GLIBC_2.17`, `GLIBC_2.42` och `GLIBCXX_3.4.32` ger 2.42 och 3.4.32.
    2. `checkDir` på en temporär katalog under `tests/.tmp/` med en falsk ELF-fil (`\x7fELF` + `GLIBC_2.42`) och en fil i `node-pty/prebuilds/win32-x64/` rapporterar båda överträdelserna. En katalog med bara `GLIBC_2.31` rapporterar ingen.
  - Kör `npx vitest run tests/main/check-glibc.test.js`.

- [x] **Steg 6 — Appikon (byggresurs)** (FR3.1, FR3.5, R-04)
  - `build/icon.svg`: canvas 1024×1024 px. Rundad kvadrat 824×824 px med offset 100 px (macOS-ikonrutnätet) och hörnradie 184 px, fylld med `#0b0b10`. Auctum-märket (samma två paths och viewBox `202 274 848 708` som `src/renderer/AuctumMark.jsx`) i `#ff9e40`, centrerat och 560 px brett. Det blir ungefär 68 % av kvadraten.
  - `scripts/make-icon.cjs` körs med `npx electron scripts/make-icon.cjs`, eftersom Electron redan är installerat och inget nytt beroende behövs. Skriptet renderar `build/icon.svg` i ett dolt `BrowserWindow` med transparent bakgrund och sparar `build/icon.png` (1024×1024, PNG med alfakanal).
  - electron-builder genererar `.icns` för macOS och alla Linux-storlekar från `build/icon.png`. Skriptet `npm run icon` läggs till i `package.json`.
  - Både `build/icon.svg` och `build/icon.png` checkas in.

- [x] **Steg 7 — Test av ikonfilen** (FR3)
  - `tests/main/icon.test.js` läser `build/icon.png` och kontrollerar:
    - PNG-signaturen
    - att IHDR-bredd och höjd är 1024
    - att färgtypen har alfakanal (6)
  - Kör `npx vitest run tests/main/icon.test.js`.

- [x] **Steg 8 — Ikonen i appen och bygget (miljö- och byggkonfiguration)** (FR3.2–FR3.4)
  - `electron-builder.yml`:
    - `icon: build/icon.png` på toppnivå
    - `linux.icon: build/icon.png`
    - `extraResources: [{ from: build/icon.png, to: icon.png }]`
  - `src/main/index.js`:
    - På macOS i dev-läge (`!app.isPackaged`) körs `app.dock.setIcon(<projekt>/build/icon.png)`.
    - På Linux får `BrowserWindow` optionen `icon`: `process.resourcesPath/icon.png` när appen är paketerad, annars `build/icon.png`.

- [x] **Steg 9 — Linux-bygget på 22.04 (bygg- och CI-konfiguration)** (FR1.1–FR1.3, R-03)
  - `.github/workflows/release.yml`:
    - `build-linux` får `runs-on: ubuntu-22.04`.
    - Efter `npm run build:linux` körs `node scripts/check-glibc.mjs dist/linux-unpacked`. Steget failar bygget vid överträdelse.
    - En kommentar förklarar varför 22.04 krävs.
  - `electron-builder.yml`, `linux.files`: lägg till `"!node_modules/node-pty/prebuilds/darwin-*/**"` och `"!node_modules/node-pty/prebuilds/win32-*/**"`. Kontrollen i steg 4 verifierar FR1.3.
  - Kontrollen körs bara när en release byggs, eftersom det finns ingen PR-CI i projektet (R-03, ett medvetet val).

- [x] **Steg 10 — Version och dokumentation** (R-04)
  - `package.json`: `version` blir `0.1.1`.
  - `docs/features/epic-04-branding-and-desktop.md`:
    - US-0401 får status 🚧 Byggd, ej releasad.
    - Byggda acceptanskriterier bockas av.
    - Avstämningen av designen med användaren och verifieringen på en installerad release lämnas öppna.
  - `README.md`: under "Kom igång", en rad om att Linux kräver Ubuntu 22.04 eller nyare och om `npm run icon`.
  - Kör hela sviten med `npx vitest run tests/` och därefter `npx electron-vite build`.

## Spårbarhet

| Steg | Krav |
|------|------|
| 2–3 | FR2.1, FR2.2, FR2.3, R-01, R-02 |
| 4–5, 9 | FR1.1, FR1.2, FR1.3, NFR1, R-03 |
| 6–8 | FR3.1–FR3.5, R-04 |
| 1, 10 | NFR2, R-04 |
