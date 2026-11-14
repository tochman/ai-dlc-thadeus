# Entities: u3-replies

## Sources

- Unit: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work.md` (U3 u3-replies, US3.1) and `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work-story-map.md`.
- Components and ownership: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md` (AgentEvent, Answer and LatestMessage owned by AgentEventStore).
- Contracts: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `reply` kind, C3 `message`, C4 `agentEvents.latest`).
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (FR2.7, FR2.8, FR6.2).
- Stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (US3.1, AC3.1.1–AC3.1.5).
- Mockups: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/refined-mockups/mockups.md` (M4, M5).
- Integration point: `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/entities.md` (AgentSession, AgentEvent, Question, Answer).
- Answers: `functional-design-questions.md` Q1 `[Q1]`.

This Unit adds the `reply` kind to u1's entities and creates LatestMessage. AgentSession and Question are used unchanged. Entries marked `extends` list only what this Unit adds to the u1 entity of the same name; everything else stays as u1 defines it (C3, additive only).

```yaml
entities:
  - name: AgentEvent
    owner: AgentEventStore
    extends: u1-questions/AgentEvent
    description: Adds the reply kind, the agent finished its turn and waits for the person, with its last message.
    adds_attributes:
      - { name: message, type: ReplyMessage, required: false, constraints: "required when kind is reply; absent otherwise" }
    changes_attributes:
      - { name: kind, allowed_added: [reply] }
      - { name: state, allowed_added: [dismissed, stale], constraints: "dismissed and stale are used by the reply kind only" }
      - { name: questions, constraints: "required when kind is question; absent for reply" }
    constraints:
      - "a reply event always has source hook; the audit fallback has no replies"
      - "at most one open reply event per session; a newer event from the same session moves the older reply on (BR6.5)"
      - "a reply never holds its session: no answer file is ever written for it"
    relationships:
      - { to: LatestMessage, cardinality: "1 to 0..1", direction: "the project's latest message names at most one reply event" }

  - name: ReplyMessage
    owner: AgentEventStore
    description: The agent's last message inside a reply event (value object).
    attributes:
      - { name: text, type: markdown, required: true, max: "64 KB", constraints: "exactly as the harness reported it, every character kept; may be empty" }
      - { name: truncated, type: boolean, required: true, default: false, constraints: "true when the text was cut at 64 KB" }
      - { name: empty, type: boolean, required: true, default: false, constraints: "true when the agent ended its turn with no text or only whitespace" }

  - name: Answer
    owner: AgentEventStore
    extends: u1-questions/Answer
    description: Adds the typed answer to a reply.
    adds_attributes:
      - { name: text, type: text, required: false, min: 1, max: "64 KB", constraints: "required when the event is a reply; one line after cleaning (BR6.11)" }
    changes_attributes:
      - { name: via, allowed_added: [typed], constraints: "typed is the only way for a reply" }
      - { name: picks, constraints: "required when the event is a question; absent for reply" }
      - { name: own, constraints: "required when the event is a question; absent for reply" }

  - name: LatestMessage
    owner: AgentEventStore
    description: The newest reply of any agent tab in one project, for the latest-message strip.
    attributes:
      - { name: projectId, type: identifier, required: true, unique: true }
      - { name: tabId, type: text, required: true, constraints: "the tab registry id of the tab that sent the reply" }
      - { name: harness, type: enum, required: true, allowed: [claude, opencode] }
      - { name: sessionId, type: identifier, required: true, references: AgentSession, constraints: "kept in main only, to mark the session ended; not sent to the renderer" }
      - { name: eventId, type: identifier, required: true, references: AgentEvent, constraints: "the reply it shows; the reply event may already have left the store" }
      - { name: text, type: markdown, required: true, max: "64 KB" }
      - { name: truncated, type: boolean, required: true, default: false }
      - { name: empty, type: boolean, required: true, default: false }
      - { name: arrivedAt, type: timestamp, required: true }
      - { name: status, type: enum, required: true, allowed: [waiting, answered, sessionEnded], default: waiting }
    constraints:
      - "one per project at most; none until the first reply since the app started"
      - "kept in memory only; nothing from an earlier app run"
      - "replaced only by a newer reply from any agent tab of the same project"
    relationships:
      - { to: AgentEvent, cardinality: "many to 1", direction: "latest message to the reply it shows" }
      - { to: AgentSession, cardinality: "many to 1", direction: "latest message to the session that sent it" }
```

## Summary

| Entity | Owner | What this Unit does to it |
|---|---|---|
| AgentEvent | AgentEventStore | Adds the `reply` kind, the `message` field and the `dismissed` and `stale` states |
| ReplyMessage | AgentEventStore | New value object: the last message's text, whether it was cut, whether it was empty |
| Answer | AgentEventStore | Adds the typed `text` and the `typed` delivery |
| LatestMessage | AgentEventStore | New: one per project, the newest reply and whether its tab still waits |
| AgentSession, Question | AgentChannel, AgentEventStore | Used as u1 defines them |
