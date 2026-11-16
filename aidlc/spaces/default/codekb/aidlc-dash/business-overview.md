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
| Workflow control | Resume, Refresh from GitHub, AI-DLC setup, a questions popup, agent dialogs (questions, permissions, replies through hooks), the AI-DLC update check | EPIC-05 |
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
- **Status is never colour alone, and every text is translated.**

## Active Intent (US-0507)

"See what the agents are doing and how far they have come": on the existing Unit diagram (`BoltDag.jsx`, the intent's Units tab), each running Unit shows:
- its stage and how long it has run;
- for a build, the plan steps done out of the total, from the ticked boxes in its worktree's `code-generation-plan.md`, plus its last commit subject;
- for a review, "review requested", then the verdict and the findings by severity.

A summary line in words sits above the diagram. It updates live; finished work drops off with its result, and a source it cannot read is named, not shown as 0. See `architecture.md` ("US-0507 data sources") and `code-quality-assessment.md` ("Brownfield notes for US-0507").
