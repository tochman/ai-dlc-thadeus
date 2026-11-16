# Code Generation Plan: US-1201 teamsamarbete (med US-1202)

## Summary

- Builds: plattformskoppling (GitHub via `gh`, GitLab via `glab`, Bitbucket via REST och nyckelringen), krockvarning, vem gör vad över mina datorer, kommentarer per story, och en granskad, plattformsneutral GitHub-panel
- Touches: nya `src/main/platforms/` och `src/main/credentials.js`, `src/main/git.js`, `src/main/ipc.js`, `src/preload/index.js`, nya vyer `CollisionPanel.jsx`, `MachinesView.jsx`, `StoryComments.jsx`, samt `RefreshPanel.jsx`, `IntentDetail.jsx`, `SettingsView.jsx`, `tools.js`, locales, `docs/features/epic-12-team-collaboration.md`
- Tests: cirka 45 tester, 5–8 per komponent: enhetstester och integrationstester mot fixturer för de tre API:erna och mot riktiga git-repon i `tests/.tmp/`

Zero-Unit arbete. Underlaget finns i `ideation/approval-handoff/initiative-brief.md`, `ideation/scope-definition/intent-backlog.md` (poster 1–5) och US-1202:s acceptanskriterier i `docs/features/epic-12-team-collaboration.md`. Requirements Analysis och designstegen är borttagna ur planen, så acceptanskriterierna nedan (AC-…) är kraven.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "feature",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided by the person at the practices interview (Q1: test first, TDD, for new work). Earlier Code Generation plans recorded the framework default `test-after`; the affirmed choice replaces it for new work.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with two projects, `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale). Currently 353 `it`/`test` call sites by static count; the knowledge base's \"about 490\" is not reconciled.\n- **Coverage floor**: 80% line coverage, checked in CI with `@vitest/coverage-v8` (Q2). Not set up yet; it is to be added to the repository and to the `verify` job of `.github/workflows/release.yml`. No coverage is measured today.\n- **Suite green before merge**: the full `npx vitest run tests/` suite must pass before any story pull request merges. CI runs it on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is checked by hand before a release tag. Jsdom tests do not run the built app."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
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
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:2eb76282a6bc6ef188af4f9c2ed6f31a0bfa37db00a281593e27e513bfb8be81",
  "contract_sha256": "sha256:d07613044106fbefce37bea497059afa0dc67f52bc72c3a7d8982807b2d8e392"
}
```

## Acceptance criteria (the requirements for this build)

- **AC-1 Plattform (post 1).** Appen känner igen GitHub, GitLab och Bitbucket på `origin`-adressen (https och ssh, även självhostad GitLab med `gitlab` i värdnamnet). Den listar öppna pull requests (nummer, titel, gren, författare, ändrade filer, länk), deras granskningar och kommentarer bakom ett gemensamt gränssnitt.
  - GitHub läses via `gh api` och GitLab via `glab api`, med din befintliga inloggning.
  - Bitbucket läses via REST med användarnamn och app-lösenord som du anger i Inställningar. De sparas krypterat med Electron `safeStorage` i appens egen datamapp, aldrig i projektet, och visas eller loggas aldrig.
  - Om CLI:n saknas, inloggningen saknas eller ett anrop tar mer än 15 s sägs det med namn på plattformen och vad du kan göra. Resten av appen fungerar.
- **AC-2 Krockvarning (post 2, US-1202).**
  - En storygren som ligger efter `origin/main` visar hur många commits den ligger efter, och att testerna ska köras om efter att main mergats in.
  - Två öppna pull requests som ändrar samma filer namnger den andra pull requesten och de gemensamma filerna, och visar vilka filer som skulle krocka (`git merge-tree --write-tree`, utan att arbetskatalogen ändras).
  - Appen hämtar, mergar och pushar aldrig själv. `git fetch` körs bara när du trycker på uppdatera.
  - Efter en merge som visade fel kan du öppna intentens `construction/build-and-test/test-results.md` i editorn med ett ifyllt avsnitt "Efter merge med main". Appen skriver inget annat under `aidlc/`.
