# Business Overview

## Purpose

T.H.A.D.E.U.S. (package `thadeus`, repository `aidlc-dash`) is a desktop "bridge console" for projects run with AI-DLC. It shows a project's AI-DLC records and embeds terminal tabs for the agent harness (Claude Code or opencode) and a shell. The records it shows are intents, stages, the audit log, Units, cost and tokens, and the feature docs. It is built and sold by Auctum Solutions AB under the MIT licence, and ships as an unsigned macOS `.dmg` and a Linux `.deb` from GitHub releases.

## Key Functionality

| Area | What the person gets | Epic |
|---|---|---|
| Intents and pipeline | An intent list with filters, intent detail with phases and stages, an artifact reader, the Unit DAG | EPIC-01, US-0411 |
| Audit timeline | A virtualised, filtered timeline of audit events with live highlighting; project velocity (US-0303, `VelocityView.jsx`) | EPIC-03 |
| Cost and tokens | Cost per stage, agent and model from the usage ledger and the audit shards of every machine; live token meters; a token detail view with Agent progress (US-0507, US-0214); the THADEUS cost rule pack (US-0212) | EPIC-02, EPIC-05 |
| Branding and desktop | The LCARS look, menu, About, splash, settings, the in-app updater, one shared tooltip | EPIC-04 |
| Workflow control | Resume, Refresh from GitHub, AI-DLC setup, a questions popup, agent dialogs, the AI-DLC update check | EPIC-05 |
| Feature docs | Epics and stories from `docs/FEATURES.md`, release markers, a Releases tab, and release planning that is committed and pushed by the app (US-0606, US-0607) | EPIC-06 |
| Languages | Swedish and English through `t()` with ICU | EPIC-07 |
| Harnesses | Claude Code and opencode tabs; setup for other harnesses | EPIC-08 |
| AI-DLC configuration | Reading and changing settings, guards, plans and models through the `aidlc` CLI | EPIC-09 |
| Editing | Monaco editor tabs with hash-checked saves | EPIC-10 |
| Open source and team | The public-readiness review, licences, the secret scan; the team view | EPIC-11, EPIC-12 |

## Business Rules That Shape the Code

- **The app reads AI-DLC; it does not change it.** It never writes engine-owned files (state, audit, `intents.json`, `.aidlc-*`, harness folders). Workflow actions are typed into the visible terminal, or run through the official `aidlc` CLI with fixed arguments. Model changes go only through `aidlc config models`, and AI-DLC regenerates the agent files itself.
- **Everything is confined to the root.** Every path the renderer names goes through `resolveInRoot`.
- **Broken input stays local.** A half-written file keeps the last good value and affects only its own intent.
- **Status is never colour alone, and every text is translated.**
- **Keyboard parity.** Whatever a pointer can reveal, focus must reveal too.
- **The LCARS look everywhere**, new views and dialogs included (project rule, 2026-11-16).
- **No agent text in an activity row** (US-0214 NFR2), except the deliberate US-0030 fields.
- **Release planning never disturbs the work** (US-0606): on a branch other than the target, the app commits in a temporary worktree on its own branch `dash/planning`, never in the checkout.

## Active Intent (US-0608)

The story is "Every planning change is kept by the app until it is on `main` or the docs branch" (EPIC-06, express, for v0.2.10). Today only three release-list actions are kept. The person wants:
- every change to `docs/FEATURES.md`, `docs/features/` and `docs/releases/` kept outside the working tree until it is on `origin/main` (or the docs branch when `main` is protected), whoever made it: the release list, the editor or an agent;
- a change that is not the story's own committed on the app's branch, never left in a story's tree;
- the waiting changes shown in the release list, with Push now;
- the intermittent error when a story is assigned to a release reproduced in a test, found and fixed;
- grouped commits, and end-to-end tests of the built app against a real git repo with a bare `origin`, run in CI.

Where this lands, and the causes found, are in `architecture.md` ("Release planning today") and `code-quality-assessment.md` ("Brownfield Notes for US-0608").

## Previous Intents

- **US-0030** (agent progress honesty, EPIC-00): the notes are kept in `architecture.md` ("Agent progress today") and `code-quality-assessment.md`.
- **US-0210** (model profile switch, built). It asks to switch to a stronger model profile when an intent on a critical plan starts, and switches back when it ends. Its building blocks and limits are kept in `architecture.md` and `code-quality-assessment.md`. The main limit: a saved AI-DLC profile holds only efforts per group, not models.
- **US-0214** (agent activity from hook events, delivered): `src/shared/agentActivity.js`, the activity kinds in `dialog.sh` and `agentAdapters.js`, `agentActivity:list` and `agent:activity`.
- **US-0303** (project velocity, built): `parsers/velocity.js`, `project:velocity`, `VelocityView.jsx` with an intent tab.
- **US-0212** (cost rule pack, done): `src/main/costRules.js`, `src/shared/costRules.js`, `CostRulesSection.jsx`. It writes a marked block in the memory files after a diff.
- **US-0414** (shared tooltip, delivered): `Tooltip.jsx` with `tooltipPlacement.js`. `tests/renderer/noNativeTitle.test.jsx` forbids native `title=`.
- **US-0507** (agent progress, delivered in #55): `AgentProgress.jsx`, `parsers/agentProgress.js`, `src/main/agentProgress.js`.
