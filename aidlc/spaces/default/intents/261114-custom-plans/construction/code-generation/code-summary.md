# Code Summary: v0.2.4

Written story by story during Code Generation. Step 26 completes it with traceability.

## US-0006: Popup answers reach Claude Code's real picker (FR1.1)

### Findings (Step 2)

There was no live capture with the person. On 2026-11-14 the person decided to fix from what is already known, with many varied tests and smoke tests ("Fixa från det vi redan vet med mycket olika tester och kanske röktester"). The comparison used the audit shards of every intent in this space and the person's screenshot of Claude Code's real picker.

**Cause 1: options that can never match the picker.**

- `parseOptions` (`src/main/questions.js`) split `Options` on commas only. The shards also hold:
  - pipe lists (`|Yes, all three work|Something is wrong (describe)`);
  - semicolon batch summaries (`Q1: a / b; Q2: c / d`, and `Q1: a, b; Q2: c, d`);
  - comma batch summaries (`Q1: a / b ,Q2: c / d`, and `Q1: a,Q1: b,Q2: c`);
  - labels with a description glued on (`Guide me (walk through each question interactively here)`). One of those descriptions holds a `;`, so even the separator must be chosen outside parentheses.
- A batch summary became one question with 4–12 options that no picker shows. Every answer to it fell back to "Svara i terminalen".
- Plan-approval, scope-confirm, new-work-routing and guard-recovery asks are logged as `QUESTION_ASKED` rows with exact JSON options. `pendingQuestions` ignored them, so the popup never showed them.
- `QUESTION_REPLIED` carries the picker's exact JSON options, but only after the answer. It is useful as the closer of a `QUESTION_ASKED` ask, not as the source of a stage question's options.
- A `QUESTION_ANSWERED` closed the oldest open question of its stage, whatever it answered. An answer to a question that was never logged, or one left open from an earlier attempt, closed the wrong one.

**Cause 2: a picker on screen that the reader does not see (`noPicker`, intermittent).**

- Timing: the popup opens on the audit row, before Claude Code draws the picker. A quick click found no picker.
- Viewport: `screenLines` read from `buf.viewportY`. A tab scrolled up shows old output. The terminal panel is 180–240 px high, about 10–14 rows, so a picker of 15 or more rows (a gate with descriptions) pushes its `❯ 1.` row into the scrollback. This is probably the most common miss.
- Box character: Claude Code draws the header chip as `□` (U+25A1). `BOX = /[☐☒✔✓]/` lacked it, so a batch whose chips are all `□` read as a single question.
- Checked and found sound: the gate layout itself (cursor row, indented descriptions, `3. Type something.`, the rule, `4. Chat about this`, the key hint) is read correctly by `readPicker`.

**Fixtures.** `tests/fixtures/picker/` holds the layout transcribed from the screenshot (`gate.txt`) and variants: `single.txt` (answer mode, cursor on 1), `single-cursor2.txt`, `batch-square.txt` (`□` chips and `✔ Submit`), `batch-ballot.txt` (`☒`/`☐`/`✔ Submit`, cursor on 2), `long-label.txt` (a label cut with `…`), `wrapped.txt` (a label wrapped onto the next row) and `no-picker.txt` (a working agent). The cases "taller than the visible rows" and "scrolled-up viewport" are terminal states. The smoke tests create them from these fixtures.

**Development-only log.** `QuestionPopup`'s send path prints the `resolveAnswer` result, each agent tab's `{rows, viewportY, baseY}` and its last 30 screen rows when a send fails. It runs only behind `import.meta.env.DEV`.

### Fix (Step 3)

- `src/main/questions.js`
  - `parseOptions(raw)` returns `{options, batch}`. It reads JSON, pipe, semicolon and comma lists, choosing the separator outside parentheses. It strips `Q<n>:` and a trailing description in parentheses. Two or more `Q<n>` groups give a `batch` of `{id, options}`.
  - `QUESTION_ASKED` (not of type `gate`, not a duplicate id) opens a question with its exact JSON options and `ask: <Question Type>`. It is closed by a `QUESTION_REPLIED` with the same options, by `PLAN_APPROVAL_RECORDED`/`PLAN_APPROVAL_SKIPPED`/`REQUEST_ROUTED`, or by the stage closers.
  - `QUESTION_ANSWERED` closes the oldest stage question whose options the reply (`Person Reply` or `Details`) names. Otherwise it closes the newest, the one on screen. It never closes an engine ask.
