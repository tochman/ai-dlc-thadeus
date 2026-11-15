# Business Overview

## Purpose

T.H.A.D.E.U.S. (Transformative Human-AI Development Environment for Ubiquitous Systems, repository `aidlc-dash`, package `thadeus` 0.2.5) is a desktop "bridge console" for software projects that use AI-DLC (AI-Driven Development Life Cycle). It is built by Auctum Solutions AB and released under the MIT licence. It runs on macOS (universal .dmg) and Linux (x64 .deb).

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
- **Outside users and contributors** (new with EPIC-11): download releases without a GitHub account, read the README, report issues and send pull requests.

## Key functionality (by epic)

Status from `docs/FEATURES.md` at commit `bc1dd3d`; the epic files hold the detail.

| Epic | Capability | Status |
|---|---|---|
| EPIC-00 | Small fixes reported in use | US-0001–0012 released (v0.2.3–v0.2.5); US-0013–0014 done for v0.2.6; US-0015 in progress |
| EPIC-01 | Read-only AI-DLC visualisation and embedded terminal (foundation) | Released v0.1.0 |
| EPIC-02 | Cost and models; live token view | Released up to v0.2.4 |
| EPIC-03 | Virtualised audit timeline | Released v0.2.0; US-0303 for v0.3.0 |
| EPIC-04 | LCARS design, desktop integration, self-update from GitHub releases, About | Released up to v0.2.5; US-0412, US-0413 planned |
| EPIC-05 | Workflow control incl. agent dialogs (US-0506) | Released up to v0.2.5 |
| EPIC-06 | Feature docs view and setup offer | Released; US-0604 planned |
| EPIC-07 | Swedish and English UI | US-0702 for v0.3.0 |
| EPIC-08 | Harness per project, set up six harnesses | Released up to v0.2.3 |
| EPIC-09 | AI-DLC configuration, custom plans, models per agent | Released up to v0.2.4 |
| EPIC-10 | Edit project files with Monaco | Released v0.2.4 |
| EPIC-11 | Open source: make the repository public | **US-1101 (this intent)**, for v0.2.6 |
| EPIC-12 | Team collaboration | US-1201 for v0.3.0 |

## The active intent: US-1101 (repository ready to be public)

Intent `261115-repo-public-ready` (scope `express`) covers EPIC-11 US-1101 (`docs/features/epic-11-open-source.md`). The repository `tochman/aidlc-dash` is private today; the app's updater fails without `gh` access, which triggered the decision to open-source it. US-0413 (updates without `gh`) builds on the public repository.

The acceptance criteria ask for: a keep/clean/remove review of what would become public (AI-DLC records, personal paths and emails, fixtures and screenshots, anything secret-like); a whole-history secret scan with rotation of anything ever committed; removal of what is private (history rewrite only on the person's word); the usual public files (outside-user README, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue and PR templates); MIT `LICENSE` agreeing with `package.json` and third-party licences listed for the packaged app; and the visibility switch only on the person's word.

What the code and files show for this intent is in `code-quality-assessment.md` ("Public-readiness review"); licences in `dependencies.md` ("Licences").
