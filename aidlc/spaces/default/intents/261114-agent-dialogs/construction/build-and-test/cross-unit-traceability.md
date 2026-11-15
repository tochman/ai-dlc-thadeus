# Cross-Unit Traceability: US-0506 agent dialogs

## Sources

- `aidlc engine sensor-traceability --stage build-and-test`, run 2026-11-15, over each `construction/<unit>/code-generation/traceability.json` (u1–u5), with each unit's `code-generation-plan.md`, `unit-test-instructions.md` and `code-summary.md`.

## Verdict: FAIL (records gap)

Every functional requirement and acceptance criterion is built. The check fails only on NFR sub-IDs that the Code Generation trace files of u2–u5 (and three of u1's manual ones) do not list.

## Requirements and acceptance criteria: all covered

| Group | Covered | Built in (Unit: file) |
|---|---|---|
| FR1.1–FR1.5, AC1.1.1–AC1.1.11 | ✅ | u1: `AgentDialog.jsx`, `ArtifactReader.jsx`, `agentEvents.js`, `agentChannel.js`, `dialog.sh`, `agentIpc.js`, `agentAdapters.js` |
| FR2.1–FR2.8, FR3.1–FR3.6, AC2.1.1–AC2.1.4 | ✅ | u2 (permissions) and u1 |
| AC3.1.1–AC3.1.5 | ✅ | u3: `ReplyPage.jsx`, `agentReplies.js`, `LatestMessageStrip.jsx`, `thadeus-dialog.js`, `agentAdapters.js` |
| FR4.1–FR4.7, AC4.1.1–AC4.1.6 | ✅ | u4: `AgentHooksPreview.jsx`, `AgentHooksSection.jsx`, `agentHooks.js`, `agentIpc.js`, `agentHooksGuard.test.js` |
| FR5.1–FR5.3, FR6.1, AC5.1.1–AC5.1.4 | ✅ | u5: `AgentDialog.jsx`, `alertPlan.js`, `notify.js`, `sv.json` |
| FR6.2–FR6.4 | ✅ | u1, u3 |

In-stage repair: u2's trace file named its list `links` instead of `coverage`, so the check could not read it and reported FR1.1, FR1.2, FR2.1, FR3.2, FR3.4, FR3.6 and AC2.1.1–AC2.1.4 uncovered. The key was renamed (content unchanged) and the check re-run.

## Uncovered: NFR sub-IDs

| Group | Not listed in a Code Generation trace file |
|---|---|
| NFR1 | 31 (u1 1.1–1.3; u2 7; u3 6; u4 5; u5 10) |
| NFR2 | 7 (u1 2.2; u2 3; u3 3) |
| NFR3 | 45 (u2 7; u3 17; u4 13; u5 8) |
| NFR4 | 14 (u2 3; u3 5; u4 6) |
| NFR5 | 40 (u2 8; u3 17; u4 14; u5 1) |
| NFR6 | 19 (u2 2; u3 3; u4 4; u5 10) |
| NFR7 | 8 (u2 2; u3 2; u4 3; u5 1) |
| NFR8 | 2 (u4 8.9; u5 8.50) |

Owning stage: code-generation (per Unit). The test files cite these IDs in their test names and the full suite passes (`test-results.md`), except the manual ones listed as `Unverified` in `build-and-test-summary.md`. Fix: add the NFR IDs, with their test or `N/A` reason, to each Unit's `code-generation/traceability.json`; that reopens Code Generation for u2–u5 (records only, no source change).
