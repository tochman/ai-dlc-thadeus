# Performance Requirements: u4-install

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR1, NFR6, NFR7; FR4.2, FR4.5)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/functional-spec.md` (W1, W2, W6, W9)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/rules.md` (BR7.7, BR7.15, BR7.17, BR7.18, BR7.20)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/entities.md` (HookInstallation held in memory, PreviewFile)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C4 `agentHooks.*`, C5 `isCurrent`)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md` (`chokidar` 4.0.3 through `src/main/watcher.js`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/performance-requirements.md` (u1 NFR1.1, u1 NFR4.1, u1 NFR6.1–NFR6.3, u1 NFR7.1)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/nfr-requirements-questions.md` (no questions)

## Scope

The installer sits on no hot path except one: the source choice at tab spawn (C5), which runs before every agent tab's first event and so must not cost u1's 1 s budget (u1 NFR1.1). Everything else runs when a project opens, when a watched file changes, or when the person clicks. The targets keep those moments quick enough that the person never waits on the installer. Every time-based test bound below is about 10 times the expected cost, so CI on `ubuntu-latest` does not flake. The bound is a check tolerance, not a promise of speed.

"Release Mac" means the MacBook Pro the person builds and checks releases on (requirements NFR1).

## Latency (NFR1)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR1.14 | `isCurrent(projectRoot, harness)` (C5) answers from the HookInstallation held in memory. It never reads disk, so the source choice at tab spawn adds nothing measurable to u1 NFR1.1. | synchronous, 0 `fs` calls per call; an unknown project or harness returns `false` | Unit test with `fs` spies: 1 000 calls make 0 `fs` calls; unknown key returns `false` |
| NFR1.15 | The status on project open (W1, BR7.17) reads each of the three fixed paths once and never writes. It runs after the project view's first render, so opening a project never waits on it. | at most 3 file reads (plus their `realpath` lookups), 0 writes; resolves in ≤ 200 ms with a 1 MB `.claude/settings.json`; the project view renders before the status resolves | Main test on a temporary project with a 1 MB settings fixture: `fs` spies and elapsed time; renderer test: the project view shows with the status still pending and the M7 strip appears when it resolves |
| NFR1.16 | A change on disk (AI-DLC rewrites `.claude/settings.json`, a pull, a deleted script) reaches the store and the renderer through the existing `watchFiles` debounce (300 ms, max 800 ms) and a fresh read. | `agent-hooks:changed` pushed and `isCurrent` updated ≤ 1.5 s after the write; one push per burst of writes; no push when the recomputed status equals the last one | Main test with a real temporary folder and `watchFiles`: rewrite the settings file 5 times in 100 ms, expect exactly one push within 1.5 s; touch the file without changing it, expect no push |
| NFR1.17 | Preview and apply respond at once to the click (W2 steps 1–6). | `agentHooks.preview` resolves in ≤ 300 ms and `agentHooks.apply` in ≤ 500 ms for a 1 MB settings file plus the script; the M8 dialog shows a busy state on Install from the click until the result | Main test timing both calls on the 1 MB fixture; renderer test: Install is disabled and labelled busy while `apply` is pending |

The 1 MB fixture is a size bound for the check, not a limit the app enforces (see `scalability-requirements.md`).

## Setup screens (NFR6, NFR7)

These targets cover the Unit's `ui` side (M7 strip, M8 preview, Project settings > Agent dialogs). They sit here as in u1, because the stage has no separate usability file.

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR6.7 | The M8 preview works by keyboard alone and writes nothing by accident. | focus is on Cancel when the dialog opens; Tab reaches the apply button (Install, Update or Remove) and every file section; Enter on Cancel and Esc anywhere close it and write nothing; there is no keyboard shortcut that applies | Renderer tests driving only keyboard events: `document.activeElement` on open, Tab order, Esc closes with 0 `agentHooks.apply` calls |
| NFR6.8 | Statuses and changes are named in text, never by colour alone (BR7.20, BR7.7). | each status reads "present and current", "out of date", "missing" or "edited by hand"; every diff line starts with a visible `+`, `-` or space; a file that replaces a hand edit carries the text "edited by hand, will be replaced by the app's version" | Renderer tests: each status word is present in the DOM for each status; diff lines keep their sign characters as text; the hand-edit summary text is present when `replacesHandEdit` is true |
| NFR7.5 | Every setup text goes through `t()` with ICU placeholders (BR7.20). | 0 hard-coded user-facing strings in the M7, M8 and Project settings components; the same keys in `sv.json` and `en.json` | Existing `tests/main/i18nKeys.test.js`; renderer tests run in the Swedish locale |
| NFR7.6 | Refusal and partial-write sentences are translated, while file paths and diff content are not. | every C4 refusal and `partiallyWritten` sentence is one `t()` key with the path as a `{file}` placeholder and the cause as `{cause}`; paths and diff lines are shown exactly as on disk | Unit test: each refusal enum maps to a key present in both locale files; renderer test: the path in the Swedish sentence equals the path on disk |

u1 NFR6.1–NFR6.3 and u1 NFR7.1 cover the agent dialog itself; nothing here changes them.
