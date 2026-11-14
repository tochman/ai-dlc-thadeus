# Performance Design: u4-install

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-design/nfr-design-questions.md` (no questions; two settled points)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/performance-requirements.md` (NFR1.14–NFR1.17, NFR6.7, NFR6.8, NFR7.5, NFR7.6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/scalability-requirements.md` (1 MB test size)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/tech-stack-decisions.md` (D3 span finder, D5 diff from splices, D6 `watchFiles`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/reviews/review-01.md` (R-03)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/functional-spec.md` (W1, W2, W6, W9)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C4 `agentHooks.*`, C5 `isCurrent`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/logical-components.md` (LC4 AgentEventStore, LC6 IpcRouter)
- Existing code: `src/main/watcher.js` (`watchFiles`, its `isFile` rule), `src/main/ipc.js` (`project:open`, `closeWatcher`)

## Approach

The installer is off every hot path except one: AgentEventStore (u1-questions LC4) asks `isCurrent` when a tab spawns. That call answers from memory. Everything else (status on open, recompute on change, preview, apply) is one pass over at most three small files, run off the render path. No cache, pool or worker is added: the inputs are three files, and the slowest one is a 1 MB test fixture.

## Design elements

### PD30 `isCurrent` answers from a map

- **Satisfies:** NFR1.14; keeps u1 NFR1.1 untouched.
- **Design:** HookInstaller (LC30) keeps `current: Map<string, boolean>` keyed `` `${root}\0${harness}` ``. Every status computation (W1, after apply, after a watched change) sets both harness keys for that root. `isCurrent(root, harness)` is `current.get(key) === true`. An unknown root or harness gives `false`. Project close deletes the root's keys (SCD31).
- **Test:** unit test with `vi.spyOn` on `node:fs` and `node:fs/promises`: 1 000 calls make 0 `fs` calls; an unknown root and an unknown harness each return `false`.

### PD31 Status on open runs after the first render

- **Satisfies:** NFR1.15.
- **Design:** `project:open` starts `installer.openProject(projectId, root)` without `await`, after the project entry is in `projects` (as `syncFeaturesWatch` is today). The status computation reads the three fixed paths once each (`lstat` chain from SD30, then one `readFile` per existing file), scans the settings text once (D3, linear in its length) and writes nothing. The result is pushed as `agent-hooks:changed`; the renderer also calls `agentHooks.status` on mount and shows the setup section as pending until one of them answers.
- **Test:** main test on a temporary project with a 1 MB settings fixture: spies count at most 3 `readFile` calls and 0 write, rename, unlink, mkdir or rmdir calls; elapsed ≤ 200 ms (a CI tolerance, about 10 times the expected cost). Renderer test: the project view renders while the status promise is pending, and the M7 strip shows after it resolves.

### PD32 Recompute on change through the existing watcher, one push per real change

- **Satisfies:** NFR1.16.
- **Design:** one `watchFiles({ root, paths: THREE_PATHS })` per open project (D6), stored as `p.hooksWatcher` and closed by `closeWatcher` (SCD31). Two small facts in today's code shape this:
  - `watchFiles` treats a target as a file only when it ends in `.md` or `.json` or its basename starts with `.`. `.thadeus/hooks/dialog.sh` and `.opencode/plugins/thadeus-dialog.js` would be taken as folders and never match. The `isFile` pattern widens to `/\.(md|json|sh|js)$/i`. No current caller names a folder with those endings (a test pins this: every existing `watchFiles` call site's targets keep their file/folder reading).
  - The watcher's `onChange` waits for the project's apply chain before it recomputes (`p.hooksApply.then(recompute)`, RD40), so an apply's own renames give one recompute after the apply, not a half-written status in between.
- After recomputing, the installer compares the new status with the last one sent (`JSON.stringify` of the C4 payload). Equal: no push and no `isCurrent` change. Different: update the map (PD30), push `agent-hooks:changed`, tell AgentEventStore.
- **Test:** main test with a real temporary folder and `watchFiles`: 5 rewrites of `.claude/settings.json` in 100 ms give exactly one push within 1.5 s; a `touch` with the same bytes gives no push; a write to `.thadeus/hooks/dialog.sh` and to `.opencode/plugins/thadeus-dialog.js` each give one push (the `isFile` fix); deleting `.thadeus/` gives one push.

### PD33 Preview and apply in one pass, with a busy button

- **Satisfies:** NFR1.17.
- **Design:** preview reads the files once, scans once, builds `nextContent` by splicing (D3) and the diff from the same splices (D5, SCD30). Apply re-reads each file once (RD35) and writes with `writeAtomic` (RD33). No step re-parses more than twice (once for the old text, once for the post-check, SD34). In M8, Install, Update and Remove are disabled and show the busy label (`agentHooks.busy`) from the click until `apply` settles; Cancel stays enabled but does nothing to a running apply.
- **Test:** main test timing `preview` (≤ 300 ms) and `apply` (≤ 500 ms) on the 1 MB fixture plus the script, as CI tolerances; renderer test: the apply button has `disabled` and the busy text while the `apply` promise is pending, and a second click makes no second call.

### PD34 M8 is keyboard-safe

- **Satisfies:** NFR6.7.
- **Design:** M8 is a modal dialog built as the existing setup dialogs are. On open, focus goes to Cancel (`autoFocus`). The tab order is Cancel, then each file section (a focusable region with `tabIndex={0}` so a long diff can be scrolled by keyboard), then the apply button. Esc and Enter on Cancel close it and call `agentHooks.cancel` (SD31). There is no accelerator for apply, and Enter is not bound on the dialog as a whole.
- **Test:** renderer tests with keyboard events only: `document.activeElement` is Cancel on open; Tab reaches every section and the apply button in that order; Esc from any element closes with 0 `agentHooks.apply` calls and 1 `agentHooks.cancel` call; Enter while focus is on a file section applies nothing.

### PD35 States and changes in words

- **Satisfies:** NFR6.8.
- **Design:** the status of each file and harness is rendered as text from `agentHooks.status.<status>` (sv and en); colour is an addition only. Diff lines are rendered as text with their first character (`+`, `-` or space) kept in the DOM, in a `<pre>` per hunk. A PreviewFile with `replacesHandEdit` shows `agentHooks.preview.replacesHandEdit` above its diff.
- **Test:** renderer tests: for each of the four statuses its word is in the DOM; diff lines' `textContent` starts with the sign; the hand-edit sentence is present only when `replacesHandEdit` is true.

### PD36 Every text through `t()`, paths and diffs as on disk

- **Satisfies:** NFR7.5, NFR7.6.
- **Design:** one key per ApplyResult `refusal` value and for `partiallyWritten`: `agentHooks.refusal.<value>` with `{file}` and `{cause}` placeholders. `{file}` is the root-relative path exactly as in the fixed path table; `{cause}` is a translated short cause from `agentHooks.cause.<code>` for the OS codes the app names (`EACCES`, `EPERM`, `EROFS`, `ENOSPC`, `link`, `changedSincePreview`), else the bare code. The diff text is passed through untranslated. The `invalidJson` sentence reads "is not plain JSON, so the app does not change it", not "not valid JSON" (resolves R-02 (d), see SD34).
- **Test:** existing `tests/main/i18nKeys.test.js`; a unit test that every `refusal` enum value and `partiallyWritten` has a key in both locale files; a renderer test in the Swedish locale where the path in the sentence equals the path on disk.

## u1 rows this Unit cites

| u1 row | How u4 keeps it |
|---|---|
| NFR1.1 (dialog within 1 s) | PD30: `isCurrent` adds no I/O to the spawn path |
| NFR6.1, NFR6.3 (dialog keyboard and text states) | unchanged; PD34 and PD35 apply the same rules to M8 |
| NFR7.1 (`t()` for dialog texts) | unchanged; PD36 applies it to the setup screens |
| NFR4.1 (guard exits fast) | the installed commands are the C6 strings (SD35); RD30 times them after a real install |
