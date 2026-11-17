# Business Overview

## Purpose

T.H.A.D.E.U.S. (package `thadeus`, repository `aidlc-dash`) is a desktop "bridge console" for projects run with AI-DLC. It shows a project's AI-DLC records and embeds terminal tabs for the agent harness (Claude Code or opencode) and a shell. The records it shows are intents, stages, the audit log, Units, cost and tokens, and the feature docs. It is built and sold by Auctum Solutions AB under the MIT licence, and ships as an unsigned macOS `.dmg` and a Linux `.deb` from GitHub releases.

## Key Functionality

| Area | What the person gets | Epic |
|---|---|---|
| Intents and pipeline | An intent list with filters, intent detail with phases and stages, an artifact reader, the Unit DAG | EPIC-01, US-0411 |
| Audit timeline | A virtualised, filtered timeline of audit events with live highlighting; project velocity (US-0303, `VelocityView.jsx`) | EPIC-03 |
| Cost and tokens | Cost per stage, agent and model from the usage ledger and the audit shards of every machine; live token meters; a token detail view; the THADEUS cost rule pack (US-0212) | EPIC-02 |
| Branding and desktop | The LCARS look, menu, About, splash, settings, the in-app updater, one shared tooltip | EPIC-04 |
| Workflow control | Resume, Refresh from GitHub, AI-DLC setup, a questions popup, agent dialogs, the AI-DLC update check | EPIC-05 |
| Feature docs | Epics and stories from `docs/FEATURES.md`, release markers, a Releases tab | EPIC-06 |
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

## Active Intent (US-0210)

The story is "Ask to switch to a stronger model profile when a critical intent starts, and switch back when it ends" (EPIC-02, for v0.2.9). The person wants three things:
- **Project settings**: which plans (scopes) count as critical, which saved model profile is "critical", and which is "economy".
- **Start**: when a new intent appears on a critical plan, the app asks once. Yes runs `aidlc config models --from <critical> --project --harness <harness> --yes`; No changes nothing.
- **End**: when that intent is completed or archived, the app switches back to the economy profile, or asks first if the person chose that.

The app shows which profile is active, and the command's output after each switch. A failed command shows its message and changes nothing else. An intent on a plan that is not critical gets no question. Open question from the story: when a critical and a non-critical intent run at the same time, the proposal is that critical wins until the last critical intent ends.

Where this lands, and the limits found, are in `architecture.md` ("US-0210 building blocks") and `code-quality-assessment.md` ("Brownfield Notes for US-0210"). The most important limit is that a saved AI-DLC profile holds only efforts per group, not models.

## Previous Intents

- **US-0303** (project velocity, built): `parsers/velocity.js`, `project:velocity`, `VelocityView.jsx` with an intent tab. Its data-source notes are kept in `architecture.md` and `code-quality-assessment.md`.
- **US-0212** (cost rule pack, done): `src/main/costRules.js`, `src/shared/costRules.js`, `CostRulesSection.jsx`. It writes a marked block in the memory files after a diff.
- **US-0414** (shared tooltip, delivered): `Tooltip.jsx` with `tooltipPlacement.js`. `tests/renderer/noNativeTitle.test.jsx` forbids native `title=`.
- **US-0507** (agent progress, delivered in #55): `AgentProgress.jsx`, `parsers/agentProgress.js`.
