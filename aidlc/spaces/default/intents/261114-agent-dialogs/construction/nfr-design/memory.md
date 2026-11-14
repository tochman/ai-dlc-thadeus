<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->


- 2026-11-14T17:44:03Z — [unit u1-questions] ARTIFACT-ONLY run; the questions file has no questions and fixes three points (poll-count liveness, C1 amendment, silent exit). Designing against src/main/pty.js, ipc.js, notify.js, fileWrite.js, projectAccess.js, settings.js as they stand.
<!-- aidlc-wave-memory:u1-questions:44284c35d4c323790f31550b99f1cf28c67e0cbd4189317ced8d67c49d01d9f2 -->


- 2026-11-14T17:44:03Z — [unit u1-questions] R-04 read as a delivery-confirmation problem, not only a timing one: main needs a signal that the hook actually took the answer, so the design adds a `.wait` marker and an atomic take by rename (`.ans` to `.took`); the unlink of `.ans` is the tie-breaker when the outcome is unclear.
<!-- aidlc-wave-memory:u1-questions:1d05f58f5fbd3ca3bdc8308997e4e2432335a81eacd6f05be1155ce60efcb0b0 -->


- [unit u2-permissions] 2026-11-14T18:12:18Z — Q1 A read as: opencode Allow always only when the request carries a non-empty always-pattern list (field name from the recorded fixture); Claude Code Allow always only when every suggestion is addRules (behavior allow) or addDirectories with no unknown key (SD11)
<!-- aidlc-wave-memory:u2-permissions:52d78f06079d91db9323687aaf34be83d228dad6640e570f7e0ac49b4ff8e499 -->


- [unit u2-permissions] 2026-11-14T18:12:18Z — "hook no longer waiting" is u1's .wait marker through u1 RD3 hookWaits; the store's clock never decides it (SD10, RD10)
<!-- aidlc-wave-memory:u2-permissions:444d8f124d1812f4d89bb0380d6f5a31e48de3e5da3a6a25514597e257bb894c -->


- [unit u3-replies] 2026-11-14T18:14:08Z — NFR3.20's "writes by other app features do not count" read in the fail-safe direction of the questions file: drop, type, sequence and the popup fallback all go through pty:write and are started by the person, so they make a reply stale; only the store's own typed answer (never via pty:write) does not (SD10).
<!-- aidlc-wave-memory:u3-replies:fc0f3b4697a87b8c7589e1ed09b6057dbcb24c0fb90b8075f8ed7020cf3c29c1 -->


- [unit u3-replies] 2026-11-14T18:14:08Z — any authentic reply that cannot be shown (over 1 MB with a valid header, not JSON, no last-message field) moves the older reply on with staleReason notShown; forged files get nothing, as u1 RD7 (RD11).
<!-- aidlc-wave-memory:u3-replies:d68eb33395038ad27643c7964ae373e40d5f18a6b6bb3f981e06e549a892cfb0 -->


- [unit u3-replies] 2026-11-14T18:14:08Z — the shared sanitizer did not exist in u1's design; defined here as LC12 src/shared/agentText.js (Cc, Cf except ZWJ, U+2028/2029) for u2, u3 and u5 (SD8).
<!-- aidlc-wave-memory:u3-replies:57cad5ba218b5ac67396f149a90775ac30ac33c59806a928cfbdccad7b0e110b -->


- [unit u5-notifications] 2026-11-14T18:32:33Z — Q1 B keeps D3: permission body is `what` plus the first line of `detail`; NFR3.53's `what`-only narrowing is recorded as superseded (SD52), with the token-on-first-line exposure as an accepted risk.
<!-- aidlc-wave-memory:u5-notifications:7483d4e0b94da5bf29055dd71f2e59aa82d0ececf54d54402bf5c505a9d498d8 -->


