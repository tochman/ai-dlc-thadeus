# Entities: u1-questions

## Sources

- Unit: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work.md` (U1 u1-questions, US1.1) and `unit-of-work-story-map.md`.
- Components and ownership: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md` (AgentSession owned by AgentChannel; AgentEvent, Answer, LatestMessage owned by AgentEventStore).
- Contracts: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1–C4).
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md`.
- Stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (AC1.1.1–AC1.1.11).
- Answers: `functional-design-questions.md` Q1 `[Q1]`.

This Unit owns the question kind only. LatestMessage belongs to u3-replies and the permission fields to u2-permissions; they are left out here and added by those Units without changing anything below (C3, additive only).

```yaml
entities:
  - name: AgentSession
    owner: AgentChannel
    description: One agent tab the app started, with its private channel folder.
    attributes:
      - { name: sessionId, type: identifier, required: true, unique: true, constraints: "random, 128 bits, hex" }
      - { name: projectId, type: identifier, required: true }
      - { name: tabId, type: text, required: true, constraints: "the tab registry id, e.g. agent:claude" }
      - { name: harness, type: enum, required: true, allowed: [claude, opencode] }
      - { name: channelDir, type: path, required: true, constraints: "under the app's userData, mode 0700, never inside the project" }
      - { name: secret, type: secret, required: true, constraints: "32 random bytes hex; never sent to the renderer or written to a project file" }
      - { name: ptyId, type: identifier, required: false, constraints: "set once by bindPty; null until then" }
      - { name: waitSeconds, type: integer, required: true, constraints: "the hook's own limit minus a safety margin [Q1]" }
      - { name: startedAt, type: timestamp, required: true }
      - { name: endedAt, type: timestamp, required: false }
    constraints:
      - "a session is live from openSession until closeSession; files for an ended session are refused"
      - "ptyId binds at most once"
    relationships:
      - { to: AgentEvent, cardinality: "1 to many", direction: "an event names its session" }

  - name: AgentEvent
    owner: AgentEventStore
    description: Something an agent tab needs the person for; in this Unit, a question (one to four questions sent together).
    attributes:
      - { name: eventId, type: identifier, required: true, unique: true, constraints: "unique per app run" }
      - { name: sessionId, type: identifier, required: false, references: AgentSession, constraints: "null when source is audit" }
      - { name: projectId, type: identifier, required: true }
      - { name: tabId, type: text, required: false }
      - { name: harness, type: enum, required: true, allowed: [claude, opencode] }
      - { name: source, type: enum, required: true, allowed: [hook, audit] }
      - { name: kind, type: enum, required: true, allowed: [question], constraints: "u2 adds permission, u3 adds reply" }
      - { name: state, type: enum, required: true, allowed: [queued, shown, sending, sent, handedBack, timedOut, ended], default: queued }
      - { name: arrivedAt, type: timestamp, required: true }
      - { name: eventFile, type: text, required: false, constraints: "the C1 event file name the answer file pairs with; null for audit events" }
      - { name: toolCallId, type: text, required: false, constraints: "the harness's id for the question tool call when it gives one; matches the closing 'answered' event" }
      - { name: context, type: object, required: false, constraints: "{ intent, stage } from the AI-DLC audit log; never changes questions" }
      - { name: questions, type: list of Question, required: true, min: 1, max: 4 }
      - { name: lastError, type: text, required: false, constraints: "one sentence, set when a send failed" }
    constraints:
      - "only events that arrived after the app started exist"
      - "at most one open question event per session; a newer question event from the same session ends the older one"
    relationships:
      - { to: AgentSession, cardinality: "many to 1", direction: "event to its session" }
      - { to: Answer, cardinality: "1 to 0..1", direction: "an event has at most one accepted answer" }

  - name: Question
    owner: AgentEventStore
    description: One question inside an AgentEvent (value object).
    attributes:
      - { name: header, type: text, required: false, max: 200 }
      - { name: text, type: markdown, required: true, max: "64 KB" }
      - { name: truncated, type: boolean, required: true, default: false }
      - { name: options, type: "list of { label, description }", required: true, min: 0, constraints: "the agent's order; label required, description optional" }
      - { name: multiSelect, type: boolean, required: true, default: false }
      - { name: allowOwn, type: boolean, required: true, default: true, constraints: "whether the agent's own picker offers an own answer" }

  - name: Answer
    owner: AgentEventStore
    description: The person's answer to one AgentEvent, as accepted by main.
    attributes:
      - { name: eventId, type: identifier, required: true, unique: true, references: AgentEvent }
      - { name: picks, type: "list of list of option index", required: true, constraints: "one list per question; single-select lists hold exactly one index unless an own answer is given" }
      - { name: own, type: "list of text or null", required: true, constraints: "one entry per question; text only where allowOwn" }
      - { name: via, type: enum, required: true, allowed: [hook, keys] }
      - { name: sentAt, type: timestamp, required: false }
      - { name: outcome, type: enum, required: true, allowed: [pending, delivered, failed], default: pending }
    constraints:
      - "an answer fits its event: as many entries as questions, indexes inside each question's options"
```

## Summary

| Entity | Owner | Role in this Unit |
|---|---|---|
| AgentSession | AgentChannel | One per agent tab; holds the folder, secret, pty binding and wait time |
| AgentEvent | AgentEventStore | One open question event (1–4 questions), with its source, state and context |
| Question | AgentEventStore | Value inside an event: header, Markdown text, options with descriptions, multi-select, own answer |
| Answer | AgentEventStore | The accepted answer and how it was delivered |
