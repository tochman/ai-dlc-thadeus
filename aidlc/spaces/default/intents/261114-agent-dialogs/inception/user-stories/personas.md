# Personas: agent dialogs (EPIC-05 US-0506)

## Sources

- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (intent analysis, FR4.4, FR4.6, assumptions).
- Code knowledge base: `aidlc/spaces/default/codekb/aidlc-dash/business-overview.md` (Users and value).
- Answers: `user-stories-questions.md` `[Q1]`…`[Q5]`; `requirements-analysis-questions.md` Q3 and Q8.

## P1. Dev, the developer running agents in the app (primary)

- **Role:** builds their own project with AI-DLC, running Claude Code or opencode in the app's agent tabs, often two side by side, sometimes in several projects at once.
- **Goals:**
  - Answer whatever the agent needs (its questions, permission prompts, plain-chat questions, AI-DLC gates) from one dialog, the first time, without going to the terminal.
  - See at a glance what each agent last said while doing other work.
  - Trust that the answer they click is the answer the agent gets.
- **Pain points (today):**
  - "Could not send: Claude shows other choices than the ones AI-DLC logged" whenever AI-DLC's logged labels differ from the picker on screen.
  - The agent's own questions, permission prompts and plain-chat questions never reach the dialog.
  - Option descriptions are missing, batches show as one line, Markdown shows as raw text, and answered questions can linger.
- **Tech comfort:** high.
- **Frequency:** all day, many questions per hour while a workflow runs.

## P2. Tea, the teammate without the app (secondary)

- **Role:** works in the same repository, pulls the committed `.claude/settings.json` that carries the app's hook entries, but runs Claude Code in their own terminal, in CI, or does not have the app at all.
- **Goals:**
  - Their Claude Code and opencode sessions behave exactly as if the app's hooks were not there.
  - No slowdown, no extra context in the agent, nothing blocked, no script error, even when the app's script folder is missing.
- **Pain points (risk this work creates):** a committed hook that fails, hangs or prints something would break every teammate's session.
- **Tech comfort:** high.
- **Frequency:** every session in the project; they never see the app.

## Relationships and priority

- P1 is the person every story serves; every story is told from P1's side.
- P2 is affected only through the committed hook entries and the opencode plugin (US4.1). Their requirement is the absence of any effect (FR4.4, FR4.6, NFR4), and US4.1 carries it as acceptance criteria.
- The app is a single-user local tool (assumption confirmed in Requirements Analysis); no other personas are needed.
