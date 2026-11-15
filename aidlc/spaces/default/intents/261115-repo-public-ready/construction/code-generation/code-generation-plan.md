# Code Generation Plan: US-1101, get the repository ready to be public

## Summary

- Builds: privacy clean-up of tracked files, gitleaks scan in CI, public project files, a generated THIRD_PARTY_LICENSES shown from About
- Touches: `aidlc/` records, `docs/features/epic-01…04`, `tests/fixtures/`, `docs/screenshots/`, `README.md`, new root docs and `.github/` templates, `release.yml`, `electron-builder.yml`, `package.json`, `scripts/third-party-licenses.mjs`, `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/AboutDialog.jsx`, locales
- Tests: 5 new unit tests (licence collector 3, About licences button 2) plus the full existing suite green

Zero-Unit express work. Brownfield: files are changed in place. No history rewrite (NFR2). Making the repository public (FR8) is not part of this build: it waits for the person's explicit word after the merge.

## Steps

### Part A: review and clean-up

- [x] **Step 1. Baseline.** Run `npx vitest run tests/`, `npx eslint .`, `npx prettier --check .` and record the results in `code-summary.md` (FR1, NFR3).
- [x] **Step 2. Review file.** Write `docs/public-readiness-review.md`: one table row per finding (aidlc records, home paths, emails, the reference project, fixtures, screenshots, secret scan, AI-DLC files) with keep / clean / remove and what changed. Filled in as Steps 3–7 finish (FR1.1, FR1.2).
- [x] **Step 3. AI-DLC records (FR2).** In tracked files under `aidlc/`, replace the personal home path with `~`, the personal email with a neutral placeholder, and the reference project's path and name with "a reference project". Nothing else in audit logs, prompts, cost figures or memory rules changes (FR2.2). Audit shard file names stay.
- [x] **Step 4. Epic files (FR3.1).** `docs/features/epic-01…04`: neutral wording instead of the reference project's path.
- [x] **Step 5. Fixtures and test names (FR3.2, FR3.4).** Give `tests/fixtures/project/…/261112-epic29-small-k2-fixes/`, `261110-epic02-finish/` and `tests/fixtures/audit/machine-a.md` invented content with the same structure, ids and counts the tests assert; rename the reference project to `demo-app` in `tests/main/notify.test.js`, `tests/renderer/AppShell.test.jsx`, `tests/renderer/SettingsView.test.jsx`; `src/renderer/AuctumMark.jsx` header comment no longer names it; `tests/fixtures/picker/no-picker.txt` uses `audit/machine.md`. Suite stays green.
- [x] **Step 6. Screenshots (FR3.3).** View all five in `docs/screenshots/`. `intents.png` and `cost.png` (and any other showing private data) are replaced with screenshots of a demo project; the person takes them if the app cannot be driven from here, and the step records which ones are still owed.
- [x] **Step 7. Secret scan (FR4.1).** `brew install gitleaks`, then `gitleaks git --log-opts="--all" .` over the full history. Each finding is resolved and listed in the review; a real secret that was ever committed is reported to the person for rotation.

### Part B: licences in the app (TDD)

- [x] **Step 8. Runner.** Confirm `npx vitest run tests/main/thirdPartyLicenses.test.js tests/renderer/AboutDialog.test.jsx` runs.
- [x] **Step 9. Business logic – Red.** `tests/main/thirdPartyLicenses.test.js`: `collectLicenses(lock, readText)` (a) lists every non-dev package of a fake lock with its licence text, (b) also lists the bundled dev packages (`monaco-editor`, `@monaco-editor/react`, `@monaco-editor/loader`) and leaves other dev packages out, (c) falls back to the `license` field when a package has no licence file. Record the failing output (FR6.1).
- [x] **Step 10. Business logic – Green.** `scripts/third-party-licenses.mjs`: exports `collectLicenses`; run directly, it reads `package-lock.json` and `node_modules`, appends Electron's `LICENSE`, and writes `build/THIRD_PARTY_LICENSES.txt` (gitignored). `ponytail:` comment: the bundled-dev list is hand-kept; add a package there when the renderer imports a new dev dependency.
- [x] **Step 11. Refactor** with the tests green.
- [x] **Step 12. Build wiring (FR6.1).** `package.json` `build`, `build:mac`, `build:linux` run the script between `electron-vite build` and `electron-builder`; `electron-builder.yml` `extraResources` ships it as `THIRD_PARTY_LICENSES.txt`.
- [x] **Step 13. API – Red/Green.** IPC `app:openLicenses` in `src/main/ipc.js` opens `process.resourcesPath/THIRD_PARTY_LICENSES.txt` when packaged, `build/THIRD_PARTY_LICENSES.txt` in dev, with `shell.openPath`, and returns its error text; `openLicenses()` on the preload bridge. Covered through the renderer test below (thin glue).
- [x] **Step 14. Frontend – Red.** `tests/renderer/AboutDialog.test.jsx`: (a) the `about-dialog-licenses` button calls `window.bridge.openLicenses`; (b) an error from it is shown in the dialog. Record the failing output (FR6.2).
- [x] **Step 15. Frontend – Green/Refactor.** Button in `AboutDialog.jsx`; keys `about.licenses` and `about.licensesFailed` in `sv.json` and `en.json` (NFR3).

### Part C: public project files

- [x] **Step 16. README (FR5.1).** For outside users: what it is, prerequisites (`aidlc`, `gh`, Node from `.nvmrc`), install, build, test, contribute, security; "private" wording gone.
- [x] **Step 17. Community files (FR5.2–FR5.5).** `CONTRIBUTING.md` (branch names, stories in epics, TDD, one squash-merged PR per story, CI gates from `team.md`), `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1, contact `info@auctum.se`), `SECURITY.md` (GitHub private vulnerability reporting), `.github/ISSUE_TEMPLATE/bug.yml`, `feature.yml`, `.github/pull_request_template.md`.
- [x] **Step 18. CI and build config (FR4.2, FR5.6).** `release.yml`: header no longer says private; `verify` checks out with `fetch-depth: 0` and runs `gitleaks/gitleaks-action@v2` (blocks on a finding). `electron-builder.yml`: "Unsigned internal build" comment reworded. `LICENSE` and `package.json` stay MIT (FR6.3).
- [x] **Step 19. AI-DLC files (FR7).** Nothing removed; confirm `.claude/settings.json` is still tracked and the agent-hooks fixture test passes.

### Part D: check

- [x] **Step 20. Privacy check (NFR1).** A `git grep` for the personal home path, the reference project's name and the personal email return nothing outside commit metadata; generic fixture paths (`/Users/dev`, `/Users/me`, `/Users/x`) stay.
- [x] **Step 21. Full gates (NFR3).** Full suite, ESLint, Prettier green; feature docs: US-1101 stays 🚧 until delivery.

## Story traceability

| Step | Requirement |
|---|---|
| 1–2 | FR1 |
| 3 | FR2 |
| 4–6 | FR3 |
| 7, 18 | FR4 |
| 16–18 | FR5 |
| 8–15, 18 | FR6 |
| 19 | FR7 |
| 20–21 | NFR1, NFR3 |
| (after merge, person's word) | FR8 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "express",
  "test_strategy": "minimal",
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
  "input_sha256": "sha256:3a3e99f1e55b225dce936715ddd095cabaceeab0e44cf8ec6eeab8daf73e4d52",
  "contract_sha256": "sha256:c203aae185bed3ce09c3c921ca1ec08a65e296b2cff7f7791c1a0522e7468af4"
}
```
