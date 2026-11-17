# Code Generation Plan: US-0213 + US-0026 (session handoff dialog)

## Summary

- Builds: the session handoff page in the agent dialog (Compact / Fresh session / Not now, and /clear / /clear + resume at a new session), four new THADEUS hook kinds, the idle rule, per-project settings, and the US-0026 empty-page fix
- Touches: `.thadeus/hooks/dialog.sh`, `.opencode/plugins/thadeus-dialog.js`, `src/main/{agentHooks,agentAdapters,agentEvents,settings,ipc,pty}.js`, new `src/main/{contextSize,sessionHandoff}.js`, `src/renderer/{AgentDialog,TerminalContext,ProjectSettingsView}.jsx`, `src/shared/locales/{sv,en}.json`, feature docs
- Tests: about 45 new tests in 8 files (node + jsdom), test first for each behaviour; full suite stays green

Brownfield: every file is changed in place. Requirements: `inception/requirements-analysis/requirements.md` (FR/NFR IDs below). No Units: one build.

## Steps

### Step 1: Runner and baseline
- [x] Run the targeted baseline (`unit-test-instructions.md` §Baseline) and record passing counts. (NFR5)

### Step 2: US-0026 root cause first (FR7.1)
- [x] Red: in `tests/renderer/AgentDialog.test.jsx`, reproduce the empty page: a new session arrives while the dialog is open (find the event: a `SessionStart`/`ended` event with no questions, or a reply with empty text, see `statusOf`/`HookPage`, `agentEvents.js` `move(…,'ended')`). The test asserts no page with no text and no choices is shown; it fails today. Record the failing output.
- [x] Green: fix at the shared source (the event that produces the empty page is dropped or closes its page in `agentEvents.js`, or the pager skips it), so every caller is covered.
- [x] Refactor with the suite green.

### Step 3: Context size from the transcript (FR1.1, FR1.2) — data layer
- [x] Red: new `tests/main/contextSize.test.js`: last assistant `usage` in a Claude JSONL transcript gives input + cache read + cache write; a half-written last line is skipped; no usage gives `null` (not 0); a missing file gives `null`; opencode message tokens map to the same shape.
- [x] Green: new `src/main/contextSize.js` (pure parse plus one bounded tail read of the transcript, root-confined).
- [x] Refactor.

### Step 4: Hook kinds and installer (FR1.1, FR1.3, FR1.4, FR1.5, FR4.2, NFR1, NFR3)
- [x] Red: `tests/main/dialogScript.test.js` + `agentHooks.test.js` + `agentHooksInstaller.test.js` + `opencodePlugin.test.js`: new kinds `session` (SessionStart), `notify` (Notification), `precompact` (PreCompact: prints the instruction file the app wrote into the session folder, prints nothing when it is absent) never wait, exit 0 on every failure and within 2 s; the Stop `reply` entry stays as is (its payload carries `transcript_path`, which main reads). CANONICAL gains three entries; the previous release is added to `RELEASES` so installed files read as out of date and update through the preview; AI-DLC's entries are untouched. opencode plugin reports session created, idle and message token usage.
- [x] Green: extend `dialog.sh` (no parsing, POSIX only, as today), `agentHooks.js` (`KINDS`, `CANONICAL`, `RELEASES`), `thadeus-dialog.js`.
- [x] Refactor.

### Step 5: Adapters and events (FR1.3, FR1.5, FR2.3)
- [x] Red: `tests/main/agentAdapters.test.js` + `agentEvents.test.js`: `parse('session'|'notify'|'precompact')` read only known fields (`source`, `notification_type`), refuse anything else; these kinds never open a dialog page by themselves; a `session` event with source `clear` resolves a pending "ready" wait.
- [x] Green: `agentAdapters.js`, `agentEvents.js` (status signals kept per session: last stop, last notify, running tool, waiting question).
- [x] Refactor.

