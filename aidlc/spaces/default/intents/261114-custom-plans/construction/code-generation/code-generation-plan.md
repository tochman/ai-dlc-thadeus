# Code Generation Plan: v0.2.4

## Summary

- Builds: v0.2.4's five stories in turn, one branch and one PR each: the popup answer fix (US-0006), the About window redesign (US-0409), a live token view (US-0207), custom plans (US-0903) and Monaco editing (US-1001)
- Touches: `src/renderer/picker.js`, `AboutDialog.jsx`, a new `TokenView.jsx` and `PlansView.jsx`, a new `src/main/plans.js` and `src/main/fileWrite.js`, a new `src/renderer/editor/`, `ipc.js`, `preload`, `App.jsx`, `index.html` (CSP), both locale files, `docs/`
- Tests: about 22 new Vitest tests (main in node, renderer in jsdom), one or more per requirement, plus the existing suite kept green

## Approach

The work is brownfield and has no Units (ultra-express plan). The source is `requirements.md` (FR1.1–FR1.5, FR2.1–FR2.4, NFR1–NFR6) and each story's acceptance criteria in its epic file.

**Delivery per story (FR2.1, FR2.2).** Each story follows the same loop:

1. Branch `feat/us-XXXX-<slug>` from an up-to-date `main`.
2. Set the story to 🚧 in its epic (story marker, `**Status (…)**` line) and in `docs/FEATURES.md`.
3. Build it, then run its tests and the full suite.
4. Tick its criteria and set it to ✅ "for v0.2.4".
5. Commit, push, open the PR, and merge once CI is green.
6. Pull `main` before the next story.

The release (FR2.4) comes after the last story.

