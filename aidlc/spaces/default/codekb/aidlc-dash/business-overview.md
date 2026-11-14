# Business Overview

## Purpose

T.H.A.D.E.U.S. (Transformative Human-AI Development Environment for Ubiquitous Systems, repository `aidlc-dash`, package `thadeus` 0.2.4) is a desktop "bridge console" for software projects that use AI-DLC (AI-Driven Development Life Cycle). It is built by Auctum Solutions AB and released under the MIT licence. It runs on macOS (universal .dmg) and Linux (x64 .deb).

The app puts three things in one window per project:

1. **A view of the AI-DLC work**: intents, their stage pipeline, the audit timeline, Bolt/Unit DAG, artifacts, cost and tokens, feature docs (epics and stories).
2. **Embedded agent terminals**: one tab per selected harness (Claude Code and/or opencode) plus a login shell, all in the project root.
3. **Steering without slash commands**: Resume an intent, answer AI-DLC's questions from a popup, refresh from GitHub, set up AI-DLC, change AI-DLC configuration, plans and models, edit files.

## Guiding principle

The app reads AI-DLC's files and leaves the writing to AI-DLC. Actions that change the workflow are either typed into the visible agent or shell terminal for the person to confirm, or run through the official `aidlc` CLI with fixed arguments. The few direct writes are the app's own `settings.json` (in userData), files the person edits in the Monaco editor (engine-owned files refused), the `## Guard Policy` section of a memory file and the project's own plan files, each after a diff (EPIC-09 tier 2).

## Users and value

- **Developer running AI-DLC**: sees where each intent stands, what it costs, and what the agent is waiting for, while doing other work.
- **Developer on several machines or in a team**: brings in AI-DLC work pushed to GitHub safely (US-0502).
- **Project owner**: reads epics and stories (feature docs) and their link to intents.

## Key functionality (by epic)

| Epic | Capability | Status at this commit |
|---|---|---|
| EPIC-01 | Read-only AI-DLC visualisation and embedded terminal (foundation) | Released v0.1.0 |
| EPIC-02 | Cost and models per intent, stage, agent and model; live token view | Released up to v0.2.4 |
| EPIC-03 | Virtualised audit timeline with live highlights | Released v0.2.0 |
| EPIC-04 | LCARS design, icon, fullscreen and menu, settings view, self-update from GitHub releases, About window | Released up to v0.2.4 |
| EPIC-05 | Workflow control: Resume, Refresh from GitHub, Set up AI-DLC, question popup (US-0505); **US-0506 in progress** | US-0504 planned |
| EPIC-06 | Feature docs view and setup offer | Released v0.2.0 |
| EPIC-07 | Swedish and English UI with a language setting | US-0702 planned |
| EPIC-08 | Harness per project (Claude Code, opencode), set up any of six harnesses, two agent tabs side by side | Released up to v0.2.3 |
| EPIC-09 | AI-DLC configuration view and changes, custom plans, models and effort per agent | In progress |
| EPIC-10 | Edit project files in the app with Monaco | Released v0.2.4 |
| EPIC-00 | Small fixes reported in use (US-0001 to US-0009) | Released v0.2.3 / v0.2.4 |

## The active intent: US-0506 (agent dialogs)

Intent `261114-agent-dialogs` (scope `classic`) covers EPIC-05 US-0506: every question, permission prompt and message from Claude Code and other AI clients (opencode, later others) shown in, and answered from, the app's dialog.

The business problem, as the code stands:

- The popup (US-0505, extended by US-0004 and US-0006) only knows AI-DLC's own questions, because they are the ones in the audit log. Claude Code's own picker questions, its permission prompts ("Allow this command?") and plain chat replies are invisible.
- An answer reaches Claude Code only when the picker on screen shows exactly the options AI-DLC logged. When the wording differs the person sees "Could not send: Claude shows other choices than the ones AI-DLC logged" and has to answer in the terminal.
- A question that was answered some other way, or whose picker went away, can stay in the popup because only an audit event closes it.
- opencode gets an own-answer field only, since its picker keys were never verified.

US-0506's acceptance criteria (in `docs/features/epic-05-workflow-control.md`) ask for: questions and permission prompts from Claude Code and opencode in the same dialog with answers in place; the agent's latest message per project rendered as Markdown with a background notification; a source per harness (Claude Code hooks, opencode event API or plugin, installed only after consent with a preview, falling back to the terminal); the US-0505 escalation and settings plus a separate messages setting; and safety rules (answers only to the asking tab, nothing approved automatically, text never HTML).

See `architecture.md` for how the current question flow works and `code-quality-assessment.md` for the risks it carries into US-0506.
