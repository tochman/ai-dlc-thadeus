# Kodgenereringsplan — EPIC-05 US-0505 Claudes frågor som popup

Underlag:
- `inception/requirements-analysis/requirements.md` (FR1.1–FR4.2, NFR1–NFR5)
- `inception/reverse-engineering/developer-scan.md`
- kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/`

Express och Minimal, inga enheter och inga nya beroenden. Alla befintliga `data-testid` och tester behålls. Appen skriver bara sin egen `settings.json`.

## Steg

- [ ] **Steg 1 — Väntande frågor i main** (FR1.1–FR1.3, NFR2)
  - Ny ren modul `src/main/questions.js` med `pendingQuestions(events, { project, intent })`. Den tar emot sorterade audit-händelser (från `parsers/audit.js` och `loadAuditEvents`) och returnerar de väntande frågorna enligt matchningsreglerna i FR1.2:
    - `QUESTION_ANSWERED` besvarar den äldsta obesvarade frågan i samma stage (och unit)
    - `GATE_APPROVED`, `GATE_REJECTED`, `STAGE_COMPLETED` och `STAGE_SKIPPED` stänger grinden och alla frågor i stagen
    - en ny `STAGE_STARTED` för samma stage stänger det som är kvar
  - Varje väntande fråga får formen `{ id, projectId, projectName, intent, stage, kind: 'question' | 'gate', text, options: string[], nextStage, timeMs }`.
    - `id` är `Question Id`, eller `<intent>:<key>` när id saknas.
    - `options` tolkas med `JSON.parse` i try/catch. Vid fel används en kommaseparerad lista, och annars råtexten.
  - `src/main/projectService.js`: `loadPendingQuestions(project)` läser audit-loggarna för de intents som pågår (status är inte `complete` eller `archived` och `aidlc-state.md` är inte klar) och samlar deras väntande frågor.

- [ ] **Steg 2 — Bevakning, kanaler och notiser** (FR1.4, FR3.1–FR3.3, FR4.2, NFR3)
  - `src/main/ipc.js`:
    - Vid `project:open` och vid varje `project:changed` som rör `aidlc/` (samma debounce) räknas frågorna om för det projektet, och den samlade listan för alla öppna projekt skickas på push-kanalen `questions:changed`.
    - Invoke-kanalen `questions:list` returnerar listan.
    - Main sparar vilka id:n som fanns när appen startade (`startedWith`). Bara id:n som tillkommit efter det räknas som **nya**.
  - Ny modul `src/main/notify.js`: för varje ny fråga skapas, när `settings.questionAlerts === 'popup-notify'` och (fönstret saknar fokus eller frågan gäller ett annat projekt än det aktiva):
    - en `new Notification({ title: '<projekt>: Claude väntar på ditt svar', body: <fråga, max 120 tecken>, silent: settings.notificationSound === false })`
    - notisen visas en gång per id
    - ett klick på notisen tar fram och fokuserar fönstret och skickar `questions:focus` med id:t
  - Renderaren talar om vilket projekt som är aktivt via `questions:activeProject` (invoke, validerad sträng), eftersom main inte vet det.
  - `src/preload/index.js`: `listQuestions()`, `onQuestions(cb)`, `onQuestionFocus(cb)` och `setActiveProject(id)`.

- [ ] **Steg 3 — Inställningar** (FR4.1, FR4.2)
  - `src/main/settings.js`: `sanitize()` godtar `questionAlerts` (`popup-notify`, `popup` eller `off`) och `notificationSound` (boolean). Ogiltiga värden utelämnas. Standardvärdena är `popup-notify` och `true`.
  - `src/renderer/AppSettingsDialog.jsx`: två nya grupper med samma radiomönster som Animationer, "Frågor från Claude" och "Ljud vid notis", som sparas via `bridge.setSettings`.

- [ ] **Steg 4 — Popupen** (FR2.1–FR2.5, NFR4, NFR5)
  - Ny komponent `src/renderer/QuestionPopup.jsx`: en native `<dialog>` med `showModal()`, samma mönster som inställningsdialogen (`aria-labelledby`, Esc via `onCancel`). Den visar:
    - projekt · intent · stage
    - frågan som text och valen som lista
    - för en grind: "Godkännande: <stage> → <next stage>"
    - "1 av N" med Föregående/Nästa
    - knapparna "Svara i Claude" (som får fokus när popupen öppnas) och "Stäng"

    Inga `role="status"` och inga `role="alert"`. `data-testid`: `question-popup`, `question-popup-answer`, `question-popup-close`, `question-popup-title`.
  - `App.jsx`:
    - prenumerera på `onQuestions` och `onQuestionFocus`
    - öppna popupen när en ny fråga kommer, om `questionAlerts !== 'off'`
    - visa frågor som väntade redan vid start under rubriken "Väntade redan när appen startade", men öppna inte popupen automatiskt för dem
    - "Stäng" döljer popupen tills ett nytt id kommer
    - popupen stängs när inga visade frågor väntar längre
    - "Svara i Claude" anropar `setActiveId(q.projectId)` och `setTerminalCommand({ seq, action: 'claude', projectId: q.projectId })` direkt, enligt fynd 6 i skanningen
    - meddela main om aktivt projekt när `activeId` ändras
  - **Eskalering:** en timer på 20 s per visad fråga sätter klassen `is-overdue`. Då byter header och rubrik till `--alert` med glöd, och rubriken blir "Väntar fortfarande på ditt svar". Timern nollställs när en ny fråga visas.
  - `src/renderer/theme.css` och `tokens.js`: den nya token `--alert` (glödande röd, AA mot `--bg` och `--on-light`) och popupens stilar, bara med tokens.
    - Glöden följer `data-motion`: `full` pulserar, `reduced` ger statisk glöd och `off` ger ingen glöd.
    - `theme.test` ska fortsätta vara grön.

- [ ] **Steg 5 — Tester**
  - `tests/main/questions.test.js`, som testar `pendingQuestions`:
    - (a) en fråga utan svar väntar
    - (b) `QUESTION_ANSWERED` i samma stage besvarar den äldsta frågan
    - (c) en grind stängs av `GATE_APPROVED`, `STAGE_COMPLETED` och `STAGE_SKIPPED`
    - (d) en ny `STAGE_STARTED` stänger det som var kvar
    - (e) `Options` som inte är giltig JSON ger en lista ändå
    - (f) en annan stage eller unit besvarar inte frågan
  - `tests/main/settings.test.js`: +1 test, där `questionAlerts` och `notificationSound` godtas och ogiltiga värden utelämnas.
  - `tests/renderer/QuestionPopup.test.jsx`:
    - frågan och valen visas, och "Svara i Claude" anropar callbacken med projektet
    - efter 20 s (fake timers) får popupen `is-overdue` och rubriken byter text
    - en grind visas som "Godkännande: …"
  - Kör `npx vitest run tests/` och `npx electron-vite build`.

- [x] **Steg 6 — Rättelse F-01: fokus i terminalen efter "Svara i Claude"** (Loop-back 1. Användaren valde "Retry with fix". Gäller FR2.3)
  - `QuestionPopup.jsx` och `App.jsx`: "Svara i Claude" stänger dialogen först. `setActiveId` och `setTerminalCommand({ seq, action: 'claude', projectId })` körs först efter dialogens `close`-händelse, eller i `requestAnimationFrame` efter `close()`. Då tar dialogens automatiska återlämning av fokus inte fokus från terminalen.
  - Test i `tests/renderer/QuestionPopup.test.jsx`: callbacken för "Svara i Claude" anropas efter att dialogen har stängts.
  - Kör `npx vitest run tests/` och `npx electron-vite build`. Verifiera i riktig Electron att `document.activeElement` ligger i `.terminal-panel` efter klicket.

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
