<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->


- 2026-11-14T16:30:00Z [unit u1-questions] — Spike done from the Claude Code hooks reference: PreToolUse on AskUserQuestion can answer via permissionDecision allow + updatedInput.answers, so questions go via hook; keys only after a time-out.
<!-- aidlc-wave-memory:u1-questions:035f79b0a8d825349a35bbf39eb7773a8b79189514b347afabde9bc596f16686 -->


- 2026-11-14T16:30:00Z [unit u1-questions] — Added a random suffix to event file names and a toolCallId on events (Contract Design review R-04, R-05); "dismissed" kept as a renderer outcome, not a stored state (R-03); failed sends return to shown and can be retried (R-06).
<!-- aidlc-wave-memory:u1-questions:50ee3d27dfbfa081bd10b359157cf81dffe2b3312e50355eb8be12d3ea14cad0 -->


- 2026-11-14T16:34:12Z [unit u2-permissions] Claude Code "Allow always" is one choice applying all permission_suggestions unchanged, mirroring the terminal's single "don't ask again" option; shown only when suggestions are non-empty (BR5.3).
<!-- aidlc-wave-memory:u2-permissions:d10df899870cbee101fecdccc7daf7629dda3d3d8db1673f797dccc7a38f1e32 -->


- 2026-11-14T16:34:12Z [unit u2-permissions] Deny maps to behavior deny with interrupt true, read as the closest match to the terminal "No"; to confirm in the NFR2 scenario 6 manual run.
<!-- aidlc-wave-memory:u2-permissions:cd30b3ec72e11e61171147a3d765db57e8ccf2ccdf51d1d2a62a52b7c03df8f0 -->


- 2026-11-14T16:34:12Z [unit u2-permissions] u1 rule IDs mentioned in rules.md are listed in traceability reverse as defined by u1-questions, since the sensor counts every BR id in the file.
<!-- aidlc-wave-memory:u2-permissions:2dc2fa4c3f2a23806059d97ee0f5df68d17fc41bd8788f8c3bea3d150fe785b1 -->


- [unit u3-replies] 2026-11-14T16:35:06Z — "answered in the terminal" (M4) is detected as any input the person types into that tab's pty through pty:write after the reply arrived (BR6.6); no extra hook such as UserPromptSubmit was added.
<!-- aidlc-wave-memory:u3-replies:9b5953291c38b4acc96b3b9278d8e07056d9b5f235c792a0614d9b614a7263e6 -->


- [unit u3-replies] 2026-11-14T16:35:06Z — AC3.1.3 says the strip shows the reply "rendered as Markdown", M5 says "first line, plain text, ellipsis"; reconciled as the first non-empty line rendered as inline Markdown on one line, with Show/Answer for the full rendering (BR6.16).
<!-- aidlc-wave-memory:u3-replies:256a57eaab7562a83e3d0e2d7dee89f1c2bed7fc94b7112b894a71521d85bc8d -->


- [unit u3-replies] 2026-11-14T16:35:06Z — the strip's four looks (empty, waiting, answered, session ended) map to "no LatestMessage" plus three stored statuses; a tab that moved on counts as answered.
<!-- aidlc-wave-memory:u3-replies:ed0339c0a23789233442d69a61975f38ee7cd7de4d01eebf24a7aa31707e35a3 -->


- 2026-11-14T16:53:18Z — [unit u4-install] Entry set taken from u1–u3 as four Claude Code entries (PreToolUse/PostToolUse on AskUserQuestion at 600/10 s, PermissionRequest matcher `*` at 600 s, Stop at 10 s) and six opencode plugin events; u2's "matcher for every tool" read as `*`.
<!-- aidlc-wave-memory:u4-install:31b885b3f7da723c393a5a4269e3174dd274083a4eea5d05176796d64a2bdba1 -->


- 2026-11-14T16:53:18Z — [unit u4-install] outOfDate vs editedByHand decided by comparing against canonical content of every app release built into the app; in the first release any difference is a hand edit.
<!-- aidlc-wave-memory:u4-install:01942f62efbeb529e6a1b4c933967dd054f9531cc3840b745528fdc30d9c222a -->


- 2026-11-14T16:53:18Z — [unit u4-install] Settled ADR-005's open consequence here because U4 replaces the source switch: a tab uses hook events only when its harness was current at spawn and still is (BR7.18).
<!-- aidlc-wave-memory:u4-install:418b5ba229917827d81e38ebe7c05366b234a16495dacf6526a64227cced7436 -->


