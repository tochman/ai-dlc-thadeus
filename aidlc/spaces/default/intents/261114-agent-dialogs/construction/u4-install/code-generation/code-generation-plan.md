# Code Generation Plan: u4-install

## Summary

- Builds: install, update and remove of the agent dialog hooks (US-0506 US4.1): the HookInstaller with its settings splicer, preview and once-only apply, the status from disk with a watcher, the source choice that follows it, and the M7 strip, M8 preview and Project settings section
- Touches: new `src/main/agentHooks.js`, `src/renderer/AgentHooksStrip.jsx`, `AgentHooksPreview.jsx`, `AgentHooksSection.jsx`; changes in `src/main/fileWrite.js`, `watcher.js`, `agentIpc.js`, `ipc.js`, `src/preload/index.js`, `src/renderer/ProjectView.jsx`, `ProjectSettingsDialog.jsx`, both locale files, `vitest.config.mjs`, `contract-summary.md`
- Tests: about 120 new tests in 8 new and 4 extended files: unit tests per component, the settings fixture suite on real temporary folders, the installed guard commands under `sh` and `dash`, and an install-to-source-choice integration test

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

- Design: `functional-design/functional-spec.md` (entry set, W1–W9, both state machines), `entities.md`, `rules.md` (BR7.1–BR7.20); `nfr-requirements/tech-stack-decisions.md` (D1–D7, NFR8.8, NFR8.9); `nfr-design/security-design.md` (SD30–SD36), `reliability-design.md` (RD30–RD44), `performance-design.md` (PD30–PD36), `logical-components.md` (LC30–LC35 and its "Amendments for Code Generation").
- Built by u1–u3 and installed as they are: `.thadeus/hooks/dialog.sh`, `.opencode/plugins/thadeus-dialog.js`, `WAIT_SECONDS` in `src/main/agentChannel.js`, the spawn-time `hooksCurrent` check in `src/main/agentIpc.js`. The dash redirect trap (u1 review R-01) is already fixed: the RD31 pattern finds nothing in today's `dialog.sh`.

## Decisions made in this plan

- **The plugin path is `.opencode/plugins/thadeus-dialog.js`** (D4), as u1–u3 built it.
- **Remove while a tab runs (RD42)** ends that harness's store and channel sessions for the project through a new `agentIpc.demote(root, harness)`; the tab's pty keeps running, its script finds no session folder and exits 0 (u1 NFR4.2), and the dialog shows the audit fallback from the next event.
- **u5 shares `ipc.js` and the locale files.** u4 changes only the `hooksCurrent` line, the `createAgentIpc` call and the `project:open`/`project:close` handlers; u5 adds its lines after the store is built.

## Steps

### Structure, contracts and runner

