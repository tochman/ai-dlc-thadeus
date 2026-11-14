# Scalability Requirements: u4-install

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR5; Constraints: only `selectable` harnesses; Assumptions: one person per app)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/functional-spec.md` (entry set per harness, W1, W9)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/rules.md` (BR7.6, BR7.7, BR7.9, BR7.13, BR7.17)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u4-install/functional-design/entities.md` (HookInstallation per project and harness, at most one open InstallPreview, CanonicalRelease list)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md` (`watchFiles` in `src/main/watcher.js`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/scalability-requirements.md` (u1's load statement)

## Load, stated plainly

One person, a few open projects, two harnesses, three files per project. Nothing grows with use except the list of earlier CanonicalReleases, which gains one entry per release that changes the installed content. There is no growth projection, scaling trigger or capacity plan.

| Quantity | Bound | Source |
|---|---|---|
| Users | 1 per app | requirements, Assumptions |
| Harnesses | 2 (`claude`, `opencode`) | requirements, Constraints |
| Files per project | 3 fixed paths | BR7.13 |
| HookInstallations in memory | 2 per open project | entities |
| Open previews | at most 1 per project and harness; a new one supersedes it | BR7.9 |
| Applies running | at most 1 per project | BR7.9 |
| App entries in the settings file | 4 canonical, plus any extra app hooks found (all `editedByHand`, BR7.6) | BR7.2, BR7.6 |
| `.claude/settings.json` size | no limit is enforced; behaviour is tested up to 1 MB (NFR1.15, NFR1.17) | this file |
| Earlier CanonicalReleases | one entry per release that changed the content; each holds 4 entries and 2 digests | entities |

## Requirements at the bounds

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR5.36 | The preview stays readable whatever the file's size (BR7.7). The settings diff holds only the app's spans. | each settings hunk holds the app's lines plus at most 3 lines of context on each side; for the 1 MB fixture the diff for Install is under 4 KB | Unit test on the 1 MB fixture: hunk count, context lines and diff length |
| NFR5.37 | Watching the three paths costs one watcher per open project and ends with the project (BR7.17). The existing `watchFiles` is reused. | 1 `watchFiles` instance per open project, covering exactly the three paths (also when their folders do not exist yet); closed when the project closes; 0 instances after all projects close; previews of a closed project are dropped | Main test: open and close 3 projects, count live watchers and previews after each step |

More earlier releases only lengthen a list compared by digest and parsed value; that is O(n) in releases per status computation, with n in single digits for the life of the feature.
