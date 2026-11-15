# Business Overview

## Purpose

T.H.A.D.E.U.S. (Transformative Human-AI Development Environment for Ubiquitous Systems, repository `aidlc-dash`, package `thadeus` 0.2.6) is a desktop "bridge console" for software projects that use AI-DLC (AI-Driven Development Life Cycle). It is built by Auctum Solutions AB and released under the MIT licence. It runs on macOS (universal .dmg) and Linux (x64 .deb).

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

Status from `docs/FEATURES.md` at commit `bc1dd3d`, with the EPIC-06 and EPIC-11 rows re-read at `4867a36`; the epic files hold the detail.

| Epic | Capability | Status |
|---|---|---|
| EPIC-00 | Small fixes reported in use | US-0001–0012 released (v0.2.3–v0.2.5); US-0013–0014 done for v0.2.6; US-0015 in progress |
| EPIC-01 | Read-only AI-DLC visualisation and embedded terminal (foundation) | Released v0.1.0 |
| EPIC-02 | Cost and models; live token view | Released up to v0.2.4 |
| EPIC-03 | Virtualised audit timeline | Released v0.2.0; US-0303 for v0.3.0 |
| EPIC-04 | LCARS design, desktop integration, self-update from GitHub releases, About | Released up to v0.2.5; US-0412, US-0413 planned |
| EPIC-05 | Workflow control incl. agent dialogs (US-0506) | Released up to v0.2.5 |
| EPIC-06 | Feature docs view and setup offer; releases or continuous deployment per project (US-0603) | US-0601–0603 released (v0.2.0–v0.2.5); US-0604 planned and **US-0605 (this intent)** in progress, both for v0.2.7 |
| EPIC-07 | Swedish and English UI | US-0702 for v0.3.0 |
| EPIC-08 | Harness per project, set up six harnesses | Released up to v0.2.3 |
| EPIC-09 | AI-DLC configuration, custom plans, models per agent | Released up to v0.2.4 |
| EPIC-10 | Edit project files with Monaco | Released v0.2.4 |
| EPIC-11 | Open source: make the repository public | US-1101 released in v0.2.6 |
| EPIC-12 | Team collaboration | US-1201 for v0.3.0 |

## Releases in the Features view (EPIC-06)

With the per-project delivery setting **Releases** (default; the other is **Continuous deployment**), the Features view lets a person mark a story for a release and lists releases with their stories (US-0603). A release is not stored anywhere: it exists only while a story carries "for vX.Y.Z" or "Released in vX.Y.Z" in the feature docs, or a git tag `vX.Y.Z` exists. The mechanics are in `architecture.md` ("Releases: derived, not stored").

## The active intent: US-0605 (create a release by hand)

Intent `261115-manual-releases` (scope `express`) covers US-0605 (`docs/features/epic-06-feature-docs.md`): a "New release" action in the release list (with patch, minor and major suggestions after the latest tag, refusing a non-`vX.Y.Z` or existing version), the new release shown as planned with 0 stories and offered in every story's picker after a restart, adding and removing stories there with the same marker as US-0603, deleting a release with no stories and no tag, hidden with Continuous deployment, all texts through `t()`. Open question in the story: where an empty release is kept (suggested `docs/RELEASES.md`, or app settings). The facts that bear on it are in `code-quality-assessment.md` ("Brownfield notes for US-0605").

The previous intent, US-1101 (`261115-repo-public-ready`), is released; its findings stay in `code-quality-assessment.md` ("Public-readiness review") and `dependencies.md` ("Licences").
