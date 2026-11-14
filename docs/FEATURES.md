# T.H.A.D.E.U.S. (aidlc-dash) — Features

Overview of all epics. Each epic lives in its own file under [features/](features/). Epics are organised by **topic** (what the app is about), not by release. A release can contain stories from several epics.

| Epic | Topic | Status |
|------|-------|--------|
| [EPIC-01](features/epic-01-bridge-console-mvp.md) | Bridge Console: read-only AI-DLC visualisation and an embedded Claude terminal (foundation) | ✅ Released in v0.1.0 |
| [EPIC-02](features/epic-02-cost-and-models.md) | Cost & Models: what runs cost, and which model each agent uses | ✅ Released in v0.2.0 (US-0201–US-0205; CSV export in US-0203 deferred) · US-0206 moved to US-0904 (EPIC-09) |
| [EPIC-03](features/epic-03-audit-timeline.md) | Audit Timeline: long histories and precise live updates | ✅ Released in v0.2.0 (US-0301, US-0302) |
| [EPIC-04](features/epic-04-branding-and-desktop.md) | Branding, Look & Desktop Integration: Auctum icon, OS integration, glow and motion | ✅ US-0401 released in v0.1.1 · ✅ US-0402–US-0404 released in v0.2.0 (motion, design refresh, full screen and app menu) · ✅ US-0406 released in v0.2.1 (name T.H.A.D.E.U.S.) · 📋 US-0405 Planned (settings view) · 📋 US-0407 Planned (update the app from a GitHub release) |
| [EPIC-05](features/epic-05-workflow-control.md) | Workflow Control: steer AI-DLC from the console (resume, refresh from GitHub, set up AI-DLC, switch, answer) | ✅ US-0501–US-0503 released in v0.2.0 · ✅ US-0505 released in v0.2.1 (questions as a popup) · 📋 US-0504 Planned (framework updates) · 📋 US-0506 Planned (answer Claude Code's and opencode's own questions in a dialog, see their messages) |
| [EPIC-06](features/epic-06-feature-docs.md) | Feature Docs: offer FEATURES.md + epic files at setup, and view epics and stories in the console | ✅ Released in v0.2.0 (US-0601, US-0602) |
| [EPIC-07](features/epic-07-internationalisation.md) | Internationalisation: translation files, English, and languages users add themselves | ✅ US-0701 released in v0.2.1 (Swedish and English, language setting) · 📋 US-0702 Planned (own translation files) |
| [EPIC-08](features/epic-08-harnesses.md) | Harnesses: choose opencode, Codex or Kiro instead of Claude per project, and set them up | ✅ US-0801 and US-0802 released in v0.2.1 (agent terminal per project: Claude Code or opencode; set up any of the six harnesses from the app). 📋 US-0803 planned: Claude Code and opencode side by side |
| [EPIC-09](features/epic-09-aidlc-configuration.md) | AI-DLC Configuration: see and change a project's AI-DLC settings, custom plans and models per agent, per harness | 🔄 In progress: ✅ US-0901 released in v0.2.2 (read-only Configuration view per project and harness) · 📋 US-0902–US-0904 planned |

## Story numbering

`US-XXYY`: `XX` = epic number, `YY` = story number within the epic. Status markers: 📋 Planned, 🚧 In progress (being built), ✅ Done (merged to main; "Released in vX.Y.Z" is added when a release includes it).
