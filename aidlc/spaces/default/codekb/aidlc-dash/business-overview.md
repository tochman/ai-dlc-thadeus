# Business Overview

## Purpose

T.H.A.D.E.U.S. (package `thadeus`, repository `aidlc-dash`) is a desktop "bridge console" for projects run with AI-DLC. It shows a project's AI-DLC records (intents, stages, the audit log, Units, cost and tokens, feature docs) and embeds terminal tabs for the agent harness (Claude Code or opencode) and a shell. It is built and sold by Auctum Solutions AB under the MIT licence. It ships as an unsigned macOS `.dmg` and a Linux `.deb` from GitHub releases.

## Key Functionality

| Area | What the person gets | Epic |
|---|---|---|
| Intents and pipeline | An intent list with filters, intent detail with phases and stages, an artifact reader, the Unit DAG | EPIC-01, US-0411 |
| Audit timeline | A virtualised, filtered timeline of audit events with live highlighting | EPIC-03 |
| Cost and tokens | Cost per stage, agent and model from the usage ledger; live token meters; a token detail view with agent progress | EPIC-02, US-0507 |
| Branding and desktop | The LCARS look, menu, About, splash, settings, the in-app updater, one shared tooltip (US-0414, in progress) | EPIC-04 |
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
- **Keyboard parity.** What a pointer can reveal, focus must reveal too (US-0208 NFR3, US-0414).

## Active Intent (US-0414)

"One LCARS tooltip across the app": every tooltip should look and behave like the split-bar tooltip in the token detail view (`.token-detail-row-tip`, US-0208):
- a coral 2 px border, the LCARS corner, the app background and tabular figures;
- it opens on hover and on keyboard focus;
- it stays inside the window;
- its texts go through `t()`.

Native `title=` tooltips on interactive elements are replaced, and their accessible names are kept. The "Tokens over time" chart tooltip moves to the same style. The full list of today's tooltips is in the intent's `inception/reverse-engineering/developer-scan.md`. The short version is in `component-inventory.md` ("Tooltip Sites"), and the risks are in `code-quality-assessment.md` ("Brownfield Notes for US-0414").

## Previous Intent (US-0507, delivered in #55)

"See what the agents are doing and how far they have come". Each running Unit shows:
- its stage and how long it has run;
- for a build, the plan steps done out of the total, plus its last commit subject;
- for a review, the verdict and the findings by severity.

It shipped as the agent progress rows in the token detail view (`AgentProgress.jsx`). See `architecture.md` ("US-0507 data sources").
