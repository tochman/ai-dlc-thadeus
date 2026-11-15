# External Dependency Map: agent dialogs (EPIC-05 US-0506)

## Sources

- Bolt plan: `bolt-plan.md`.
- Requirements (open questions): `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md`.
- Contracts (C1, C6 provisional parts): `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md`.
- Team practices (release gates): `aidlc/spaces/default/intents/261114-agent-dialogs/inception/practices-discovery/team-practices.md`.

A **Bolt** is one build pass over one Unit of Work, ending in code that runs and is checked. The work needs no other team, external API or approval. The dependencies below are tools and checks outside the code.

| Dependency | Owner | Lead time | Blocks | If it slips |
|---|---|---|---|---|
| Claude Code's hook behaviour in the installed version (event names, answer return, time limit) | Anthropic (tool); checked by the spike | Hours (spike in B1) | B1, then B2–B4 | Keys path for questions (contract C1); hand-back before the time limit |
| opencode's plugin and event API in the installed version | opencode project; checked by the spike | Hours (spike in B1) | B1, B2, B3 | Same adapter rules; a harness that cannot be reached keeps today's fallback |
| Real sessions to record payloads from | you, on the release Mac | Minutes per recording | B1–B3 tests | Tests use payloads from the tools' published hook documentation until recordings exist |
| `@vitest/coverage-v8`, ESLint, Prettier packages | npm | Minutes | B1 first task | None needed |
| Manual release run (NFR1, NFR2) | you, on the release Mac | About an hour | the v0.2.5 tag | The release waits; no Bolt is blocked |
