# Kodgenereringsplan — EPIC-04 US-0406 Namnet T.H.A.D.E.U.S.

Underlag:
- `inception/requirements-analysis/requirements.md` (FR1.1–FR5.1, NFR1–NFR2)
- `inception/reverse-engineering/developer-scan.md`, med alla förekomster av namnet och fil:rad

Express och Minimal, inga enheter och inga nya beroenden. Repo-namnet `aidlc-dash` och userData-mappen `aidlc-dash` ändras inte.

## Steg

- [x] **Steg 1 — En källa för namnet** (FR1.1)
  - Ny modul `src/shared/appName.js` med exporterna:
    - `APP_NAME = 'T.H.A.D.E.U.S.'`
    - `APP_FULL_NAME = 'Transformative Human-AI Development Environment for Ubiquitous Systems'`
    - `APP_TAGLINE = 'AI-driven software development, under human direction.'`
    - `APP_SHORT = 'THADEUS'`
    - `APP_VENDOR = 'Auctum'`
  - Modulen ska gå att importera från både main och renderer. Kontrollera att electron-vite bundlar den till båda, eller lägg en alias om det behövs (ändring i `electron.vite.config.mjs` är tillåten om det krävs).

- [x] **Steg 2 — Appen** (FR2.1–FR2.4)
  - `src/main/menu.js`: `APP_NAME` från modulen. `setAboutPanelOptions({ applicationName: APP_NAME, applicationVersion, version, copyright: '© Auctum', credits: APP_FULL_NAME + ' — ' + APP_TAGLINE })`. Fältnamnen anpassas till Electron 45.
  - `src/main/index.js`: fönstertiteln är `APP_NAME`. `app.setName(APP_NAME)` sätts om det behövs för menyn i dev. `app.setPath('userData', …aidlc-dash)` står kvar, och kommentaren skrivs om ("mappen heter fortfarande aidlc-dash så att inställningar överlever namnbyten").
  - `src/renderer/index.html`: `<title>T.H.A.D.E.U.S.</title>`.
  - `src/renderer/App.jsx`: märkesblocket visar `APP_NAME` på en rad. Underraden "Aidlc control" tas bort.
  - `src/renderer/Splash.jsx`: rubriken är `APP_NAME`, med `APP_FULL_NAME` och `APP_TAGLINE` under. Den dolda sr-only-texten använder modulen. `role="img"` "Auctum" och `is-leaving` behålls.
  - `src/renderer/theme.css`: märkesblocket (`.app-brand-text`) får plats med "T.H.A.D.E.U.S." på en rad, med en mindre storlek eller mindre spärrning vid behov och `white-space: nowrap`. Startskärmens underrader radbryts snyggt, med `max-width` och `text-wrap: balance`, och flödar inte över vid 1100 px. Bara tokens.

- [x] **Steg 3 — Paketering och release** (FR3.1–FR3.3)
  - `package.json`: `"name": "thadeus"`, `"productName": "THADEUS"` och `"description"` med det utskrivna namnet. Kör `npm install --package-lock-only` så att `package-lock.json` följer med.
  - `electron-builder.yml`:
    - `appId: se.auctum.thadeus` och `productName: THADEUS`
    - `linux.executableName: thadeus`
    - `linux.desktop` med `Name: T.H.A.D.E.U.S.` (i den form electron-builder 26 vill ha den, till exempel `desktop.entry.Name`)
    - `dmg.artifactName: THADEUS-${version}-${arch}.dmg`, som ger `THADEUS-0.x.y-universal.dmg`
    - `deb.artifactName: thadeus_${version}_${arch}.deb`
    - `deb.fpm: ["--replaces=aidlc-dash", "--conflicts=aidlc-dash"]`
    - Kontrollera nycklarna mot electron-builder 26:s schema i `node_modules/app-builder-lib`.
  - `.github/workflows/release.yml`: titeln är `"T.H.A.D.E.U.S. ${GITHUB_REF_NAME}"` och kommentaren på rad 1 uppdateras. Globbarna förblir oförändrade.

- [x] **Steg 4 — README och dokumentation** (FR4.2, FR5.1)
  - `README.md`:
    - rubriken "T.H.A.D.E.U.S." följt av det utskrivna namnet och taglinen, och en mening om Auctum
    - avsnittet "Uppgradera från Auctum AIDLC Control" för macOS (ny app, ta bort den gamla, notisbehörighet och Dock görs om, högerklick och Öppna) och Linux (det nya paketet ersätter det gamla)
    - inga andra förekomster av det gamla namnet
  - `docs/features/epic-04-branding-and-desktop.md`: markera US-0406 som byggd, inte släppt, och kryssa i dess kriterier.

- [x] **Steg 5 — Tester**
  - Uppdatera `tests/main/menu.test.js` (menyetiketterna med det nya namnet), `tests/renderer/Splash.test.jsx` (rubrik, utskrivet namn och tagline, med `role="img"` "Auctum" kvar) och `tests/renderer/AppShell.test.jsx` (märkesblocket visar "T.H.A.D.E.U.S." och ingen "Aidlc control").
  - Nytt test `tests/main/appName.test.js`: modulen exporterar formerna. Ett test kontrollerar också att inga användarsynliga strängar "Auctum AIDLC Control" eller "Aidlc control" finns kvar i `src/`. Kontrollen läser filerna som text och utesluter kommentarer om historik.
  - Kör `npx vitest run tests/` och `npx electron-vite build`.
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