- [unit u5-notifications] 2026-11-14T16:52:56Z — "Line only" and "Off" reuse u3's `dismissed` state (reply accepted straight as dismissed, strip's Answer reopens it) instead of a new state; one pure `alertPlan(kind, settings, inFront)` decides dialog, notification and sound for main and renderer alike.
<!-- aidlc-wave-memory:u5-notifications:90b7acaa1d13d688737f4f45f4a5924fcb95ec28ce5e860d1ceda079ce1785fd -->


- [unit u5-notifications] 2026-11-14T16:52:56Z — "Line only" still notifies in the background (AC5.1.2 says only "Off" has no notification); clicking such a notification reopens the reply like the strip's Answer.
<!-- aidlc-wave-memory:u5-notifications:44514d2576420f08f47e403fd530fd7f635262ca4b65ec635dcc264a21e64558 -->


- [unit u5-notifications] 2026-11-14T16:52:56Z — settings key named `replyAlerts` (`dialog-notify`, `line`, `off`), mirroring `questionAlerts`; the existing alerts legend and help texts change to cover agent questions and permission prompts, keys kept.
<!-- aidlc-wave-memory:u5-notifications:706110b2c956b9164a07717d63cd045d744a6d6b0b44060482e28381964ea5e7 -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->


- 2026-11-14T16:40:00Z [unit u1-questions] — opencode cannot hold its question for the dialog: its form shows in the terminal at once and no plugin answer API is documented. Designed the plugin to reply via the client's session.form.reply (from source, provisional), falling back to keys; the dialog does not take over for opencode (differs from FR3.3), and says so on the page.
<!-- aidlc-wave-memory:u1-questions:7b0da18b6216baa0a2782d12e8e1cb2c7afc09ef885389f99b9172557cc2973d -->


- 2026-11-14T16:34:12Z [unit u2-permissions] A timed-out permission is not sent as keys (u1 sends timed-out questions as keys, M6 "send from here as keys"): a wrong key would allow a command nobody chose, so choices are disabled and the terminal answers (BR5.9).
<!-- aidlc-wave-memory:u2-permissions:d5b42ec25f337dffd4f366bb107ac295dd28b9dabfd8584c49a610a4df1589cc -->


- 2026-11-14T16:34:12Z [unit u2-permissions] On open, focus goes to the page title, not the first choice as u1 BR4.5 says, so Enter can never allow by default (M3, BR5.6).
<!-- aidlc-wave-memory:u2-permissions:9246c07b8329efd60c4444437477f453e999742cb332a3cde4b6023c4d5fc686 -->


- [unit u3-replies] 2026-11-14T16:35:06Z — on tab exit a shown reply goes stale (keeps text, session-ended line) instead of ending, as M4 and M5 require; BR6.7 narrows u1 BR2.3's "end every event of the session" for the reply kind only.
<!-- aidlc-wave-memory:u3-replies:3b07f8fad0af5a13d1e3acdf61be4bdd4a6565fd2c15cac7199416f1e674e9a3 -->


- [unit u3-replies] 2026-11-14T16:35:06Z — added to u1's contracts, additively: states dismissed and stale, message.empty, agentEvents.latest output fields eventId/truncated/empty, new bridge member agentEvents.reopen, and an in-process terminal-input signal from IpcRouter's pty:write handler to the store.
<!-- aidlc-wave-memory:u3-replies:9c790aad8d30ccee9e80e516292348877f20cf993ca7f18eead6a63ae576a6e6 -->


- 2026-11-14T16:53:18Z — [unit u4-install] Plugin path `.opencode/plugins/thadeus-dialog.ts` replaces C6's provisional `thadeus-dialog.js` and M8's `.opencode/plugin/` placeholder; C4 gets additive refusals, a `reason` field and an `agent-hooks:changed` push.
<!-- aidlc-wave-memory:u4-install:52d46784e39b4856390cb327334a83bb0198152ecb675ef4e5df8b1069f0c128 -->


- 2026-11-14T16:53:18Z — [unit u4-install] PostToolUseFailure not installed, matching u1's entry set; a failed question closes on a newer event or tab exit.
<!-- aidlc-wave-memory:u4-install:85dd247007f4cb73c133c4b931f96a744563559e2f2c976694114ba3c3163e9d -->


