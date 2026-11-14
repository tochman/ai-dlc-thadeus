# Scalability Design: u4-install

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-design/nfr-design-questions.md` (no questions)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/scalability-requirements.md` (load table, NFR5.36, NFR5.37)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/tech-stack-decisions.md` (D5 diff from splices, D6 `watchFiles`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/nfr-requirements/reviews/review-01.md` (R-05 preview lifetime)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/functional-spec.md` (W1, W9)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/logical-components.md` (shared resources table, `chokidar` row)
- Existing code: `src/main/watcher.js` (`watchFiles`), `src/main/ipc.js` (`closeWatcher`, `project:close`)

## Approach

The load is one person, a few open projects, two harnesses and three files (scalability requirements). Nothing here scales out. The design keeps two things bounded: what the preview shows, and what each open project holds in main.

## Design elements

### SCD30 The diff holds only the app's spans

- **Satisfies:** NFR5.36.
- **Design:** D5. Each splice gives one hunk: its old lines with `-`, its new lines with `+`, and at most 3 context lines on each side, taken from the file text around the splice. Two splices whose context would overlap are joined into one hunk. A whole-file create is all `+`, a delete all `-`. Nothing else of the file goes into the diff, so its size follows the app's entries (about 1.3 KB for the four Claude Code groups), not the file's.
- **Test:** unit test on the 1 MB fixture: Install gives at most 4 hunks, each with at most 3 context lines on each side, and a diff under 4 KB.

### SCD31 Per project: one watcher, at most two previews, two map entries

- **Satisfies:** NFR5.37; bounds the preview memory of review R-05 (SD31).
- **Design:** what an open project holds for this Unit, and when it goes:

| Held in main | Bound | Created | Dropped |
|---|---|---|---|
| `p.hooksWatcher` (one `watchFiles` over the three paths, PD32) | 1 | `installer.openProject`, called from `project:open` | `closeWatcher(p)`, which `project:close` and `shutdown` already call; this Unit adds `p.hooksWatcher` to its list |
| `p.hookPreviews` (SD31) | 1 per harness, so 2 | `agentHooks:preview` | apply, cancel, supersede, or project close |
| `p.hooksApply` (the apply chain, RD40) | 1 promise | project open | project close |
| `current` map keys (PD30) | 2 per root | each status computation | project close: `installer.closeProject(root)` deletes both keys and the last pushed status and last logged reasons (OD31) |

  `watchFiles` watches the root with a depth of 3 and an `ignored` filter that keeps only the three paths and their folders, so missing folders are picked up when they appear (D6, F-01). A watcher is one `chokidar` instance per project, which is the same cost as the existing `watchConfig` and `syncFeaturesWatch` watchers.
- **Test:** main test: open 3 temporary projects, then close them one by one. After each step, the count of live `hooksWatcher` instances and of previews equals the open projects (and 0 at the end); `isCurrent` of a closed root is `false`.

## Growth that is accepted

The list of earlier CanonicalReleases grows by one entry per release that changes the installed content. A status computation compares each found entry against every release by parsed value and digest: O(releases × 4), with releases in single digits. No index is built.
