# Security and Quality Requirements: U9 u9-feature-token-log

Sources: NFR1–NFR8 in `requirements.md`, contract C8 in `contract-summary.md`, the U9 `functional-spec.md` and
`rules.md` (BR1.1–BR4.1), and answers Q1–Q2 in `nfr-requirements-questions.md`. No login, network call or secret is
involved. The threats are paths taken from hook events and files, and writes outside the token log.

| ID | Requirement | Measure |
|---|---|---|
| NFR3.1 | U9 writes nothing under `.specify/` or `specs/`; its only project writes are `.thadeus/tokens/speckit-*.json` (FR9.3, BR3.1). | Test with a spy on fs writes: zero calls under `.specify/` or `specs/`; every write path matches `.thadeus/tokens/speckit-*.json` |
| NFR3.2 | A transcript path from a Stop event is read only when it resolves inside `~/.claude/projects` (`insideDir`); otherwise the turn is skipped and logged (BR1.2). | Tests: path outside, `..` path, symlink out |
| NFR3.3 | A bucket key that fails the name check, or a feature folder named `project`, `cursor` or similar reserved word, goes to `speckit-project` so it cannot overwrite the project-wide bucket (BR3.1). | Tests: `../x`, `project`, a valid `001-login` |
| NFR3.4 | `.thadeus` or `.thadeus/tokens` that is a link out of the project refuses the write (`resolveInRoot`), logged, cursor kept (BR3.2). | Test with a symlinked `.thadeus` |
| NFR3.5 | The session cursor lives in the app's user data, keyed by project root and session; it holds message ids and counts only, no message text. | Test: cursor file holds no text fields |
| NFR3.6 | Calls already in a session before the app first sees it go to `speckit-project`; only calls from the first seen turn on go to the active feature (Q1). | Test: transcript with 3 earlier calls and 1 new: 3 in project, 1 in feature |
| NFR6.1 | Both harnesses log (Q2): the app's opencode plugin (`.opencode/plugins/thadeus-dialog.js`) sends the assistant message id, output, input, cache read and cache write per usage event; the adapter passes them on. An event without them is ignored, not guessed. | Plugin and adapter tests: full event credited; event without id ignored |
| NFR6.2 | A re-sent opencode message, and a Claude call whose usage grows between turns, add only their increase (BR1.2, BR1.3). | Tests: same id sent twice with growing counts |
| NFR8.1 | Test first; the new module and the plugin each hold 80% line coverage; ESLint, Prettier and gitleaks green. | CI |
| NFR1.1 | Log and error lines are console only; no new user-facing text, so no new `t()` keys (Q3 of Functional Design: log files only). | `i18nKeys.test.js` unchanged |

Not in this Unit: NFR2 (no view), NFR4 (no CLI run), NFR5 (reads `feature.json` through U6's reader, which owns the
version check), NFR7 (no view to refresh).