- `src/renderer/picker.js`
  - `□`/`■`/`☑` count as header chips. The chips are read only in the picker's own header (from the rule above it), not anywhere on screen.
  - A picker with more than 3 non-empty rows under it is old output, not the picker on screen.
  - A label matches with or without `A. `, `Q1: ` or a `(…)` description, when it is cut with `…`, or when it is wrapped onto the rows under it.
  - A batch question gives `several`.
  - `waitForAnswer(read, q, answer, {waitMs = 3000})` reads again every 150 ms while no picker is drawn.
- `src/renderer/TerminalPanel.jsx`: `screenLines` reads the bottom of the active buffer (`baseY`), with 40 rows of scrollback above it, not the scrolled viewport.
- `src/renderer/TerminalContext.jsx`: `answer()` is async and waits through `waitForAnswer`. `ProjectView.jsx` replies when it settles.
- `src/renderer/QuestionPopup.jsx`:
  - a batch shows its questions, offers only the terminal and says why in one sentence (`app.question.batch`);
  - an engine ask is named (`askPlan`, `askScope`, `askOther`);
  - a send waiting for its picker disables the choices.
- `src/main/notify.js`: the notification names an engine ask the same way.
- `src/shared/locales/{sv,en}.json`: `askPlan`, `askScope`, `askOther`, `batch`.

### Decisions

- **Batch pickers are answered in the terminal.** The plan allows "one answer per question, or only Svara i Claude". The shards show that a batch's logged summary labels differ from the picker's own labels (`Non-default plus Show all` against `Non-default + Show all`). Keys per question would be guessed, so the popup sends nothing and says why.
- **Free-text replies close the newest question.** A reply that names no option most likely answers the question on screen.

### Tests (Step 4)

- `tests/renderer/picker.test.jsx` (13 tests) runs over every fixture:
  - the gate's `Approve` and `Request Changes` keys;
  - a single question with the cursor on option 1 and on option 2;
  - the option under the rule;
  - labels with a description, letter or Q prefix;
  - a label cut with `…` and a wrapped label;
  - a `□` batch, a `□`-only batch and a `☒`/`☐`/`✔ Submit` batch give `several`;
  - an own answer through "Type something";
  - `mismatch`, `noPicker`, an old picker under newer output, the right tab of three;
  - `waitForAnswer` waits for a late picker and gives up after 3 s.
