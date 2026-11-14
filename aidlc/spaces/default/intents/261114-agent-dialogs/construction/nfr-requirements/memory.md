<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->


- [unit u1-questions] 2026-11-14T17:02:30Z — ARTIFACT-ONLY run; the questions file has no questions, so the targets are NFR1–NFR8 from requirements.md split into NFRx.y rows, each with its check (test, recorded payload, or the manual run on the release Mac).
<!-- aidlc-wave-memory:u1-questions:5f64cd6c63e045290893f1df4bba87832299fed130df6bb57503e72b2da3a1b1 -->


- [unit u1-questions] 2026-11-14T17:07:27Z — NFR1's "keys reach the pty within 1 s of the click" read for the hand-back path as 1 s from the later of click and picker seen, since C2 allows up to 3 s for the picker to show (NFR1.3).
<!-- aidlc-wave-memory:u1-questions:2ba69d42a2d4e06289eaed8eae7b275b83a25b049c6825a9d920f7e0222b906f -->


- [unit u1-questions] 2026-11-14T17:07:27Z — THADEUS_WAIT_SECONDS read as the full wait (595), with the 5 s margin applied once in main; C1's "minus 5 s" would otherwise apply it twice (NFR5.2).
<!-- aidlc-wave-memory:u1-questions:d08645690bbc93eaf459721486c6d132c7e72615d077c1104316a862700c55e6 -->


- [unit u1-questions] 2026-11-14T17:07:27Z — NFR2 scenarios 6 and 7 left to u2 and u3, per the stories' scenario table; this Unit covers 1–5 on both harnesses.
<!-- aidlc-wave-memory:u1-questions:58915dda0dcabe47967b11a51a5faa6d61d8486af8f600ed0034bad9f9e975c4 -->


- 2026-11-14T17:18:47Z — [unit u2-permissions] numbered u2's detailed NFRs after u1's (NFR1.8+, NFR3.13+, NFR5.13+ and so on) so every NFRx.y ID is unique in the intent and "as u1 NFRx.y" references cannot be confused.
<!-- aidlc-wave-memory:u2-permissions:80d89d49719b3e19c646e54a0742e2b4e243c97c485389747a939ab9f802a1b4 -->


- 2026-11-14T17:18:47Z — [unit u2-permissions] stated the four u1 review corrections (R-01 liveness, R-02 wait variable and order, R-03 silent exit, R-07 dash tests) as assumed targets in u2 rows (NFR5.14, NFR5.15, NFR5.22, NFR4.5, NFR8.5); their design stays with NFR Design.
<!-- aidlc-wave-memory:u2-permissions:303c450360413e5870541ebdb6b2929841d915abc4387b890f79d73df3efade9 -->


- [unit u3-replies] 2026-11-14T17:14:56Z — NFR1's 1 s is written for questions, permission prompts and keys reaching the pty; applied the same 1 s to reply appearance and typed delivery rather than inventing a number (NFR1.8, NFR1.9).
<!-- aidlc-wave-memory:u3-replies:c12fe64bafd6e5a943899139413a69f0306693904437542dac8d786f52855808 -->


- [unit u3-replies] 2026-11-14T17:14:56Z — sub-IDs continue after u1's (NFR1.8, NFR3.13, NFR5.13 …) so cross-Unit citations do not clash; u1 rows are reused by id, not restated.
<!-- aidlc-wave-memory:u3-replies:8510f814292be5a9cd2993689f3aed241d71dbdec4fa15f51247452882d69c2a -->


- [unit u5-notifications] 2026-11-14T17:30:20Z — ui Unit: wrote performance, security and tech-stack files only, as the stage's produces_kinds sets; the one reliability concern (a failing notification must not stop the event) is NFR5.50 in the performance file.
<!-- aidlc-wave-memory:u5-notifications:1bbf328c9be5883e5749758e56a96be1769b1fbf46c2b778029cbc43d733f317 -->


