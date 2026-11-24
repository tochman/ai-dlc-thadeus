# Logical Components: U10 u10-speckit-agent-status

Sources: `performance-design.md` and `security-design.md` in this folder, `tech-stack-decisions.md` in `../nfr-requirements/`, the U10 `functional-spec.md`, and contract C9 in `contract-summary.md`. Everything runs inside the one Electron app; the only failure domain is one project's readout.

| Component | Process | Responsibility | NFRs it carries |
|---|---|---|---|
| `agentProgress.js`: `waitingFrom(events)` | main (pure) | Oldest open hook question or permission, two fields, 200 characters | NFR3.3, NFR5.1 |
| `agentProgress.js`: `loadSpeckitProgress(root, events)` | main | Builds C9 with `Promise.allSettled`; `source` per BR10.4 | NFR3.1, NFR5.2, NFR7.3 |
| Agent event store (`agentEvents.js`, unchanged) | main | `list(projectId)`, per project, pager order | NFR3.3 |
| `loadSpeckitFeatures` (U6, unchanged) | main | Active feature and its task counts | NFR3.1 |
| `ipc.js` `agents:progress` | main | Branch order: Spec Kit, then dir name, then C9 | NFR3.2, NFR8.2 |
| `SpeckitProgress.jsx` above the Specs features list | renderer | LCARS readout; texts via `t()`; refresh on the two pushes | NFR1.1, NFR2.1, NFR5.1, NFR7.1, NFR7.2, NFR7.4 |
| `AgentDialog` hook page | renderer | One "from the agent hooks" note via `t()` | NFR1.1 |

Blast radius: a failing part shows as empty in this readout only; the features list below it and the popup are unaffected. A thrown bug rejects the call and the readout shows its failed state (the functional spec's screen states).

Shared with other Units: only the `agents:progress` handler, whose AI-DLC path with a dir name is unchanged and pinned by today's IPC tests, and `vitest.config.mjs`, which gains one `TIMED` entry.
