# Auctum AIDLC Control (aidlc-dash) — Features

Overview of all epics. Each epic lives in its own file under [features/](features/). Epics are organised by **topic** (what the app is about), not by release. A release can contain stories from several epics.

| Epic | Topic | Status |
|------|-------|--------|
| [EPIC-01](features/epic-01-bridge-console-mvp.md) | Bridge Console: read-only AI-DLC visualisation and an embedded Claude terminal (foundation) | ✅ Released in v0.1.0 |
| [EPIC-02](features/epic-02-cost-and-models.md) | Cost & Models: what runs cost, and which model each agent uses | 🚧 Built, not released (US-0201–US-0205; CSV export in US-0203 deferred) · US-0206 📋 Planned (future: choose models) |
| [EPIC-03](features/epic-03-audit-timeline.md) | Audit Timeline: long histories and precise live updates | 🚧 Built, not released (US-0301, US-0302; 20 000-event timing in Electron pending) |
| [EPIC-04](features/epic-04-branding-and-desktop.md) | Branding, Look & Desktop Integration: Auctum icon, OS integration, glow and motion | US-0401 🚧 released in v0.1.1 (awaiting verification) · US-0402 🚧 Built, not released (glow, motion, Animationer setting) · US-0403 🚧 Built, not released (design refresh) · US-0404 🚧 Built, not released (full screen, app menu) · US-0405 📋 Planned (settings view, after v0.2.0) |
| [EPIC-05](features/epic-05-workflow-control.md) | Workflow Control: steer AI-DLC from the console (resume, refresh from GitHub, set up AI-DLC, switch, answer) | 🚧 Built, not released (US-0501–US-0503) · US-0504 framework updates 📋 Planned · US-0505 Claude's questions as a popup 📋 Planned (after v0.2.0) |
| [EPIC-06](features/epic-06-feature-docs.md) | Feature Docs: offer FEATURES.md + epic files at setup, and view epics and stories in the console | 🚧 Built, not released (US-0601, US-0602; manual checks in Electron pending) |
| [EPIC-07](features/epic-07-internationalisation.md) | Internationalisation: translation files, English, and languages users add themselves | 📋 Planned (US-0701 medium, US-0702 low) — after v0.2.0 |
| [EPIC-08](features/epic-08-harnesses.md) | Harnesses: choose opencode, Codex or Kiro instead of Claude per project, and set them up | 📋 Planned (US-0801 high, US-0802 medium) — after v0.2.0 |

## Story numbering

`US-XXYY`: `XX` = epic number, `YY` = story number within the epic. Status markers: 📋 Planned, 🚧 In progress / built not released, ✅ Done.
