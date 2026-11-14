# Unit Story Map: agent dialogs (EPIC-05 US-0506)

## Sources

- User stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (US1.1–US5.1).
- Units: `unit-of-work.md`.
- Components: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md`.
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md`.

## Story to Unit

| Story | Unit ID | Directory |
|---|---|---|
| US1.1 | U1 | u1-questions |
| US2.1 | U2 | u2-permissions |
| US3.1 | U3 | u3-replies |
| US4.1 | U4 | u4-install |
| US5.1 | U5 | u5-notifications |

## Cross-cutting rows

Each story maps to exactly one Unit, but the requirements below are met across several:

| Requirement | Units | How |
|---|---|---|
| FR6.1 order and one notification per event | U1, U2, U5 | U1 queues by arrival, U2 puts permissions before replies, U5 notifies once per event |
| FR6.2 64 KB and every character | U1, U3 | U1 for questions, U3 for replies |
| NFR2 correctness scenarios | U1, U2, U3 | scenarios 1–5 in U1, 6 in U2, 7 in U3 |
| NFR7 texts in sv and en | U1–U5 | every Unit adds its own keys |
| NFR8 quality gates | U1–U5 | test first, 80% line coverage of touched code, ESLint and Prettier |

## Order inside each Unit

- **U1:** AgentChannel; HarnessEventAdapter for Claude Code questions, then opencode; ClaudeCodeHook and OpencodePlugin for questions; AgentEventStore (lifecycle, check, delivery, source choice, fallback mapping); PtyManager and IpcRouter changes; AgentDialog M1, M2, M6; remove QuestionPopup.
- **U2:** adapter permission parsing; hook and plugin permission events; store permission rules and ordering; AgentDialog M3.
- **U3:** adapter reply parsing; stop hook and idle event (no wait); store reply kind, LatestMessage and stale check; AgentDialog M4; LatestMessageStrip M5.
- **U4:** HookInstaller status and preview; apply with re-read and atomic write; remove; AgentDialogsSetupUI M7, M8 and the settings section; switch the store's source choice to the installer status.
- **U5:** settings key; Notifications per kind; SettingsView M9 row; escalation for every kind.

## Coverage check

- Every story US1.1–US5.1 has a Unit.
- Every Unit U1–U5 has a story row.
