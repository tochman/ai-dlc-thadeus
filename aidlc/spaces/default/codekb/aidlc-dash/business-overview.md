# Business Overview

## Purpose

T.H.A.D.E.U.S. (package `thadeus`, repository `aidlc-dash`) is a desktop "bridge console" for projects run with AI-DLC. It shows a project's AI-DLC records (intents, stages, the audit log, Units, cost and tokens, feature docs) and embeds terminal tabs for the agent harness (Claude Code or opencode) and a shell. It is built and sold by Auctum Solutions AB under the MIT licence. It ships as an unsigned macOS `.dmg` and a Linux `.deb` from GitHub releases.

## Key Functionality

| Area | What the person gets | Epic |
|---|---|---|
| Intents and pipeline | An intent list with filters, intent detail with phases and stages, an artifact reader, the Unit DAG | EPIC-01, US-0411 |
| Audit timeline | A virtualised, filtered timeline of audit events with live highlighting; project velocity (US-0303, in progress) | EPIC-03 |
| Cost and tokens | Cost per stage, agent and model from the usage ledger and the audit shards of every machine; live token meters; a token detail view with agent progress | EPIC-02, US-0209, US-0507 |
| Branding and desktop | The LCARS look, menu, About, splash, settings, the in-app updater, one shared tooltip (US-0414) | EPIC-04 |
| Workflow control | Resume, Refresh from GitHub, AI-DLC setup, a questions popup, agent dialogs, the AI-DLC update check | EPIC-05 |
| Feature docs | Epics and stories from `docs/FEATURES.md`, release markers, a Releases tab | EPIC-06 |
| Languages | Swedish and English through `t()` with ICU | EPIC-07 |
| Harnesses | Claude Code and opencode tabs; setup for other harnesses | EPIC-08 |
| AI-DLC configuration | Reading and changing settings, guards, plans and models through the `aidlc` CLI | EPIC-09 |
| Editing | Monaco editor tabs with hash-checked saves | EPIC-10 |
| Open source and team | The public-readiness review, licences, the secret scan; the team view (machines, collisions, pull request comments) | EPIC-11, EPIC-12 |

## Business Rules That Shape the Code

- **The app reads AI-DLC; it does not change it.** Engine-owned files (state, audit, `intents.json`, `.aidlc-*`, harness folders) are never written. Workflow actions are typed into the visible terminal, or run through the official `aidlc` CLI with fixed arguments.
- **Everything is confined to the root.** Every path the renderer names goes through `resolveInRoot`.
- **Broken input stays local.** A half-written file keeps the last good value and affects only its own intent.
- **Status is never colour alone, and every text is translated.**
- **Keyboard parity.** What a pointer can reveal, focus must reveal too (US-0208 NFR3, US-0414).
- **The LCARS look everywhere**, new views included (project rule, 2026-11-16).

## Active Intent (US-0303)

"Project velocity: intent, story and project metrics" (EPIC-03, for v0.2.9). The person wants:
- **per intent**: the total time, the time per phase and per stage, the time spent waiting at approvals, and the review rounds per stage, from the audit log and the state file;
- **per story**: the time from 🚧 to ✅ to "Released in vX.Y.Z", and the stories per release, from the feature docs and their git history;
- **per project**: the intents and stories finished per week and per month, the average intent length, and the trend.

A running intent shows its numbers so far and is marked unfinished. A missing or unreadable record is named, not counted as zero. The view names the records it used, and all its text goes through `t()` in Swedish and English.

The data sources and gaps are in `architecture.md` ("US-0303 data sources"). The risks are in `code-quality-assessment.md` ("Brownfield Notes for US-0303").

## Previous Intents

- **US-0414** (shared tooltip, delivered): `Tooltip.jsx` with `tooltipPlacement.js`. It is portalled to `document.body`, opens on focus and hover, and stays inside the window. `tests/renderer/noNativeTitle.test.jsx` now forbids native `title=` in the renderer.
- **US-0507** (agent progress, delivered in #55): the agent progress rows in the token detail view (`AgentProgress.jsx`, `parsers/agentProgress.js`).
