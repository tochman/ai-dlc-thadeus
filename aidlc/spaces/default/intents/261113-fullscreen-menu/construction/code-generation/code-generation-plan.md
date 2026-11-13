# Kodgenereringsplan — EPIC-04 US-0404 Helskärm och egen appmeny

Underlag:
- `inception/requirements-analysis/requirements.md` (FR1.1–FR1.4, FR2.1–FR2.6, NFR1–NFR3)
- `inception/reverse-engineering/developer-scan.md`
- kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/`

Express och Minimal, inga enheter och inga nya beroenden. Alla befintliga `data-testid` och tester behålls, och arm-knapparna beter sig som förut.

## Steg

- [ ] **Steg 1 — Helskärm i main** (FR1.1, FR1.3)
  - `src/main/settings.js`: `sanitize()` godtar `fullscreen` som boolean, och andra värden utelämnas, på samma sätt som `animations`.
  - `src/main/index.js`:
    - spara fönsterreferensen
    - läs `getSettings()` före `createWindow()` och skapa fönstret med `fullscreen: settings.fullscreen === true`
    - lägg till `autoHideMenuBar: true` (har effekt på Linux)
    - lyssna på `enter-full-screen` och `leave-full-screen`, och gör tre saker vid varje ändring: spara `fullscreen` via settings-kön, skicka `window:fullscreen` (boolean) till renderaren och bygg om menyn så att bocken stämmer
  - `src/main/ipc.js`:
    - `window:toggleFullscreen` växlar läget för avsändarens fönster (`BrowserWindow.fromWebContents`)
    - `window:isFullscreen` returnerar läget
  - `src/preload/index.js`: `toggleFullscreen()`, `isFullscreen()` och `onFullscreen(cb)` via den befintliga `subscribe`.

- [ ] **Steg 2 — Appmenyn** (FR2.1, FR2.2, FR2.3, FR2.6, NFR1)
  - Ny fil `src/main/menu.js` med `buildMenuTemplate({ isMac, isPackaged, state, fullscreen, send, actions })`. Funktionen är ren och returnerar mallen, så att den kan testas utan Electron.
  - `applyMenu(win)` anropar `Menu.setApplicationMenu(Menu.buildFromTemplate(...))`.
  - Innehåll och kortkommandon följer FR2.1 exakt, med svenska etiketter.
  - Redigera använder rollerna `undo`, `redo`, `cut`, `copy`, `paste` och `selectAll`.
  - Fönster använder `role: 'windowMenu'` och visas bara på macOS.
  - "Om …" använder `role: 'about'`, med `app.setAboutPanelOptions` (namn och version).
  - Helskärm är en `checkbox`, med `accelerator` `Ctrl+Cmd+F` på macOS och `F11` på Linux. Den växlar läget i main.
  - Hjälp:
    - "Rapportera problem" öppnar `https://github.com/tochman/aidlc-dash/issues` med `shell.openExternal`
    - "AI-DLC-dokumentation" skickar `{ command: 'docs' }` till renderaren
    - konstanten `AIDLC_DOCS_URL = 'https://github.com/awslabs/aidlc-workflows'` används som reserv
  - Menyn "Utveckling" (Reload och DevTools) finns bara när `!isPackaged`.
  - Allt som rör innehållet skickar `menu:command` till fokuserat fönster med `{ command, ...args }`:
    - `openProject`
    - `closeProject` (`CmdOrCtrl+W`)
    - `projectSettings`
    - `appSettings` (`CmdOrCtrl+,`)
    - `view` med `intents` eller `features`
    - `panel` med `cost` eller `github`
    - `terminal` med `claude`, `shell` eller `restart`
    - `docs`
  - `enabled` följer `state`:
    - posterna för Projekt, Visa (utom zoom och Helskärm) och Terminal kräver `hasProject`
    - Kostnad och Github kräver `isAidlc`
    - Features visas bara när `showFeatures` är sant
  - `src/main/ipc.js`: `menu:state` (renderaren skickar till main) validerar att payloaden är `{ hasProject, isAidlc, showFeatures }` med bara booleaner, och att annat ignoreras. Kanalen sparar läget och bygger om menyn.
  - `src/main/index.js` anropar `applyMenu` när appen är redo.
  - Preload: `sendMenuState(state)` och `onMenuCommand(cb)`.

