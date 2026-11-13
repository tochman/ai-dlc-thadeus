# Code Summary: US-0801 Choose the harness per project

## Test baseline and result

- **Before any edit:** 38 files, 138 tests, all passing.
- **After the build:** 39 files, 150 tests, all passing. 12 tests are new; the existing tests were updated for the `agent` rename and the new texts.
- **This work's scoped command:** 7 files, 32 tests, all passing.
- **`npx electron-vite build`:** succeeds.
- **Tests written but not run:** none. FR7.2's "covers Claude Code" note is built but has no test of its own.

## opencode readiness (FR4.3)

- **The probe:** the installed opencode v2.1.4 was started twice in a pseudo-terminal in an empty folder, with no login, no prompt and no config change. The throwaway script and folder were deleted afterwards.
- **What happened:**
  - Output settled at 4.8 s and 7.7 s, then one more start-up redraw came 3.0 s and 3.6 s later.
  - After that it stayed fully quiet; there is no constant redraw.
  - Typed input echoed at once and then went quiet.
- **The decision:** the shared 1.5 s rule would type before opencode's last redraw. opencode's table entry therefore gets `quietMs: 4000`, used by the existing `createActivity`. Claude keeps 1.5 s.
- **Trade-off:** the opencode tab shows Arbetar for 4 s after output stops.
- **The `/aidlc` command in opencode** is confirmed from AI-DLC's own files: `.opencode/command/aidlc.md` is opencode's `/aidlc` entry point. It was not run inside opencode.

## Files

- **New:**
  - `src/shared/harnesses.js`, the harness table: labels, folder markers, CLI, `selectable`, commands, `quietMs`.
  - `src/main/harness.js`: `detectHarnesses`, plus a re-export of the table.
  - `tests/main/harness.test.js`.
- **Main and preload:** `pty.js`, `ipc.js`, `settings.js`, `menu.js`, `preload/index.js`.
- **Renderer:**
  - The terminal: `TerminalContext.jsx`, `TerminalPanel.jsx`.
  - The other components: `ResumeButton.jsx`, `ProjectView.jsx`, `ProjectSettingsDialog.jsx`, `App.jsx`, `RefreshPanel.jsx`, `SetupAidlc.jsx`, `CostPanel.jsx`, `CostTab.jsx`, `useFeatures.js`.
  - Styles: `theme.css`.
- **Locales:** `sv.json` and `en.json`, with the same keys and placeholders.
- **Tests:** `tests/main/{settings,pty,menu,notify}.test.js` and `tests/renderer/{TerminalPanel,ProjectSettingsDialog,ResumeButton,QuestionPopup}.test.jsx`.

## Key decisions

- **The table is shared** in `src/shared/harnesses.js`, because the renderer needs the labels and commands. Only ids from that table reach the pty; any other id is refused in main.
- **The agent tab waits** until both the saved setting and the detection result are in, so it never starts Claude and then switches.
- **Detection** starts in the background when a project opens and is cached per project.
- **The "not installed" warning** shows only when the chosen harness has no markers and another harness does. A project with no harness yet starts the CLI as before. "CLI not found" always blocks.
- **Only a changed harness is saved,** so saving other settings never pins the default.
- **Texts shown across projects or from main** name AI-DLC or "the agent tab" (the question popup, the notification title, the menu entry). Texts inside one project use `{harness}`.
- **Copilot is detected** by `.github/skills/aidlc/` or `.github/hooks/aidlc.json`. **opencode is detected** by `.aidlc/`, `.opencode/command/aidlc.md`, or an `opencode.json` that mentions aidlc.

## Deviations from the plan

- **The table moved** to `src/shared/harnesses.js`; `src/main/harness.js` re-exports it.
- **The busy-tab confirmation** (FR6.1) lives in the project settings dialog and is tested there, because that is where a switch starts.
- **Two more test files were updated** for the reworded texts: `notify.test.js` and `QuestionPopup.test.jsx`.
- **One shell edit:** `sed -i` renamed `answerInClaude` → `answerInAgent` in `App.jsx`, two places.
- **Detection is not re-run after setup.** Setup stays Claude-only until US-0802.