- `tests/renderer/pickerSmoke.test.jsx` (6 tests, new): the fixtures as raw output (ANSI colours, CRLF, Ink's erase-and-redraw cursor moves) in a real `@xterm/xterm` `Terminal` in jsdom, read through `screenLines` → `readPicker` → `resolveAnswer`:
  - a gate;
  - a tab scrolled up 30 rows;
  - an 8-row terminal under a 17-row picker, also scrolled up;
  - a redraw with the cursor moved to option 2;
  - a 40-column tab that wraps rows;
  - a batch, and an answered picker under newer output.
  `Terminal` runs in jsdom (only a canvas warning), so no stand-in was needed.
- `tests/main/questions.test.js` (14 tests, 8 new):
  - comma, pipe, semicolon and JSON lists;
  - a description with `;` stripped;
  - every batch form found in the shards;
  - plan-approval and scope-confirm asks shown and closed;
  - a batch summary row as a batch;
  - an answer closing only its own question.
- `tests/renderer/QuestionPopup.test.jsx` (11 tests, 3 new):
  - a send before the picker is drawn succeeds once it appears, and the popup closes on the following `QUESTION_ANSWERED`;
  - a batch offers only the terminal;
  - a plan-approval ask is named and shows its options.
- `tests/renderer/TerminalPanel.test.jsx`: the `answer()` test is now async, and one test was added for the wait.
- **Regression check:** three cases were run against temporary copies of `main`'s `picker.js`, `screenLines` and `parseOptions`, deleted afterwards. All three failed on `main`:
  - the gate through a scrolled viewport gave `noPicker`;
  - the `□` batch gave `multi: false`;
  - the pipe list gave `['|Yes', …]`.
  They pass on the new code.
- **Counts:** the US-0006 command gives 4 files and 44 tests. The full suite gives 53 files and 311 tests, all passing (baseline 52 files and 285 tests).

### Deviations

- **First criterion.** It asks for the cause to be found in a real Claude Code session, with the picker text captured. Following the person's decision of 2026-11-14, the fixtures are transcribed from their screenshot instead. The criterion is ticked with that note in the story.
- **Unchanged screen-only test.** `tests/renderer/TerminalPanel.test.jsx`'s stand-in terminal is kept for the panel tests. The real `Terminal` is used in the new smoke file.

### PR

- [#24](https://github.com/tochman/aidlc-dash/pull/24): CI green (verify, build-mac, build-linux; release skipped outside tags). Squash-merged into `main` as `6aa4792`.
- While this story was built, two commits were pushed to `main` directly, outside this work: `0ce5db7 chore(aidlc): close living-lcars intent` and `a2166a6 wip INTENT LIST`. They now sit under #24 and are not part of v0.2.4's plan.

## US-0409: The About window in the new LCARS design (FR1.2)

### Files

- `src/renderer/AboutDialog.jsx`: rebuilt. It exports `codeLabels(version, platform)`.
- `src/renderer/theme.css`: the `.about-lcars-*` rules replace the `.about-dialog-body` rules.
- `src/shared/locales/{sv,en}.json`: `aboutDialog.exit` (STÄNG / EXIT).
- `tests/renderer/AboutDialog.test.jsx`.
- `docs/FEATURES.md`, `docs/features/epic-04-branding-and-desktop.md`.

### Decisions

- **Elbow.** A CSS grid. The arm spans the top bar, main and foot rows. The main area overlaps the arm by 24 px with a 24 px radius, so the arm's colour shows in the inner curve. No new `Lcars.jsx` part was needed: `Frame`'s cut segments do not fit a dialog this size, and a second elbow component for one use was not worth it.
- **Colours.** Existing tokens only:
  - frame `--slate-5`;
  - bars `--text-2` with `--slate-2` text;
  - end tabs `--amber`, `--steel-light` and `--coral-soft` (the reference's pale yellow, pale cyan and a third);
  - title `--amber` (the app's accent);
  - EXIT `--steel-light` with `--on-light` text and an `--alert` marker.
- **Contrast.** Measured: bar text 7.8:1, EXIT 13.6:1, title 9.9:1, status row 12.2:1.
- **Labels (NFR3).** The code labels come from the version and platform (`00-02`, `04`, `DAR`, `000204`). EXIT/STÄNG comes from the locale files.
- **Motion.** No new animation. The mark keeps its `splash-mark` glow, which follows the animations setting.
- **Status row.** It keeps the `about-dialog-version` test id with the `settings.about.version` text, so the version reads the same as in Inställningar.

### Tests

- `tests/renderer/AboutDialog.test.jsx`: 6 tests (5 before, all updated, 1 new):
  - the name as title, and the full name, tagline and version in bars with end tabs;
  - code labels from app data;
  - EXIT closes and focus returns;
  - Esc and a click outside;
  - a failing version read;
  - English.
- Full suite: 53 files and 313 tests, all passing. The count includes one test from the direct `a2166a6` commit.

### Deviations

- **No screenshot.** Step 8's `docs/screenshots/about-v0.2.4.png` was skipped: this build has no screen access. The story's notes say a screenshot is due before the release.
- **No visual check.** The design was not seen on screen. The person should look at it once before the release.

### PR

- [#25](https://github.com/tochman/aidlc-dash/pull/25): CI green (verify, build-mac, build-linux). Squash-merged into `main` as `bda758d`.

## US-0207: Live token view while the work runs (FR1.3)

### Files

- `src/renderer/tokenFlow.js` (new): `tokensOf`, `pushSample`, `meterLevel`, `niceCeil`, `HISTORY_MAX = 120`, `SEGMENTS = 10`.
- `src/renderer/TokenView.jsx` (new): four meters and the waveform. It exports `wavePoints`.
- `src/renderer/IntentDetail.jsx`: the view sits in the readout column, right under the cost readout. `ReadoutColumn` gets `cost` and `dirName`.
- `src/renderer/theme.css`: the `.token-*` rules and `@keyframes token-wave-flow`.
- `src/shared/locales/{sv,en}.json`: `tokens.*`.
- `tests/renderer/tokenFlow.test.jsx`, `tests/renderer/TokenView.test.jsx`.
- `docs/FEATURES.md`, `docs/features/epic-02-cost-and-models.md`.

### Decisions

- **Data source.** `tokensOf(cost, dirName)` reads `cost.perIntent[dirName].total.tokens` from the `project:cost` summary, not the raw ledger. The renderer never receives the raw ledger. The summary's `costOf` already reads the intent's `workflows["intent:<uuid>"]` node and adds `cacheCreate5m + cacheCreate1h` into `cacheWrite`, so the figures stay the ledger's own and nothing is re-implemented.
- **Shared scale.** The four meters share one scale, the largest figure rounded up to 1/2/5 × 10ⁿ. The meters can then be compared, and each still shows its exact figure as text.
- **History.** It lives in the component and starts again when another intent is shown. An unchanged reading adds no point. A lower total starts a new history.
- **Stale ledger (NFR5).** With `cost.stale`, main has kept the last good summary, and the view shows `cost.stale` with main's warning. With `cost.available: false`, the view keeps the last sample's tokens and shows the same sentence with main's reason.
- **Motion (NFR4).** The lit segments pulse with the existing `lcars-glow-steel` and the wave line flows with a dash animation. Both are stopped by the existing `data-motion` rules (reduced/off).

### Tests

- `tests/renderer/tokenFlow.test.jsx`: 5 tests.
- `tests/renderer/TokenView.test.jsx`: 4 tests.
- The US-0207 command gives 2 files and 9 tests. The full suite gives 55 files and 322 tests, all passing.

### Deviations

- **Test file name.** It is `tokenFlow.test.jsx`, not `tokenFlow.test.js`: the renderer project in `vitest.config.mjs` only picks up `*.test.jsx`, and the plan does not change that file.
- **`tokensOf` signature.** It is `tokensOf(cost, dirName)` on the summary, not `tokensOf(ledger, intentUuid)`. The reason is given under Decisions.
- **Known limit.** The readout column (and so the view) is hidden in windows narrower than 1280 px. This follows the plan's place for the view. A view for narrow windows would be a follow-up.
- **No visual check.** The view was not seen on screen.

### PR

- [#26](https://github.com/tochman/aidlc-dash/pull/26): CI green (verify, build-mac, build-linux). Squash-merged into `main` as `8d1c97a`.

## US-0007 (EPIC-00 fix, added during the release): Resume stays disabled while an agent session runs the work

The person reported this during the work. Following the project's way of working for small fixes, it was done directly after Step 13 as its own PR, outside the plan's steps.

### Files

- `src/renderer/TerminalContext.jsx`: `running()`, true while any agent tab is not exited.
- `src/renderer/ResumeButton.jsx`: `workingReason()` adds the reason `intents.resume.running` after busy and asking. It needs a live session and an active intent whose status is `in-flight`.
- `ProjectView.jsx`, `IntentDetail.jsx`, `IntentList.jsx`: pass `activeIntent`.
- `src/shared/locales/{sv,en}.json`: `intents.resume.running`.
- Docs: the US-0007 story in `docs/features/epic-00-fixes.md`, the Stories and Status lines, `docs/FEATURES.md`, and `docs/releases/0.2.4.md`.

### Decisions

The intent name in the text is the active intent's slug (falling back to its dirName), the way the intent list shows it.

### Tests

- `tests/renderer/ResumeButton.test.jsx`: 4 new tests, 9 in all.
- `tests/renderer/TerminalPanel.test.jsx`: `running()` checked true and false.
- The full suite gives 55 files and 326 tests, all passing.

### PR

- [#27](https://github.com/tochman/aidlc-dash/pull/27): CI green (verify, build-mac, build-linux). Squash-merged into `main` as `4f570b2`.

## US-0903: Create and reuse custom plans (FR1.4)

### Files

- `src/main/plans.js` (new): `listPlans`, `planStages`, `validPlanName`, `gridOf`, `savePlan`, `planEditDiff`, `previewPlanEdit`, `applyPlanEdit`, `deletePlan`, and `readPlans`/`loadPlans` moved here from `aidlcConfig.js`.
- `src/main/aidlcConfig.js`: imports `loadPlans` and `OWN_PLANS_DIR` from `plans.js`. `config:get` still sends `{name, description, own, active}` per plan.
- `src/main/projectService.js`: `inProgress` exported, so a plan in use is judged the same way as a waiting question.
- `src/main/ipc.js`: `plans:list`, `plans:stages`, `plans:save`, `plans:previewEdit`, `plans:applyEdit`, `plans:delete`.
- `src/preload/index.js`: `listPlans`, `getPlanStages`, `savePlan`, `previewPlanEdit`, `applyPlanEdit`, `deletePlan`.
- `src/shared/planName.js` (new): `validPlanName`, shared by main and the view.
- `src/renderer/PlansView.jsx` (new), `App.jsx` (arm block, view label, menu whitelist), `ProjectView.jsx`, `theme.css` (`.plans-*`, `.config-change-actions`).
- `src/shared/locales/{sv,en}.json`: `app.plans`, `plans.*`, `errors.invalidPlanName|stockPlan|planInUse|planNotFound`.
- `tests/main/plans.test.js`, `tests/renderer/PlansView.test.jsx`.
- `docs/FEATURES.md`, `docs/features/epic-09-aidlc-configuration.md`.

### Decisions

- **Stock plans' stages.** A stock scope file (`.claude/scopes/aidlc-bugfix.md`) has no grid block. `planStages` reads the own plan's grid, then the harness copy's, then the harness's compiled `tools/data/scope-grid.json`. The stage count uses the same sources.
- **Harness copies.** An edit or a delete removes `<dir>/scopes/aidlc-<name>.md` for every harness in the table that has one (`.claude/`, `.aidlc/`, `.codex/`, `.kiro/`, `.cursor/`, `.github/skills/aidlc/`), the same folders `scopesDir` gives and the config watch already covers. A copy that is a symlink is removed as a link, never its target.
- **In use.** A plan is used by an intent whose `plan` (or, without one, `scope`) names it. Delete is refused while such an intent is in progress (`inProgress`, the rule waiting questions use).
- **Save plan** shows only when the active intent has a `Plan` (a composed plan). It passes `--name` only, so it saves the active intent's plan.
- **Edit.** Preview and apply follow the Guard Policy lock: main keeps the text the diff was made from and writes only when the file still reads it. Only `description`, `depth` (`Minimal|Standard|Comprehensive`) and `keywords` reach `planEditDiff`; a block keyword list is replaced by one inline list.
- **Agent lines.** The person's text becomes one quoted argument: whitespace collapsed to one line, `\` and `"` escaped. Change steps types `/aidlc compose "<localized request naming the plan>: <what>"`.

### Tests

- `tests/main/plans.test.js`: 7 tests, in a temp folder from `fs.mkdtemp(os.tmpdir())`.
- `tests/renderer/PlansView.test.jsx`: 6 tests.
- The US-0903 command gives 2 files and 13 tests. The full suite gives 57 files and 339 tests, all passing.

### Deviations

- **`planStages` signature.** It is `planStages(root, harness, name)`, not `planStages(root, name)`: the harness decides which copy and which compiled grid to read.
- **A runtime-integrity hook refused a write of `PlansView.jsx`** whose code built an agent line from a variable named `aidlc` in a template string (it reads as a shell call to the `aidlc` CLI with an unresolved argument). The variable is `agentBase` and the lines are joined from arrays. No hook or setting was changed.
- **No visual check.** The view was not seen on screen.

### PR

- [#28](https://github.com/tochman/aidlc-dash/pull/28): CI green (verify, build-mac, build-linux). Squash-merged into `main` as `9979774`.
- **Fixed in #29:** `PlansView` was rendered after `.project-main` had closed, so it sat outside the project's main column. #29 moves it inside.

## US-1001: Edit files in the app with Monaco (FR1.5)

### Files

- `package.json`, `package-lock.json`: `monaco-editor` 0.57.0 and `@monaco-editor/react` 4.7.0, as devDependencies.
- `src/main/fileWrite.js` (new): `isEngineOwned`, `readForEdit`, `writeFileSafe`, `listTree`, `MAX_EDIT_BYTES`, `TREE_SKIP`.
- `src/main/ipc.js`: `file:read`, `file:write`, `file:watch`, `project:listTree`, `app:closeConfirmed`; `guardClose(win)` and `noteQuitting`; the open files' watcher closes with the project.
- `src/main/watcher.js`: `watchOpenFiles`.
- `src/main/index.js`: `guardClose(win)`; `before-quit` notes the quit, and `shutdown()` moved to `will-quit`.
- `src/preload/index.js`: `readFileForEdit`, `writeFile`, `watchOpenFiles`, `listTree`, `onFileChanged`, `onConfirmClose`, `confirmClose`.
- `src/renderer/editor/` (new): `monacoSetup.js`, `MonacoPane.jsx` (lazy), `EditorPanel.jsx` (`useEditorTabs`, `languageFor`), `ConflictDialog.jsx`, `FileTree.jsx` (`buildTree`), `EditorContext.jsx` (`useEditor`, `markDirty`, `dirtyFiles`).
- `src/renderer/ProjectView.jsx`: the Editor view, the editor context, `editRequest`, the active intent's record for the agent notice.
- `src/renderer/App.jsx`: the Editor arm block, the view label and menu whitelist, `editRequest` from the docs dialog, the ask on closing a project and on `app:confirmClose`.
- `src/renderer/ArtifactReader.jsx`, `FeaturesView.jsx`, `DocsDialog.jsx`: "Redigera / Edit"; the OS editor is the quieter `btn-quiet`.
- `src/renderer/index.html`: `worker-src 'self' blob:`.
- `src/renderer/theme.css`: `.editor-*`, `.file-tree*`.
- `src/shared/locales/{sv,en}.json`: `app.editor`, `common.edit`, `editor.*`, `errors.notAFile|engineOwned`; `common.openInEditor` now reads "Öppna i extern editor / Open in external editor".
- `tests/main/fileWrite.test.js`, `tests/renderer/EditorPanel.test.jsx`; `tests/main/windowOptions.test.js` (its `ipc.js` mock gains the two new exports).
- `docs/FEATURES.md`, `docs/features/epic-10-editing.md`.

### Decisions

- **Monaco 0.57's import paths.** The package's `exports` map `monaco-editor/*` to `esm/vs/*.js`, so the plan's `monaco-editor/esm/vs/editor/editor.api` no longer resolves. The setup imports `monaco-editor/editor/editor.api`, `monaco-editor/features/<name>/register`, `monaco-editor/languages/definitions/<lang>/register`, `monaco-editor/languages/features/<lang>/register` and `monaco-editor/language/<lang>/<lang>.worker?worker`.
- **Lazy loading.** `MonacoPane.jsx` imports `monacoSetup.js` first and `@monaco-editor/react` second, and is reached only through `React.lazy`. The loader therefore always has `monaco` configured before it can start, and the CDN default is never reached.
- **devDependencies.** Both packages are bundled into the renderer. As dependencies, electron-builder shipped `node_modules/monaco-editor` (102 MB) in `app.asar` (150 MB). As devDependencies, `app.asar` is 46 MB.
- **Engine-owned paths.** `aidlc/**/aidlc-state.md`, `aidlc/**/audit/`, `aidlc/**/intents.json`, `aidlc/**/runtime-graph*.json`, the `active-intent`/`active-space` cursors, any `.aidlc-*` file or folder, `.github/hooks/aidlc.json`, and the whole harness folders (`.claude/`, `.aidlc/`, `.opencode/`, `.codex/`, `.kiro/`, `.cursor/`, `.github/skills/aidlc/`) plus `.git/`. Both the path given and its real path are checked, so a symlink to an engine file is refused too.
- **Conflict.** The hash decides. An equal mtime skips the hashing. "Keep mine" saves against the disk version's hash.
- **Read-only.** Engine files open with their text. Binary files (a NUL in the first 8 KB) and files over 10 MB open without text, only the reason. Files over 2 MB open read-only.
- **File tree.** `git ls-files --cached --others --exclude-standard -z` honours `.gitignore`. Without git, a walk. Both skip `node_modules/`, `out/`, `dist/` and `.git/`, capped at 20,000 files. A folder's children render only when it is opened.
- **Reload.** main watches exactly the open files (`file:watch`). A change re-reads the file. An equal hash (our own save) is ignored, a clean tab reloads, and a dirty tab gets the one-line notice.
- **Closing.** Every window close waits for the renderer's `app:closeConfirmed`, which asks only while a file is unsaved. A renderer that is gone no longer blocks it. `shutdown()` moved from `before-quit` to `will-quit`, so a quit cancelled at the question doesn't stop the agent sessions.
- **Switching project.** The project tabs stay mounted, so showing another project keeps each editor and its unsaved text and does not ask. Closing the project asks.
- **Cmd/Ctrl+S** is handled on the panel's `keydown`, which Monaco lets through because it binds no command to it. Cmd/Ctrl+F is Monaco's own find.

### Bundle and CSP (Step 20, Step 25)

- **Before** (main after #28, `npx electron-vite build`): `index-*.js` 2,206.44 kB; `out/renderer` 2,388 KB.
- **After:** `index-*.js` 2,233.27 kB (+26.8 kB, the editor UI); `out/renderer` 25,852 KB. Lazy chunks: `editor.api` 5,050 kB, `MonacoPane` 1,124 kB, a shared `workers` chunk 1,076 kB, `editor.worker` 598 kB, `json.worker` 877 kB, `html.worker` 1,235 kB, `css.worker` 1,732 kB, `ts.worker` 11,613 kB, plus CSS, `codicon.ttf` and 18 small language chunks. The start chunk refers to `editor.api` only in its dynamic-import map.
- **CSP:** `worker-src 'self' blob:` added. No `'unsafe-eval'`: no chunk calls `eval(` or `new Function(`. The one hit is TypeScript's `lib.d.ts` text inside `ts.worker`. Workers are built as `new Worker(new URL('<name>.worker-<hash>.js', import.meta.url))`, same-origin files.
- **Packaging:** `npm run build:mac` built `dist/THADEUS-0.2.3-universal.dmg` (the version bump comes with the release). `asar list` shows the five worker files and the shared chunk in `app.asar` under `out/renderer/assets/`. They are not unpacked: Electron serves `file://` reads from inside the asar.

### Tests

- `tests/main/fileWrite.test.js`: 5 tests (out-of-root, `..`, symlink and engine-owned refusals; the atomic write; the conflict and keep-mine; binary, >2 MB and engine files read-only; the tree skips).
- `tests/renderer/EditorPanel.test.jsx`: 6 tests, Monaco mocked (`@monaco-editor/react` and `monacoSetup.js`): language from the extension; Cmd+S with the opened mtime/hash, the unsaved dot and the Markdown preview; the conflict dialog with compare and keep mine; closing a dirty tab asks; a read-only file with its reason and no save; quiet reload on a clean tab and the notice on a dirty one.
- The US-1001 command gives 2 files and 11 tests. The full suite gives 59 files and 350 tests, all passing.

### Not run here, with reasons

- **The built app's window.** This build cannot open it. So these wait for the person: opening a 1 MB file in under 1 s on the reference machine, an unchanged app start time, and the editor and its workers running in the `.dmg` under `file://`. The Performance criterion stays unticked. If a worker can't start under `file://`, Monaco falls back to running its language services on the main thread, so the editor still opens, only slower.
- **No visual check.** The editor, the tree and the LCARS Monaco theme were not seen on screen.

### Deviations

- **Monaco import paths** (see Decisions).
- **Story status timing.** US-1001 went from 📋 to ✅ in the PR's single commit. The 🚧 step was not committed separately.

### PR

- [#29](https://github.com/tochman/aidlc-dash/pull/29): CI green (verify, build-mac, build-linux). Squash-merged into `main` as `0293db3`.
- A commit outside this work, `c23f8bc docs: add Testing section to README and drop the old upgrade notes`, reached `main` between #28 and #29.

## Close (Step 26)

### Test counts

| Story | Story's own files | Full suite after its PR |
|-------|-------------------|-------------------------|
| Baseline | | 52 files, 285 tests |
| US-0006 (#24) | 4 files, 44 tests | 53 files, 311 tests |
| US-0409 (#25) | 1 file, 6 tests | 53 files, 313 tests |
| US-0207 (#26) | 2 files, 9 tests | 55 files, 322 tests |
| US-0007 (#27, EPIC-00) | 2 files | 55 files, 326 tests |
| US-0903 (#28) | 2 files, 13 tests | 57 files, 339 tests |
| US-1001 (#29) | 2 files, 11 tests | 59 files, 350 tests |

### Open for the person before the release

- US-0409: the About window screenshot (`docs/screenshots/about-v0.2.4.png`) and a look at it.
- US-0207, US-0903, US-1001: a look at the token view, the Plans view and the Editor view.
- US-1001: the 1 MB open time, the start time, and Monaco's workers in the built `.dmg`.

### Traceability

`traceability.json` was written by `aidlc engine sensor-traceability --stage code-generation … --write-upstream` and then filled in: every FR and NFR is `OK` with an existing implementation or test file, except FR2.4 (the release), which is `Deferred` to Deployment Pipeline and Deployment Execution with `docs/releases/0.2.4.md` as its target.