- [ ] **Steg 3 — En kodväg i renderaren** (FR2.4, FR2.5, FR2.6)
  - `src/renderer/App.jsx`: lyft armens inline-lambdor till namngivna funktioner som både armen och menyn använder:
    - `openProject` (den befintliga `addProject`)
    - `closeActiveProject`, som anropar `closeTab(activeId)` och inte gör något utan aktivt projekt
    - `showView(view)`
    - `togglePanel(key)`
    - `openAppSettings`
    - `openProjectSettings`
  - En `useEffect` prenumererar på `onMenuCommand` och mappar varje kommando till en funktion. Okända kommandon ignoreras.
  - `docs` visar projektets `docs/README.md` i artefaktläsaren om filen finns och läses via befintlig bridge. Annars öppnas `AIDLC_DOCS_URL`, via en ny invoke-kanal i main med fast adress (`app:openDocsUrl`).
  - En `useEffect` skickar `sendMenuState({ hasProject, isAidlc, showFeatures })` när värdena ändras.
  - **Terminal:** App skickar propen `terminalCommand` (`{ seq, action }`) till det aktiva projektets `ProjectView`. Där kör en effekt i `TerminalProvider`-kontexten `setView('claude' | 'shell')` eller `restart()`. Bara den aktiva vyn reagerar, och `seq` gör att samma kommando kan upprepas.

- [ ] **Steg 4 — Helskärmsknappen** (FR1.2, FR1.4, NFR3)
  - `App.jsx`: ett `lcars-block` längst till höger i `.app-header-row`, efter dekoren.
    - `data-testid="fullscreen-toggle"` och `aria-pressed={fullscreen}`
    - etiketten är "Helskärm" eller "Lämna helskärm"
    - klick anropar `bridge.toggleFullscreen()`
    - läget läses vid start med `isFullscreen()` och uppdateras via `onFullscreen`
  - `theme.css`: blocket stylas bara med tokens, med fokusram och samma höjd som rubrikraden. Ramarna kontrolleras i helskärm (Build and Test).

- [ ] **Steg 5 — Tester**
  - `tests/main/menu.test.js`, som testar `buildMenuTemplate`:
    - (a) paketerad app utan Reload, DevTools och "Utveckling", och med dem i dev
    - (b) inget projekt ger avstängda projektposter, och `isAidlc: false` ger avstängda Kostnad och Github
    - (c) "Stäng projekt" har `CmdOrCtrl+W` och skickar `closeProject`
    - (d) Linux har ingen Fönster-meny och har F11
  - `tests/main/settings.test.js`: +1 test, där `fullscreen` godtas som boolean och ett ogiltigt värde utelämnas.
  - `tests/renderer/AppShell.test.jsx`:
    - +1 test: helskärmsknappen byter etikett och `aria-pressed` när `onFullscreen` anropas
    - +1 test: ett `menu:command` `{ command: 'view', view: 'features' }` eller `appSettings` ger samma resultat som armknappen
  - Kör `npx vitest run tests/` och `npx electron-vite build`.

- [x] **Steg 6 — Rättelse F-01: helskärm på macOS** (Loop-back 1. Användaren valde "Retry with fix". Gäller FR1.1 och FR1.3)
  - `src/main/index.js`: lyft fönstrets options till en ren exporterad funktion, `windowOptions(settings, platform)`. Den sätter `fullscreenable: true` och tar med `fullscreen: true` bara när `settings.fullscreen === true`. Ett uttryckligt `fullscreen: false` stänger av helskärm på macOS.
  - Test i `tests/main/windowOptions.test.js`: utan sparat läge saknas nyckeln `fullscreen` och `fullscreenable` är true. Med sparat läge är `fullscreen` true.
  - Kör `npx vitest run tests/` och `npx electron-vite build`. Verifiera med `./node_modules/.bin/electron tests/.tmp/shots/menu.cjs` att `isFullScreen` blir true och att knappen visar "Lämna helskärm". Kör sedan `./node_modules/.bin/electron tests/.tmp/shots/menu.cjs after` och kontrollera att appen startar i helskärm.

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
