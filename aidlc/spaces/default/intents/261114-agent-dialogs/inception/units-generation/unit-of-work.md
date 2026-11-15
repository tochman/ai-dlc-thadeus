# Units of Work: agent dialogs (EPIC-05 US-0506)

## Sources

- Components: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md` (13 components).
- Decisions: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/decisions.md` (ADR-001–ADR-006).
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md`.
- User stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (US1.1–US5.1).
- Answers: `units-generation-questions.md` Q1–Q3 `[Q1]`…`[Q3]`, and the approved Units plan.

One Unit per story, in a chain where later stories build on what US1.1 creates (`[Q1]`, `[Q3]`). The app stays one desktop build, and US-0506 ships as one pull request (User Stories Q1), so every Unit is embedded in that build. No walking skeleton (team practices).

## Units

| Unit ID | Directory | Story | Kind | Complexity | Deployment |
|---|---|---|---|---|---|
| U1 | u1-questions | US1.1 | service | XL | embedded in the desktop app; scripts committed to the project |
| U2 | u2-permissions | US2.1 | service | M | embedded |
| U3 | u3-replies | US3.1 | service | M | embedded |
| U4 | u4-install | US4.1 | service | L | embedded |
| U5 | u5-notifications | US5.1 | ui | S | embedded |

## U1 u1-questions: answer the agent's own questions from the dialog

- **Delivers:** US1.1.
- **Owns (creates):** AgentChannel, ClaudeCodeHook (question hook), OpencodePlugin (question event), HarnessEventAdapter (question parsing and answers for both harnesses), AgentEventStore (event lifecycle, answer check and delivery, source choice per project and harness), FallbackQuestionSource, AgentDialog (question and batch layouts M1, M2, the M6 states).
- **Changes:** PtyManager (session variables at agent spawn, guarded write into a named session), IpcRouter (new handlers and wiring), removal of `QuestionPopup.jsx` with its tests moved to AgentDialog (ADR-006).
- **Boundaries:** questions only. Permission prompts and replies are recognised by the adapter as kinds it does not yet handle and are ignored.
- **Implementation notes:** the hook entries U1 needs for development are installed by hand until U4. The Functional Design spike (requirements Open questions) runs in this Unit's Functional Design: whether a hook can return a question's answer, the hook time limit, the opencode event names. The kind of event reaches the script as an argument of its hook entry, so the script never parses JSON (Domain Design review R-01).

## U2 u2-permissions: allow or deny permission prompts from the dialog

- **Delivers:** US2.1.
- **Changes (built by U1):** ClaudeCodeHook and OpencodePlugin (permission event), HarnessEventAdapter (permission parsing and choices), AgentEventStore (permission kind, ordering before replies, never answered by the app), AgentDialog (M3 amber permission layout).
- **Boundaries:** permission prompts only.
- **Implementation notes:** edits the same files as U3; built side by side, the two need a careful merge (see `unit-of-work-dependency.md`).

## U3 u3-replies: read and answer the agent's latest message

- **Delivers:** US3.1.
- **Owns (creates):** LatestMessageStrip (M5).
- **Changes (built by U1):** ClaudeCodeHook (stop hook: writes the event and exits at once, no wait) and OpencodePlugin (idle event), HarnessEventAdapter (reply parsing), AgentEventStore (reply kind, LatestMessage, typing an answer only while the tab waits), AgentDialog (M4 message layout and stale state).
- **Boundaries:** replies and the latest-message strip; the reply setting itself is in U5.

## U4 u4-install: install, update and remove the hooks and plugin safely

- **Delivers:** US4.1.
- **Owns (creates):** HookInstaller, AgentDialogsSetupUI (M7 notice strip, M8 preview, Project settings section).
- **Changes:** AgentEventStore's source choice reads HookInstaller's status in place of U1's development switch.
- **Boundaries:** writes only `.claude/settings.json` entries whose command runs a script in `.thadeus/hooks/`, the script folder, and the opencode plugin file (ADR-004).
- **Implementation notes:** installs the hook entries for every kind U1–U3 handle, so it comes after them.

## U5 u5-notifications: be told when the agent needs me

- **Delivers:** US5.1.
- **Changes:** Notifications (kinds, the new reply setting), the Settings Store (new key, sanitised like `questionAlerts`), SettingsView (M9 row), AgentDialog (escalation for every kind), AgentEventStore (call Notifications once per event, reply setting "line only" and "off").
- **Boundaries:** alerts and settings only.

## Component to Unit

| Component | Created in | Changed in |
|---|---|---|
| ClaudeCodeHook | U1 | U2, U3 |
| OpencodePlugin | U1 | U2, U3 |
| AgentChannel | U1 | — |
| HarnessEventAdapter | U1 | U2, U3 |
| AgentEventStore | U1 | U2, U3, U4, U5 |
| FallbackQuestionSource | U1 | — |
| HookInstaller | U4 | — |
| PtyManager | U1 (changed) | — |
| Notifications | — | U5 |
| IpcRouter | U1 (changed) | U3, U4 |
| AgentDialog | U1 | U2, U3, U5 |
| LatestMessageStrip | U3 | — |
| AgentDialogsSetupUI | U4 | — |