- [unit u5-notifications] 2026-11-14T16:52:56Z — every kind escalates to red after 20 s, replies included (u3 BR6.17), superseding AC5.1.1's wording for replies; recorded in functional-spec.md D7.
<!-- aidlc-wave-memory:u5-notifications:f7d9f8e5429fc1e58d3348343c1a0bdc97f439a39ad38266b9c0168eea7f573d -->


- [unit u5-notifications] 2026-11-14T16:52:56Z — traceability sensor reports pass false: its functional-design check always requires the Unit's own rules.md and BR targets in it, but a ui Unit produces no rules.md (produces_kinds). Rows are OK with u1/u3 rule IDs and spec decisions D1–D9; no rules.md written, per the brief.
<!-- aidlc-wave-memory:u5-notifications:d0118dc1041a38ae7be322bb4cb69f71c2d81cf7468cc8eeff1417758123caa0 -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->


- 2026-11-14T16:34:12Z [unit u2-permissions] opencode uses permission.asked + ctx.permission.reply, not the evaluate hook: evaluate decides in code before the person is asked (FR3.4).
<!-- aidlc-wave-memory:u2-permissions:1fc5eb09ff84243644049458918ff7593b15ec37710295596346594689e050b1 -->


- 2026-11-14T16:34:12Z [unit u2-permissions] A command cut at 64 KB disables the allow choices; Deny, Close and the terminal stay. Safer than allowing something the person cannot read in full (BR5.5).
<!-- aidlc-wave-memory:u2-permissions:712093f87cb500ad88100bbc202220cfd8435f2f3cc8d3b912b3836f60055282 -->


- 2026-11-14T16:34:12Z [unit u2-permissions] Pager rank puts questions and permissions before replies but keeps u1's no-jump rule, so AC2.1.4 holds when paging from the start rather than by switching the open page (BR5.12).
<!-- aidlc-wave-memory:u2-permissions:83f56be4b2b0aa891650851d9383056b5e26019e182ee2f37713ee9cf7579097 -->


- [unit u3-replies] 2026-11-14T16:35:06Z — the reply answer is typed as one line: newlines and tabs become spaces, other control characters are removed (BR6.11); safe against early submits and escape injection, at the cost of multi-line answers (bracketed paste not used).
<!-- aidlc-wave-memory:u3-replies:894665bc20622e7167c55ab4ff60b49ce9a79c1d552b1f438a15560dc3461d00 -->


- [unit u3-replies] 2026-11-14T16:35:06Z — a sent reply ends at once rather than waiting in "sent" for a closing event, because no hook reports that the typed input was taken; the LatestMessage keeps the record as answered.
<!-- aidlc-wave-memory:u3-replies:97a1357b873f016c853cf4bc4dcadb6d79a7361eece8000a8e259f1a3c5f719c -->


- [unit u3-replies] 2026-11-14T16:35:06Z — an empty last message still opens the dialog with an app placeholder line, keeping "every reply opens the dialog" (FR2.7) over hiding blank turns.
<!-- aidlc-wave-memory:u3-replies:cbdda5114f62230de8eaf8d29883d9dc0b4f48a69f589a5c843716f172d59f93 -->


- 2026-11-14T16:53:18Z — [unit u4-install] Settings edits splice text at the app's spans instead of re-serialising, to keep other entries byte for byte; costs a span-aware JSON reader, checked by a post-splice value comparison (BR7.10).
<!-- aidlc-wave-memory:u4-install:aec17aade8a18cccf90ef4325ed1753251fcfc9c4fe5c46343ef2939d48681f0 -->


- 2026-11-14T16:53:18Z — [unit u4-install] No two-file transaction: script written before entries (reversed on remove) so a partial write is harmless and shows as out of date (BR7.16).
<!-- aidlc-wave-memory:u4-install:2bf614bdf28e1e79fe78f9c1042d3d7dfd16aab5b99a3c0e164c42a065d8f5d5 -->


- [unit u5-notifications] 2026-11-14T16:52:56Z — notify decision taken once at arrival (window state then), no later notification on blur and no withdrawal on focus; simpler "once per event id", matches today's notify.js.
<!-- aidlc-wave-memory:u5-notifications:41a961ac900fbdcb4b875e9dac4da70c9b6eff9ef09895247c4d8da12e407d44 -->