**Testing.** Test-after, per the Testing Contract below: each layer is implemented first, then its tests are written and run. Main-process tests run in node, renderer tests in jsdom with Testing Library. Monaco is mocked in jsdom.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "ultra-express",
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
  "input_sha256": "sha256:6f8adf2d6d2f23d3a600d90970ef67f4819d061b592e46d5c9ed4bfe67a35dd3",
  "contract_sha256": "sha256:91a3ddbca508f56d1a2f627eda0975405de847674beb23f092e1f43f68275812"
}
```

## Steps

### Shared setup

- [x] **Step 1: Release plan and baseline (FR2.3, NFR1).**
  - Write `docs/releases/0.2.4.md` in the shape of `0.2.3.md`: the theme, the five stories with epic, priority, complexity and dependencies, the build order, what is deliberately left out (US-0205, US-0506, US-0504, US-0702), and a release checklist.
  - Verify the runner: `npx vitest run tests/main/settings.test.js` passes.
  - Run the full suite once on the unchanged tree and record the pass count as the baseline.
  - Commit the release plan on `docs/release-plan-v0.2.4`, open the PR, and merge it once CI is green.

### US-0006: Popup answers reach Claude Code's real picker (FR1.1)

- [x] **Step 2: Find the cause (FR1.1).** Branch `fix/us-0006-popup-answers`, and set US-0006 to 🚧.
  - Compare what AI-DLC logs with what the picker shows. Take the last two intents' audit shards (`DECISION_RECORDED` options for questions and gates) and the `readPicker()`/`resolveAnswer()` rules in `src/renderer/picker.js`. Known suspect: batch decisions logged as one row with summary options (`Q1: … / …`), which never match a picker label, so every such answer falls back to "Svara i Claude".
  - Add a development-only `console.debug` in `QuestionPopup`'s send path. It prints the `resolveAnswer` result and the last 30 screen lines when the send fails.
  - Changed on 2026-11-14 at the person's request ("Fixa från det vi redan vet med mycket olika tester och kanske röktester"): there is no live capture with the person. The fixtures in `tests/fixtures/picker/` are written from the real picker the person showed in a screenshot: the gate layout with the `□ Approval` header chip, the `❯ 1.` cursor row, indented descriptions, `3. Type something.`, a full-width rule, `4. Chat about this` and the `Enter to select · ↑/↓ to navigate · Esc to cancel` hint line. From that layout they add variants: a single question, a batch with `□`/`☐`/`✔` header chips and Submit, a cursor on option 2, a long label cut with `…`, wrapped rows, a picker taller than the visible rows, and a scrolled-up viewport.
  - Write the findings in `code-summary.md`.
- [x] **Step 3: Fix both causes (FR1.1).**
  - **Options that can never match:**
    - Main (`questions.js`) takes a question's options from the exact JSON AI-DLC records (`QUESTION_ASKED` / `QUESTION_REPLIED` `Options: [...]`) when present.
    - Otherwise it parses `DECISION_RECORDED` `Options` as comma, pipe or semicolon lists, and strips a trailing parenthetical description from a label.
    - A batch summary row (`Q1: … / …`) becomes a batch question, not one question with nonsense options.
    - Plan-approval and scope-confirm asks (`QUESTION_ASKED`) also reach the popup.
    - An answer closes only the question it answers.
  - **Picker not seen:**
    - `screenLines()` reads the bottom of the active buffer (`baseY`), not the scrolled viewport, so a scrolled-up tab still shows the picker.
    - `readPicker` recognises `□` (U+25A1) as a header box.
    - `answer()` waits up to 3 s for a picker to appear before it reports `noPicker`, so a click right after the question is logged works.
  - **Every case below must work:**
    - A single question with matching options sends its key.
    - A batch picker sends one answer per question in order, or offers only "Svara i Claude" and says why.
    - A gate sends `Approve`/`Request Changes`.
    - An own answer goes through the picker's own "Type something" choice.
    - The popup still closes on `QUESTION_ANSWERED` and still shows its 10 s "may not have arrived" note.
  - Keep the development-only log behind `import.meta.env.DEV`.
- [x] **Step 4: Broad tests and smoke tests for US-0006 (FR1.1, NFR2).**
  - **Unit tests, `tests/renderer/picker.test.jsx`, over every fixture:**
    - gate → the `Approve` key, and the `Request Changes` key;
    - single → the right key, with the cursor on option 1 and on option 2;
    - the option below the rule (`4. Chat about this`) is read;
    - a label cut with `…` matches;
    - wrapped rows still give the right key;
    - a `□` batch and a `☐`/`✔ Submit` batch → `several` or keys per question;
    - an own answer → the "Type something" key plus the text;
    - logged options that don't match → `mismatch`;
    - no picker → `noPicker`.
  - **Option parsing in main, `tests/main/questions.test.js`:**
    - comma, pipe, semicolon and JSON option lists;
    - a parenthetical description stripped from a label;
    - a batch summary row;
    - `QUESTION_ASKED` plan-approval asks shown;
    - an answer closing only its own question.
  - **Regression check:** confirm that the gate-through-viewport, `□` batch and pipe-list tests fail on `main`'s code, using a temporary copy that is deleted afterwards.
  - **Smoke tests, `tests/renderer/pickerSmoke.test.jsx`:** write the picker as raw terminal output, with ANSI colours, cursor moves and CRLF, into a real `@xterm/xterm` `Terminal` in jsdom. Run `screenLines` → `readPicker` → `resolveAnswer` end to end, then:
    - scroll the terminal up and send again;
    - repeat on a terminal with fewer rows than the picker;
    - redraw the picker with the cursor moved, as Claude Code does on an arrow key.

    If `Terminal` can't run in jsdom, use the smallest working stand-in and say why in `code-summary.md`.
  - **Popup test, `tests/renderer/QuestionPopup.test.jsx`:** a send closes the popup on the following `QUESTION_ANSWERED`, and a send before the picker is drawn succeeds once it appears within 3 s.
  - Run the US-0006 test files, then the full suite.
- [x] **Step 5: Docs and PR for US-0006 (FR2.1, FR2.2).**
  - Tick US-0006's criteria and set it to ✅ for v0.2.4 in its epic and in `FEATURES.md`.
  - Add a line to US-0004's notes pointing to US-0006.
  - Commit, push, open the PR, and merge once CI is green.

### US-0409: The About window in the new LCARS design (FR1.2)

- [x] **Step 6: Build the new frame (FR1.2, NFR3, NFR4).** Branch `feat/us-0409-about-design`, and set US-0409 to 🚧. Rebuild `src/renderer/AboutDialog.jsx` and its CSS in `theme.css`:
  - Frame: a rounded LCARS elbow (top, left, bottom) with small code labels in the frame, built from the existing `Lcars.jsx` parts and colour tokens.
  - Title: `APP_NAME` top right in the accent colour.
  - Content bars: `APP_FULL_NAME`, `APP_TAGLINE` and `v<version>` as light horizontal bars, each with a coloured end tab and a line under it, beside the Auctum mark.
  - EXIT: an EXIT block in the left edge with a red marker, which closes the window.
  - Status row: a small row at the bottom with the app version and platform.
  - Kept from US-0408: `<dialog>`, Esc, click outside, focus return, sv/en.
  - Labels: decorative labels come from the app's own data (version, platform). They are not copied from the screenshot (NFR3).
  - Text: every text, including EXIT/STÄNG, comes from the locale files.
- [x] **Step 7: Tests for US-0409 (FR1.2, NFR2).** Update `tests/renderer/AboutDialog.test.jsx`:
  - the name, full name, tagline and version render in the bars;
  - EXIT closes the window and focus returns;
  - Esc and a click outside still close it.

  Run that file, then the full suite.
- [x] **Step 8: Docs and PR for US-0409 (FR2.1, FR2.2).**
  - Tick US-0409 and set it to ✅ for v0.2.4.
  - Take a screenshot into `docs/screenshots/about-v0.2.4.png`.
  - Commit, push, open the PR, and merge once CI is green.

### US-0207: Live token view while the work runs (FR1.3)

- [x] **Step 9: Token history logic (FR1.3, NFR5).** Branch `feat/us-0207-live-tokens`, and set US-0207 to 🚧.
  - Add the pure module `src/renderer/tokenFlow.js`.
  - `tokensOf(ledger, intentUuid)` reads the intent's `workflows["intent:<uuid>"].tokens` and returns `{input, output, cacheWrite: cacheCreate5m + cacheCreate1h, cacheRead}` (or null).
  - `pushSample(history, tokens, now)` keeps the last N samples (N = 120) and the rate in tokens per minute between consecutive ledger readings. A drop or reset starts a new history.
  - `meterLevel(value, max)` maps a figure to 0–10 bar segments on a scale that rounds up to a readable step.
- [x] **Step 10: Tests for the token logic (FR1.3, NFR5).** `tests/renderer/tokenFlow.test.js`:
  - tokens are read from a fixture ledger;
  - the rate is computed from two readings;
  - a missing intent gives null;
  - a lower total (a new session) resets the history;
  - meter levels hold at boundaries.

  Run it.
- [x] **Step 11: The view (FR1.3, NFR4, NFR5).**
  - Add `src/renderer/TokenView.jsx`, shown in the intent detail beside the live indicator when the intent is in flight. Its exact place is beside the cost readout in `IntentDetail.jsx`.
  - Four vertical bar meters (input, output, cache write, cache read), each with a text label, a level scale and its figure. The meters glow in the LCARS palette.
  - A waveform drawn as an inline SVG polyline of the rate history.
  - It updates from the existing `project:changed`/cost refresh (US-0205's debounced ledger watch), with no new watcher.
  - A missing or half-written ledger keeps the last good values and shows the existing stale note in one sentence.
  - With animations off, no glow pulse or wave motion.
  - sv/en labels.
- [x] **Step 12: Tests for the view (FR1.3, NFR2).** `tests/renderer/TokenView.test.jsx`:
  - the four labelled meters and figures render for an in-flight intent;
  - the waveform gets a point per sample;
  - nothing renders for a finished intent;
  - a stale ledger keeps the values and shows the note.

  Run it, then the full suite.
- [x] **Step 13: Docs and PR for US-0207 (FR2.1, FR2.2).** Tick US-0207, set it to ✅ for v0.2.4, commit, push, open the PR, and merge once CI is green.

### US-0903: Create and reuse custom plans (FR1.4)

- [x] **Step 14: Plans in main (FR1.4, NFR6).** Branch `feat/us-0903-custom-plans`, and set US-0903 to 🚧. Add `src/main/plans.js`, reusing `readPlans`/`loadPlans` from `aidlcConfig.js` (moved and exported, not copied).
  - `listPlans(root, harness, activeScope, intents)` returns each plan's name, description, depth, stage count, default settings (`review_cap`, `sensors`, `learnings`, `summary_confirmation`, `plan_approval`, `guard_policy`, `collaborators`), whether it is the project's own, and which intents use it. It reads the frontmatter and the composed-grid JSON.
  - `planStages(root, name)` returns its EXECUTE and SKIP stages from the grid JSON in `aidlc/scopes/<name>.md`, or from the harness copy for stock plans.
  - `validPlanName(name)` allows lowercase words joined by hyphens only.
  - `savePlan(root, name)` runs `aidlc engine scope save --name <name>` through `runFixed`, after `validPlanName`.
  - `planEditDiff(text, {description, depth, keywords})` changes only those frontmatter fields above the `<!-- BEGIN aidlc composed-scope-grid` marker and returns `{next, diff}`.
  - `applyPlanEdit(root, name, edit, before)` writes only when the file still reads `before`. It refuses stock plans, removes the stale harness copy (`.claude/scopes/aidlc-<name>.md`, and the same for each installed harness), then runs `aidlc engine graph compile`.
  - `deletePlan(root, name, intents)` refuses stock plans and plans an active intent uses, removes `aidlc/scopes/<name>.md` and each harness copy, then recompiles.
  - Every path goes through `resolveInRoot`.
- [x] **Step 15: Tests for plans in main (FR1.4, NFR6).** `tests/main/plans.test.js`, with a temp project fixture:
  - the list carries depth, stage count and defaults;
  - stages split into EXECUTE and SKIP;
  - `validPlanName` refuses `Bad Name` and `../x`;
  - `savePlan` passes the fixed arguments;
  - the edit diff touches only the frontmatter fields above the marker;
  - the edit refuses a stock plan and a changed file;
  - delete refuses a plan a running intent uses, and otherwise removes both files and calls compile.

  Run it.
- [x] **Step 16: IPC and preload (FR1.4).**
  - New channels in `ipc.js` `handlers`: `plans:list`, `plans:stages`, `plans:save`, `plans:previewEdit`, `plans:applyEdit`, `plans:delete`, each taking a `projectId` only, never a root.
  - Named functions in `src/preload/index.js`.
  - The config watch reloads the view when `aidlc/scopes/` changes.
- [x] **Step 17: The Plans view (FR1.4, NFR4).** Add `src/renderer/PlansView.jsx`, its own view with a "Planer / Plans" block in the left arm (`showView('plans')`, and the `menuCommands` view whitelist extended).
  - **List:** each plan's name, description, depth, stage count and defaults. Own and stock plans are marked in text. The active intent's plan is marked.
  - **Open a plan:** shows its stages run and skipped.
  - **New plan:** asks what the work is for and types `/aidlc compose "<task>"` into the agent tab, without Enter.
  - **Save plan:** shown for an intent on a custom plan. It asks for a name, checks it as typed, and runs `plans:save`, showing the result or the error.
  - **Start with plan:** asks what to build and types `/aidlc --scope <name> "<what>"` into the agent tab.
  - **Edit:** description, depth and keywords for own plans. It shows the diff, then applies.
  - **Delete:** a confirmation names the plan. It is disabled, with the reason, when an intent uses the plan.
  - **Change steps:** types an `/aidlc compose` request into the agent tab.
  - Typed text goes through the existing `type()` with `submit: false`. Quotes in the person's text are escaped for the agent line.
  - The plan name already shown with intents (US-0701) stays.
  - Texts in sv/en.
- [x] **Step 18: Tests for the Plans view (FR1.4, NFR2).** `tests/renderer/PlansView.test.jsx`:
  - the list renders with defaults;
  - opening a plan shows its stages;
  - New plan and Start with plan type the right lines without Enter;
  - Save refuses an invalid name before calling the bridge;
  - Delete is disabled for a plan in use;
  - stock plans have no Edit or Delete.

  Run it, then the full suite.
- [x] **Step 19: Docs and PR for US-0903 (FR2.1, FR2.2).** Tick US-0903, set it to ✅ for v0.2.4, commit, push, open the PR, and merge once CI is green.

### US-1001: Edit files in the app with Monaco (FR1.5)

- [x] **Step 20: Dependencies and build configuration (FR1.5).** Branch `feat/us-1001-monaco`, and set US-1001 to 🚧.
  - Install `monaco-editor` and `@monaco-editor/react`. These are the dependencies the story names.
  - Measure the renderer bundle before and after.
  - In `src/renderer/editor/monacoSetup.js`: `import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'` plus the needed language contributions, `?worker` imports, `self.MonacoEnvironment.getWorker` by label, `loader.config({ monaco })`, and the LCARS theme defined. All of it is loaded with a dynamic `import()` the first time an editor opens.
  - CSP in `index.html`: add `worker-src 'self' blob:`, with no `'unsafe-eval'`. Check the build and record the finding.
  - Check that `electron-builder.yml` ships the worker chunks and that they load from the asar (unpack them if not).
