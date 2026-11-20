# Code Generation Plan: U4 u4-park-unpark (US-0510)

## Summary

- Builds: a live LCARS "Parked" mark with its stage on parked intents, Park on the active in-flight intent, Unpark on any parked one (switching the active intent first when needed), and Resume that unparks first
- Touches: new `src/main/intentPark.js`, `src/main/projectService.js` (the summary), `src/main/ipc.js` and `src/preload/index.js` (two channels), `src/renderer/IntentList.jsx`, `IntentDetail.jsx`, `ResumeButton.jsx`, `theme.css`, the locales, their tests
- Tests: 20 new tests (11 in `intentPark.test.js`, 2 in `projectService.test.js`, 2 in `IntentList.test.jsx`, 2 in `IntentDetail.test.jsx`, 2 in `ResumeButton.test.jsx`, 1 in `ProjectView.test.jsx`), test first; Steps 1-12 are built and committed (`0647cdf`), Step 13 (the list's Resume, in `src/renderer/ProjectView.jsx`) is new

Story: US4.1 (US-0510), AC4.1.1–AC4.1.6; FR4.1–FR4.6; NFR1–NFR5. Design: ADR-004 (`../../../inception/domain-design/decisions.md`), as the person confirmed again on 2026-11-20: `aidlc engine status` on load plus the audit events for live changes.

## Design

- `intentPark.js` (new; doc comments name US-0510):
  - `parkedFromAudit(events)` (pure) returns `{parked, stage, at}` from the last `WORKFLOW_PARKED` or `WORKFLOW_UNPARKED` event, with `stage` from the parked event.
  - `parkedFromStatus(text)` (pure) reads the active intent's state from `aidlc engine status`: parked when its `Status:` line names parking. `ponytail:` comment: that line was not seen on a parked intent while planning; the audit covers it either way.
  - `park(root)` runs `aidlc engine orchestrate park --person-asked`.
  - `unpark(root, dirName, {activeDirName, known})` checks `dirName` with `assertName` and against the intent list (`known`). When `dirName` is not the active intent, it first runs `aidlc intent <dirName>`, then `aidlc engine state unpark`. It returns `{ok, switched}`, or `{ok: false, error, switched}` naming a switch already made (FR4.5).
  - Every command goes through `runFixed` with fixed arguments and a timeout, never `--help`. A refusal or failure comes back as a value; nothing more runs after it.
- `projectService.js`: `summarizeIntent` adds `parked`, `parkedStage` and `parkedAt` from `parkedFromAudit`. The audit is already read when its folder changes, and the intents watcher reloads the list on audit writes, so the mark follows an agent's park live (FR4.6). On `project:open`, and after the app's own Park or Unpark, `ipc.js` also reads `aidlc engine status` for the active intent; when it disagrees with the audit, the newer one wins (status at its read time, the audit at its event time).
- `ipc.js` and `preload`: `intents:park(projectId)` and `intents:unpark(projectId, dirName)` call `intentPark.js` and then send `project:changed`.
- `IntentList.jsx` and `IntentDetail.jsx`: a parked intent shows an LCARS mark, `data-testid="intent-parked"`, with `t('intents.parked', {stage})`. The detail shows Park (`intent-park`) only on the active intent while it is in flight and not parked, and Unpark (`intent-unpark`) on any parked intent. After Unpark on another intent, one line says it is now the active intent (`t('intents.nowActive', {name})`). A failure shows its reason in the existing `refresh-error` line. No native `title=`.
- `ResumeButton.jsx`: on a parked intent, it calls `unpark` first and types `/aidlc --resume` only on success (FR4.4).

## Steps

- [ ] **Step 1** (setup): from `main`, create the branch `feat/US-0510`. Set US-0510 to 🚧 In progress, for v0.2.13, in its marker in `docs/features/epic-05-workflow-control.md`, in that epic's **Status** line and in its `docs/FEATURES.md` cell. Run `npx vitest run tests/main/featureDocsStatus.test.js`.
- [ ] **Step 2** (runner): run `npx vitest run tests/main/projectService.test.js tests/renderer/IntentList.test.jsx tests/renderer/IntentDetail.test.jsx tests/renderer/ResumeButton.test.jsx` on the unchanged code and record that it is green.
- [ ] **Step 3** (business logic, Red): new `tests/main/intentPark.test.js` with an injected `exec`:
  - `parkedFromAudit`: a last parked event gives the parked state and its stage, and a later unparked event clears it (AC4.1.1, AC4.1.6);
  - `parkedFromStatus`: a status naming parking gives parked; the current output gives not parked;
  - `park` runs exactly `aidlc engine orchestrate park --person-asked` (AC4.1.2);
  - `unpark` on the active intent runs only `aidlc engine state unpark`;
  - `unpark` on another intent runs `aidlc intent <name>`, then `aidlc engine state unpark`, and reports `switched` (AC4.1.3);
  - a refused park comes back with its reason, and nothing else runs (AC4.1.5);
  - a name not in the list, or not a valid name, throws before anything runs (NFR4);
  - a failed unpark after the switch reports the switch.

  Run `npx vitest run tests/main/intentPark.test.js` and record the failing output.
- [ ] **Step 4** (Green): implement `intentPark.js`. Run it green.
- [ ] **Step 5** (Refactor) with the tests green.
- [ ] **Step 6** (data access, Red): in `tests/main/projectService.test.js`, add: an intent whose audit ends with a parked event is listed with `parked: true` and its stage; one whose audit ends with an unparked event is not (AC4.1.1, AC4.1.6). Run `npx vitest run tests/main/projectService.test.js` and record the failing output.
- [ ] **Step 7** (Green): `summarizeIntent` adds the fields. Then `ipc.js` gets `intents:park` and `intents:unpark` and the status read on open and after Park/Unpark, and `preload` gets `parkIntent` and `unparkIntent`. Run `npx vitest run tests/main/projectService.test.js tests/main/ipc.test.js` green.
- [ ] **Step 8** (Refactor) with the tests green.
- [ ] **Step 9** (frontend, Red): add:
  - `IntentList.test.jsx`: a parked intent's row shows `intent-parked` with its stage; others do not (AC4.1.1);
  - `IntentDetail.test.jsx`: Park shows only on the active in-flight intent and calls `parkIntent`; Unpark on a parked intent calls `unparkIntent` and shows the now-active line when `switched` (AC4.1.2, AC4.1.3);
  - `ResumeButton.test.jsx`: on a parked intent, Resume unparks first and types `/aidlc --resume` only after success; on failure it types nothing and shows the reason (AC4.1.4, AC4.1.5).

  Run `npx vitest run tests/renderer/IntentList.test.jsx tests/renderer/IntentDetail.test.jsx tests/renderer/ResumeButton.test.jsx` and record the failing output.
- [ ] **Step 10** (Green): the mark, the buttons and the Resume change; LCARS classes in `theme.css`; `intents.parked`, `intents.park`, `intents.unpark` and `intents.nowActive` in `sv.json` and `en.json`. Run the renderer tests and `npx vitest run tests/main/i18nKeys.test.js tests/renderer/noNativeTitle.test.jsx` green.
- [ ] **Step 11** (Refactor) with the tests green.
- [ ] **Step 12** (checks): this Unit's command from `unit-test-instructions.md`, then `npx eslint` and `npx prettier --check` on the changed files.

- [ ] **Step 13** (frontend, added at the person's request after the build): the intents list's Resume can unpark. Red: in `tests/renderer/ProjectView.test.jsx`, a parked intent's Resume in the list is available and unparks through `unparkIntent` with the project's id (AC4.1.4); run `npx vitest run tests/renderer/ProjectView.test.jsx` and record the failing output. Green: pass `projectId={projectId}` to `<IntentList …>` in `src/renderer/ProjectView.jsx` (one prop; the file is also the Spec Kit work's, so change nothing else) and remove the `ponytail:` note in `IntentList.jsx` that waited for it. Refactor with `npx vitest run tests/renderer/ProjectView.test.jsx tests/renderer/IntentList.test.jsx tests/renderer/ResumeButton.test.jsx` green, then ESLint and Prettier on the changed files.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "ultra-express",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided at the practices interview (test first for new work), carried over from the baseline. Git history cannot show test-first ordering, so this is not re-proven from evidence.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with three projects: `main` (node, `tests/main/**`, 98 files), `scripts` (the timed hook-script tests, run after the others, retried twice), and `renderer` (jsdom, `tests/renderer/**`, 53 files, Swedish locale).\n- **End-to-end**: Playwright 1.65 drives the built app through Electron (`tests/e2e`, US-0608). This is new since the baseline.\n- **Test count**: about 1,630 `it`/`test` lines by a static grep (1,136 in `main`, 497 in `renderer`). The baseline's 353 was out of date. Not counted by running the suite.\n- **Coverage floor**: 80% line coverage, v8, over `src/**` and the app's opencode plugin. Some agent and dialog files each hold 80% on their own. Set up in `vitest.config.mjs` and checked in CI. Current percentage not measured here.\n- **Suite green before merge**: the full suite (`npx vitest run tests/ --coverage`) runs in CI on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is still checked by hand before a release tag. The built-app Playwright tests in CI do not replace this check."
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
  "input_sha256": "sha256:62e0e9fa98cd86fbefaed196456b1ab91473689ff98919dd339561dd96d35b90",
  "contract_sha256": "sha256:b4ae8e1ec7217b124511fee47f9c29395d19f01a4e3b3abd23c00abd3e6afb59"
}
```
