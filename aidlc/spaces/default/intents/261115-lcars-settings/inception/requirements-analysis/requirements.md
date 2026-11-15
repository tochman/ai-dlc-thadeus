# Requirements: US-0410 Settings in LCARS tabs, with every tool the app needs checked

## Sources

- Initial description: US-0410 in `docs/features/epic-04-branding-and-desktop.md` [desc]
- Answers Q1–Q4 in `requirements-analysis-questions.md` [Q1]–[Q4]
- Code read: `src/renderer/SettingsView.jsx` (sections tools, appearance, project, about), `src/renderer/App.jsx` (rail `ArmBlock` SETTINGS at line 561, `settingsView` state), `src/main/tools.js` (`TOOL_IDS = ['aidlc', 'claude', 'shell']`), `src/main/updater.js` (runs `gh`), `src/shared/harnesses.js` (opencode `cli: 'opencode'`)
- Codekb: `aidlc/spaces/default/codekb/aidlc-dash/business-overview.md`, `architecture.md`, `code-structure.md`

## Intent

Make Settings quick to scan and in the app's LCARS look: one topic at a time, chosen from the left rail, with LCARS motion. Make sure every tool the app runs is checked in one place, opencode and the GitHub CLI included. Build the LCARS card style once so US-0411 can reuse it on the pipeline.

## Functional requirements

**FR1 Tabs in the left rail** [Q1]
- FR1.1 While Settings is open, the left rail shows five sub-buttons under SETTINGS: Tools, Appearance, Notifications, Project, About, in the rail's own LCARS block style. They are hidden when Settings is closed.
- FR1.2 Choosing one shows only that tab's panel in the content frame; the chosen sub-button is lit.
- FR1.3 The sub-buttons work with the keyboard and say which one is selected (`aria-current` or tab semantics).

**FR2 Content per tab** [desc]
- FR2.1 Tools: the tool cards (FR4).
- FR2.2 Appearance: animations, full screen at start, language.
- FR2.3 Notifications: questions from AI-DLC, the agent dialog and reply settings (US-0506), notification sound.
- FR2.4 Project: default folder, recent and open projects.
- FR2.5 About: as today.
- FR2.6 Every setting saves and behaves exactly as today; only where it is shown changes.

**FR3 Frame and motion** [Q2]
- FR3.1 Each panel sits in an LCARS frame: an elbow, a header bar with the tab's name, a dark body.
- FR3.2 With animations Full: on a tab change the sub-button lights, a sweep runs along the frame to the panel, and the panel's rows appear one after another.
- FR3.3 Reduced: a static glow on the chosen sub-button, no sweep, rows appear at once. Off: no motion.

**FR4 Tool cards** [desc]
- FR4.1 Tools lists the AI-DLC CLI, Claude Code, opencode, the GitHub CLI (`gh`) and the shell, each as an LCARS card: name in the header strip, path and version in the body, "found automatically" or "chosen" and Choose… / Reset in the footer.
- FR4.2 opencode and `gh` are found on the login shell's PATH like the others, can be chosen by hand, and a chosen path is used the next time the app runs that tool (agent tabs for opencode, the updater and GitHub features for `gh`).
- FR4.3 A tool that is not found shows "Not found", what the app needs it for, and Choose… [Q4]. Nothing else is blocked.
- FR4.4 A path wraps at `/`, never mid-word.

**FR5 Last tab** [Q3]
- FR5.1 Settings opens on the tab used last, remembered between app starts in the app settings; the first time, Tools.

**FR6 Shared card style** [desc]
- FR6.1 The card (outline with one rounded top-right corner, a lighter bar on the top edge, header strip with the title aligned right, dark body, footer strip) is one shared style, used by the tool cards, for US-0411 to reuse.

## Non-functional requirements

- NFR1 Every text goes through `t()` with the same keys in `sv.json` and `en.json`.
- NFR2 Animations honour the animations setting and the system's reduce-motion default (FR3.3); no motion runs when Off.
- NFR3 Colours come from the existing tokens; text keeps at least 4.5:1 contrast.
- NFR4 TDD; 80% line coverage on the changed files; ESLint and Prettier clean; existing `SettingsView` and `tools` tests still pass (behaviour unchanged).

## Constraints

- Renderer in React with plain CSS, as the rest of the app; no new dependency.
- Tool lookup and version checks stay in `src/main/tools.js` with fixed arguments and no shell (US-0405 C2).

## Assumptions

- [assumption] The sub-buttons replace scrolling: one panel at a time, no long page.
- [assumption] The project's own settings dialog (`ProjectSettingsDialog.jsx`, agent hook install) stays where it is.
- [assumption] Version for `gh` is `gh --version`'s first line, for opencode `opencode --version`.

## Out of scope

- Install hints or a warning mark in the rail for a missing tool (Q4 chose A).
- The pipeline cards themselves (US-0411).
- New settings.

## Open questions

None.