- [x] **Step 21: Safe writes in main (FR1.5, NFR6).** Add `src/main/fileWrite.js`:
  - `writeFileSafe(root, rel, content, {expectMtime, expectHash})` resolves through `resolveInRoot`. It refuses absolute paths, `..`, symlinks out of the root and engine-owned files: `aidlc/**/aidlc-state.md`, `audit/`, `.aidlc-engine/`, `aidlc/.aidlc-sessions/`, the harness folders' engine files, and `intents.json`.
  - It checks the mtime and hash first and returns `{conflict, disk}` when they differ.
  - It writes atomically, to a temp file in the same folder and then a rename.
  - `readForEdit(root, rel)` returns the content, mtime, hash and a `readOnly` reason for engine-owned files, binary files (a NUL byte in the first 8 KB) and files over 2 MB.
  - New IPC `file:read`, `file:write` and preload functions.
- [x] **Step 22: Tests for safe writes (FR1.5, NFR6).** `tests/main/fileWrite.test.js`:
  - refuses out-of-root paths, `..`, a symlink out of the root, and an engine-owned path;
  - an atomic write leaves no temp file and the content in place;
  - a changed mtime/hash returns a conflict with the disk text;
  - binary and >2 MB files read as read-only.

  Run it.
- [x] **Step 23: Editor UI (FR1.5, NFR4).** Add `src/renderer/editor/`:
  - **`EditorPanel.jsx`:** editor tabs in the project view, with a dot for unsaved changes, the language from the extension (`languageFor(path)`), Cmd/Ctrl+S to save, Monaco's find and replace and multiple cursors, and a side-by-side Markdown preview through the existing Markdown renderer.
  - **`ConflictDialog.jsx`:** keep mine, take the disk version, or compare in Monaco's diff editor.
  - **`FileTree.jsx`:** the project root with `.gitignore`d folders hidden, read through a new `project:listTree` IPC that skips `node_modules/`, `out/`, `dist/` and `.git/`.
  - **Edit actions:** in the artifact reader, the docs dialog and the Features view (opens the epic file). "Öppna i editor" becomes secondary.
  - **Unsaved changes:** closing a tab, switching project or quitting asks first. Main's `before-quit` asks the renderer.
  - **Reload:** a file changed on disk reloads quietly when the editor is clean, and shows a one-line notice when it is dirty.
  - **Agent notice:** a calm notice when the agent tab is "Arbetar" and the file is in the active intent's record.
  - **Read-only:** read-only files show their reason.
  - Texts in sv/en.
