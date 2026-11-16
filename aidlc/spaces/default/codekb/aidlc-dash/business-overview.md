# Business Overview

## Purpose

T.H.A.D.E.U.S. (package `thadeus`, repository `aidlc-dash`) is a desktop "bridge console" for projects run with AI-DLC. It shows a project's AI-DLC records (intents, stages, the audit log, Units, cost and tokens, feature docs) and embeds terminal tabs for the agent harness (Claude Code or opencode) and a shell. It is built and sold by Auctum Solutions AB under the MIT licence. It ships as an unsigned macOS `.dmg` and a Linux `.deb` from GitHub releases.

## Key Functionality

| Area | What the person gets | Epic |
|---|---|---|
| Intents and pipeline | An intent list with filters, intent detail with phases and stages, an artifact reader, the Unit DAG | EPIC-01, US-0411 |
| Audit timeline | A virtualised, filtered timeline of audit events with live highlighting | EPIC-03 |
| Cost and tokens | Cost per stage, agent and model from the usage ledger; live token meters; a token detail view | EPIC-02 |
| Branding and desktop | The LCARS look, menu, About, splash, settings, the in-app updater | EPIC-04 |
| Workflow control | Resume, Refresh from GitHub, AI-DLC setup, a questions popup, agent dialogs, agent progress on the Unit DAG (US-0507) | EPIC-05 |
| Feature docs | Epics and stories from `docs/FEATURES.md`, release markers, a Releases tab | EPIC-06 |
| Languages | Swedish and English through `t()` with ICU | EPIC-07 |
| Harnesses | Claude Code and opencode tabs; setup for other harnesses | EPIC-08 |
| AI-DLC configuration | Reading and changing settings, guards, plans and models through the `aidlc` CLI | EPIC-09 |
| Editing | Monaco editor tabs with hash-checked saves | EPIC-10 |
| Open source | The public-readiness review, licences, the secret scan | EPIC-11 |

## Business Rules That Shape the Code

- **The app reads AI-DLC; it does not change it.** Engine-owned files (state, audit, `intents.json`, `.aidlc-*`, harness folders) are never written. Workflow actions are typed into the visible terminal, or run through the official `aidlc` CLI with fixed arguments.
- **Everything is confined to the root.** Every path the renderer names goes through `resolveInRoot`.
- **Broken input stays local.** A half-written file keeps the last good value and affects only its own intent.
- **Cost is AI-DLC's own figure.** Only the `usd` values AI-DLC wrote are shown; the app computes no prices (`ledger.js` FR2.4).
- **Status is never colour alone, and every text is translated.**

## Active Intent (US-0209)

"An intent's cost should count every machine." Today the cost views read only this machine's gitignored ledger, so work done on another computer is missing. The intent adds the cost rollups that every machine commits in its own audit shard (`<record>/audit/<host>-<clone-id>.md`), merged with the local ledger without double counting, and shows which machines contributed and when a total is partial. See `architecture.md` ("US-0209 cost sources") and `code-quality-assessment.md` ("Brownfield notes for US-0209").
