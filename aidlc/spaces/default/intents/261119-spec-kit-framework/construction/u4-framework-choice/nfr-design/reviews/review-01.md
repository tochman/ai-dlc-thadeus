## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T12:04:17Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/nfr-design/performance-design.md > NFR7.1 row | The design says `chooseFramework` "runs detection again and sends the `project:detected` push itself". In `src/main/ipc.js`, a switch of framework does more than send the push: `watchForSetup`'s `onFound` closes `p.setupWatcher`, sets `p.framework`, starts `watchSpace` (aidlc) or `watchSpeckit` (speckit), then sends the push. If the choice handler only detects and pushes, the views switch but the project record keeps its old framework, the setup watcher keeps running, and no space or Spec Kit file watcher starts. The Spec Kit and AI-DLC views would then be static after the choice. Nothing in the design or in `logical-components.md` owns this. | State in the design which code does the full post-write switch (close the setup watcher, set `p.framework`, start the matching watcher, then push), preferably by extracting the body of `watchForSetup`'s `onFound` into a shared function that both call. Add a test that after Confirm the project's framework and watcher are set. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/nfr-design/logical-components.md > `frameworkChoice.js`: `chooseFramework(root, framework)` and security-design.md > The one write | The two documents give different signatures: `chooseFramework(root, framework)` against `chooseFramework(projectId, framework)`. The security design (NFR3.3) requires the project id, not a path, as the input. Also, `projectService.js` already has a private `chooseFramework(found, saved, askWhenBoth)`, so the new name is confusing. | Fix the component table to `(projectId, framework)`, or name the main-side function separately from the IPC handler. Rename one of the two `chooseFramework` functions. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/nfr-design/performance-design.md > NFR4.3 row | The claim that the PATH read is "shared and cached by `exec.js`, so after the first project open it costs nothing" holds only after a successful read. In `exec.js`, `readLoginPath` does not keep a fallback result, so after a timeout every scan and every Retry waits up to 20 s again. | Say that the cache covers successful reads only. Decide whether Retry should call `refreshLoginPath`, so a tool the person just installed is found, and record that choice. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/nfr-design/security-design.md > Tool lookup | `locateTool` ignores any path the person saved for `specify`, because `specify` is not in `TOOL_IDS`. That is deliberate, but the design does not say it. The screen can therefore show "specify not found" for a tool installed outside the login PATH, while the Tools section accepts custom paths for other tools. | Add one line that this is a known limit, or note that the U3 setup step offers the way out when the tool is missing. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| none listed in the stage definition | not run | I checked the claims by hand against `exec.js`, `tools.js`, `projectService.js`, `projectFile.js` and `ipc.js`. The `resolveOnPath` and `isExecutable` helpers, `writeProjectFile`'s keep-other-keys behaviour and `FRAMEWORKS` all match the design. |

### Summary

The design is sound: a read-only scan, one validated atomic write through U2, no program started, and every NFR is traced to a test. The one gap to weigh before approving is that the post-write framework switch in `ipc.js` also restarts watchers and updates the project record, which the design does not cover. The other three findings are minor wording and decision gaps.
