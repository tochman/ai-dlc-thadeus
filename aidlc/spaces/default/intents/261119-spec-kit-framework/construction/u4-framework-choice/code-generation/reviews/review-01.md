## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/code-generation/unit-test-instructions.md > Run this unit's tests (main-process command) | The documented main command lists `tests/main/tools.test.js` but not `tests/main/locateTool.test.js`, where the six tool-lookup tests now live (code-summary Deviations says the file should be listed). Anyone following the instructions skips those tests. The plan's Step 5 also still names `tools.test.js`. | Add `tests/main/locateTool.test.js` to the main command and the expected-coverage line, and correct the file named in Step 5 of the plan. | New |
| R-02 | Minor | src/renderer/FrameworkChoice.jsx > `save()` (comment `ponytail:`) | After a written choice the screen stays on "Saving" with the options disabled until main pushes `project:detected`. If that push is lost (sender destroyed, or `applyDetection` returns early), the person has no way out except reopening the project. The ceiling is named in the comment but there is no fallback. | Accept the shortcut knowingly, or add a small fallback: after a result with `next: 'none'`, return to `choosing` if no detection arrives within a few seconds. | New |
| R-03 | Minor | tests/e2e/intentLayout.spec.js and tests/e2e/planning.spec.js | The detection change (a missing `.thadeus/project.json` now means the choice screen) can affect built-app flows. The summary says it changed `intentLayout.spec.js` and that `planning.spec.js` opens a folder with neither framework, but nobody ran the e2e suite for this unit. The unit's scoped commands do not cover e2e. | Run the Playwright suite in Build and Test and record the result. Do not mark the story released until it passes. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npx vitest run --project main tests/main/projectService.test.js tests/main/tools.test.js tests/main/locateTool.test.js tests/main/frameworkChoice.test.js tests/main/ipc.test.js` | PASS: 5 files, 131 tests passed | Detection, tool lookup, scan, choose and IPC behave as the plan describes. |
| `npx vitest run --project scripts tests/main/frameworkChoiceTimed.test.js` | PASS: 1 file, 1 test passed | The scan stays within the timing target (NFR4.3). |
| `npx vitest run --project renderer tests/renderer/FrameworkChoice.test.jsx tests/renderer/ProjectView.test.jsx` | PASS: 2 files, 31 tests passed | The screen states, the single-call guard and the mount in `ProjectView` pass. The code summary reports 30, one fewer than this run. |

### Summary

The implementation matches the functional spec and contract C4. The scan only reads, an unknown framework is refused before any file access, a missing framework writes nothing, and `applyDetection` gives the switch a single owner. All three scoped test commands pass. The open points are minor: a test file missing from the instructions, a "Saving" screen with no fallback, and an e2e run still owed.
