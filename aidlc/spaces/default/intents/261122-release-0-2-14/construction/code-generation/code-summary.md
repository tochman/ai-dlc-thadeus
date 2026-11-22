# Code Summary: Release v0.2.14

Four stories, built in parallel, each in its own git worktree on its own branch from `main` (`e7ad18b`). Nothing is committed yet; the person approves commits. Every behaviour was test-first: each new test failed (Red recorded) before its code.

| Story | Branch | Worktree | New tests |
|-------|--------|----------|-----------|
| US-0038 | `fix/US-0038` | `.claude/worktrees/agent-a9c824dfc82b53ac2` | 9 (planningSync, planningRecord, FeaturesView) |
| US-0039 | `fix/US-0039` | `.claude/worktrees/agent-a2e321f2751161b83` | 14 (sessionHandoff, agentEvents, terminalControl, AgentDialogHandoff) |
| US-0037 | `fix/US-0037` | `.claude/worktrees/agent-a87ca7dc12879e3c7` | 7 (IntentDetail, ResumeButton) |
| US-0040 | `fix/US-0040` | `.claude/worktrees/agent-af7ed8825a21af92f` | 4 (parsers, IntentList) |

## US-0038 (FR1)
- `src/main/planningSync.js`: on a rebase conflict, each conflicting file keeps the target's text and the rebase goes on; `setAside()` keeps the app's version as a conflict entry naming its commit (`from`), so Keep theirs / Use mine apply. A commit left empty is skipped. Entries for a tagged release's plan are dropped with a log line at the start of each replay.
- `src/main/planningRecord.js`: `addContent` keeps only the newest change's story ids; entries carry `from`.
- `src/renderer/FeaturesView.jsx`: the Planning sync row names the blocking commit or entry and what each choice does.
- Deviation: per-file set-aside instead of `rebase --skip` (which would drop the commit's non-conflicting files too).

## US-0039 (FR2)
- `src/main/sessionHandoff.js`: `parkRequest(harness)` fixed line; `commandsFor` returns `mode` (`now` when idle, `park` otherwise); Compact in park mode adds `/aidlc --resume`; `park(eventId)`; `idle` counts only a stop after the park request.
- `src/main/agentEvents.js`: `postcompact` ends a wait for `compact` (opencode sends no session start after a compaction).
- `src/main/ipc.js`, `src/preload/index.js`: `handoff:park`.
- `src/renderer/terminalControl.js`, `AgentDialog.jsx`: park request first, "request sent" status, the rest on the next stop.
- Deviation (FR2.1): at a gate the park request is sent as the gate question's own answer, not by handing the question back and typing `/clear` (that could pick an option in Claude Code's own picker). One agent turn later than "at once".

## US-0037 (FR3)
- `src/renderer/IntentDetail.jsx`: Park and Resume in one `.intent-head-actions` group; no Unpark button; the progress row shows the parked pill instead of "In progress"; sidebar "Stages done"; smaller cost readout.
- `src/renderer/ResumeButton.jsx`: one label, "Unpark and resume at <stage>" when parked; no step text.
- `src/renderer/theme.css`: group layout, same height for Park and Resume, `.readout-value--cost`.
- Deviation: the parked mark sits in the progress row, not in the head, so it shows once.

## US-0040 (FR4)
- `src/main/parsers/intents.js`: `createdMsFromUuid` (UUID v7); within a day, newest by creation time; no `uuid` after that day's indexed intents.
- `src/renderer/IntentList.jsx` (`sortIntents`): date sort puts the active intent, then in-flight intents, first.

## Locales
US-0038, US-0039 and US-0037 each add keys in `src/shared/locales/sv.json` and `en.json` (US-0037 also removes three unused ones); expect merge conflicts there when the branches meet `main` one after another.

## Unverified, for the manual check
- Whether Claude Code and opencode deliver a line typed during a running turn into that turn (US-0039).
- That `/aidlc --resume` after a park at a gate shows the gate again (US-0039).
- The intent head layout by eye (US-0037): side-by-side Park and Resume at normal and short window heights, the parked row, narrow-window wrap, the sidebar cost.
- A planning commit that cannot be set aside has no test of its own and no button (US-0038).

## Added 2026-11-22 (plan Steps 16–25)

| Story | Branch | Notes |
|-------|--------|-------|
| US-0041 | `fix/US-0041` | Watcher reports `workDirNames`; a parked or complete intent never counts as working; 1-minute window; the notice names intent and stage. |
| US-0905 | `feat/US-0905` | Plans is a Settings \| Plans sub-view of Configuration › AI-DLC; `view: 'plans'` lands there. |
| US-0417 | `feat/US-0417` | Foundation (theme rules and tokens, shared pieces in `Lcars.jsx`, the shell) plus three view branches merged: diagonal-frame Intents/Activity (renamed from Tokens)/Cost/Velocity; Features, Releases and Editor with the list drawer; Configuration in the round frame and the About and Update dialogs (`LcarsDialog.jsx`, `openUpdateDialog()`). Mockup: `construction/lcars-mockup/index.html`. |
| US-0416 | `feat/US-0416` | Settings › Tools in four groups (`ToolRows.jsx`); Check for updates opens the Update dialog. Merges US-0417. |
| US-1203 | `feat/US-1203` | The Comments tab becomes Review: Needs you, then the pull request's threads (GitHub via `gh api graphql`, GitLab discussions, Bitbucket inline threads). Merges US-0416, so it holds the whole release. |

Whole release on `feat/US-1203`: 2,187 tests pass, 1 skipped, 92.7% line coverage, ESLint 0 errors, Prettier clean.

Still to check by eye or with the real tools: the LCARS layout in the running app; US-0039's park request and resume; US-1203's GitHub thread read on a real pull request; US-0416's rows at narrow widths.
