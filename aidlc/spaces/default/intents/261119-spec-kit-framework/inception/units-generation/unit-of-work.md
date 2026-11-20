# Units of Work: EPIC-14 Spec Kit

One Unit per story (Q1). Each Unit is one branch and one squash-merged pull request. All Units ship together in one desktop app as v0.3.0, the *embedded* deployment model. Sources:
- `requirements.md` (FR/NFR);
- `stories.md` (US1.1–US5.2);
- the code KB (`architecture.md`, `component-inventory.md`).

Domain Design was skipped, so the boundaries come from the code KB's components.

| Unit ID | Directory | Story | Kind | Size |
|---|---|---|---|---|
| U1 | u1-framework-views | US1.1 (US-1401) | ui | L |
| U2 | u2-framework-file | US1.2 (US-1408) | library | S |
| U3 | u3-speckit-setup | US2.1 (US-1405) | ui | M |
| U4 | u4-framework-choice | US2.2 (US-1406) | ui | M |
| U5 | u5-speckit-commands | US3.1 (US-1403) | ui | M |
| U6 | u6-speckit-features | US4.1 (US-1402) | ui | L |
| U7 | u7-constitution | US4.2 (US-1404) | ui | S |
| U8 | u8-framework-switch | US2.3 (US-1407) | ui | M |
| U9 | u9-feature-token-log | US5.1 (US-1409) | library | M |
| U10 | u10-speckit-agent-status | US5.2 (US-1410) | ui | M |

## Responsibilities and notes

- **U1 u1-framework-views.** Owns the `framework` value and the single list of views per framework. Replaces every use of `detection.isAidlc` in `ipc.js`, `menu.js`, `App.jsx` and `ProjectView.jsx`. Adds the fallback detection, and opencode detection for Spec Kit. Includes an empty Spec Kit view shell in the left arm, which later Units fill. The AI-DLC path must stay exactly as it is.
- **U2 u2-framework-file.** Reads `.thadeus/project.json` and writes it atomically. Reports unknown or unreadable files with the reason. The write happens only after a confirmed preview.
- **U3 u3-speckit-setup.** Finds `specify` on the login shell's `PATH` and runs `specify init --integration <harness>` through the existing exec runner: fixed arguments, no shell, with a timeout. Shows a preview first and the output after. Mirrors the AI-DLC setup (US-0503).
- **U4 u4-framework-choice.** The first-open screen: what was found (frameworks, CLIs), the proposal, the choice, then saving through U2 and handing off to setup (U3 or US-0503).
- **U5 u5-speckit-commands.** Works out the next `/speckit-*` command from the feature status (U6) and offers the quick commands, including extension commands from U7's reader. Sends them to the agent terminal through the existing terminal control, formatted for the harness.
- **U6 u6-speckit-features.** The read-only parsers for `specs/*`, `feature.json` and `tasks.md`, the watcher paths, and the features list and detail view. Every file opens in the artifact reader.
- **U7 u7-constitution.** The constitution view, and the extensions/hooks list read with the new `yaml` dependency.
- **U8 u8-framework-switch.** The switch in project settings: a preview naming the work in progress, the setup run when one is needed, then the file write through U2. The file is written only after the setup succeeds.
- **U9 u9-feature-token-log.** Credits readings from the coding tool's session records to the active feature, or to the project-wide bucket, under `.thadeus/tokens/`.
- **U10 u10-speckit-agent-status.** The waiting popup and agent progress for Spec Kit: hook events plus `tasks.md` counts. Fixes the throw in `agents:progress`.

Cross-cutting, in every Unit:
- every text through `t()` in `sv`/`en`;
- the LCARS look;
- no writes in `.specify/` or `specs/`;
- test first, and 80% coverage.
