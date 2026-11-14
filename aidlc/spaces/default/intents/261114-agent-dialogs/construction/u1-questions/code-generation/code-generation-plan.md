# Code Generation Plan: u1-questions

## Summary

- Builds: the quality gates (coverage 80%, ESLint, Prettier in CI), then the agent question pipeline: hook script, opencode plugin, channel, adapters, event store, IPC bridge and AgentDialog in place of QuestionPopup
- Touches: package.json, vitest.config.mjs, eslint.config.mjs, .prettierrc.json, .prettierignore, .github/workflows/release.yml, .thadeus/hooks/dialog.sh, .opencode/plugins/thadeus-dialog.js, src/shared/agentText.js, src/main/agent*.js, src/main/{pty,ipc,index,questions}.js, src/preload/index.js, src/renderer/{AgentDialog,App,ArtifactReader}.jsx, the two locale files, contract-summary.md
- Tests: about 130 new tests in 13 files (unit tests per component, plus integration tests of the real script against a real channel folder, run under sh and dash), and the 15 QuestionPopup tests moved to AgentDialog

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
  "input_sha256": "sha256:0db0277d6c2a6742d5982d08f7356d1c82513cd0b72253b0dfc67cfe6f0770b5",
  "contract_sha256": "sha256:71418531672369a589adb02df222cd73b11bef5572eb7b2d1ef1c7ed1dcfb984"
}
```

## Sources

- Unit design: `construction/u1-questions/functional-design/` (functional-spec.md W1–W8 and the state machine, rules.md BR1.1–BR4.6, entities.md), `nfr-requirements/` (NFR1.1–NFR8.4, tech-stack D1–D6), `nfr-design/` (LC1–LC10, RD1–RD9, SD1–SD7, PD1–PD6, OD1–OD4, SCD1–SCD5, the C1 amendment) and `nfr-design/reviews/review-01.md` (R-01 to R-07), with `nfr-design/memory.md` "Open questions".
- Inception: `inception/domain-design/components.md`, `inception/contract-design/contract-summary.md` (C1–C6), `inception/units-generation/unit-of-work.md` and `unit-of-work-story-map.md`, `inception/requirements-analysis/requirements.md`, `inception/user-stories/stories.md` (US1.1, AC1.1.1–AC1.1.11), `inception/delivery-planning/bolt-plan.md` (B1 first task).
- Cross-Unit amendments that land here because u1 is built first: u5 `nfr-design/logical-components.md` "Amendments for Code Generation" 1–3 and 6 (C4 focus row, the one `src/shared/agentText.js`, `visibleText` for header and option text, event ids ≤ 64 characters); u2 `nfr-design/security-design.md` SD14 (wait marker without `: >`, single-instance lock before `init()`, "sent" only while the folder exists); u3 `nfr-design/logical-components.md` (LC12 TextSanitizer is created by u1).
- Existing code read: `src/main/{pty,ipc,notify,fileWrite,projectAccess,watcher,index,questions}.js`, `src/preload/index.js`, `src/renderer/{QuestionPopup,App,TerminalContext,ArtifactReader}.jsx`, `src/shared/locales/{sv,en}.json`, `vitest.config.mjs`, `package.json`, `.github/workflows/release.yml`, `tests/main/{i18nKeys,pty,windowOptions}.test.js`, `tests/renderer/QuestionPopup.test.jsx`.

## Key decisions

| # | Decision | Why |
|---|---|---|
| K1 | Coverage floor is project-wide: `thresholds.lines: 80` over `src/**/*.{js,jsx}` and the plugin file; the Unit's new files also get per-file 80% globs (NFR8.2). Step 3 measures the baseline first. If the existing code is below 80%, the build stops and the gap goes to the person. No threshold is lowered and no file is excluded to pass. | team Testing Posture; stage rule: targets are inputs |
| K2 | Prettier: `printWidth 160`, single quotes, semicolons, 2 spaces, `trailingComma: "none"`, `arrowParens: "always"`, matching today's hand style. AI-DLC records, harness folders, docs, Markdown, fixtures and generated output are ignored, so the format pass touches only code and config. | team Code Style; framework files are engine-owned |
| K3 | ESLint flat config: `@eslint/js` recommended, `eslint-plugin-react` only for `jsx-uses-vars` (React 19 JSX transform), `eslint-plugin-react-hooks` with `rules-of-hooks: error` and `exhaustive-deps: warn` only (not the plugin's full recommended set), `eslint-config-prettier` last, `no-empty` with `allowEmptyCatch`. A finding in existing code whose fix would change behaviour gets a `// eslint-disable-next-line <rule> -- <reason>` line, never a code change. | smallest rule set that catches real errors; the existing code keeps its behaviour |
| K4 | The development switch for BR2.7 until u4 is `THADEUS_AGENT_HOOKS=1` in the app's environment, behind `hooksCurrent(projectRoot, harness)` with C5's signature. With it off, no channel session is opened, the agent tab gets no `THADEUS_*` variable, the hook exits at once, and the dialog shows today's audit-log questions. With it on, a project with a live channel session shows hook events, and its audit questions add context only (BR2.5). | a hook installed by hand never waits for an app that will not show its question |
| K5 | Single-instance lock (review R-02 Major, u2 SD14): `app.requestSingleInstanceLock()` right after `app.setPath('userData')` in `src/main/index.js`. A second start quits before `registerIpc()`, so the channel's start-up wipe (RD6) never runs beside a live instance. `second-instance` brings the first window forward. | per-instance scoping would need an owner-pid protocol; the lock is two lines |
| K6 | `dialog.sh` writes the wait marker with `printf '' > "$a.wait" \|\| exit 0`, never `: >` (review R-01 Major). Before it writes anything, a waiting hook runs one `sleep 0.1 \|\| exit 0` after its first read of `alive`. This probes fractional sleep and adds the 20th sleep of the liveness count (review R-03), so 20 unchanged polls mean at least 2.0 s. | dash exits 2 on a failed redirect of the special builtin `:`; the probe settles R-03 without changing C1's 20-poll rule |
| K7 | The agent's Markdown body is rendered by `FileContent` with a new optional prop `html="text"`, which leaves out `skipHtml`. react-markdown then escapes raw HTML, so `<script>` shows as text, as AC1.1.3 and FR2.2 say. SD6's "dropped" wording is narrower than the acceptance criterion. Every other `FileContent` caller keeps `skipHtml`. | AC1.1.3 is the acceptance contract |
| K8 | Header, option label and option description are shown through `visibleText(s)` (one line) from `src/shared/agentText.js` (u5 amendment 3). What goes back to the agent is always the label the event carried, never the display string (BR3.3). | the display escape must never change the answer |
| K9 | `src/shared/agentText.js` is created with all eight exports u5's table settles (`UNSAFE`, `cleanLine`, `stripUnsafe`, `visibleText`, `plainLine`, `firstLine`, `cutGraphemes`, `utf8Bytes`), one test file for the module. u1 itself uses `visibleText` and `cleanLine`. | u5 amendment 2: one module, created by the first Unit |
| K10 | The renderer-facing wiring of IpcRouter for this feature goes in a new `src/main/agentIpc.js`, a factory with no Electron import. `ipc.js` only spreads its handlers and calls its spawn, exit and shutdown hooks. | `ipc.js` has no tests and imports Electron; the new wiring must be tested (NFR3.4, RD5) |
| K11 | `via: keys` (hook gave up, or opencode refused) is built for single-question events: a single pick, or an own answer. A batch or a multi-select answer as keys fails with the "answer in the terminal" sentence and keeps the answer (BR3.4). The code carries a `ponytail:` comment naming this limit and the upgrade path (record the picker's key sequence for tabs and checkboxes in the manual run). | the key sequences for Claude Code's batch tabs and checkboxes are not documented; a guessed sequence could pick the wrong option, which NFR2 forbids |
| K12 | The opencode plugin lives at `.opencode/plugins/thadeus-dialog.js` in this repository, so the development run loads it (the final folder stays u4's, C6). It default-exports the V2 shape `{ id, setup }` without importing `@opencode-ai/plugin`, which is not installed. | no new dependency; the manual opencode run confirms the shape loads (NFR5.7) |
| K13 | The hook entries for development (functional-spec.md, C6) are installed by hand by the person. This plan does not write `.claude/settings.json`, which AI-DLC owns. `code-summary.md` and `unit-test-instructions.md` give the entries to paste. | engine-owned file; FR4.2 needs a preview, which is u4 |
| K14 | Fixtures under `tests/fixtures/agent-events/` follow the payload shapes of the spike tables (functional-spec.md), with the 2026-11-14 labels. The manual run on the release Mac (NFR2.2) saves the real event files of the five scenarios, and they replace or confirm the fixtures before the release pull request. | the proof rule asks for recorded payloads; Code Generation cannot drive a real Claude Code question |
| K15 | `questions:focus` and `onQuestionFocus` stay. u1 adds only the C4 `agentEvents.focus` row. u5 removes the old channel after that row exists (u5 amendment 1). | the audit fallback still uses the notification click |
| K16 | u3's contract additions (C2 `onRefusedReply`, C3 `dismissed`/`stale`, C4 `agentEvents.latest` and `reopen`, the C6 Stop entry) describe u3's code and are applied by u3's Code Generation. u1 applies the C1 amendment, its review fixes and the C4 focus row. | each Unit documents the contract it builds |

## Files

| Path | New or changed | Component |
|---|---|---|
| `package.json`, `package-lock.json` | changed: dev dependencies and `lint`, `format`, `format:check`, `coverage` scripts | NFR8 |
| `vitest.config.mjs` | changed: `coverage` block | NFR8.2 |
| `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore` | new | NFR8.3 |
| `.gitignore` | changed: `coverage/` | NFR8.2 |
| `.github/workflows/release.yml` | changed: `verify` job runs coverage, ESLint, Prettier; `THADEUS_REQUIRE_DASH=1` | NFR8.2–NFR8.4 |
| existing `src/`, `tests/`, `scripts/`, config files | changed by the format pass and behaviour-neutral lint fixes only | NFR8.3 |
| `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` | changed: C1 amendment and review fixes, C2 additions, C4 focus row | C1, C2, C4 |
| `src/shared/agentText.js` | new | u3 LC12 TextSanitizer |
| `.thadeus/hooks/dialog.sh` | new | LC8 ClaudeCodeHook |
| `src/main/agentChannel.js` | new | LC1 ChannelHeartbeat, LC2 AgentChannel |
| `src/main/agentAdapters.js` | new | LC3 HarnessEventAdapter |
| `.opencode/plugins/thadeus-dialog.js` | new | LC9 OpencodePlugin |
| `src/main/agentTiming.js` | new | LC7 TimingLog |
| `src/main/agentEvents.js` | new | LC4 AgentEventStore |
| `src/main/questions.js` | changed: `auditEvent(q)` and `auditContext(questions, intent)` | FallbackQuestionSource |
| `src/main/pty.js` | changed: env built without inherited `THADEUS_*`, channel env for agent tabs, `onExit` option, `tapOutput(id, fn)` | LC5 PtyManager |
| `src/main/agentIpc.js` | new | LC6 IpcRouter (agent part) |
| `src/main/ipc.js` | changed: wires `agentIpc.js` into `pty:spawn`, `shutdown`, `refreshQuestions` and the handler table | LC6 |
| `src/main/index.js` | changed: single-instance lock; `windowOptions` gains the timing flag | K5, OD1 |
| `src/preload/index.js` | changed: `agentEvents` member (list, answer, close, onChanged, stamp only with the flag) | C4 |
| `src/renderer/AgentDialog.jsx` | new, replaces `src/renderer/QuestionPopup.jsx` (deleted) | LC10 |
| `src/renderer/ArtifactReader.jsx` | changed: `FileContent` prop `html="text"` | K7 |
| `src/renderer/App.jsx` | changed: AgentDialog in place of QuestionPopup, `agentEvents` subscription | LC10 |
| `src/renderer/theme.css` | changed only if the new elements need a class the popup styles lack | LC10 |
| `src/shared/locales/sv.json`, `en.json` | changed: `agentDialog.*` keys; popup-only keys removed when no `t()` call uses them any more | NFR7.1 |
| `tests/fixtures/agent-events/**` | new: Claude Code `PreToolUse`/`PostToolUse` stdin and opencode `form.created`/`form.replied` payloads | K14 |
| `tests/main/agentText.test.js`, `dialogScript.test.js`, `agentChannel.test.js`, `agentChannelScript.test.js`, `agentAdapters.test.js`, `opencodePlugin.test.js`, `agentTiming.test.js`, `agentEvents.test.js`, `agentIpc.test.js`, `preload.test.js`, `tests/helpers/shells.js` | new | tests |
| `tests/main/pty.test.js`, `tests/main/windowOptions.test.js` | changed: new cases | tests |
| `tests/renderer/AgentDialog.test.jsx` | new; `tests/renderer/QuestionPopup.test.jsx` moved into it and deleted | tests |

TerminalContext.jsx does not change: fallback events still go through its `answer()` (BR3.6). `notify.js` does not change: per-event notifications are u5's.

## Steps

### Quality gates (Bolt 1, first task)

- [ ] Step 1: Project structure and production configuration skeleton. Install the dev tools with `npm install -D @vitest/coverage-v8@<installed vitest version, read from node_modules/vitest/package.json; 5.1.x> eslint @eslint/js globals eslint-plugin-react eslint-plugin-react-hooks eslint-config-prettier prettier`. Add the npm scripts `"coverage": "vitest run tests/ --coverage"`, `"lint": "eslint ."`, `"format": "prettier --write ."` and `"format:check": "prettier --check ."`. Add `coverage/` to `.gitignore`. (NFR8.2, NFR8.3)
- [ ] Step 2: Write the configs. `vitest.config.mjs` gains `coverage: { provider: 'v8', include: ['src/**/*.{js,jsx}', '.opencode/plugins/*.js'], reporter: ['text', 'json-summary'], thresholds: { lines: 80 } }`, inside the shared `test` block so both projects report into one result. Write `.prettierrc.json` (K2) and `.prettierignore` with `out/`, `dist/`, `build/`, `coverage/`, `node_modules/`, `aidlc/`, `.claude/`, `.aidlc/`, `.opencode/*`, `!.opencode/plugins/`, `docs/`, `*.md`, `package-lock.json`, `tests/fixtures/`, `tests/.tmp/`, `aidlc.settings.json`, `opencode.json`. Write `eslint.config.mjs` (K3): node globals for `src/main`, `src/preload`, `tests/main`, `scripts`, `.opencode/plugins` and the config files; browser globals for `src/renderer` and `tests/renderer`; `sourceType: 'commonjs'` for `*.cjs`; JSX enabled; ignores matching `.prettierignore`. (NFR8.2, NFR8.3)
- [ ] Step 3: Baseline before any edit to existing code. Run `npx vitest run tests/` and record the pass count. Then run `npx vitest run tests/ --coverage` and record the project's line coverage. If it is below 80%, stop and tell the person the measured figure and the files that pull it down. Never lower the threshold or exclude files (K1). (NFR8.2, team Testing Posture)
- [ ] Step 4: Formatting-only pass on existing code. Run `npx prettier --write .`, then `npx vitest run tests/`; the pass count must equal Step 3's. Keep it as its own commit (`chore(US-0506): format with Prettier`), so the review can skip it. No logic, rename or reordering beyond what Prettier writes. (NFR8.3)
- [ ] Step 5: Lint pass on existing code. Run `npx eslint .`. Fix only behaviour-neutral findings (unused imports and variables, a missing `globals` entry). Where a fix would change behaviour, add `// eslint-disable-next-line <rule> -- <reason>` (K3). Re-run `npx vitest run tests/`; the count must equal Step 3's. (NFR8.3)
- [ ] Step 6: CI. In the `verify` job of `.github/workflows/release.yml`, replace `npx vitest run tests/` with `npx vitest run tests/ --coverage` under `env: THADEUS_REQUIRE_DASH: '1'`, then add the steps `npx eslint .` and `npx prettier --check .`. Each is its own step, so a failure names its gate. Run the Construction Verification Command `npx vitest run tests/ --coverage && npx eslint . && npx prettier --check .` on the whole repo; it passes, or Step 3's coverage gap is already with the person. (NFR8.2, NFR8.3, NFR8.4)

### Contract documentation

- [ ] Step 7: Apply the C1 amendment of `nfr-design/logical-components.md` to `contract-summary.md` § C1: replace the `environment`, `folder`, `event_file.name`, `answer_file` and `waiting` keys, and add `event_file.order` and the "Delivery is confirmed, not assumed" bullet. Fold in review R-05: `refusals` reads "still .tmp: ignored, never read or deleted"; `versions.other_versions` says an unaccepted version is deleted with no hand-back (it may be forged), so that hook ends by its own deadline or liveness rule; `waiting` gains `entry_timeout: "600 s for the question entry, 10 s for answered (C6)"`. Fold in R-04: the bullet says "sent" is reported only while the session is live and its folder exists. In C2, add "hook gave up" to `writeAnswer`'s errors, and note `answerState` and `retract` as main-internal members. (C1, C2; R-04, R-05; BR1.1, BR1.3, BR3.2)
- [ ] Step 8: Apply the C4 focus row (u5 amendment 1): add `agentEvents.focus: { push: "agent-events:focus", payload: { eventId: string }, unit: U5 }` to the C4 YAML block, and change C4's Owner in the Contracts table to "U1; U3, U4 and U5 add members". `questions:focus` and `onQuestionFocus` stay in the code (K15). (C4)

### Runner and test data

- [ ] Step 9: Verify the existing test runner and record the unit-scoped command. Run `npx vitest run tests/main/i18nKeys.test.js` (green), and confirm `--coverage.include` and per-file globs work with the installed vitest. Create `tests/helpers/shells.js`, which exports `SHELLS`: `['sh']` plus `'dash'` when `spawnSync('dash', ['-c', 'exit 0']).status === 0`, and which throws when `THADEUS_REQUIRE_DASH=1` and dash is missing. Create the fixtures (K14): `tests/fixtures/agent-events/claude/` holds `gate-2026-11-14.json` (scenario 1: "Complete workflow" and "Request Changes" with descriptions), `reordered.json` (2), `batch-four.json` (3, one question multi-select), `multi-two.json` (4), `own-answer.json` (5), `post-tool-use.json`, `unicode-70kb.json` (generated in the test from a seed, not stored), and the malformed `no-questions.json`, `five-questions.json`, `no-text.json`, `empty-label.json`; `tests/fixtures/agent-events/opencode/` holds the same five scenarios as `form.created` payloads, plus `form-replied.json` and `form-cancelled.json`. Add `tests/fixtures/agent-events/README.md`, which says the files follow the spike tables until the manual run replaces them. (AC1.1.1, AC1.1.2, AC1.1.10; NFR2.1, NFR8.4)

### Layer: shared sanitizer (`src/shared/agentText.js`, u3 LC12)

- [ ] Step 10: Red. Write `tests/main/agentText.test.js` from u5's "Tested by": one table test over every listed code point (U+0000, U+001B, U+007F, U+0085, U+009F, U+00AD, U+061C, U+200B–U+200F, U+202A, U+202E, U+2028, U+2029, U+2060, U+2066, U+2069, U+FEFF, U+E0001, U+E0041, U+E007F, lone U+D800) with the result of each export; `UNSAFE.flags` has no `g` and two `.test()` calls in a row agree; 👩‍💻 and `åäö` unchanged by `cleanLine` and `stripUnsafe`; `visibleText` escapes to `\uXXXX`/`\u{…}`, and keeps LF and TAB with `multiline: true`; `plainLine` and `firstLine` on Markdown samples; `cutGraphemes` keeps a ZWJ sequence whole and adds "…"; `utf8Bytes` of emoji. Run `npx vitest run tests/main/agentText.test.js` and record the failing output (module missing). (u5 amendment 2; NFR7.2, BR4.1)
- [ ] Step 11: Green. Create `src/shared/agentText.js` with the eight exports (K9), no exported pattern with the `g` flag, and the `ponytail:` note that emoji tag-sequence flags lose their tags. Header comment: `US-0506 u1 (u3 LC12, u5 amendment 2)`. Run the Step 10 command: green.
- [ ] Step 12: Refactor with the Step 10 command green: one internal `every()` builder for the global pattern, no duplicate class string.

### Layer: hook script (`.thadeus/hooks/dialog.sh`, LC8; file protocol, writer side)

- [ ] Step 13: Red. Write `tests/main/dialogScript.test.js`, which runs every case once per shell in `SHELLS` and always spawns the shell explicitly (`spawn(shell, [script, kind])`, RD4). Each case asserts exit status 0 and 0 bytes on stdout and stderr unless an answer is printed. Cases: the exact C6 command through `sh -c`, 20 runs each with the variable unset and with the script folder deleted, each ≤ 100 ms (NFR4.1); folder or `alive` missing, nothing written, ≤ 100 ms (NFR4.2); `THADEUS_WAIT_SECONDS` empty or not a number; unknown kind (NFR4.3); `events/` not writable; `answers/` missing (review R-01: this one fails under dash with `: >`); a failing `sleep` on `PATH` makes the hook exit before any file exists (R-03); `alive` stops changing, exit 2.0–2.5 s after the last update (NFR5.1, BR1.2); `alive` rewritten every 500 ms for 3 s, then stopped: still waiting at 3 s, exit 2.0–2.5 s after the last write; `THADEUS_WAIT_SECONDS=2`, exit 1.0–3.2 s (NFR5.2, BR1.3); a dropped `.ans` is printed byte for byte ≤ 300 ms, with no `.wait` or `.took` left (NFR1.5); an empty `.ans` prints nothing ≤ 300 ms (NFR5.3, BR3.5); `TERM` to a waiting hook removes `.wait` (RD4); a payload with `$(touch marker)`, backticks, `;` and both quotes arrives byte for byte, and `marker` does not exist (NFR3.8, SD5); a `sleep` wrapper on `PATH` counts at most 11 polls in 1 s (NFR5.11); `answered` writes its event and exits at once without a `.wait`. Each test uses its own `mkdtemp` folder under `tests/.tmp/`. Run `npx vitest run tests/main/dialogScript.test.js` and record the failing output (script missing). (AC1.1.6, AC1.1.9; NFR4.1–NFR4.3, NFR5.1–NFR5.3, NFR5.11, NFR8.4)
- [ ] Step 14: Green. Write `.thadeus/hooks/dialog.sh` from RD4 and RD1, with K6. These are the lines that differ from the design:

  ```sh
  [ -n "$d" ] && [ -n "$s" ] && read -r last < "$d/alive" || exit 0
  if [ "$waits" = 1 ]; then sleep 0.1 || exit 0; fi   # R-03: probe fractional sleep; the first of the 20 liveness sleeps
  t0=$(date +%s) || exit 0
  ...
  if [ "$waits" = 1 ]; then printf '' > "$a.wait" || exit 0; fi   # R-01: never ': >' (dash exits 2 on a special builtin)
  ```

  No other redirect is placed on `:` or `exec`, except `exec 2>/dev/null` itself. The header comment names `US-0506 u1 FR4.6, NFR4, NFR5` and the C1 version. Run the Step 13 command: green under `sh`, and under `dash` where installed.
- [ ] Step 15: Refactor with the Step 13 command green. Review the script against SCD4's per-poll list (one `[ -f ]`, one `read`, one `date`, one `sleep`; `mv` and `cat` only on an answer) and against "no `[[`, `$RANDOM`, arrays, `local`, `ERR` trap". Change the design's sentence "only POSIX features" to name `sleep 0.1` (R-03), as a comment in the script. (NFR5.11, NFR8.4)

### Layer: channel and file protocol (`src/main/agentChannel.js`, LC1 and LC2; data access)

- [ ] Step 16: Red. Write `tests/main/agentChannel.test.js` against `createAgentChannel({ root, log })` on a temp root:
  - `openSession` returns `sessionId` and an `env` with exactly the three C1 keys, a 64-hex secret and `THADEUS_WAIT_SECONDS` `595` for Claude Code (NFR3.2, NFR5.2).
  - The root, the session folder, `events/` and `answers/` have mode `0700`, also under `process.umask(0)`, and the path starts with the given root (NFR3.1, SD1).
  - The first `openSession` awaits `init()`, which removes leftover folders holding `.evt` files and emits no raw event for them (NFR5.4, BR2.4, RD6).
  - One test per SD3 refusal (unknown folder, ended session, bad name, symlink, over 1 048 576 bytes, malformed line 1, unaccepted version, wrong secret): the file is gone, one `[agent-events]` line names `session=` and `file=` and holds no secret, and nothing is emitted (NFR3.3, NFR3.11, BR1.1).
  - A `.tmp` file is ignored and kept.
  - The file is read through an `O_NOFOLLOW` descriptor and its size checked on that descriptor (R-06).
  - A valid renamed `.evt` gives exactly one raw event within 500 ms, with `arrivedAtMs` from `mtimeMs` and an increasing `seq`, and the file is deleted (PD1, SCD2, NFR5.12).
  - `writeAnswer` writes `<base>.<uuid>.tmp` with `wx` and renames it to `.ans`. It refuses a name with `/` or `..`, a session that ended ("session ended") and a missing `.wait` ("hook gave up"), and a planted symlink at the temp name does not redirect it (NFR3.9, SD7).
  - `answerState` reports `waiting`, `answerPresent`, `nack` and `folder`; `retract` returns true once and false after (RD2).
  - Heartbeat: `alive` changes during a 1.5 s busy loop on the test thread (RD1 stall); 1 000 reads never see it empty; heartbeat writes raise no intake event and no log line (R-07).
  - `closeSession` removes the folder while the heartbeat runs, 100 repetitions (RD5, NFR5.12).
  - The happy path makes no `console.*` call (NFR3.12, OD3).

  Write `tests/main/agentChannelScript.test.js` (integration, per shell in `SHELLS`):
  - the real `dialog.sh question` with the session's env gives one raw event whose body equals stdin, and `writeAnswer` makes the script print it and exit (W1 steps 2–6);
  - 200 runs of a hook and `retract` started together: exactly one of "the hook printed the answer" and "retract returned true" holds (RD2);
  - `closeSession` makes a waiting hook exit within 100 ms (RD5);
  - a full round trip leaves only `alive`, an empty `events/` and an empty `answers/` (SCD5).

  Run `npx vitest run tests/main/agentChannel.test.js tests/main/agentChannelScript.test.js` and record the failing output. (AC1.1.5, AC1.1.9; NFR3.1–NFR3.3, NFR3.9, NFR3.11, NFR5.4, NFR5.12)
- [ ] Step 17: Green. Write `src/main/agentChannel.js`. It holds C2's `openSession`, `bindPty`, `ptyOf`, `closeSession`, `onRawEvent` and `writeAnswer`, plus the main-internal `answerState`, `retract` and `isLive`. The heartbeat is an inline `worker_threads` worker with `eval: true` (RD1), which reports a write error other than `ENOENT` once per folder and code through `parentPort` (OD2). There is one `chokidar` watcher on the root with `depth: 2` and `ignoreInitial: true`, no `awaitWriteFinish`, and an `ignored` function that passes only `<id>/events/*.evt` (PD1, R-07). Secrets are compared with `crypto.timingSafeEqual` on the decoded bytes (SD3). The header comment names `US-0506 u1 FR1.3, NFR3, NFR5, C1, C2`. Run the Step 16 command: green.
- [ ] Step 18: Refactor with the Step 16 command green: the refusal checks as one ordered list, and the log line built in one function (cut to 80 characters, line breaks made spaces).

### Layer: harness adapters (`src/main/agentAdapters.js`, LC3; business logic, pure)

- [ ] Step 19: Red. Write `tests/main/agentAdapters.test.js` against the fixtures:
  - Claude Code `PreToolUse` and opencode `form.created` parse into questions with header, text, options (label and description in the agent's order), `multiSelect` and `allowOwn` (BR1.4, BR4.2, AC1.1.1, AC1.1.2).
  - `toolCallId` is read where the payload has it, and `post-tool-use.json` and `form-replied.json` parse as closing events (BR2.3).
  - Each malformed fixture is a refusal with a reason (NFR2.3).
  - 65 536 bytes unchanged, 65 537 bytes cut with `truncated: true`, and an emoji at byte 65 534 not split (NFR5.8, SCD1, BR2.6).
  - Swedish, emoji, quotes, newlines and control characters are kept byte-equal (NFR7.2, AC1.1.10).
  - The five NFR2.1 scenarios per harness (10 tests): for Claude Code, the built hook output has `hookSpecificOutput.permissionDecision: "allow"` and `updatedInput` with the questions and `answers` mapping each question's text to the picked label (comma-joined for multi-select, the own text for an own answer); for opencode, the reply is `{ q0: label | [labels] }` (NFR2.1, BR3.3, AC1.1.1, AC1.1.2).
  - Key sequences: a Claude Code single pick is the digit of its position; an own answer is the digit of the own-answer row, then `cleanLine(text)`, then Enter; opencode is ↓ times the index, then Enter; a batch or multi-select answer has no key sequence (K11; BR3.2, BR3.3).
  - An unknown kind is ignored (C1 ownership rules).

  Run `npx vitest run tests/main/agentAdapters.test.js` and record the failing output. (NFR2.1, NFR2.3, NFR5.8, NFR7.2)
- [ ] Step 20: Green. Write `src/main/agentAdapters.js`: `adapters.claude` and `adapters.opencode`, each `{ parse(kind, body), answerText(event, answer), keys(event, answer) }`, pure, with `cutUtf8` from SCD1. The `ponytail:` comment on `keys` names K11's ceiling. The header comment names `US-0506 u1 FR1.1, FR1.2, FR3.2, FR6.2, ADR-003`. Run the Step 19 command: green.
- [ ] Step 21: Refactor with the Step 19 command green: one shared question normaliser for both harnesses.

### Layer: opencode plugin (`.opencode/plugins/thadeus-dialog.js`, LC9)

- [ ] Step 22: Red. Write `tests/main/opencodePlugin.test.js`, which imports the module with a stubbed V2 `ctx` and a temp session folder:
  - Without `THADEUS_SESSION_DIR` it registers nothing and writes nothing (FR4.4).
  - `form.created` writes a C1 event file (header line, then the payload JSON) and a `.wait` marker before the rename (RD2 step 1).
  - A dropped `.ans` is taken by rename to `.took`, `session.form.reply` is called with the parsed answer, and `.took` and `.wait` are removed.
  - Reply missing, or reply rejecting: `.nack`, nothing thrown (NFR5.7, RD8).
  - An `fs` error on the event write is logged through opencode's logger, nothing thrown.
  - Two events in the same ms get different `<epoch-ms>-<pid>` names.
  - With fake timers: `alive` unchanged for 2000 ms ends the wait with no reply (BR1.2); `THADEUS_WAIT_SECONDS × 1000` ends it (BR1.3).
  - `form.replied` and `form.cancelled` write an `answered` event (BR2.3).
  - The event handler returns before the wait ends (own async task).

  Run `npx vitest run tests/main/opencodePlugin.test.js` and record the failing output. (NFR5.7, AC1.1.1, AC1.1.6)
- [ ] Step 23: Green. Write `.opencode/plugins/thadeus-dialog.js` (K12): an ES module, `node:fs/promises` only, every handler in `try`/`catch`, the wait as a `setTimeout` chain. The header comment names `US-0506 u1 FR1.2, FR4.4, NFR5.7, C1`. Run the Step 22 command: green.
- [ ] Step 24: Refactor with the Step 22 command green: the C1 file names and the header line built in one place, matching the script.

### Layer: timing log (`src/main/agentTiming.js`, LC7)

- [ ] Step 25: Red. Write `tests/main/agentTiming.test.js`:
  - With the switch on, one answered event gives exactly four JSON lines `{ eventId, harness, stamp, at }` in order, with no other field.
  - With it off, no `logs/` folder and no file exist after the same calls.
  - Renderer stamps other than `dialogShown` and `answerClicked`, or an `eventId` over 64 characters, are refused.
  - Appends go through one queue, so lines never interleave.
  - The `notificationShown` and `notificationClicked` names are accepted from main callers only (u5 amendment 4 needs only the list entry).

  Run `npx vitest run tests/main/agentTiming.test.js` and record the failing output. (NFR1.6, NFR1.7)
- [ ] Step 26: Green. Write `src/main/agentTiming.js`: `createTimingLog({ dir, on })`, a no-op when off. The header comment names `US-0506 u1 NFR1.6, OD1`. Run the Step 25 command: green.
- [ ] Step 27: Refactor with the Step 25 command green (none expected beyond naming).

### Layer: event store and fallback source (`src/main/agentEvents.js`, LC4; `src/main/questions.js`)

- [ ] Step 28: Red. Write `tests/main/agentEvents.test.js` against `createAgentEventStore({ channel, adapters, pty, timing, contextOf, auditEventsOf, clock })` with a fake channel, a fake pty and fake timers.
  - Order and lifecycle:
    - three sessions within 100 ms are listed by `arrivedAtMs`, then `tabId`, then `seq` (NFR5.9, BR2.1);
    - a second question from one session ends the first before the second is queued, never two open (NFR5.10, BR2.2);
    - `answered` with and without `toolCallId`, a newer event, and `endSession` each end the event, and the push spy runs before the call returns (NFR1.4, PD3, BR2.3, AC1.1.7);
    - `endSession` writes nothing and pushes the "session ended" line (NFR5.5, FR6.4).
  - Answer check, one test per C4 error (unknown event, fallback event, event not open, session ended, does not fit: wrong count, index out of range, two picks on single-select, own text where not allowed); a second answer is refused; in every refusal `writeAnswer` and the pty writer are never called (NFR3.4, NFR3.10, BR3.1, BR3.6, AC1.1.5).
  - Hook delivery:
    - one test per RD2 decision row, plus the tie-breaker both ways;
    - the R-04 case: the folder is removed during the poll, so the answer is not reported as sent and goes `via: keys` or fails (u2 SD14);
    - RD3: a young marker → hook, no marker → keys, a marker older than `waitSeconds + 5` s → keys, `timedOut` with a marker → hook.
  - Keys delivery:
    - keys are written in the same tick as the chunk that carries the first label, also when the label is split across two chunks and wrapped in ANSI colour codes, never before;
    - nothing is written and "the agent's picker is not showing" comes back at 3 s (NFR1.3, BR3.2);
    - a batch as keys fails with the terminal sentence and keeps the answer (K11).
  - Close and Esc write only the empty hand-back file, and state is `handedBack` (NFR5.3, BR3.5, AC1.1.6).
  - An adapter-refused waiting question writes the empty answer and pushes nothing (RD7).
  - The `timedOut` timer fires at `waitSeconds` (NFR5.2, AC1.1.6).
  - Each failure (session ended, answer file not writable, picker not showing, hook did not take it) sets state back to `shown` (or keeps `timedOut`) with a one-sentence `lastError`, and a second Send succeeds (NFR5.6, BR3.4, AC1.1.8).
  - Arrival, `timedOut`, Close and exit call no writer with non-empty text (NFR3.7).
  - Serialised `list()` results and every push contain no secret (NFR3.2).
  - Audit fallback:
    - with no live session for the project, `list()` returns `auditEventsOf(projectId)` as `source: "audit"` events;
    - with one, the audit questions are not listed and an open gate of the active intent becomes `context` with the options untouched (BR2.5, BR2.7, AC1.1.4).
  - Every minted id, hook and audit, is ≤ 64 characters (u5 amendment 6).
  - One `[agent-events]` line per refused answer and per failed send (NFR3.11), and none on the happy path (NFR3.12).

  Add cases to the existing `tests/main/questions.test.js` for `auditEvent(q)` (same text, options, gate and ask fields as today, and `audit` keeps the original question for the terminal path) and `auditContext`. Run `npx vitest run tests/main/agentEvents.test.js tests/main/questions.test.js` and record the failing output. (AC1.1.1–AC1.1.8; NFR1.3, NFR1.4, NFR3.2, NFR3.4, NFR3.7, NFR5.2–NFR5.6, NFR5.9, NFR5.10)
- [ ] Step 29: Green. Write `src/main/agentEvents.js` (state machine of functional-spec.md, `sendViaHook` from RD2 with the R-04 check `channel.isLive(sessionId) && state.folder` before `sent`, `hookWaits` from RD3, the picker tap with a rolling 64 KB ANSI-stripped buffer, C4 errors thrown as `Error(t('agentDialog.errors.<key>'))` with the English reason logged). The header comment names `US-0506 u1 FR1.4, FR1.5, FR3.1–FR3.6, FR6.1, components.md Option A`. Add `auditEvent` and `auditContext` to `src/main/questions.js`. Run the Step 28 command: green.
- [ ] Step 30: Refactor with the Step 28 command green: the transitions in one table-driven `move(ev, to)`, with the push in it, so no path forgets it.

### Layer: PtyManager, IPC and preload bridge, single instance (LC5, LC6; API)

- [ ] Step 31: Red.
  - Extend `tests/main/pty.test.js`:
    - a shell tab spawned while `process.env` holds `THADEUS_SESSION_SECRET` gets no `THADEUS_*` key;
    - an agent tab gets exactly the three channel keys passed in (NFR3.2, SD2);
    - `onExit` is called on exit (RD5);
    - `tapOutput` sees data and stops after its remover runs (PD2).
  - Write `tests/main/agentIpc.test.js` against `createAgentIpc({ channel, store, timing, hooksCurrent, senders })`:
    - an agent spawn with hooks current calls `openSession`, passes its env, then `bindPty`;
    - with hooks not current, no session and no env (K4, BR2.7);
    - a failed spawn closes the opened session;
    - a pty exit calls `store.endSession`, then `channel.closeSession` (RD5);
    - `agentEvents:answer` refuses a non-string or over-64-character `eventId` and a malformed `answer` before the store sees it (SD4);
    - store changes push `agent-events:changed` `{ projectId, events }` to each live sender;
    - `shutdown` closes every session before the ptys are killed;
    - the `agent-timing:stamp` listener exists only with timing on (OD1).
  - Write `tests/main/preload.test.js` (electron mocked, capturing `exposeInMainWorld`):
    - `bridge.agentEvents` has `list`, `answer`, `close` and `onChanged` on the C4 channels;
    - `stamp` exists only when `process.argv` holds `--thadeus-timing`, and it uses `send`, not `invoke` (NFR1.7);
    - `listQuestions`, `onQuestions` and `onQuestionFocus` are unchanged (K15).
  - Extend `tests/main/windowOptions.test.js`:
    - `additionalArguments` holds `--thadeus-timing` only when timing is on;
    - `claimSingleInstance(app, focus)` returns false and calls `app.quit()` when the lock is refused, so `registerIpc` never runs;
    - on `second-instance` it calls `focus` (K5, R-02).

  Run `npx vitest run tests/main/pty.test.js tests/main/agentIpc.test.js tests/main/preload.test.js tests/main/windowOptions.test.js` and record the failing output. (AC1.1.5, AC1.1.7, AC1.1.9; NFR1.7, NFR3.2, NFR3.4, NFR5.5)
- [ ] Step 32: Green.
  - `src/main/pty.js`: `spawnSession` gains `env` (the channel variables) and `onExit`; the base environment is `process.env` minus every `THADEUS_*` key; `tapOutput(id, fn)` returns a remover.
  - `src/main/agentIpc.js` as tested. `src/main/ipc.js` builds the channel on `<userData>/agent-channel`, the store, the timing log on `<userData>/logs`, and `hooksCurrent` from `THADEUS_AGENT_HOOKS`. It wires `pty:spawn`, `shutdown` and the three `agentEvents:*` handlers, and pushes after `refreshQuestions` publishes (audit events in the list).
  - `src/main/index.js`: `claimSingleInstance` right after `setPath` (K5), and `windowOptions(settings, platform, { timing })`.
  - `src/preload/index.js`: the `agentEvents` member.

  Header and doc comments name `US-0506 u1` with the FR or NFR. Run the Step 31 command: green. Then run `npx vitest run tests/main/` once to keep the main project green.
- [ ] Step 33: Refactor with the Step 31 command green: the env helper in `pty.js` as one pure function; no new `ipc.js` handler beyond the three.

### Layer: AgentDialog (`src/renderer/AgentDialog.jsx`, LC10; frontend)

- [ ] Step 34: Red. Write `tests/renderer/AgentDialog.test.jsx` (Swedish locale, `window.bridge` stubbed).
  - Question layouts:
    - M1 single question with descriptions under each label, "Complete workflow" first, with a pick sending `{ picks: [[0]], own: [null] }` once (AC1.1.1, BR4.2);
    - M2 batch of four stacked under their headers, each collapsing when answered, Send disabled with "<n> av <total> besvarade" until all are answered, then one `answer` call (AC1.1.2, BR4.3);
    - multi-select with checkboxes and Done, two ticks (BR4.4);
    - own answer field (FR2.6).
  - Markdown body: a heading, a list, inline code, a code block and an `https` link render; `<script>`, `<style>`, `<iframe>`, `<img onerror>` show as text with no such element and no `on*` attribute; no anchor for `javascript:`, `file:` or `data:`; the window-open path is called only on click (AC1.1.3, NFR3.5, NFR3.6, K7).
  - Header and labels pass through `visibleText`: a U+202E in a label shows as `‮`, and the sent answer is still the index (K8).
  - Context: "<project> · <intent> · <stage>" from `context` (AC1.1.4).
  - States, one text per state (sending, "Skickat till Claude Code.", handed back, timed out (M6), failed with `lastError`, session ended), with the failed state keeping the own-answer text and offering Open the terminal (NFR6.3, AC1.1.6–AC1.1.8, BR3.4).
  - For opencode, "Also open in the terminal".
  - A cut question shows the "cut, full text in the terminal" line (AC1.1.10).
  - Paging: a second event while a page is shown leaves the page and shows "+1 ny" (NFR5.9, BR2.1).
  - Keyboard only: focus is on the first choice when the page shows; digits pick, Space ticks, Enter sends, Esc calls `close`; digits typed in the own-answer field are text (NFR6.1, NFR6.2, AC1.1.11, BR4.5).
  - Escalation: calm, then red at `OVERDUE_MS` with the "still waiting" title (BR4.6).
  - Timing: with the stamp member absent, Send still works; with it present, `answer` is called in the same tick as the click (NFR1.7).
  - Fallback: an `audit` event renders in the same dialog and answers through `onAuditSend` with the original question. The 15 QuestionPopup cases are moved here, adapted to `agent-dialog-*` test ids (gate Approve and Request Changes, own answer and Enter, no number keys for opencode, Open the terminal after close (F-01), refused send, "may be lost" after `ARRIVAL_MS`, batch and plan-approval asks, and the real-picker cases) (BR3.6, ADR-006).
  - Extend `tests/renderer/AppShell.test.jsx`: a pushed hook event opens the dialog unless `questionAlerts` is `off`.

  Run `npx vitest run tests/renderer/AgentDialog.test.jsx tests/renderer/AppShell.test.jsx` and record the failing output. (AC1.1.1–AC1.1.4, AC1.1.6–AC1.1.8, AC1.1.10, AC1.1.11; NFR3.5, NFR3.6, NFR6.1–NFR6.3, NFR7.1)
- [ ] Step 35: Green.
  - Write `src/renderer/AgentDialog.jsx`: a native modal `<dialog>` as today; `data-testid` values `agent-dialog`, `agent-dialog-title`, `agent-dialog-choice`, `agent-dialog-check`, `agent-dialog-own`, `agent-dialog-send`, `agent-dialog-done`, `agent-dialog-close`, `agent-dialog-terminal`, `agent-dialog-status`, `agent-dialog-prev`, `agent-dialog-next`, `agent-dialog-new-count`; the timing stamps in a `requestAnimationFrame` after paint and at the start of Send.
  - Add `html="text"` to `FileContent`.
  - In `App.jsx`, replace QuestionPopup with AgentDialog, fed by `bridge.agentEvents.list` and `onChanged`; keep the `questions` state for `askingIntents`; send audit answers through the existing `sendAnswer`.
  - Delete `src/renderer/QuestionPopup.jsx` and `tests/renderer/QuestionPopup.test.jsx`.
  - Add the `agentDialog.*` keys to `sv.json` and `en.json` with the same ICU placeholders: `title.waiting`, `title.stillWaiting`, `kind.question`, `context`, `state.sending`, `state.sent` `{harness}`, `state.handedBack`, `state.timedOut`, `state.failed` `{error}`, `state.sessionEnded` `{harness}`, `alsoInTerminal`, `truncated`, `answered` `{answered}` `{total}`, `send`, `sendAll`, `done`, `ownAnswer`, `newCount` `{n}`, `openTerminal`, `position` `{i}` `{n}`, `previous`, `next`, and `errors.unknownEvent`, `errors.eventNotOpen`, `errors.sessionEnded`, `errors.doesNotFit`, `errors.fallback`, `errors.pickerNotShowing`, `errors.sendFailed` `{cause}`, `errors.notTaken`, `errors.answerInTerminal`. Move the popup's `app.question.*` keys that the fallback path still uses; remove only keys no `t()` call uses any more.

  The header comment names `US-0506 u1 FR2.1–FR2.6, FR3.3, FR3.5, NFR6, NFR7, ADR-006`. Run the Step 34 command, then `npx vitest run tests/main/i18nKeys.test.js`: green.
- [ ] Step 36: Refactor with the Step 34 command green: one `QuestionBlock` component inside the file for the M1 and M2 questions; no Swedish literal in the file (the i18nKeys regression check).

### Environment, build and verification

- [ ] Step 37: Environment and build configuration. Add per-file coverage globs at 80 lines to `vitest.config.mjs` for `src/main/agent*.js`, `src/shared/agentText.js`, `src/renderer/AgentDialog.jsx` and `.opencode/plugins/thadeus-dialog.js` (NFR8.2). Run `npx eslint .` and `npx prettier --check .` on the new files and fix them. Then run the Construction Verification Command `npx vitest run tests/ --coverage && npx eslint . && npx prettier --check .`; it passes, and the test count is Step 3's count minus the deleted popup file plus the new tests. Record the counts and the coverage figures for `code-summary.md`. (NFR8.1–NFR8.4)
- [ ] Step 38: Development hook entries (K13). Put the two Claude Code entries from functional-spec.md ("Hook entries for development") into `unit-test-instructions.md` and `code-summary.md` for the person to paste, together with `THADEUS_AGENT_HOOKS=1 npm run dev` and `THADEUS_TIMING=1`. `.claude/settings.json` is not written. The manual run (NFR1.1–NFR1.3, NFR2.2) is left to Build and Test and the release check, as the bolt plan says.

### Documentation and traceability

- [ ] Step 39: Documentation and traceability. Check that `docs/FEATURES.md` and `docs/features/epic-05-workflow-control.md` still show US-0506 as "🚧 in progress, for v0.2.5"; leave them unchanged and mark nothing done. Check that every new module and exported function names its story and requirement IDs (team Code Style). Check that every `ponytail:` comment names its ceiling (K11, the agentText flags, RD2's "taken but not finished within 1 s"). `code-summary.md`, `source-manifest.json` and `traceability.json` follow in Step 5 of the stage.

## Story and requirement traceability

| Plan steps | Story / criteria | Rules and NFRs |
|---|---|---|
| 1–6, 37 | US1.1 Definition of Done | NFR8.1–NFR8.4 |
| 7, 8 | US1.1 (contracts) | C1, C2, C4; R-04, R-05 |
| 9 | AC1.1.1, AC1.1.2, AC1.1.10 | NFR2.1, NFR8.4 |
| 10–12 | AC1.1.11 | BR4.1, NFR7.2 (u5 amendment 2) |
| 13–15 | AC1.1.6, AC1.1.9 | BR1.2, BR1.3, BR3.5, NFR1.5, NFR3.8, NFR4.1–NFR4.3, NFR5.1–NFR5.3, NFR5.11; R-01, R-03 |
| 16–18 | AC1.1.5, AC1.1.9 | BR1.1, BR2.4, NFR3.1–NFR3.3, NFR3.9, NFR3.11, NFR3.12, NFR5.4, NFR5.12; R-06, R-07 |
| 19–21 | AC1.1.1, AC1.1.2, AC1.1.10 | BR1.4, BR2.6, BR3.3, BR4.2, NFR2.1, NFR2.3, NFR5.8, NFR7.2 |
| 22–24 | AC1.1.1, AC1.1.6 | BR1.2, BR1.3, BR2.3, NFR5.7 |
| 25–27 | AC1.1.1 (timing proof) | NFR1.6, NFR1.7 |
| 28–30 | AC1.1.1–AC1.1.8 | BR2.1–BR2.5, BR2.7, BR3.1–BR3.6, NFR1.3, NFR1.4, NFR3.2, NFR3.4, NFR3.7, NFR3.10–NFR3.12, NFR5.2–NFR5.6, NFR5.9, NFR5.10; u2 SD14 R-04 |
| 31–33 | AC1.1.5, AC1.1.7, AC1.1.9 | BR2.7, NFR1.7, NFR3.2, NFR3.4, NFR5.5; R-02, u2 SD14 |
| 34–36 | AC1.1.1–AC1.1.4, AC1.1.6–AC1.1.8, AC1.1.10, AC1.1.11 | BR2.1, BR3.4–BR3.6, BR4.1–BR4.6, NFR3.5, NFR3.6, NFR6.1–NFR6.3, NFR7.1 |
| 38, Build and Test | AC1.1.1 demo, AC1.1.9 manual | NFR1.1–NFR1.3, NFR2.2 (manual run on the release Mac) |
| 39 | US-0506 feature docs | project Mandated rules |

## Open risks

1. **Project-wide coverage may start below 80%.** Nothing is measured today, and Electron glue (`ipc.js`, `index.js`, `menu.js`, the preload) has few tests. Step 3 finds out before any other edit. If it is below 80%, the Verification Command cannot pass from this Unit alone, and the person decides how to close the gap (more tests in this PR, or a separate story). The threshold stays at 80.
2. **Fixtures are schema-built, not recorded** (K14). The manual run on the release Mac must save the real payloads before the release pull request.
3. **opencode is provisional.** The plugin's export shape without `Plugin.define`, `session.form.reply`, and `node:fs` in the plugin runtime are inferred (NFR5.7). The `.nack` path and keys cover a failure, but only the manual opencode run proves it.
4. **Keys after a hand-back are limited to single-question answers** (K11). A batch or multi-select that timed out must be answered in the terminal.
5. **The format pass is large.** It touches many files at once; it is kept as its own commit (Step 4).
6. **Lint findings in existing code are not counted yet.** Behaviour-changing fixes are kept out by `eslint-disable` lines with reasons (K3), which the review can list.
7. **Timing in CI.** The script tests take about 2–3 s per timed case per shell, and the 200-run race adds a few seconds; they carry the design's 0.5 s slack. A flaky run on `ubuntu-latest` is surfaced, never solved by widening a target.
8. **A sandboxed preload and `additionalArguments`.** A unit test checks only that `stamp` follows `process.argv`; the built-app run confirms it (OD1).
9. **The 3 s picker wait** (C2 open question) is settled only by the manual time-out case on the release Mac (NFR1.3).