- [x] Step 1: Contract and design amendments, before any code (logical-components "Amendments"). In `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md`, with the file-edit tool, each marked "U4 amendment": C6 `recognised_as_the_apps` to the `appKind` rule, `committed_files` to the two real paths; C4 `agentHooks.cancel`, the new `apply` errors, the exact argument lists, the `agent-hooks:changed` push, `status` entries with `reason`. In this Unit's functional design: BR7.1 wording, `applying` and Cancel in the InstallPreview machine, the link row in W7, the RD37 cases in Known limits, `.ts` read as `.js`. NFR3.25's first clause reads "refused as a link". Traces: SD30, SD31, SD34, RD37, R-01, R-04, R-05.
- [x] Step 2: Runner check on the unchanged tree. Run `npx vitest run tests/main/fileWrite.test.js tests/main/watcher.test.js tests/main/agentIpc.test.js tests/main/dialogScript.test.js` and record the pass count. In `vitest.config.mjs`, add `tests/main/agentHooksGuard.test.js` to `TIMED` (the real-time `scripts` project) and per-file 80% line entries for `src/main/agentHooks.js` and the three new renderer files (setting floors up, never lowering one). Traces: NFR8.5.
- [x] Step 3: Test data. `tests/fixtures/agent-hooks/` with the NFR8.8 and RD43 settings fixtures as files: `empty-object.json`, `no-hooks.json`, `hooks-empty.json`, `aidlc.json` (a copy of this repository's `.claude/settings.json`), `other-pretooluse.json`, `indent-4.json`, `indent-tab.json`, `crlf.json`, `bom.json`, `no-final-newline.json`, `unknown-keys.json`, `current.json`, `earlier-release.json`, `hand-edited.json`, `duplicate-app.json`, `invalid.json`, `hooks-array.json`, `teammate-other-sh.json`, `questionx.json`, `two-hooks-keys.json`, `escaped-hooks-key.json`, `bad-utf8.json`, `jsonc-comment.json`, and a generated 1 MB fixture built in the test helper. A `README.md` names what each holds. Traces: NFR8.8, RD43.

### Data access: the atomic writer and the watcher (LC32, LC33)

- [x] Step 4: Red. Extend `tests/main/fileWrite.test.js` (8 tests): `writeAtomic` writes the bytes; on `ENOSPC` at the temp write and `EACCES` at the rename the target keeps its old sha256 and no `*.tmp` is left; `expect` throwing leaves the target untouched; `mode` sets `0600`, `0664` and `0755` exactly; without `mode` a new file gets `0o666 & ~umask`; `writeFileSafe` now keeps a file's mode; `isEngineOwned` is true for `.claude/settings.json` and `.opencode/plugins/thadeus-dialog.js` and false for `.thadeus/hooks/dialog.sh`; a source test finds `writeAtomic` imported only by `fileWrite.js` and `agentHooks.js`. Extend `tests/main/watcher.test.js` (2 tests): `watchFiles` treats `.sh` and `.js` targets as files; every existing call site's targets keep their file or folder reading. Run `npx vitest run tests/main/fileWrite.test.js tests/main/watcher.test.js`; record the failures.
- [x] Step 5: Green. `src/main/fileWrite.js`: `export async function writeAtomic(abs, bytes, { mode, expect } = {})` per RD33 with its `ponytail:` comment (no `fsync` before rename); `writeFileSafe` calls it with `stat.mode & 0o7777`. `src/main/watcher.js`: `isFile` pattern `/\.(md|json|sh|js)$/i`. Traces: D1, RD33, SD36, PD32, NFR3.30, NFR5.25, NFR5.34.
- [x] Step 6: Refactor. Existing editor tests green unchanged.

### Business logic: ownership, canonical release, paths (LC30)

- [x] Step 7: Red. New `tests/main/agentHooks.test.js`, first part (16 tests): `appKind` table of RD38 (each canonical command, unquoted, `;exit 0` forms give the kind; `questionx`, no argument, `other.sh`, no `.thadeus/hooks/`, a non-string give `null`); `CANONICAL` per RD41 (events, matchers, timeouts 600 and 10, `question` and `permission` timeout ≥ `WAIT_SECONDS.claude` + 5); the current release's `scriptDigest` and `pluginDigest` equal the sha256 of the `?raw` imports and appear in the release table (D2); the RD31 source test finds no `:` with a redirect in `dialog.sh`; a source test finds no network import or `fetch(` in `agentHooks.js` (SD35); `checkPath` on a temporary project for every SD30 case (`.claude` and `.thadeus` linked outside, a settings link outside, `.claude` linked to `docs/`, `.thadeus` linked to `.git/`, a dangling link, `dialog.sh` linked inside): the right reason, and the link target's bytes and mtime unchanged; absent paths name their missing folders. Run `npx vitest run tests/main/agentHooks.test.js`; record the failures (module missing).
- [x] Step 8: Green. New `src/main/agentHooks.js` (header: US-0506 u4 US4.1, BR7.1–BR7.20, ADR-004): `FILES`, `KINDS`, `appKind`, `command(kind)` from the C6 string, `CANONICAL` with the wait constant imported from `agentChannel.js`, `RELEASES` with the current digests from `?raw` imports of `dialog.sh` and `thadeus-dialog.js`, `checkPath(root, rel)`. Traces: BR7.1–BR7.3, SD30, SD34, SD35, RD31, RD38, RD41, NFR3.24, NFR3.25, NFR3.29, NFR4.10.
- [x] Step 9: Refactor. The C6 string held once; tests green.

### Business logic: the settings splicer (LC31)

- [x] Step 10: Red. Second part of `tests/main/agentHooks.test.js` (24 tests, pure, bytes in and out): reading refuses invalid UTF-8, a BOM not at the start, a parse failure (`invalidJson`), duplicate keys and keys with `\` in any walked object, `hooks` not an object, an event value not an array, a group without `hooks` (`unexpectedShape`); a leading BOM is kept; `classify` gives `current`, `outOfDate` (an earlier release's entry), `editedByHand` (another command or timeout for a known kind), `missing`, and an extra app entry of a kind as a hand edit (BR7.4–BR7.6); `splice(install)` over each RD43 fixture: the result parses, `prune(stripApp(next))` deep-equals `prune(stripApp(old))`, exactly one current entry per kind, the file's own line end and indent, the final newline kept, appends in the fixed event order; a missing file gives a new file with only the app's entries; `splice(update)` replaces outOfDate and edited entries in place and marks `replacesHandEdit`; `splice(remove)` leaves no `appKind` command and round-trips byte for byte to the pre-install file except the three RD37 cases; the teammate `other.sh` and `questionx` entries are byte-identical after install, update and remove; a patched splicer that drops a non-app key or writes a wrong timeout is refused by the post-check; the diff per splice has `-`/`+` signs and up to 3 context lines (D5); install twice gives `none` (RD36). Run `npx vitest run tests/main/agentHooks.test.js`; record the failures.
- [x] Step 11: Green. In `src/main/agentHooks.js`: the span scanner (`ponytail:` strict JSON only; switch to `jsonc-parser` if comments or trailing commas turn up), `classify`, `splice(text, action)`, `stripApp`, `prune`, `postCheck`, `diffFromSplices`. Traces: D3, D5, BR7.4–BR7.6, BR7.8, BR7.10–BR7.12, BR7.19, SD34, RD36, RD37, RD38, NFR3.28, NFR5.28–NFR5.30, NFR5.36.
- [x] Step 12: Refactor. Splice operations as three small functions (replace, remove with separator, append); tests green.

### Business logic: status, preview, apply (LC30)

- [x] Step 13: Red. New `tests/main/agentHooksInstaller.test.js` (26 tests, `createHookInstaller({ log })` on real temporary projects, `fs` spies):
  - Status: one entry per harness with each file's status in words and a `reason` for an unusable file (RD39); a harness is `current` only when all its files are; `isCurrent` answers from memory (1 000 calls, 0 `fs` calls; unknown root or harness `false`; PD30); status, preview and open make 0 writes (SD31); at most 3 `readFile` calls on open (PD31).
  - Preview: one open preview per harness (a newer one supersedes); a harness with a `reason` builds none; the IPC result holds `previewId` and `{ path, change, summary, diff, replacesHandEdit }` only, never `nextBytes` or `baseDigest` (SD33); a preview with every file `none` offers no apply and applying it gives `nothingToChange`.
  - Apply: writes the preview's bytes (sha256 equal), script before settings on install and update, settings before script and non-recursive `rmdir` on remove (RD34); unknown, applied, refused, superseded, cancelled and another project's ids give `previewUnknown`; two applies without awaiting give one write per file and `previewUnknown` for the second; each RD40 table row leaves the right map state; a file changed, created or deleted after the preview writes nothing and returns a new preview (W6, RD35); the final compare is directly followed by `rename` or `unlink` with no other `fs` call between (an `fs` wrapper records the order); a settings rename failure on install gives `partiallyWritten` naming `.claude/settings.json` and status `outOfDate`; a script unlink failure on remove gives `partiallyWritten` and Remove offered again; an unexpected throw leaves no preview in `applying`; two harnesses' applies on one project run one after the other; a new file and new folders get the umask modes, a changed file keeps its mode; `dialog.sh` has no `\r` and no BOM; the 1 MB fixture: preview ≤ 300 ms, apply ≤ 500 ms, status ≤ 200 ms (CI tolerances).
  - Watch: 5 rewrites in 100 ms give one `onStatus` push within 1.5 s; the same bytes give none; writes to `dialog.sh` and the plugin each give one; deleting `.thadeus/` gives one; a fixed invalid file loses its `reason`; the recompute waits for a running apply; project close removes the watcher and the `isCurrent` keys.
  Run `npx vitest run tests/main/agentHooksInstaller.test.js`; record the failures.
- [x] Step 14: Green. In `src/main/agentHooks.js`: `createHookInstaller({ log, onStatus })` with `openProject(projectId, root)`, `closeProject(projectId)`, `status(projectId)`, `preview(projectId, harness, action)`, `apply(projectId, previewId)`, `cancel(projectId, previewId)`, `isCurrent(root, harness)`; per project `hookPreviews`, `hooksApply` chain and `hooksWatcher` (`watchFiles` over the three paths); `[agent-hooks]` log lines with file names and codes only. Traces: BR7.5, BR7.7, BR7.9, BR7.13–BR7.17, SD31, SD33, PD30–PD33, RD33–RD35, RD39, RD40, RD42, OD30, OD31, NFR1.14–NFR1.17, NFR3.26, NFR3.27, NFR5.26, NFR5.27, NFR5.31, NFR5.32, NFR5.35.
- [x] Step 15: Refactor. `writeOrder(preview)` and the outcome table as data; tests green.

### Guard: the installed commands (RD30)

- [x] Step 16: New `tests/main/agentHooksGuard.test.js` (scripts project, real time; each case for every shell in `SHELLS`): after a real Install into a temporary root named `a b "c" $d`, read each of the 4 commands back from the written file and run it 20 times under each of the 4 RD30 cases: exit 0, 0 bytes on stdout and stderr, ≤ 100 ms each; the commands equal the canonical strings byte for byte (SD35). Written after the layer it checks. Run `npx vitest run tests/main/agentHooksGuard.test.js`. Traces: RD30, NFR4.9, AC4.1.3, AC4.1.4.

### API: IPC, preload, source choice (LC34, u1 LC4)

- [x] Step 17: Red. New `tests/main/agentHooksIpc.test.js` (10 tests): each of `agentHooks:status`, `:preview`, `:apply`, `:cancel` with one argument too many, one too few, an unknown harness or action, a number or object as `previewId` throws `errors.invalidValue` with 0 `fs` reads (SD32); valid calls reach the installer; `agent-hooks:changed` is pushed to every sender on `onStatus`. Extend `tests/main/agentIpc.test.js` (4 tests, fake installer): a tab spawned before Install stays on the fallback after it; a tab spawned after Install gets a session; `demote(root, harness)` ends that project's sessions of that harness in the store and the channel and leaves other projects and harnesses alone; spawn reads `isCurrent` with no `fs` call. Extend `tests/main/preload.test.js` (1 test): `agentHooks.status`, `preview`, `apply`, `cancel` pass exactly their arguments, and `onChanged` subscribes `agent-hooks:changed`. Run `npx vitest run tests/main/agentHooksIpc.test.js tests/main/agentIpc.test.js tests/main/preload.test.js`; record the failures.
- [x] Step 18: Green. `src/main/agentHooks.js`: `hooksHandlers(installer)` with the argument checks. `src/main/agentIpc.js`: `demote(root, harness)`. `src/main/ipc.js`: the installer built once in `agentWiring()`, `hooksCurrent` replaced by `installer.isCurrent` (the `THADEUS_AGENT_HOOKS` switch removed, K4), `onStatus` pushes `agent-hooks:changed` and calls `agent.demote` when a harness stops being current; `project:open` calls `openProject` without awaiting it, `project:close` (inside `closeWatcher`) calls `closeProject`. `src/preload/index.js`: the `agentHooks` members. Traces: C4, C5, SD32, PD31, RD42, BR7.17, BR7.18, SCD31, AC4.1.6.
- [x] Step 19: Refactor. u1–u3 IPC and store tests green unchanged.

### Integration: install to source choice

- [x] Step 20: New `tests/main/agentHooksFlow.test.js` (3 tests; real installer, real `agentIpc` and store, fake pty, temporary project): status `missing`, preview, apply, then a new agent tab gets a session; Remove while that tab runs: its next event comes from the audit fallback; AI-DLC rewriting the settings file between preview and apply gives the changed-since-preview refusal and a new preview built from the new text. Written after the layers; a failure is fixed in the layer it names. Run `npx vitest run tests/main/agentHooksFlow.test.js`. Traces: W2, W5, W6, W9.

### Frontend: M7 strip, M8 preview, Project settings section (LC35)

- [x] Step 21: Red. New `tests/renderer/AgentHooksStrip.test.jsx` (6 tests): shown for a used harness that is `missing` (Install) or `outOfDate`/`editedByHand` (Update), naming the file in words; hidden when current or the harness is not used; Details opens Project settings at the Agent dialogs section; dismissing hides it for this run; a status with `reason` shows the sentence and Details only, no action (RD39); the view renders while status is pending (PD31). New `tests/renderer/AgentHooksPreview.test.jsx` (10 tests): title per action ("Add agent dialogs to this project", "Remove agent dialogs from this project"); the committed-and-shared and teammates lines; one section per file with path, summary and the diff in a `<pre>` whose lines start with their sign (PD35); the hand-edit sentence only with `replacesHandEdit`; focus on Cancel at open, Tab order Cancel, sections, apply; Esc closes with 0 `apply` and 1 `cancel` call; Enter on a section applies nothing (PD34); the apply button is disabled with the busy text while `apply` is pending and a second click makes no call (PD33); a changed-since-preview result keeps the dialog open with the sentence and the new diff; a refusal shows its one sentence with the path as on disk (PD36); success closes with the restart line naming the harness (BR7.18). New `tests/renderer/AgentHooksSection.test.jsx` (5 tests): lists each file with its status word; Install, Update and Remove as the status allows; none for a file with a `reason`; updates on `agent-hooks:changed`. Run `npx vitest run tests/renderer/AgentHooksStrip.test.jsx tests/renderer/AgentHooksPreview.test.jsx tests/renderer/AgentHooksSection.test.jsx`; record the failures.
- [x] Step 22: Green. New `src/renderer/AgentHooksStrip.jsx`, `AgentHooksPreview.jsx` (a modal `<dialog>` as the existing setup dialogs), `AgentHooksSection.jsx`; the strip at the top of `src/renderer/ProjectView.jsx`, the section in `src/renderer/ProjectSettingsDialog.jsx`. Every text through `t()`: `agentHooks.status.<status>`, `agentHooks.reason.<reason>`, `agentHooks.refusal.<value>`, `agentHooks.cause.<code>`, `agentHooks.preview.*`, `agentHooks.strip.*`, `agentHooks.busy`, `agentHooks.done` in both `sv.json` and `en.json`. `data-testid` values `agent-hooks-strip`, `agent-hooks-strip-action`, `agent-hooks-strip-details`, `agent-hooks-strip-dismiss`, `agent-hooks-preview`, `agent-hooks-preview-cancel`, `agent-hooks-preview-apply`, `agent-hooks-preview-file`, `agent-hooks-section`, `agent-hooks-section-<harness>-<action>`. Traces: BR7.7, BR7.8, BR7.15, BR7.20, PD33–PD36, RD39, NFR6.7, NFR6.8, NFR7.5, NFR7.6, AC4.1.1, AC4.1.2, AC4.1.5.
- [x] Step 23: Refactor. A unit test that every `refusal` value and `partiallyWritten` has a key in both locale files; `tests/main/i18nKeys.test.js` green; existing ProjectView and ProjectSettingsDialog tests green.

### Documentation and traceability

- [x] Step 24: Module headers and exported doc comments name US-0506 u4 and the BR, SD or RD they implement. Write `code-summary.md`, `source-manifest.json` and `traceability.json` in this folder; `code-summary.md` lists the RD44 manual run (both harnesses, the deduplication check with the Claude Code version) for the release pull request. Run `npx vitest run tests/` once at the end and record the result.

## Story traceability

| AC | Steps |
|---|---|
| AC4.1.1 (install from the app after a preview) | 10–15, 21, 22 |
| AC4.1.2 (status, update, remove) | 10–15, 20–22 |
| AC4.1.3 (teammates without the app unaffected) | 8, 16 |
| AC4.1.4 (sessions the app did not start unaffected) | 16 |
| AC4.1.5 (nothing written without yes, refusals in one sentence) | 13, 14, 20–22 |
| AC4.1.6 (source choice follows status) | 17–20 |
