# Risk and Sequencing Rationale: agent dialogs (EPIC-05 US-0506)

## Sources

- Unit graph: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work-dependency.md`.
- Requirements and their open questions: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md`.
- User stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md`.
- Mockups: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/refined-mockups/mockups.md`.
- Components: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md`.
- Contracts: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md`.
- Team practices: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/practices-discovery/team-practices.md`.
- Answers: `delivery-planning-questions.md` `[Q1]`…`[Q4]`.

A **Bolt** is one build pass over one Unit of Work, ending in code that runs and is checked.

## Heuristic: risk-first, within the graph

The ordering is **risk-first** (Boehm's spiral model): the Bolt with the most uncertainty goes first, so the later Bolts are built on facts rather than guesses.

- **B1 first.** It holds the spike, the biggest unknown: whether Claude Code's hooks can return a question's answer, and how long a hook may wait. The graph also requires it, because every other Unit builds on its channel, adapters, store and dialog. Both constraints point the same way.
- **B2 and B3 side by side, B2 merged first.** Both carry moderate risk: each adds one event kind to the same files. You chose to follow Unit order for the merges `[Q1]` and to build side by side `[Q2]`.
- **B4 and B5 last, side by side.** B4 must install the hook entries for every kind, so it waits for B2 and B3. B5 needs all three kinds for titles and settings. B4 carries the team-wide risk (committed hooks), and B5 is small.

The sequence follows the graph's own order (topological order) with no deviation.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hooks cannot return a question's answer | Medium | Medium | The keys path is already in the contracts; carry on with it `[Q4]` |
| Claude Code's hook time limit is too short for a person | Medium | Medium | The hook hands back to the terminal before the limit; the answer is then sent as keys (FR3.6) |
| A committed hook breaks a teammate's session | Low | High | The entry checks the session variable before running anything (FR4.6); B4's tests run a checkout without the app |
| B2 and B3 conflict when merged | Medium | Low | B2 merges first; most changes are additions per kind; the full suite runs after each merge |
| Coverage, ESLint and Prettier are not set up yet and block the first pull request | High | Medium | Set up as B1's first task (`bolt-plan.md`) |
| Claude Code or opencode change their hook or plugin format | Low | Medium | One adapter per harness (ADR-003); recorded payloads show the break in tests; the protocol version allows one release of overlap |
| The manual release run finds a scenario failing | Medium | Medium | Planned before the release pull request; a failure is fixed before v0.2.5 is tagged |

## What would change the order

If the spike in B1 shows that neither harness can be answered reliably from outside the terminal, stop and revisit the requirements with you before B2. The keys path covers the case where hooks can only allow or deny, so that case does not stop the work.