- [unit u5-notifications] 2026-11-14T17:30:20Z — sub-IDs start at .50 in every group: u2 and u3 already share NFR1.8–NFR1.12 and more, and u4 has not numbered yet, so a fixed block avoids a third clash. Tech decisions are D50–D54 for the same reason.
<!-- aidlc-wave-memory:u5-notifications:0e64e76f5ca1f7f479dbc99e930ebed3f8d5964ffa5956c7a76135acb7db8bf1 -->


- [unit u5-notifications] 2026-11-14T17:30:20Z — FD review R-01 to R-05 resolved as rows: R-01 NFR6.56 (never switch project on arrival; open-over-current recommended, final rule for NFR Design), R-02 NFR6.57 (project marker button), R-03 NFR6.58 (clicked page shown at once, others keep order), R-04 NFR1.56 and D51 (cap 500), R-05 NFR3.54 and D53.
<!-- aidlc-wave-memory:u5-notifications:0f1086bef8fa1e031df6eda3e6ef74de183d7da044c34e34d5f924a176ffa69f -->


- [unit u4-install] 2026-11-14T17:34:21Z — ARTIFACT-ONLY run, no questions; targets carried from NFR1, NFR3–NFR8, with sub-IDs that continue after the highest u1–u3 numbers (NFR1.14, NFR3.24, NFR4.9, NFR5.25, NFR6.7, NFR7.5, NFR8.8). NFR2 is N/A: no answer passes through the installer.
<!-- aidlc-wave-memory:u4-install:af1b22e32c9031d7cd7576e8ba72a5077f85edd8d0f977bcb634d0f0b3e4c150 -->


- [unit u4-install] 2026-11-14T17:34:21Z — NFR1 read for this Unit as "the installer never costs the dialog's latency": isCurrent is in-memory (NFR1.14), and status detection on open or change is bounded (NFR1.15, NFR1.16).
<!-- aidlc-wave-memory:u4-install:b3d5bd282d99216e8ff0cf011c27e8cf7e6dcfc1074366191b6be137dca24aec -->


- [unit u4-install] 2026-11-14T17:34:21Z — FD review R-01 to R-03 resolved here: preview state per apply outcome (NFR5.32, changedSincePreview → superseded, partiallyWritten → refused); a file with a reason shows no Install/Update/Remove (NFR5.31); kind extraction rule with test rows (NFR5.30).
<!-- aidlc-wave-memory:u4-install:9861cadc95453fa8223a325bfd28fc4bffbbdea3f24519732cb1cf5af3d44f2f -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->


- [unit u1-questions] 2026-11-14T17:07:27Z — event file names are <epoch-s>-<pid>.evt, not the functional spec's <ms>-<pid>-<rand>: POSIX sh on macOS has no ms clock or $RANDOM; arrival time comes from mtimeMs in main (tech-stack D3).
<!-- aidlc-wave-memory:u1-questions:1204b1d79d85ef615641c0b58cffad39dbc560b3276613ff91ee6dcb9c6890e7 -->


- [unit u1-questions] 2026-11-14T17:07:27Z — opencode plugin as .js, not the spike table's .ts; repo has no TypeScript and C6 already says .js (tech-stack D4).
<!-- aidlc-wave-memory:u1-questions:936dec45afce19be44e1534cca254d036e2edac227de2de6a2924b1e49edb710 -->


- [unit u1-questions] 2026-11-14T17:07:27Z — NFR6 and NFR7 placed in performance-requirements.md (the ui-side file); the stage's five files have no usability file.
<!-- aidlc-wave-memory:u1-questions:7b1b8c2f3508d60d9e017f8f9b4d10091bf632d6df272b24eb98c690adf98cc7 -->


- 2026-11-14T17:18:47Z — [unit u2-permissions] NFR3.16 widens BR5.5's escaping from control characters to Unicode bidi and zero-width format characters (Trojan Source style hiding in commands); the functional rule should pick this up.
<!-- aidlc-wave-memory:u2-permissions:98c2e337e3ba97db0a720a74fea2cfba337f7abfbc5070c21b9d5c3c25fc0198 -->


- 2026-11-14T17:18:47Z — [unit u2-permissions] NFR5.14's hand-back window is 2.0–3.5 s, per the corrected 1 s liveness rule; FR6.3's "within 2 seconds" is read as "gone after a 2 s gap".
<!-- aidlc-wave-memory:u2-permissions:68154efd5266b54304f9ff0b605e0768f775808d09b95c4a5603a070f56be2e0 -->


