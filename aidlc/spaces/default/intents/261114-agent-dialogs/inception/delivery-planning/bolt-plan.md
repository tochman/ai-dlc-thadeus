# Bolt Plan: agent dialogs (EPIC-05 US-0506)

## Sources

- Units and their graph: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`.
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md`.
- User stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (proof rule: recorded payloads plus a manual run on the release Mac).
- Mockups: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/refined-mockups/mockups.md`.
- Components: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md`.
- Contracts: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md`.
- Team practices: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/practices-discovery/team-practices.md`.
- Answers: `delivery-planning-questions.md` Q1–Q4 `[Q1]`…`[Q4]`.

A **Bolt** is one build pass over one or more Units of Work, ending in code that runs and is checked. Here every Bolt is exactly one Unit. There is no walking skeleton, a thin end-to-end slice built first (team practices: off). All five Bolts ship together in the one US-0506 pull request, `feat/US-0506`, for **v0.2.5** `[Q3]`.

## Construction settings

- Stage by stage, with Units that do not depend on each other built side by side, each in its own copy of the project `[Q2]`.
- Every completed Unit is checked and approved at its checkpoint.

## Sequence

| Order | Bolt | Unit | Runs with | Needs |
|---|---|---|---|---|
| 1 | B1 | u1-questions | — | — |
| 2 | B2 | u2-permissions | B3 | B1 |
| 2 | B3 | u3-replies | B2 | B1 |
| 3 | B4 | u4-install | B5 | B1, B2, B3 |
| 3 | B5 | u5-notifications | B4 | B2, B3 |

When the side-by-side pairs merge, B2 merges before B3 and B4 before B5 (`[Q1]`, Unit order).

## B1 u1-questions

- **Units:** u1-questions (US1.1).
- **Walking skeleton:** no.
- **First tasks:**
  1. Set up the quality gates the team affirmed but has not installed yet: `@vitest/coverage-v8` with an 80% line floor, ESLint and Prettier, all three in the `verify` job of `.github/workflows/release.yml` (Units Generation review R-02; team practices).
  2. Run the spike against a real Claude Code and opencode session: the hook names, whether a hook can return a question's answer, and the hook time limit.
- **If the spike shows hooks only allow or deny:** carry on with the keys path for questions, as contract C1's provisional block describes `[Q4]`.
- **Definition of Done:** AC1.1.1–AC1.1.11 pass in automated tests replaying recorded Claude Code and opencode payloads. Today's popup tests move to AgentDialog and pass. The fallback (audit-log questions) behaves as today. Coverage of touched code is at least 80%. ESLint and Prettier pass. The full suite is green.
- **Confidence hypothesis:** the dialog can show exactly what the agent's picker shows, and the answer the person picks reaches the agent unchanged, including the 2026-11-14 "Complete workflow" case. This is the claim the whole intent rests on.
- **Expected demo:** in an app tab, Claude Code asks a question with descriptions. The dialog shows it within a second, and picking "Complete workflow" completes the gate in that tab.

## B2 u2-permissions

- **Units:** u2-permissions (US2.1).
- **Definition of Done:** AC2.1.1–AC2.1.4 pass with recorded permission payloads for both harnesses. No permission is ever allowed without a click. Gates as in B1.
- **Confidence hypothesis:** permission prompts can be answered from the dialog without the person watching the terminal, and an unanswered prompt always returns to the terminal.
- **Expected demo:** the agent asks to run a test command. The amber dialog shows the command, and Allow once runs it.

## B3 u3-replies

- **Units:** u3-replies (US3.1).
- **Definition of Done:** AC3.1.1–AC3.1.5 pass. The stop hook writes its event and exits at once. Nothing is typed into a tab that is no longer waiting. Gates as in B1.
- **Confidence hypothesis:** a question asked in plain chat text can be answered from the app, and the last word of each project is visible at a glance.
- **Expected demo:** Claude Code ends with "Which name should the file have?". The dialog opens, and the answer "notes.md" is typed into that tab.

## B4 u4-install

- **Units:** u4-install (US4.1).
- **Definition of Done:** AC4.1.1–AC4.1.6 pass against fixture settings files. A teammate checkout without the app or the script runs the hook in under 100 ms with no output. Gates as in B1.
- **Confidence hypothesis:** the hooks can be committed for the whole team with no effect on anyone who does not use the app.
- **Expected demo:** a project without hooks shows the fallback notice. Install shows the diff, and after Install the next agent tab uses the dialog.

## B5 u5-notifications

- **Units:** u5-notifications (US5.1).
- **Definition of Done:** AC5.1.1–AC5.1.4 pass. Every new text is in `sv.json` and `en.json`. Gates as in B1.
- **Confidence hypothesis:** the person notices what blocks an agent without being interrupted by every finished turn.
- **Expected demo:** with "Line only", a finished turn updates the strip silently, while a question still notifies.

## After the last Bolt

The manual run of the seven correctness scenarios (NFR2) on the release Mac, against real Claude Code and opencode sessions with the timing log (NFR1), comes before the release pull request for v0.2.5 (User Stories proof rule).
