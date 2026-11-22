# Units of Work: Release v0.2.13

One Unit per story, as Requirements set it. Every Unit is code in the one desktop app (embedded, shipped together in v0.2.13), on its own `feat/` or `fix/` branch and squash-merged pull request. Components and decisions: `../domain-design/components.md`, `../domain-design/decisions.md`. Plan approved by the person (Approve Plan).

| Unit ID | Directory | Story | Kind | Size | Deployment |
|---|---|---|---|---|---|
| U1 | u1-login-path | US-0035 | library | S | embedded |
| U2 | u2-main-planning-read | US-0036 | library | M | embedded |
| U3 | u3-thadeus-sync | US-0609 | service | L | embedded |
| U4 | u4-park-unpark | US-0510 | ui | S | embedded |
| U5 | u5-fold-list | US-0415 | ui | S | embedded |

## U1 — u1-login-path (US-0035)
- **Owns**: ExecRunner (`exec.js`), ToolsRegistry (`tools.js`), the Tools row's fallback note (ToolsView).
- **Delivers**: 20 s login-shell read, shared in-flight read, no kept fallback, `refresh()` on a scan, the fallback flag on the row (FR1.1–FR1.5). ADR-006.
- **Notes**: a pure promise change with an injectable `exec`; tests use fake timers. NFR5: 20 s is the longest timeout.

## U2 — u2-main-planning-read (US-0036)
- **Owns**: FeaturesLoader (`features.js`) source choice and overlay, GitReader's file-at-ref read, PlanningSync's stale-entry drop, the source label in FeaturesView.
- **Delivers**: planning from `origin/<docs branch or main>` on a story branch, the branch's story blocks on top, the local target with no remote, the label (FR2.1–FR2.5). ADR-001.
- **Notes**: write hashes must come from the read ref. Tests use a real temporary git repo with an origin.

## U3 — u3-thadeus-sync (US-0609)
- **Owns**: ThadeusSync (new `thadeusSync.js`), PlanningRecord's `.thadeus` entry kind, the exported worktree/rebase/push helpers of PlanningSync, AgentHooksInstaller's splice from `main`'s version and committed-drift check, SetupHelper's `.thadeus` rule, the combined waiting count in FeaturesView.
- **Delivers**: FR3.1–FR3.8. ADR-002, ADR-003.
- **Notes**: both cycles run through the same per-root serial queue. Token logs merge by reading time. `.DS_Store` and swap files are skipped. The harness file table has two rows (Claude Code, opencode).

## U4 — u4-park-unpark (US-0510)
- **Owns**: IntentPark (new `intentPark.js`), ProjectService's parked state from the audit, the Parked mark and Park/Unpark in IntentList and IntentDetail, ResumeButton's unpark-first.
- **Delivers**: FR4.1–FR4.6. ADR-004.
- **Notes**: fixed arguments only, never `--help`; the intent name must be in the intent list. Code Generation checks whether `aidlc --status` answers for a non-active intent; the audit covers it either way.

## U5 — u5-fold-list (US-0415)
- **Owns**: UseFold (new `useFold` hook and shared LCARS classes), SettingsStore's `listFolded`, the toggle and strip in every list view.
- **Delivers**: FR5.1–FR5.4. ADR-005.
- **Notes**: the list stays mounted while folded, so its state survives. Each view gets a test for its toggle, `aria-expanded` and accessible name; reduced motion turns the animation off.