- **AC-3 Vem gör vad över mina datorer (post 3).**
  - Per intent visas vilka datorer som arbetat på den: värd och klon från audit-shardens namn, senaste steg och när.
  - Det visas också vilka storygrenar på `origin` som har commits som inte finns i main.
  - Samma story som pågår på två datorer, eller på två grenar, markeras som en möjlig krock.
- **AC-4 Kommentarer per story (post 4).**
  - Intentens vy har en flik med kommentarer och granskningar från storyns pull request, ihop med AI-DLC:s öppna frågor, godkännanden och granskningsfynd för intenten.
  - Pull requesten hittas genom att storynumret står i grennamnet eller titeln.
  - Varje rad visar källa, författare och tid.
- **AC-5 GitHub-panelen (post 5).**
  - Granskningen av panelen skrivs först i epic-12: vad den gör bra, vad som saknas eller förvirrar, vad som ändras.
  - Panelen byter namn till "Uppdatera från <plattform>" efter `origin` och visar krockvarningen (AC-2).
  - Den behåller sin regel att kommandon som ändrar arbetskatalogen skrivs in i terminalen utan Enter.
- **AC-6 Allmänt.**
  - Allt gränssnitt följer LCARS-stilen och använder den delade `Tooltip`.
  - Varje text går genom `t()` på svenska och engelska.
  - Inga nya beroenden utöver Electron `safeStorage`, som redan finns i Electron.

## Steps

Datalagret är plattformsdata och git-data; det finns ingen databas. Varje grupp nedan följer Red, Green och Refactor.

- [x] **Step 1: Struktur och gren.** Byt grenens namn från `docs/US-1201` till `feat/US-1201`, eftersom storyn nu har kod. Nya filer:
  - `src/main/platforms/detect.js`, `github.js`, `gitlab.js`, `bitbucket.js` och `index.js` (det gemensamma gränssnittet `listPulls`, `listComments`, `listReviews`);
  - `src/main/credentials.js`;
  - `src/main/teamActivity.js`;
  - vyerna `src/renderer/CollisionPanel.jsx`, `MachinesView.jsx` och `StoryComments.jsx`.
- [x] **Step 2: Testkörare.** Kör `npx vitest run tests/main/git.test.js` grönt på det oförändrade trädet och anteckna kommandot från `unit-test-instructions.md`.
- [x] **Step 3: Granskning av panelen (AC-5, dokument).** Skriv granskningen av `RefreshPanel.jsx` i US-1201 i `docs/features/epic-12-team-collaboration.md`: vad den gör bra, vad som saknas eller förvirrar, vad som ändras. Märk US-1202 som sammanslagen med US-1201.
- [x] **Step 4: Plattformsdata, Red (AC-1).** `tests/main/platforms.test.js`:
  - `detectPlatform` för https- och ssh-adresser för de tre plattformarna, självhostad GitLab och en okänd värd;
  - tolkning av fixturer från de tre API:erna (`tests/fixtures/platforms/`) till samma form för pull requests, kommentarer och granskningar;
  - ett fel och en tidsgräns ger ett namngivet fel.
- [x] **Step 5: Plattformsdata, Green.** Bygg `detect.js` och tolkarna. `github.js` och `gitlab.js` kör `gh api` och `glab api` genom `exec.js`, med tidsgräns. `bitbucket.js` gör ett `fetch` mot `api.bitbucket.org/2.0`, med Basic auth från `credentials.js`.
- [x] **Step 6: Plattformsdata, Refactor** medan testerna är gröna.
- [x] **Step 7: Inloggningsuppgifter, Red (AC-1).** `tests/main/credentials.test.js`, med `safeStorage` stubbad:
  - en sparad uppgift läses tillbaka;
  - den krypterade filen ligger i appens datamapp och innehåller inte lösenordet i klartext;
  - ett fel när `safeStorage` inte är tillgänglig sägs, och inget sparas okrypterat;
  - en uppgift kan tas bort.