### Step 6: Handoff logic (FR2, FR3.4, FR5, FR6.2) — business logic
- [x] Red: new `tests/main/sessionHandoff.test.js` (pure): threshold crossing offers once; Not now re-offers only after +50 000; `STAGE_COMPLETED` offers; a gate (`[?]` in state + latest gate event `STAGE_AWAITING_APPROVAL`) offers and replaces a completion at the same boundary; Not now at a boundary waits for the next one; moments turned off never offer; idle rule (no running tool or agent, no waiting question or permission, no key in last 5 s or since last stop); turn cost = tokens × cache-read rate from `modelRates.js`, `null` when no rate; autonomous runs still get the threshold moment.
- [x] Green: new `src/main/sessionHandoff.js` (pure, no Node imports) plus wiring in `ipc.js` next to `refreshQuestions` (watcher callback reads state + audit, reusing the existing parsers).
- [x] Refactor.

### Step 7: Settings (FR6.1, FR6.3)
- [x] Red: `tests/main/settings.test.js`: `handoff: { threshold, onThreshold, onStage, onGate, autoCompactWindow }` sanitised (threshold 10 000–1 000 000, default 150 000; flags default on, autoCompactWindow off) in all three places; `pty.test.js`: `claude` starts with `CLAUDE_CODE_AUTO_COMPACT_WINDOW` only when on.
- [x] Green: `settings.js`, `ipc.js` (`projectSettings:set`), `pty.js`.
- [x] Refactor.

### Step 8: Sending commands (FR3.2, FR3.3, FR3.5, FR4.1, FR5.3, FR8.1, NFR4)
- [x] Red: `tests/renderer/terminalControl.test.jsx`: Compact types `/compact <instruction>` + Enter; Fresh types `/clear`, waits for the `session` event (source `clear`), then `/aidlc --resume`; opencode uses its commands; another harness gets no choices; nothing is typed while not idle, the choice waits; console logs before/after sizes; only fixed command text.
- [x] Green: `TerminalContext.jsx` (one `sendHandoff` path through the existing `write`), instruction text built from intent, stage, Unit, open decisions, files left.
- [x] Refactor.

### Step 9: The handoff page (FR3.1–FR3.4, NFR2) — frontend
- [x] Red: new `tests/renderer/AgentDialogHandoff.test.jsx`: the page shows size and turn cost (tokens beside the estimate, "price missing"); three choices at the moments, two at a new session; the gate note on Fresh session; "waiting until the agent is idle"; every choice by keyboard (digits, Enter); LCARS classes; `data-testid` `agent-dialog-handoff-*`.
- [x] Green: `HandoffPage` in `AgentDialog.jsx`, settings section in Configuration (`ProjectSettingsView.jsx`), keys in `sv.json` and `en.json`.
- [x] Refactor.

### Step 10: Docs and traceability
- [x] Update `docs/features/epic-02-cost-and-models.md` (US-0213) and `docs/features/epic-00-fixes.md` (US-0026): note the SessionStart/Notification entries; tick met criteria at Build and Test. Write `code-summary.md` and `traceability.json`.

## Traceability

| Requirement | Steps |
|---|---|
| FR1.1–FR1.5 | 3, 4, 5 |
| FR2.1–FR2.4 | 6 |
| FR3.1–FR3.5 | 6, 8, 9 |
| FR4.1–FR4.2 | 4, 8 |
| FR5.1–FR5.3 | 6, 8 |
| FR6.1–FR6.3 | 6, 7 |
| FR7.1 | 2 |
| FR8.1 | 8 |
| NFR1, NFR3 | 4 |
| NFR2 | 9 |
| NFR4 | 8 |
| NFR5 | 1–9 |

Open question carried from requirements (OQ1): after `/clear`, does `/aidlc --resume` show the waiting gate again and accept the approval? Checked by hand in Build and Test; if not, Fresh session at a gate is held back and the page says why.

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
