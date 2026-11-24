# Code Generation Plan: U9 u9-feature-token-log (US-1409)

## Summary

- Builds: a token log per Spec Kit feature, credited at each agent turn end (Claude Code Stop, opencode usage)
- Touches: new `src/main/speckitTokens.js`; small changes in `tokenReadings.js`, `tokenHistory.js`, `speckitFeatures.js`, `agentAdapters.js`, `ipc.js`, `vitest.config.mjs`
- Tests: about 22 unit tests in 5 test files (vitest `main`), test first

Story: US5.1 (AC5.1.1–AC5.1.3), FR9.1–FR9.3, BR1.1–BR4.1, NFR3.1–NFR3.6, NFR6.1–NFR6.2, NFR8.1, NFR1.1. Contracts
C5 (feature reader) and C8 (token log). Inputs: `functional-spec.md`, `rules.md`, `entities.md`, `security-design.md`,
`logical-components.md`, `cicd-pipeline.md`.

## Decisions taken from the code and the design reviews

- **opencode carries no message id or model.** The plugin's `session.usage.updated` event holds the session's running
  totals (`tokens: { input, output, reasoning, cache: { read, write } }`, `cost`). So opencode is counted by the
  increase of the session total since the cursor (NFR6.2 holds: a re-sent total adds only its increase), keyed by
  session id, and its dollars are the increase of the event's own `cost`. An event without `tokens` is ignored
  (NFR6.1). No plugin change. This replaces the "message id" wording of NFR6.1 and the price-table rule BR4.1 for
  opencode only; Claude calls keep BR4.1.
- **Symlink check.** `insideDir` does only `path.resolve`; the new module calls `fs.realpath` on the transcript and on
  `~/.claude/projects` first, then `insideDir` (NFR3.2, NFR design review).
- **Cursor per project.** One cursor file per project in `userData/speckit-tokens/<sha1 of root>.json`, so the
  per-project queue owns its file and two projects cannot overwrite each other. Sessions not seen for 30 days are
  dropped on write.
- **Known ceilings, marked `ponytail:`.** A crash between the bucket write and the cursor write counts that turn twice;
  a deleted cursor recounts earlier calls into `speckit-project`. Each Stop reads the whole transcript (as US-0215
  does). All three are rare and stay visible in the code.
- **Bucket key.** The active feature from the C5 reader, then the existing name check (`^[\w.-]+$`, no `..`); anything
  else is `speckit-project`. No extra reserved-name list (the review found it redundant).
- **Coverage.** A per-file 80% line entry for `src/main/speckitTokens.js` in `vitest.config.mjs` (infrastructure review:
  no such entry existed). No packaging check is claimed for the cursor path.

## Steps

- [x] Step 1: Project structure. Create `src/main/speckitTokens.js` with a header naming US-1409; no new dependency.
- [x] Step 2: Runner. Verify `npx vitest run --project main tests/main/speckitTokens.test.js tests/main/tokenReadings.test.js tests/main/tokenHistory.test.js tests/main/speckitFeatures.test.js tests/main/agentAdapters.test.js` runs; record it in `unit-test-instructions.md`.
- [x] Step 3: Data model, Red. In `tests/main/tokenReadings.test.js`: `mergeReading` adds a turn to the last reading, replaces it inside 30 s, appends after, thins past `MAX_READINGS` (BR2.2). In `tests/main/tokenHistory.test.js`: `callsOfTranscript` keeps `id` and `model` per call. Record the failing output.
- [x] Step 4: Data model, Green. `tokenReadings.js`: export `mergeReading(list, turn, at)` and `writeReadings(root, key, list)` (the write half of `recordReading`, same `resolveInRoot` + `writeAtomic`); `addReading` and `recordReading` unchanged. `tokenHistory.js`: `addLine` keeps `id` and `message.model`.
- [x] Step 5: Data model, Refactor with the suite green.
- [x] Step 6: Data access, Red. `tests/main/speckitFeatures.test.js`: `activeFeature(root)` gives the folder for a valid `feature.json`, null for missing, unreadable or a missing folder (BR2.1). `tests/main/speckitTokens.test.js`: cursor store reads missing as empty, writes ids and counts only (NFR3.5), prunes sessions older than 30 days. Record the failing output.
- [x] Step 7: Data access, Green. Export `activeFeature(root)` from `speckitFeatures.js` (reuses `listFeatureDirs` + `readActive`). Cursor store in `speckitTokens.js` (`writeAtomic`, per-project file).
- [x] Step 8: Data access, Refactor with the suite green.
- [x] Step 9: Business logic, Red. `tests/main/speckitTokens.test.js`: Claude turn counts only uncounted or grown calls (BR1.2, NFR6.2); first sight puts earlier calls in `speckit-project` (NFR3.6); transcript outside, `..`, symlink out is skipped and logged (NFR3.2); opencode increase of totals and cost, event without tokens ignored (BR1.3, NFR6.1); active feature at turn end decides the bucket, bad key goes to `speckit-project` (BR1.4, BR2.1, NFR3.3); unknown model adds tokens, no dollars (BR4.1); symlinked `.thadeus` refuses, cursor kept (NFR3.4, BR3.2); fs-write spy sees only `.thadeus/tokens/speckit-*.json` (NFR3.1); two turns of one project run in order (W1). Record the failing output.
- [x] Step 10: Business logic, Green. `speckitTokens.js`: `createSpeckitTokens({ userDataDir, projectsDir, ratesOf })` with `onTurn({ root, harness, sessionId, transcriptPath | usage })`; per-project promise queue; credit, write bucket, then advance cursor; errors as one console line (NFR1.1).
- [x] Step 11: Business logic, Refactor with the suite green; mark the three `ponytail:` ceilings.
- [x] Step 12: Endpoint, Red. `tests/main/agentAdapters.test.js`: opencode `usage` result carries `usage: { tokens, cost }` when present, none otherwise. Record the failing output.
- [x] Step 13: Endpoint, Green. `agentAdapters.js` `opencodeSignal` adds `usage`. `ipc.js`: one `store.onSignal` listener that calls `onTurn` for a `speckit` project on a Claude `reply` with a transcript path or an opencode `usage` (BR1.1); AI-DLC projects untouched.
- [x] Step 14: Endpoint, Refactor with the suite green.
- [x] Step 15: Frontend: none (no view in this story).
- [x] Step 16: Configuration. `vitest.config.mjs`: `'src/main/speckitTokens.js': { lines: 80 }` (NFR8.1).
- [x] Step 17: Documentation and traceability. Header and doc comments name US-1409 and the rule ids; ESLint and Prettier clean.

| Step | Story / AC |
|---|---|
| 3–5, 9–11 | US5.1 AC5.1.1 (credit the active feature) |
| 6–8, 9–11 | US5.1 AC5.1.2 (project bucket) |
| 4, 9–11 | US5.1 AC5.1.3 (only `.thadeus/tokens/`) |
| 12–14 | US5.1 AC5.1.1 (both harnesses) |
| 16–17 | NFR8.1 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "classic",
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
  "input_sha256": "sha256:36dbd137c1dafd3e8f4a29e23917b2a23c6dca6c2eacae2219e2473d1661458b",
  "contract_sha256": "sha256:bfe3fc216905988409d5a13f51ed4ab2709768afac7dac9ce951c1faa1c86abd"
}
```