- [unit u3-replies] 2026-11-14T17:18:53Z — a Stop payload over C1's 1 MB limit is refused, not cut to 64 KB as FR6.2 reads; the script cannot cut without parsing JSON (D8, NFR5.23). Recorded as a known limit for the gate.
<!-- aidlc-wave-memory:u3-replies:a3e1c813357afee1e3532a7e06706e206cdd8a9211463c6c5fd0f7fa63e12e16 -->


- [unit u5-notifications] 2026-11-14T17:32:44Z — NFR3.53 narrows D3's permission body to `what` only, dropping the first line of `detail`, because a command line is where a token most likely sits; flagged for the gate.
<!-- aidlc-wave-memory:u5-notifications:cfebaaddbc494497974be0e3926bfaae17d32f1c1c5cce2ee2f43cf08c332fa3 -->


- [unit u4-install] 2026-11-14T17:34:21Z — plugin path is .opencode/plugins/thadeus-dialog.js, not the FD's .ts, following u1 D4, C6 and u2/u3 (tech-stack D4); the FD's functional-spec, BR7.3, BR7.13 and entities still say .ts.
<!-- aidlc-wave-memory:u4-install:046527fac86ba5330b027b4710359c5d1a71d30c801fdbcb84114bfcd69d03e5 -->


- [unit u4-install] 2026-11-14T17:34:21Z — the FD state machine's "changed since preview → refused" arrow is replaced by NFR5.32's table (→ superseded), which matches BR7.14 and W6.
<!-- aidlc-wave-memory:u4-install:132f3020fcbb450f30598feb785e2ce51b4f9ec63faed73199542f9ccf9c06ae -->


- [unit u4-install] 2026-11-14T17:34:21Z — NFR6 and NFR7 placed in performance-requirements.md, as u1 did; the stage has no usability file.
<!-- aidlc-wave-memory:u4-install:bf6a608919a38ed8a84471f6e9dd065466e529b33805a34d5926421b07a0c2d9 -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->


- [unit u1-questions] 2026-11-14T17:07:27Z — liveness by alive-file content change instead of stat (macOS and Linux stat flags differ); wait deadline by date +%s instead of poll counting (counting drifts past the 600 s timeout).
<!-- aidlc-wave-memory:u1-questions:3fe08301b43eec0fd24d0ad0a54c94b6333f26c82db343a541284438286c70e3 -->


- [unit u1-questions] 2026-11-14T17:07:27Z — time-based script tests carry 0.5 s slack (NFR5.1 2.0–2.5 s, NFR1.5 300 ms) so CI on ubuntu-latest is not flaky; the slack is a check tolerance, not a new target.
<!-- aidlc-wave-memory:u1-questions:ae4664957e56c718df7b73a1e2aa5854ce901175d2f4b39c2d5e74e6f88180f8 -->


- [unit u3-replies] 2026-11-14T17:18:53Z — opencode idle handler does not await ctx.session.context (D9): never holds opencode, at the cost of one pending promise if a read hangs.
<!-- aidlc-wave-memory:u3-replies:8325d4efd13c81afb6046261b7cd8f531f9156812f737fa2871d9a833e086753 -->


- [unit u4-install] 2026-11-14T17:34:21Z — own span finder with a JSON.parse + deep-equal post-check over adding jsonc-parser (D3): no new dependency, and a scanner bug becomes a refusal, never a damaged file; jsonc-parser is the upgrade path if comments must be kept.
<!-- aidlc-wave-memory:u4-install:7b1f1ae6521de7d74af65b081f2bd71566b1a710f433e43f9a9d146aa231cd48 -->


- [unit u4-install] 2026-11-14T17:34:21Z — atomic write moved into a shared writeAtomic helper rather than bypassing writeFileSafe's engine-owned rule (D1); no fsync, same as the editor, named as an accepted limit.
<!-- aidlc-wave-memory:u4-install:9b57d702ce43f40eb5e9e0ec3fac067e8b8695be29281c028988848e95d932a4 -->