- [unit u5-notifications] 2026-11-14T16:52:56Z — no cap on notifications for a burst of events; one per event as FR6.1 says, a cap only if it proves noisy.
<!-- aidlc-wave-memory:u5-notifications:f6c68d1ca85958a9c7cef17a83d6cd4708283eb907239124f29bb469956046f0 -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-11-14T16:30:00Z [unit u1-questions] — Claude Code docs list no maximum hook timeout; used the documented default 600 s (waitSeconds 595) for "as long as allowed" [Q1]. Raising it later is a one-line change in the entry.
<!-- aidlc-wave-memory:u1-questions:4398a56cec13d86651f9cb6e6865c2ef352ff499caee46eaa55019132bcd6889 -->

- 2026-11-14T16:34:12Z [unit u2-permissions] Exact opencode permission.asked field names for type and pattern are to be read from recorded fixtures before the adapter is written.
<!-- aidlc-wave-memory:u2-permissions:f4a1a06fab4dfba196af71d8539c217d6befa47c3a23064a7195767cf532e893 -->

- 2026-11-14T16:34:12Z [unit u2-permissions] u1 refusals by AgentChannel (BR1.1) leave the hook waiting until its limit; BR5.4 hands back at once only for events that pass the channel. Not changed here.
<!-- aidlc-wave-memory:u2-permissions:7da5c042ea90edf20b6273cb93f777b323dafcd967d98ff709669082dd9f1a82 -->

- [unit u3-replies] 2026-11-14T16:35:06Z — Q1 = B (replies turn red after 20 s, BR6.17) contradicts the approved AC5.1.1, which limits red to questions and permission prompts; u5-notifications needs its story text aligned.
<!-- aidlc-wave-memory:u3-replies:a2a44ae18a48b5f1d3b3b41b125470e2c60bb8d5eccd71c6fe77f647ecdf2d69 -->

- [unit u3-replies] 2026-11-14T16:35:06Z — BR6.2 assumes the opencode plugin can tell a top-level session from a sub-agent session; check against a recorded session.status and ctx.session.context payload in Code Generation.
<!-- aidlc-wave-memory:u3-replies:bd00dc5c9eae07a48d102b02d6d5c1e8ee6b3fa3923a5a25aa14f8dec19a3393 -->

- [unit u3-replies] 2026-11-14T16:35:06Z — when another Stop hook blocks the stop, the reply event arrives while Claude continues; the next event marks it stale, but a Send before that types into a running turn. Accepted as a known limit.
<!-- aidlc-wave-memory:u3-replies:e6270fff0c53bae824efc0414006aa0a6a3549ef768039d99b3b18b4aa46c88d -->

- [unit u3-replies] 2026-11-14T16:35:06Z — BR6.8 (replies after questions and permissions) may overlap u2's ordering rule in BR5; merge into one rule when both are built.
<!-- aidlc-wave-memory:u3-replies:7dd3cc0e64964e335ac42fd7f79a52a9fe1496613995b8cf01f5eead11c8d525 -->

- 2026-11-14T16:53:18Z — [unit u4-install] Teammates on different app releases: a newer release's files show as edited by hand in an older app, and its Update would downgrade them (visible in the preview). A version marker could fix this later.
<!-- aidlc-wave-memory:u4-install:6e8b9fd1c29bc37b025f944a55dec3eed867536f54cf0d1770700fa65a446d52 -->

- 2026-11-14T16:53:18Z — [unit u4-install] Whether Claude Code accepts `*` as PermissionRequest matcher and reads hooks only at session start should be confirmed on the release Mac in Code Generation.
<!-- aidlc-wave-memory:u4-install:9461e95b4a6cd64f2c747d760a2a30af5a4ec4be564906e0cf3e18e291cf887f -->

- [unit u5-notifications] 2026-11-14T16:52:56Z — the traceability sensor needs an override or a framework fix for ui Units without rules.md; the orchestrator decides.
<!-- aidlc-wave-memory:u5-notifications:7b793047301dc73e80cb0b5ebe87261b639eb00b4a30ea59bc4356605a7d67d4 -->

- [unit u5-notifications] 2026-11-14T16:52:56Z — u2's permission escalation was not readable here; D7 states red after 20 s for permission pages as this Unit's own decision (unit-of-work: AgentDialog "escalation for every kind").
<!-- aidlc-wave-memory:u5-notifications:edd1cd664bde5c7b6f156dcbd84527cf27354bcbbe5b5166385d5f8b013009b0 -->
