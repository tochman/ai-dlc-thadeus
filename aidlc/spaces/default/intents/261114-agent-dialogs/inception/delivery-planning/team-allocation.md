# Team Allocation: agent dialogs (EPIC-05 US-0506)

## Sources

- Bolt plan: `bolt-plan.md`.
- Units: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work.md`.
- Team practices: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/practices-discovery/team-practices.md`.

A **Bolt** is one build pass over one Unit of Work, ending in code that runs and is checked. A **mob** is the group that builds a Bolt together. This plan has no team-formation stage (the classic plan skips Ideation), so every Bolt is built by the AI developer, and you are the person who approves each plan and checkpoint.

| Bolt | Unit | Built by | Approved by | Runs with |
|---|---|---|---|---|
| B1 | u1-questions | AI developer | you | — |
| B2 | u2-permissions | AI developer | you | B3 (own copy of the project) |
| B3 | u3-replies | AI developer | you | B2 (own copy of the project) |
| B4 | u4-install | AI developer | you | B5 (own copy of the project) |
| B5 | u5-notifications | AI developer | you | B4 (own copy of the project) |

- **Human checks no AI can do:** the spike in B1 runs against your real Claude Code and opencode sessions, and the manual release run (NFR2, NFR1) is on your release Mac.
- **Review:** the architecture reviewer checks each Unit's design and code before you see it.