- [unit u5-notifications] 2026-11-14T18:32:33Z — C3 fixes no event-id format (the `<digits>-<digits>` shape is C1's file name); the 64-character bound is justified by u1 SD4 instead, plus a store test on minted ids (SD53).
<!-- aidlc-wave-memory:u5-notifications:89e4586521b224f8c845e230e67ed242a31a0b6d063ab890f0b9e41135136e86 -->


- [unit u5-notifications] 2026-11-14T18:32:33Z — NFR6.56 rule chosen: dialog opens over the current view naming the event's project; W2 step 3 amended (PD56).
<!-- aidlc-wave-memory:u5-notifications:5cf4e3b15587fd68e2e29bd817c2189cd0ff8cb7af0883df71c35b7364dd20a2 -->


- [unit u4-install] 2026-11-14T18:34:33Z — ownership is `appKind`: the command runs exactly `.thadeus/hooks/dialog.sh` with one of the four kinds; anything else, also another script in `.thadeus/hooks/`, is not the app's (review R-01, questions file)
<!-- aidlc-wave-memory:u4-install:1932631447a58d070af375359e373fa222d458ea0521ec50bb2dffc2c03b3a76 -->


- [unit u4-install] 2026-11-14T18:34:33Z — "refuse on doubt" made concrete: UTF-8 round trip, BOM off and on, duplicate or escaped keys in walked objects, then prune(stripApp) deep-equal and the classifier on the result, all at preview time (review R-02)
<!-- aidlc-wave-memory:u4-install:dd0fc9698ac31a79d69090bfe0ac80d8aa294ecede958f03db127094265a9ed6 -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->


- 2026-11-14T17:54:06Z — [unit u1-questions] NFR3.3 lists "still .tmp" as a delete case; the design ignores .tmp files instead, since deleting the hook's in-progress file would break a legitimate rename. Folder removal cleans leftovers.
<!-- aidlc-wave-memory:u1-questions:0bf09f488fd5507e2ccf68eff5a5faa8c910a26ed6c1b1f5b04d73fe56e7d749 -->


- 2026-11-14T17:54:06Z — [unit u1-questions] NFR5.2's script-test window ("2 to 3 s" for WAIT=2) becomes 1.0 to 3.2 s, and the real exit window is 594 to 596.1 s: both `date +%s` readings are floored. Intent (out before 600 s) unchanged; the .wait marker covers the early side.
<!-- aidlc-wave-memory:u1-questions:8b37f348cbcb5c5a7fc148d9925f382d5c7b232719aca1c938d51d96e5971a7a -->


- 2026-11-14T17:54:06Z — [unit u1-questions] The opencode plugin names its files <epoch-ms>-<pid> with strictly increasing ms, because its pid is constant per session and seconds-based names would collide; written into the C1 amendment.
<!-- aidlc-wave-memory:u1-questions:8e164d772613d0735ab1a52e01778a3027f3444db825acbbe54f09e7d907fdd4 -->


- 2026-11-14T17:54:06Z — [unit u1-questions] traceability.json also lists NFR1.7, NFR3.11, NFR3.12 and NFR8.1–NFR8.4, which `--write-upstream` did not pick up; the sensor passes with them.
<!-- aidlc-wave-memory:u1-questions:33cf6dda8c8700d3caeb52a699b63859886d506dfc4f98e7377efde974c269ed -->


- [unit u2-permissions] 2026-11-14T18:12:18Z — NFR5.19's "answered event marked failed" carried by u1's .nack marker instead (one failure mechanism, same outcome)
<!-- aidlc-wave-memory:u2-permissions:443ad5136d8239b8141b98bf927269f157f6a17b7c82bae9cb163d296fd6efbe -->


- [unit u2-permissions] 2026-11-14T18:12:18Z — a cut what or cwd also disables both allow choices (stricter than NFR3.16, which names detail only)
<!-- aidlc-wave-memory:u2-permissions:f9e83c2a17e0b9569ce680d19329e33525efe615e316d82b08428d352746f7ab -->


- [unit u2-permissions] 2026-11-14T18:12:18Z — NFR5.14/NFR5.15 bounds taken from u1 RD1 (poll-count liveness 2.0-2.3 s; deadline 594-596.1 s, script test window 1.0-3.2 s)
<!-- aidlc-wave-memory:u2-permissions:707b61b5cbf3d4cf87ee1cb39f8a06cabf2ce0478de904c8d8ac0c9e44a3d057 -->


- [unit u3-replies] 2026-11-14T18:14:08Z — NFR4.5 says "no sleep" and NFR5.24 lists one cat and one mv; RD10 adds a background watchdog subshell with sleep 2 and kill to bound an open stdin (review R-04). Not a wait for an answer; recorded in RD10 and SCD10.
<!-- aidlc-wave-memory:u3-replies:dba366e3539c71901743141d87506eda637e3ec8a05b2688f721cf3b97abac02 -->


- [unit u3-replies] 2026-11-14T18:14:08Z — NFR5.23 "the strip does not change" narrowed: an authentic over-limit reply sets LatestMessage status notShown (review R-01).
<!-- aidlc-wave-memory:u3-replies:00a201489d51c92bb40d509edb9da5d8774967dc220cb27439d7b4c28248d6d5 -->


- [unit u4-install] 2026-11-14T18:34:33Z — a symlinked `.claude/settings.json` is refused, not written through; narrows NFR3.25's first clause, amendment listed in logical-components.md (review R-04)
<!-- aidlc-wave-memory:u4-install:b97afdbc47986f7b31e9dc245779a0ddbeea1fdbc1e976fb385bba52f82248ca -->


- [unit u4-install] 2026-11-14T18:34:33Z — added C4 member `agentHooks.cancel(projectId, previewId)` so Cancel ends the preview in main (review R-05)
<!-- aidlc-wave-memory:u4-install:cc813bc637748749b38eaef586dbf084f12e9e224eef2d89d4e83ed96cdb27a1 -->


- [unit u4-install] 2026-11-14T18:34:33Z — `watchFiles`' isFile pattern must widen to `.sh` and `.js`; today it would treat `dialog.sh` and the plugin as folders and never fire (found in src/main/watcher.js, not in the requirements)
<!-- aidlc-wave-memory:u4-install:22b7e8cc8c19a12b61bf36b5ead23f680176e0e28fdae8a7973a6781d7f30f2e -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->


- 2026-11-14T17:54:06Z — [unit u1-questions] Heartbeat in an inline `worker_threads` worker (eval: true) rather than a main-loop timer: a few lines more, but a main stall no longer looks like "app gone"; no bundler entry needed.
<!-- aidlc-wave-memory:u1-questions:77e2d2963534d4da7aa2d1e75e14e5a85a97619c116b4d226405a7b580d44f91 -->


- 2026-11-14T17:54:06Z — [unit u1-questions] An answer taken but not finished within 1 s is reported as sent (ponytail ceiling); only matters if opencode's local form.reply is slow and then fails.
<!-- aidlc-wave-memory:u1-questions:28424d1547d4fb0e83c32c6a83663f69c0b0effc5abbc434f128c2380ff00ba7 -->


- 2026-11-14T17:54:06Z — [unit u1-questions] An adapter-refused waiting question is handed back at once with an empty answer, so BR1.4's "own picker stays usable" holds without the 595 s wait; BR1.1 refusals get no hand-back because they may be forged.
<!-- aidlc-wave-memory:u1-questions:f201c5907eac0097d88c6734a83cc2702dea237a87b534d0229822b7574dcbe6 -->


- [unit u2-permissions] 2026-11-14T18:12:18Z — 500 ms input guard swallows keys in flight (they reach neither the page nor the terminal); losing half a second of typing beats a stray answer
<!-- aidlc-wave-memory:u2-permissions:e84ab1287d7c6ae85d277ec1f6870521107351b48def79154abc3308a2bcea88 -->


- [unit u2-permissions] 2026-11-14T18:12:18Z — unknown suggestion keys or types drop Allow always rather than guess; a newer Claude Code loses the dialog's Allow always until fixtures are re-recorded
<!-- aidlc-wave-memory:u2-permissions:70efcfdc17ae763ded87c3bb36b956078409b7b31092c7ec2357701fff6ca1e7 -->


- [unit u2-permissions] 2026-11-14T18:12:18Z — residual permission.reply window (R-06) accepted: opencode applies the first decision; replied-during-reply test
<!-- aidlc-wave-memory:u2-permissions:0ea04af82f88f564081568853bc500a43a666f4ce7afee7b6823f0a7751341fb -->


- [unit u3-replies] 2026-11-14T18:14:08Z — text and Enter in one writeSession call by default (the app already does this via withEnter for agent tabs); 30 ms separate-Enter fallback only if the NFR2.5 run shows a stray newline (RD13).
<!-- aidlc-wave-memory:u3-replies:aea6f7d87d70a918e973449ba9cd81d9ea730c43af4bd7e21f62e0937552dad2 -->


- [unit u3-replies] 2026-11-14T18:14:08Z — classifier is content-only in main; Shift/Ctrl-F3 share CPR's form and leave a reply shown. Accepted (no effect in either TUI), ponytail note with the DSR-correlation upgrade (SD10).
<!-- aidlc-wave-memory:u3-replies:71022535485b48ca8e0d5ee31d89cfb5917c507bc545635617d4952f72359e3b -->


- [unit u3-replies] 2026-11-14T18:14:08Z — a watchdog-cut Stop copy is still published so main refuses it and RD11 moves the older reply on, rather than leaving it answerable.
<!-- aidlc-wave-memory:u3-replies:5b61301117eb1389345ae370850530ce1a22298963bc00d4d46b5a022b525d15 -->


- [unit u5-notifications] 2026-11-14T18:32:33Z — one sanitizer module `src/shared/agentText.js` for u1, u2, u3, u5: u2's `visibleText` moves into it and u3's `escapeUnsafe` becomes `visibleText(s, { multiline: true })`; removing functions keep ZWJ, the escaping one shows it.
<!-- aidlc-wave-memory:u5-notifications:dc4e83e6542362435c341af180e29fee499a8932d7e75d664e7badcb8ac46fd3 -->


- [unit u5-notifications] 2026-11-14T18:32:33Z — decided set kept at 500 but refreshed on each re-offer, so a pending audit question only falls out if 500 other ids are decided between two recomputes of its project (R-04).
<!-- aidlc-wave-memory:u5-notifications:2897be27e477a6251867019b8c0115b957053d3eb0e75f7fa1c9b3757dc7f8df -->


- [unit u5-notifications] 2026-11-14T18:32:33Z — overdue screen-reader cover: one polite `role="status"` announcement per shown page rather than none (R-06).
<!-- aidlc-wave-memory:u5-notifications:ab161282b5f7426681425a443f4edb762bb38dd126df5fb8f533436a25c14ae8 -->


- [unit u5-notifications] 2026-11-14T18:32:33Z — Linux body escapes `&`, `<`, `>`; a daemon without markup would show entities literally (ponytail limit).
<!-- aidlc-wave-memory:u5-notifications:6a8744302911a7635296075957e0eb865af8cf9274d33d050a5096293115131d -->


- [unit u4-install] 2026-11-14T18:34:33Z — accepted, not built: removal of a pre-existing empty `.thadeus/` (git does not track empty folders), the 4-byte `{}` file left after Install then Remove on the no-file fixture, and the check-to-rename link swap by the same OS user
<!-- aidlc-wave-memory:u4-install:51f1b4a1de2a9b4ff6b63cbd8adad82cf870e08faa7c26bfb412edc2ccb44ce5 -->


- [unit u4-install] 2026-11-14T18:34:33Z — final compare moved inside `writeAtomic` just before rename; the 50 ms bound becomes a tolerance and the call-order test is the real check (review R-03)
<!-- aidlc-wave-memory:u4-install:1bd5cddf8369a43744b7b2b80080f3a0496414def23f24ae380cd6d11b5d4ac2 -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-11-14T17:54:06Z — [unit u1-questions] Code Generation confirms that a sandboxed preload sees `additionalArguments` in `process.argv` (OD1's timing flag); a preload test is named for it.
<!-- aidlc-wave-memory:u1-questions:3e953332284bdef21828d9dbb8bd6ee4eb0b9bfcb016238fe2211e7a5dd65361 -->

- 2026-11-14T17:58:09Z — [unit u1-questions] Carried to Code Generation from the design review (Major): under dash a failed redirect on the special builtin `:` exits 2 before `|| exit 0` runs (RD4 `: > "$a.wait"`); write markers with a non-special command or check `[ -d answers ]` first, and keep the dash test for a missing `answers/`.
<!-- aidlc-wave-memory:u1-questions:5614c7ce1d2e566672a70edab49db858506ea320d1685de48f51e6806b87b32b -->

- 2026-11-14T17:58:09Z — [unit u1-questions] Carried to Code Generation from the design review (Major): RD6's start-up wipe of the channel root would destroy a second running instance's live sessions; add `app.requestSingleInstanceLock()` or scope the wipe to this instance's own folders. Minors to fold in: poll loop gives ≥1.9 s (read `last` inside the loop), `sleep 0.1` is not POSIX (check both shells), C1 amendment's `refusals` and `other_versions` lines are stale and the 600 s entry timeout belongs in C1, open event files with O_NOFOLLOW, ignore `alive`/`alive.tmp` in the watcher.
<!-- aidlc-wave-memory:u1-questions:e34335f65b1253895b37f80b91791646d88834909500036ddb96dbd821777446 -->

- [unit u2-permissions] 2026-11-14T18:12:18Z — the traceability tool does not extract NFR1.12, NFR3.20, NFR3.21, NFR8.6 from the u2 requirements; they are designed in OD5, OD7, OD8, OD9 but not in traceability.json
<!-- aidlc-wave-memory:u2-permissions:fae7ee8333dfaa5dd83a9492dd51392ecf421f3bfb4cec200ef9b265fccaeab4 -->

- [unit u2-permissions] 2026-11-14T18:12:18Z — opencode always-pattern field name (expected `always`) and Claude Code suggestion shapes to confirm from recorded fixtures before the adapter is written
<!-- aidlc-wave-memory:u2-permissions:a31433b50eb55d9359f8e47c5e47a9691edb9bc62dc62c2c9aa43b67e4bffe5a -->

- [unit u3-replies] 2026-11-14T18:14:08Z — RD13's harness facts table (chosen write, stray newline) is filled by the NFR2.5 manual run before the release pull request.
<!-- aidlc-wave-memory:u3-replies:470201d94c7abe1441e97eb61ccf94c856c6d3f887af2e4a6453e7e33cbb6bbb -->

- [unit u3-replies] 2026-11-14T18:14:08Z — the traceability tool's upstream list omits NFR1.12, NFR3.22, NFR3.23 and NFR8.5–NFR8.7; they are designed in OD5, OD7, OD8 and OD9 all the same.
<!-- aidlc-wave-memory:u3-replies:8ce244fa5d215ad2a11cbe5efe150c3dc086e0b3bcd90cae77ef6a974611569a -->

- [unit u4-install] 2026-11-14T18:34:33Z — Claude Code 2.1.325 deduplication not run here; added as a step of the NFR8.9 manual run (RD44)
<!-- aidlc-wave-memory:u4-install:f9ea4a9f00ef4545ab92ce96533935ff0044759b803b553f86f1d7525f080976 -->

- [unit u4-install] 2026-11-14T18:34:33Z — u1-questions RD4 still has `: > "$a.wait"` (u1 design review R-01); u4's RD31 tripwire fails until u1 fixes it
<!-- aidlc-wave-memory:u4-install:06011dca1b3316a8ba4f68580524dc72c838de5a886b61775b08f9d4aff61477 -->