- [x] **Step 24: Tests for the editor (FR1.5, NFR2).** With Monaco mocked in jsdom, `tests/renderer/EditorPanel.test.jsx`:
  - language from the extension (`.md`, `.jsx`, `.yaml`, `.sh`, unknown);
  - Cmd+S calls `file:write` with the expected mtime/hash;
  - a conflict opens the conflict dialog;
  - closing a dirty tab asks first;
  - a read-only file shows its reason and has no save.

  Run it, then the full suite.
- [x] **Step 25: Packaged check and PR for US-1001 (FR1.5, FR2.1, FR2.2).**
  - Run `npm run build:mac` and open a file in the built app to confirm the editor and workers load under `file://`.
  - Time a 1 MB file open, and confirm app start is unchanged.
  - Record the CSP and bundle-size findings in the story's notes.
  - Tick US-1001, set it to ✅ for v0.2.4, commit, push, open the PR, and merge once CI is green.

### Close

- [x] **Step 26: Summary and traceability.** Write `code-summary.md`: the files per story, decisions, test counts, tests not run with reasons, and deviations. Write `traceability.json` through the sensor command, with every FR/NFR mapped to its implementation or test file.

The release itself (FR2.4: version `0.2.4`, the release notes in `docs/releases/0.2.4.md`, the "Released in v0.2.4" markers, the release PR and the tag) runs in Deployment Pipeline and Deployment Execution after Build and Test.

## Story to step traceability

| Requirement | Story | Steps |
|-------------|-------|-------|
| FR1.1 | US-0006 | 2, 3, 4, 5 |
| FR1.2 | US-0409 | 6, 7, 8 |
| FR1.3 | US-0207 | 9, 10, 11, 12, 13 |
| FR1.4 | US-0903 | 14, 15, 16, 17, 18, 19 |
| FR1.5 | US-1001 | 20, 21, 22, 23, 24, 25 |
| FR2.1, FR2.2 | all | 5, 8, 13, 19, 25 |
| FR2.3 | release plan | 1 |
| FR2.4 | release | Deployment stages |
| NFR1 | all | 1 and every story's full-suite run |
| NFR2 | all | 4, 7, 10, 12, 15, 18, 22, 24 |
| NFR3 | US-0409, US-0207 | 6, 11 |
| NFR4 | UI stories | 6, 11, 17, 23 |
| NFR5 | US-0207 | 9, 10, 11 |
| NFR6 | US-0903, US-1001 | 14, 15, 21, 22 |