- [x] **Step 8: Inloggningsuppgifter, Green.** `credentials.js` med `saveBitbucket`, `loadBitbucket` och `clearBitbucket`, som skriver till `app.getPath('userData')`.
- [x] **Step 9: Inloggningsuppgifter, Refactor.**
- [x] **Step 10: Krock och aktivitet, Red (AC-2, AC-3).**
  - `tests/main/git.test.js`, mot riktiga repon i `tests/.tmp/`:
    - `behindCount` mot `origin/main`;
    - `changedFiles` för en gren;
    - `predictConflicts` med `git merge-tree` lämnar arbetskatalogen orörd.
  - `tests/main/teamActivity.test.js`:
    - datorer per intent från shard-namn och senaste händelse;
    - samma story på två datorer eller två grenar flaggas;
    - en trasig shard hoppas över.
- [x] **Step 11: Krock och aktivitet, Green.** Nya funktioner i `git.js`: `behindCount`, `changedFiles`, `predictConflicts` och `remoteStoryBranches`. `teamActivity.js` bygger på `loadAuditEvents`. `collisions(pulls, localBranch)` korsar filerna.
- [x] **Step 12: Krock och aktivitet, Refactor.**
- [x] **Step 13: Kommentarer per story, Red (AC-4).** `tests/main/storyComments.test.js`:
  - en pull request matchas på storynummer i gren eller titel;
  - plattformskommentarer slås ihop med AI-DLC:s öppna frågor (tomma `[Answer]:`), godkännanden (`GATE_APPROVED`) och granskningsfynd i tidsordning, med källa, författare och tid;
  - ingen pull request ger bara AI-DLC-raderna.
- [x] **Step 14: Kommentarer per story, Green.** `storyComments(intent, pulls, events, questions)` i `teamActivity.js`.
- [x] **Step 15: Kommentarer per story, Refactor.**
- [x] **Step 16: IPC, Red (AC-1–AC-4).** `tests/main/ipc.test.js`:
  - kanalerna `team:platform`, `team:pulls`, `team:collisions`, `team:machines`, `team:comments` och `credentials:bitbucket` svarar med rätt form och med plattformsfel som värden, inte som kast;
  - `team:refresh` kör `git fetch` bara när den anropas;
  - `team:mergeNote` öppnar `test-results.md` med mallen utan att skriva något annat under `aidlc/`.
  - Brygga i `preload/index.js`.
- [x] **Step 17: IPC, Green.** Kanalerna i `ipc.js` med namngivna metoder i bryggan. Lägg till `glab` i `tools.js` `TOOL_IDS`.
- [x] **Step 18: IPC, Refactor.**
- [x] **Step 19: Vyer, Red (AC-2–AC-6).**
  - `CollisionPanel.test.jsx`: antal commits efter, delade filer med den andra pull requesten och krockfiler.
  - `MachinesView.test.jsx`: datorer per intent och krockmarkering.
  - `StoryComments.test.jsx`: rader med källa och tom vy.
  - `RefreshPanel.test.jsx`: rubriken efter plattformen och krockvarningen.
  - `SettingsView.test.jsx`: Bitbucket-uppgiften sparas och lösenordet visas aldrig.
  - Allt är LCARS-klasser och delad `Tooltip`.
- [x] **Step 20: Vyer, Green.** Bygg vyerna:
  - `CollisionPanel` i `RefreshPanel`;
  - `MachinesView` i projektvyn, som en sektion i armen;
  - fliken `StoryComments` i `IntentDetail`;
  - Bitbucket-raden i Inställningar › Verktyg.
  - Nya nycklar i `sv.json` och `en.json`.
- [x] **Step 21: Vyer, Refactor.**
- [x] **Step 22: Konfiguration.** Inga nya beroenden. `safeStorage` finns i Electron. Kontrollera att `.thadeus/` inte används för hemligheter.
- [x] **Step 23: Dokumentation och hela sviten.**
  - Huvudkommentarer namnger US-1201 och AC.
  - Kör `npx vitest run tests/`, `npx eslint .` och `npx prettier --check src tests` gröna.

## Traceability

| Krav | Steg |
|---|---|
| AC-1 | 4–9, 16–17, 20 |
| AC-2 | 10–12, 16–17, 19–20 |
| AC-3 | 10–12, 16–17, 19–20 |
| AC-4 | 13–15, 16–17, 19–20 |
| AC-5 | 3, 19–20 |
| AC-6 | 19–21 |
