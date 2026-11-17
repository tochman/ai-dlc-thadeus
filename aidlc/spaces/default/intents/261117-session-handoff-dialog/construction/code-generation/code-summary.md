# Code Summary: US-0213 + US-0026

All 10 plan steps are built, test first. The plan's targeted command passes: 15 files, 448 tests (baseline: 12 files, 359). With the neighbouring test files touched, 33 files and 731 tests pass. The full suite was not run here; Build and Test runs it. Nothing is committed.

## US-0026 root cause (FR7.1)

The empty page came from a `Stop` hook, or an opencode idle, whose last message was empty, whitespace or only invisible characters. The app showed that turn as a new reply, which opened the dialog on a page with no text and no choices. The fix is in `agentReplies.add`, which covers every caller: such a turn opens no page and adds no notification, and an older reply in the tab still moves on. One US-0506 test asserted the old rule ("an empty message is still a reply"); it now asserts the new one. This root cause was found by reading the code, not by checking a recorded payload.

## Files

- **New:** `src/main/contextSize.js`, `src/main/sessionHandoff.js`, `tests/main/contextSize.test.js`, `tests/main/sessionHandoff.test.js`, `tests/renderer/AgentDialogHandoff.test.jsx`
- **Source changed:**
  - hooks: `.thadeus/hooks/dialog.sh`, `.opencode/plugins/thadeus-dialog.js`
  - main: `src/main/{agentHooks,agentAdapters,agentEvents,agentReplies,agentChannel,projectService,settings,pty,ipc}.js`
  - shared and preload: `src/shared/agentOrder.js`, `src/preload/index.js`
  - renderer: `src/renderer/{AgentDialog,TerminalContext,ProjectSettingsView,ProjectView,App}.jsx`, `src/renderer/terminalControl.js`
  - text: `src/shared/locales/{sv,en}.json`
- **Tests and fixtures changed:** 11 main test files, 2 renderer test files, 5 fixtures under `tests/fixtures/agent-hooks/`
- **Docs:** implementation notes in the US-0213 and US-0026 stories. Markers are still 🚧 and no criteria are ticked.

## Key decisions

- **Hook kinds:** there are eight in all. The report-only kinds `answered`, `reply`, `session`, `notify` and `postcompact` are `"async": true`. `question`, `permission` and `precompact` stay synchronous. `RELEASES` keeps v0.2.8 and the pre-US-0213 entries, so an existing install reads as out of date and updates through the preview.
- **Signals, not pages:** the new kinds are kept per session (last stop, background tasks, transcript path, notify, busy, size, compaction time) and never open a page. `waitForSession` resolves when the session after `/clear` (or `/new`) starts.
- **Adapters:** they read only `source`, `notification_type` and `trigger`. `compact_summary` and the notification text are never read. An absent field becomes `null`.
- **Handoff page:** a new `handoff` kind in the same pager, sorted last. Closing it counts as Not now. A harness with no commands gets no page.
- **Sending:** main decides idle; the renderer types only main's fixed lines, through the agent tab's own write.
- **Gate detection:** the gate moment needs a `- [?]` stage line, because the state file's legend comment also contains `[?]`.
- **Transcripts:** read only under `~/.claude/projects`, from the last 256 KB.
- **opencode:**
  - V2 names, each kept in one constant (`OC`). The plugin reads `data ?? properties`.
  - `session.compaction.ended` reports a compaction.
  - `ctx.session.hook('compaction')` adds the instruction when the hook exists.
  - `session.status` feeds the idle rule.
  - `session.usage.updated` gives the context size.

## Deviations from the plan

- **Added at the person's request during the build:**
  - the `postcompact` kind (Claude Code `PostCompact`, with `SessionStart` source `compact` as the fallback);
  - `async` on the report-only entries;
  - `background_tasks` in the idle rule;
  - the opencode V2 equivalents.
- **Files outside the plan's list:** preload, `agentChannel` (`writeInstruction`), `projectService` (`loadHandoffInputs`), ProjectView, App and agentOrder.
- **Tests that changed with the new rules:** the US-0026 Red is in `tests/main/agentEventsReply.test.js` (the fix is in main), not `AgentDialog.test.jsx`. An old test that said busy writes nothing now expects one `status` event. The `empty-containers` fixture's empty array moved to `SubagentStop`, because `Notification` is now the app's.
- **Shell writes:** some files were written with shell commands (heredoc, `python3`, one `sed -i`) instead of the file tools. Two scratch fixture scripts were created and deleted.

## Written but not executed (for Build and Test)

- **Full suite:** not run here (the brief said targeted runs only).
- **Wiring only syntax-checked:** `ipc.js`, `ProjectView.jsx`, `App.jsx`. No test exercises them end to end.
- **Real harness runs, by hand:**
  - PreCompact's printed text reaching Claude Code's compaction;
  - OQ1: does `/aidlc --resume` show the waiting gate again after `/clear`;
  - opencode's `/compact` taking no argument (the instruction goes through the hook);
  - opencode's real payload shapes.
