## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T11:59:56Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/nfr-requirements/security-requirements.md > NFR4.1 and tech-stack-decisions.md > NFR4.4 | The requirement says the lookup is "`toolPath`, else `resolveOnPath`". In `src/main/tools.js`, `toolPath(name)` never fails: it returns the saved path or just the name, so there is no "else". `resolveOnPath(name)` also joins each PATH dir with its argument, so passing a saved absolute path gives wrong results. `TOOL_IDS` does not contain `specify`, so a saved path can never exist for it. The text does not say whether a saved `aidlc` path counts as found, whether it is checked for existence or the executable bit, or how `specify` is handled. A developer would have to guess, and a stale saved path could show "on the PATH" falsely. | State the exact rule. For example: for `aidlc`, use the saved path if one is set and it is an executable file (the same check `resolveOnPath` uses), otherwise `resolveOnPath('aidlc')`. For `specify`, use `resolveOnPath('specify')` only. Say that a saved path that is not executable counts as not found. Add a test for a stale saved path. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/nfr-requirements/performance-requirements.md > NFR4.3 | The target is 300 ms on the CI runner, but the Measure is a test with a 1 s bound. The bound is a loosening that the text does not explain, and the scan's file checks (an AI-DLC space exists, `.specify/` exists) are not named as part of the budget. | Either set the test bound to match the target, or write that 300 ms is the design target and the 1 s test bound is only there to avoid flaky timing on `scripts`. Name the file checks as part of the scanned work. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/nfr-requirements/security-requirements.md > NFR3.1 | "Makes exactly U2's write" does not cover an interrupted write or an existing `.thadeus/project.json` that is unreadable or invalid. The choice screen only appears when the file is missing (BR4.1). A file that appears between scan and Confirm (another clone, or a manual edit) would be overwritten without notice. | Add one line saying whether `chooseFramework` overwrites a file that has appeared since the scan, or refuses it. Add a test either way. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/nfr-requirements/performance-requirements.md > NFR7.2 | Double-call protection is only a disabled button in the renderer. The main-side `chooseFramework` has no idempotency or in-flight requirement, and the "call again after setup succeeds" path (BR4.6) is a second caller of the same handler. Two near-simultaneous calls would still run two atomic writes. They write the same content, so the harm is small. | Say the main-side handler is safe to call twice with the same value (the atomic write is idempotent), and add a test for it. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u4-framework-choice/nfr-requirements/traceability.json > NFR6 and NFR5 | NFR5 and NFR6 are marked N/A with a reason. That is reasonable. The reason for NFR6 depends on U3's panel choosing the harness, which is not on `main` yet (tech-stack-decisions.md notes that U4 builds after U3 merges). | No change needed. Optionally note the dependency on U3 under NFR6 so it is rechecked if U3's design changes. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| (none listed for this stage) | n/a | I read `src/main/tools.js` and `src/main/exec.js` to check the claims about the helpers. The 20 s login PATH timeout matches `PATH_TIMEOUT_MS`. The `toolPath` and `resolveOnPath` behaviour does not match NFR4.1 as written (see the Major finding). |

### Summary

The requirements are measurable, cover NFR1 to NFR8 with sensible N/A reasons, and the security rules match the functional rules BR4.6 to BR4.8. The one point to weigh before approving is that NFR4.1 and NFR4.4 describe the saved-path lookup in a way the real helpers do not support, so it needs a precise rule. The rest are minor tightening. READY, with one Major.
