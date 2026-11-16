# Code Generation Plan: US-0209 an intent's cost counts every machine

## Summary

- Builds: cost from every machine's audit shard rows and committed snapshots, merged once with this machine's ledger, plus a machines line and a "partial" tag in the cost views
- Touches: new `src/main/parsers/auditCost.js`, new `src/main/usageSnapshot.js`; changes `src/main/projectService.js`, `src/main/ipc.js`, `src/main/watcher.js`, `src/renderer/CostPanel.jsx`, `src/renderer/CostTab.jsx`, `src/shared/locales/{sv,en}.json`
- Tests: about 14 unit tests (main: parsing, merge, snapshot, watcher; renderer: machines line and partial tag), plus the full suite green

Zero-Unit express work: one iteration, built from `inception/requirements-analysis/requirements.md` and the code knowledge base (`codekb/aidlc-dash/architecture.md`, "US-0209 cost sources").

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

## Steps

Layers that do not apply: there is no database or repository layer (the files are the data). "Data model" is the parsing of the audit rows and the snapshot file; "business logic" is the merge; "API" is the `project:cost` handler and the watcher.

- [x] **Step 1: Structure.** Note the new files: `src/main/parsers/auditCost.js` (pure, no Node imports), `src/main/usageSnapshot.js` (file I/O), test fixtures under `tests/fixtures/cost/` (two shards with cost rows, one snapshot, one copy of 261113-cost-and-models' shard). No new dependency.
- [x] **Step 2: Runner.** Verify `npx vitest run tests/main/ledger.test.js` runs green on the unchanged tree and record the scoped command from `unit-test-instructions.md`.
- [x] **Step 3: Parsing, Red (FR1.1, FR1.2, FR1.3).** `tests/main/auditCost.test.js`: one `STAGE_COMPLETED` block becomes a cost (USD, tokens, by model and agent, with `71k`/`13.4M` read as numbers); two rows for the same stage in one shard count only the last, and rows per Unit count apart; `WORKFLOW_COMPLETED` adds nothing; the 261113-cost-and-models fixture totals $23.39. Run and record the failure.
- [x] **Step 4: Parsing, Green.** `auditCost.js`: `stageRollups(events)` (last row per shard, stage and Unit) and `shardCosts(events)` → per shard `{host, cloneId, cost}` in the `perIntent` shape (`total, tokens, byStage, byAgent, byModel, stageModels, agentModels, complete`). Header names US-0209.
- [x] **Step 5: Parsing, Refactor** with the tests green. Reuse `costOf`/`addCost` from `ledger.js` (export them) instead of copying.
- [x] **Step 6: Snapshot, Red (FR3.1, FR3.2, FR3.3, NFR2).** `tests/main/usageSnapshot.test.js`: `snapshotOf(ledger)` holds every intent of the ledger (the backfill); its keys are only the allowed ones (no `sessions`, no paths); `writeSnapshot` writes `.thadeus/usage/<host>-<clone-id>.json` and does not rewrite an unchanged file; `readSnapshots` skips a malformed file (NFR3).
- [x] **Step 7: Snapshot, Green.** `usageSnapshot.js`: `snapshotOf`, `writeSnapshot` (through `resolveInRoot` + `writeAtomic` like `tokenReadings.js`), `readSnapshots`, `localClone(root)` (reads `aidlc/.aidlc-clone-id`; host from this machine's shard name, else `os.hostname()`).
- [x] **Step 8: Snapshot, Refactor** with the tests green.
- [x] **Step 9: Merge, Red (FR1.4, FR2.1–FR2.3, FR3.4, FR4.2).** `tests/main/crossMachineCost.test.js`: no ledger → the shard rows give the cost; machine A's ledger plus B's shard → A's ledger plus B's row, A's own shard ignored; the ledger lacks the intent → A's shard counts; B with a snapshot → the larger of snapshot and shard total, never both; `machines` lists each host with `local` and `source`; `partial` is true when any part is shard rows only.
- [x] **Step 10: Merge, Green.** `mergeIntentCosts({ledgerCost, local, shards, snapshots})` in `auditCost.js`, and `loadCrossMachineCost(root, space, intents)` in `projectService.js`. It reads every intent's shards through `loadAuditEvents`, the snapshots and the clone id, and returns `perIntent[dir]` with `machines` and `partial`, plus `project.machines` and `project.partial`.
- [x] **Step 11: Merge, Refactor** with the tests green.
- [x] **Step 12: API, Red (FR1.4, FR3.1, FR5.1).** `tests/main/ipc.test.js`: `project:cost` with no ledger but cost rows answers `available: true`; with a ledger it writes the snapshot. `tests/main/watcher.test.js`: a change in an `audit/*.md` and in `.thadeus/usage/*.json` sets `costChanged`.
- [x] **Step 13: API, Green.** `ipc.js` `project:cost` uses `loadCrossMachineCost`. Token readings still come from the local ledger summary only (assumption in requirements). `watcher.js`: audit shard paths and a `usageDir` set `costChanged`; `ipc.js` passes `usageDir`.
- [x] **Step 14: API, Refactor** with the tests green.
- [x] **Step 15: Frontend, Red (FR4.1, FR4.2, FR4.3).** `tests/renderer/CostPanel.test.jsx` and a new `tests/renderer/CostTab.test.jsx`: the line under the total names the machines with "den här datorn" marked; the "partial" tag shows with its tooltip only when `partial`; every cost stays labelled as an estimate.
- [x] **Step 16: Frontend, Green.** A small `MachinesLine` in `CostPanel.jsx`, used by `CostTab.jsx`; `data-testid="cost-machines"` and `cost-partial`; new keys `cost.machines`, `cost.thisMachine`, `cost.partial`, `cost.partialHelp` in `sv.json` and `en.json`.
- [x] **Step 17: Frontend, Refactor** with the tests green.
- [x] **Step 18: Config.** No build or config change. `.thadeus/usage/` stays tracked (not in `.gitignore`).
- [x] **Step 19: Docs and full suite.** JSDoc on exported functions naming US-0209 and the FR; update `codekb` notes only through a later scan. Run `npx vitest run tests/` green.

## Traceability

| Requirement | Steps |
|---|---|
| FR1.1–FR1.3 | 3–5 |
| FR1.4 | 9–13 |
| FR2.1–FR2.3 | 9–11 |
| FR3.1–FR3.3, FR3.5 | 6–8, 12–13 |
| FR3.4 | 9–11 |
| FR4.1–FR4.3 | 15–17 |
| FR5.1 | 12–14 |
| NFR1 | 3, 9 |
| NFR2 | 6 |
| NFR3 | 6, 9 |
| NFR4 | 2, 19 |
