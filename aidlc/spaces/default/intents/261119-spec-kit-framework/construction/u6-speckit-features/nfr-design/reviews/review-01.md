## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-20T06:21:19Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u6-speckit-features/nfr-design/security-design.md > 1. Read-only Spec Kit files, "Artifact reader" bullet | The design says the reader hides `artifact-reader-edit` when the file's `readOnly` is `'speckit'`. But `FileView` in `src/renderer/ArtifactReader.jsx` loads text through `bridge.readFile` (`project:file`, `readText`), not `file:read`. It never receives `readOnly`, and today it shows Edit for engine-owned files too. As written, the Edit button cannot be hidden, and NFR3.2's renderer test has nothing to assert against. The `constitution.md` exception also has no way to reach the reader. `ArtifactReader.jsx` is listed as changed only as "Hides Edit". | State how the reader learns read-only status: switch it to `file:read`, or add a small IPC that returns the `readOnly` reason. Cover the constitution exception in that path. Update the `ArtifactReader.jsx` row in logical-components so it names the data source. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u6-speckit-features/nfr-design/security-design.md > 1, `ipc.js` passes `framework`; src/main/ipc.js `file:write` | The read-only rule fails open if `framework` is unknown, because a project without a recorded framework treats `specs/` and `.specify/` as writable. The design does not say where `ipc.js` gets `framework`: cached on the project, or re-detected on every save. A stale cache has the same effect. In `file:write`, `recordContent` runs before `writeFileSafe`, so a refused speckit save would still be recorded in the planning record, as an engine-owned save is today. | Say where `framework` comes from and that a stale value is acceptable or refreshed. Have `ipc.js` refuse a speckit read-only write before `recordContent`. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u6-speckit-features/nfr-design/traceability.json > NFR3.4 and NFR3.2 | NFR3.4 asks that the open-file call refuse a path that is not one of the listed files, and tests that. The design deliberately drops the list check (§2, "Opening a file") and relies on `file:read` staying inside the root. The reasoning (a stale list after a push) is sound. But the traceability entry says OK, and the measure "an unlisted path is refused" is not met. NFR3.2 says no Edit for any `specs/` or `.specify/` path, while Q1 = C keeps `constitution.md` editable. Neither requirement text was updated. | Mark NFR3.4 and NFR3.2 as deliberate deviations in traceability, with the reason. Re-word their measures: a path outside the root is refused, and constitution.md is the one editable file. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u6-speckit-features/nfr-design/security-design.md > 2. Paths stay in the project | Only direct children of `specs/` are checked with `lstat`. Inside a feature, `contracts/` and `checklists/` are listed by name, and the design does not say these subfolders or their files are checked for links. A linked `contracts/` folder pointing outside the root would leak file names into the list. Chokidar follows links by default, so a linked folder under `specs/` would also be watched outside the project. | Apply the link check to subfolders and files inside a feature as well. Set `followSymlinks: false` on the `/**` watcher target. Add a test for a linked `contracts/` folder. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u6-speckit-features/nfr-design/logical-components.md > `fileWrite.js` and the editor row | The editor shows its read-only reason through `t('editor.readOnly.<reason>')` (`EditorPanel.jsx`). The new reason `speckit` needs `editor.readOnly.speckit` in both `sv.json` and `en.json`, and `errors.speckitReadOnly` must exist too. Neither key is listed, and `i18nKeys.test.js` would fail without them. | List the new keys for both locales. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| None listed for this stage | Not run | Cross-checked the design against `src/main/fileWrite.js`, `src/main/watcher.js`, `src/main/ipc.js` and `src/renderer/ArtifactReader.jsx` by hand. |

### Summary

The security and performance design is sound: the `fileWrite.js` read-only case, the realpath checks and the `/**` watcher target all trace to real code. The one gap that needs a decision is the reader's Edit-hiding mechanism, which does not work as written because the reader never receives `readOnly`. The rest are small clarifications.
