# Entities: u2-permissions

## Sources

- Unit: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work.md` (U2 u2-permissions, US2.1) and `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work-story-map.md`.
- Components and ownership: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md` (AgentEvent and Answer owned by AgentEventStore).
- Contracts: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 `permission` kind, C3 `permission` block and `Answer.permission`).
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md`.
- Stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (US2.1, AC2.1.1–AC2.1.4).
- Mockups: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/refined-mockups/mockups.md` (M3, M6).
- Integration point: `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/entities.md` (AgentSession, AgentEvent, Question, Answer).
- Answers: `functional-design-questions.md` (no questions for this Unit).

This Unit adds to u1's entities and redefines none of them (C3, additive only). AgentSession is unchanged. AgentEvent gains the `permission` kind and a `permission` value; Answer gains `choice`. Two value objects are new: Permission and PermissionChoice.

```yaml
entities:
  - name: AgentEvent
    extends: u1-questions AgentEvent
    owner: AgentEventStore
    description: Adds the permission kind. Every u1 attribute, constraint and relationship stays as u1 defines it.
    added_attributes:
      - { name: kind, type: enum, required: true, allowed: [question, permission], constraints: "permission added by this Unit; u3 adds reply" }
      - { name: permission, type: Permission, required: false, constraints: "present exactly when kind is permission; questions is then an empty list" }
      - { name: toolCallId, type: text, required: false, constraints: "reused from u1: for opencode the permission requestID, matched by the closing permission.replied" }
    added_constraints:
      - "a permission event is never answered except by an Answer the person sent (FR3.4)"
      - "a session may hold several open permission events at once; u1's one-open-question rule does not apply to them"
      - "a permission event in timedOut or handedBack can no longer be answered from the app"

  - name: Permission
    owner: AgentEventStore
    description: What the agent asks to do and the choices it offers (value object inside a permission AgentEvent).
    attributes:
      - { name: what, type: text, required: true, max: 200, constraints: "the tool or permission type as the agent named it, e.g. Bash, Edit, mcp__x__y, bash" }
      - { name: detail, type: text, required: true, max: "64 KB", constraints: "the command, path or input as reported; kept character for character; plain text, never Markdown" }
      - { name: truncated, type: boolean, required: true, default: false }
      - { name: cwd, type: path, required: false, constraints: "the working folder the agent reported, shown as is" }
      - { name: choices, type: list of PermissionChoice, required: true, min: 2, max: 3, constraints: "the agent's own choices in its order" }
      - { name: alwaysRules, type: "list of opaque object", required: false, constraints: "Claude Code's permission_suggestions exactly as received; main only, never sent to the renderer; empty for opencode" }

  - name: PermissionChoice
    owner: AgentEventStore
    description: One choice the person can make on a permission (value object).
    attributes:
      - { name: label, type: text, required: true, constraints: "app text through t(); for allow always it names the agent's rule text verbatim" }
      - { name: effect, type: enum, required: true, allowed: [allowOnce, allowAlways, deny] }
      - { name: refuses, type: boolean, required: true, constraints: "true exactly when effect is deny" }
      - { name: enabled, type: boolean, required: true, default: true, constraints: "false for allowOnce and allowAlways when detail is truncated" }

  - name: Answer
    extends: u1-questions Answer
    owner: AgentEventStore
    description: Adds the permission answer. Every u1 attribute and constraint stays as u1 defines it; picks and own are empty lists for a permission.
    added_attributes:
      - { name: choice, type: integer, required: false, constraints: "index into the event's permission.choices; present exactly when the event's kind is permission" }
      - { name: via, type: enum, required: true, allowed: [hook], constraints: "a permission answer is only ever delivered via hook, never as keys" }
    added_constraints:
      - "a permission answer fits its event: choice is inside choices and that choice is enabled"
```

## Summary

| Entity | Owner | What this Unit adds |
|---|---|---|
| AgentEvent | AgentEventStore | the `permission` kind and value; several open permissions per session |
| Permission | AgentEventStore | new value: what, detail (plain text, 64 KB), cwd, the agent's choices, Claude Code's rule suggestions kept in main |
| PermissionChoice | AgentEventStore | new value: label, effect (allow once, allow always, deny), refuses, enabled |
| Answer | AgentEventStore | `choice` index; delivery only `via: hook` |
