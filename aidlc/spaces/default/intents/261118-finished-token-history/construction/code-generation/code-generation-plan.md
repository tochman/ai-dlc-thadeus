# Code Generation Plan: US-0215 Token history for finished intents

## Summary

- Builds: rebuilt token history from Claude Code transcripts for finished intents with no readings, a figures strip, and the "rebuilt" / "no history here" / gap notes
- Touches: new `src/main/tokenHistory.js`; `src/main/contextSize.js`, `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/TokenDetail.jsx`, `src/renderer/tokenChart.js`, `src/renderer/IntentDetail.jsx`, the two locale files, the token detail CSS
- Tests: about 22 new tests (12 main unit, 4 chart unit, 6 renderer jsdom), TDD

## Design in short

- **Main, `tokenHistory.js` (new).** Pure parts: `callsOfTranscript(lines)` (assistant lines with `message.usage`, one per `message.id`, the last line kept, because Claude Code writes one line per content block with the same usage; broken lines skipped), `stageWindows(events)` (opens on `STAGE_STARTED` and `WORKFLOW_UNPARKED`; closes on `STAGE_COMPLETED`, `STAGE_SKIPPED`, `STAGE_JUMPED`, `WORKFLOW_PARKED`, `WORKFLOW_COMPLETED` or the next `STAGE_STARTED`; no stage events gives one first-to-last window), `wallClockMs(events)` (`WORKFLOW_STARTED` to `WORKFLOW_COMPLETED`, else null), `rebuildReadings(calls, windows)` (calls inside a window, cumulative, in the stored-reading shape with `usd: null`). I/O: `readTranscriptCalls(file, allowedDir)` streams the file line by line with `readline`, so a large transcript never blocks main; `loadTokenHistory(...)` picks the source and keeps a rebuilt result in a module `Map` per root and intent.
- **Confinement.** `contextSize.js` gets one exported `insideDir(file, allowedDir)`, used by both `readTranscriptContext` and `readTranscriptCalls` (FR2.1).
- **IPC.** `tokens:readings(projectId, dirName, space)` returns `{ source: 'recorded' | 'rebuilt' | 'none', readings, wallMs, gap }`. Live intents keep today's path (recorded readings only). `gap` is `{ ledgerTokens, rebuiltTokens, missingSessions, outsideTokens }` when the totals differ, else null (FR5).
- **Renderer.** `TokenDetail` reads both the new object and a bare array (older shape), shows the ledger figures at once and the diagrams when the answer comes (NFR1), one note sentence per source (FR2.5, FR3), the gap line (FR5), and a figures strip. `runFigures(...)` in `tokenChart.js` computes the strip; an unknown figure is null and shows "–" (FR4.6).
- The rebuild writes nothing under `aidlc/` or `.thadeus/` (FR6).

## Steps

- [x] Step 1: Verify the runner: `npx vitest run tests/main/contextSize.test.js` passes on the unchanged tree; record the unit-scoped commands in `unit-test-instructions.md`.
- [x] Step 2: Transcript calls - Red: tests in `tests/main/tokenHistory.test.js` for `callsOfTranscript` (one call per `message.id`, a broken line skipped, a user line ignored, kinds split into input, output, cache write 5m/1h, cache read) and `readTranscriptCalls` (outside the projects folder gives null, a missing file gives null). Record the failing output. (FR2.1, FR2.2)
- [x] Step 3: Transcript calls - Green: `insideDir` in `contextSize.js`; `callsOfTranscript` and `readTranscriptCalls` in `src/main/tokenHistory.js`. (FR2.1, FR2.2)
- [x] Step 4: Stage windows - Red: tests for `stageWindows` (start to complete, park and unpark, next start closes the open window, no stage events gives one window) and `wallClockMs` (started to completed; not completed gives null). (FR2.3, FR4.3)
- [x] Step 5: Stage windows - Green: implement both. (FR2.3, FR4.3)
- [x] Step 6: Rebuild - Red: tests for `rebuildReadings` (calls outside every window dropped, cumulative totals, stored-reading shape) and `loadTokenHistory` (recorded readings win even when few, FR1.1; rebuilt when none; `none` when no transcript is readable; the second call is served from memory; `gap` names the missing sessions and the tokens outside the windows; nothing is written in the project). (FR1.1, FR2.3, FR2.4, FR3, FR5, FR6)
- [x] Step 7: Rebuild - Green: implement both; refactor with the main tests green. (FR2.4, FR5, FR6)
- [x] Step 8: IPC: `tokens:readings` takes `space`, finds the intent's uuid and `status` with `loadIntentList`, the ledger with `loadCost`, the audit with `loadAuditEvents`, and the projects folder as `readTranscriptContext` does; `preload/index.js` comment updated. A failed rebuild logs and returns `none` (NFR1). (FR6)
- [x] Step 9: Figures - Red: tests in `tests/main/tokenChart.test.js` for `runFigures` (kinds from the ledger; working time from readings; peak rate equals the highest `rateSeries` point; cache-read share; every unknown figure null). (FR4.1–FR4.6)
- [x] Step 10: Figures - Green: `runFigures` in `src/renderer/tokenChart.js`. (FR4)
- [x] Step 11: View - Red: tests in `tests/renderer/TokenDetail.test.jsx`: a finished intent with 300 readings draws all of them in the table (FR1); `rebuilt` shows its note sentence (FR2.5); `none` shows the ledger totals and its note, no empty chart (FR3); the strip shows "–" for an unknown figure and the estimate label (FR4.2, FR4.6); the gap line shows the difference and its reason (FR5); a bare array still works. (FR1–FR5)
- [x] Step 12: View - Green: `TokenDetail.jsx` (`RunFigures` strip, source note, gap line), `IntentDetail.jsx` passes `space`, keys in `sv.json` and `en.json` through `t()`, LCARS styles in the token detail CSS; status in text, never colour alone. Refactor with the renderer tests green. (FR2.5, FR3, FR4, FR5, NFR2)
- [x] Step 13: Check against a real transcript: run `loadTokenHistory` for one finished intent without readings from a small vitest file kept out of the suite, or by a one-off node call, and compare with the ledger; note the result in `code-summary.md` (requirements assumption 1). Nothing is written.
- [x] Step 14: Docs and traceability: US-0215 stays 🚧 in `docs/features/epic-02-cost-and-models.md` and `docs/FEATURES.md` until Build and Test; module headers name US-0215 and the FR.

## Story traceability

All steps implement US-0215 (EPIC-02). FR1: Step 11. FR1.1: Step 6. FR2: Steps 2–7. FR3: Steps 6, 11. FR4: Steps 4, 9–12. FR5: Steps 6, 11. FR6: Steps 6–8. NFR1: Steps 3, 8, 12. NFR2: Step 12. NFR3: every Red step.

## Out of the plan

No coverage tool setup (team rule says it is still to be added; not this story). Live intents are unchanged. Subagent transcripts are not read.

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
  "input_sha256": "sha256:966ae7aa76a3ff867860dd0a2f0ee2fa471dead8c2ee6b26e903919b9f425698",
  "contract_sha256": "sha256:89b142ff38d5934191dfc83fed7aed0fa585c14d568cc2a017bf79391c7e68d1"
}
```