- [unit u4-install] 2026-11-14T17:34:21Z — time-based test bounds (200 ms status, 300/500 ms preview/apply, 1.5 s change push) set about 10x the expected cost so CI does not flake; they are check tolerances, not speed promises.
<!-- aidlc-wave-memory:u4-install:c3f0d9f453efd77960ec32f8dacea0cd980d76ed8995741fd13cdf259910b9d8 -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- [unit u1-questions] 2026-11-14T17:07:27Z — whether 3 s is enough for the picker to show after a hand-back (C2 open question) is settled by the manual run on the release Mac (NFR1.3).
<!-- aidlc-wave-memory:u1-questions:e8be02f37efdd09011166298680f70f6b0db2280eec08afcc4234ed069b8895c -->

- [unit u1-questions] 2026-11-14T17:07:27Z — node:fs in opencode's plugin runtime is inferred, not documented; the manual opencode run confirms it (NFR5.7).
<!-- aidlc-wave-memory:u1-questions:c74b8d9be3a9656c450effb1f0bd6d486b5c2ce95da380704c84bd96d192ea12 -->

- 2026-11-14T17:18:47Z — [unit u2-permissions] NFR1.13 adds an `agentConfirmed` timing stamp so opencode's NFR1.10 is measurable; NFR Design to confirm the shape with u1 NFR1.6.
<!-- aidlc-wave-memory:u2-permissions:3cb17d398eaa12c6997cabd35f5ce65d72594824ca29a0a594a22650db965b1f -->

- 2026-11-14T17:18:47Z — [unit u2-permissions] gates before Code Generation: deny with `interrupt: true` (D8, NFR2.5), opencode `permission.asked` fixtures (D9), and the Allow always label for suggestions without rule text (FD review R-03, NFR3.17).
<!-- aidlc-wave-memory:u2-permissions:88a1ac5f753321390b3f942e8c1ca4ef26ebe7b244985ea4064b55fc012293b2 -->

- [unit u3-replies] 2026-11-14T17:18:53Z — u3 FD review R-01 (what counts as the person's terminal input) and R-02 (text plus Enter in one write) are still open in rules.md; stated as checkable targets (NFR3.20, NFR2.5, NFR5.15) for NFR Design to settle.
<!-- aidlc-wave-memory:u3-replies:f4a72b5615a2623c4f5f7c637a2cfcc05a10b3bcd55a9e5b7bde862b0ec49e16 -->

- [unit u5-notifications] 2026-11-14T17:32:44Z — for NFR Design: whether the dialog opens over another project on arrival (NFR6.56, tied to u1's per-project `agentEvents.list`); the Linux markup method (NFR3.57); whether the Settings view counts as "not showing the event's project" for D2 (today `setActiveProject` keeps the project id while Settings is open).
<!-- aidlc-wave-memory:u5-notifications:91475af119ec88f8b61c21bfc0e630816ab00daec62cd31389ff88f3238ce40d -->

- [unit u4-install] 2026-11-14T17:34:21Z — for NFR Design: confirm Claude Code 2.1.325 deduplicates identical hook commands across settings files (accepted risk for copies in settings.local.json or user settings, FD review R-04).
<!-- aidlc-wave-memory:u4-install:95c4024e01245668b45fd780690920463338a486d1c817585a1155dfde0727b4 -->

- [unit u4-install] 2026-11-14T17:34:21Z — for NFR Design: record the concurrent-write window (≤ 50 ms between the last digest compare and the rename, NFR5.27) and its recovery through the watcher; no cross-process lock exists.
<!-- aidlc-wave-memory:u4-install:61f62d0aea294ba04fe166146a8756bf721c1d8ea41e81b1bb8eea09ca5b0c2d -->

- [unit u4-install] 2026-11-14T17:34:21Z — for NFR Design: resolveInRoot needs an existing path (fs.realpath), so new files and folders are checked through their deepest existing folder (NFR3.24).
<!-- aidlc-wave-memory:u4-install:c2acf4b4e514908fa29b5c3ab4c419f74eb3d6077f3defe65fb4882ee8e3f78a -->
