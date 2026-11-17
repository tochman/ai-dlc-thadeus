# Code Summary: US-0210 model profile switch

All 15 plan steps done, TDD (Red recorded before each Green). Nothing committed.

## Files

- New: `src/main/modelProfiles.js`, `src/renderer/ModelProfilesSection.jsx`, `src/renderer/ProfileSwitchDialog.jsx`, `tests/main/modelProfiles.test.js`, `tests/renderer/ModelProfilesSection.test.jsx`, `tests/renderer/ProfileSwitchDialog.test.jsx`
- Changed: `src/main/modelChoice.js` (`from` → `--from`, `data.profiles` passed through), `src/main/settings.js`, `src/main/ipc.js`, `src/preload/index.js`, `src/renderer/ProjectSettingsView.jsx`, `src/renderer/ProjectView.jsx`, `src/shared/locales/sv.json`, `src/shared/locales/en.json`, `tests/main/settings.test.js`, `tests/main/modelChoice.test.js`, `tests/main/ipc.test.js`
- Docs: US-0210 set to 🚧 In progress in `docs/features/epic-02-cost-and-models.md` and `docs/FEATURES.md`

## Key decisions

- A save merges `modelProfiles` key by key; the view never sends `active`. Only main writes it, after every command of a switch succeeded (FR4.3).
- A switch builds all commands first; a model outside the harness table means nothing runs. Then they run in order and stop at the first failure.
- A critical intent that starts while critical is already active joins the switched-for set without a question; the switch back waits for the last one (FR3.1).
- No separate "declined" list: an intent is asked once, and a declined or failed one never joins the switched-for set (FR2.3, FR3.3).
- Switch back without "ask first": main still sends the ask marked as needing no confirmation; the dialog runs it at once and shows the output, because only the renderer knows the agent tab's harness (FR5.1).
- After a switch main also sends `features:changed`, so the section shows the new active profile.

## Tests

- Scoped command from `unit-test-instructions.md`: 7 files, 133 tests passed, 30 of them new.
- Red runs: settings 2 failed; business logic 16 failed; ipc 5 new failed (2 older ones failed only from unused queued fakes, green after); renderer suites failed to load (components missing).

## Not run in this stage (for Build and Test)

- Nearby existing tests: `AppShell.test.jsx` (the arm has a fifth section), `ProjectSettingsView.test.jsx`, ProjectView-related tests.
- ESLint and Prettier (one long assertion line in `tests/main/settings.test.js` may need reformatting).
- 80% line coverage on the full suite.
- NFR3 (question within 2 s): manual check.

## Deviations from the plan

- `ipc.test.js` fakes `runProfile` whole (the file already mocks `modelChoice.js`); real running and stop-on-failure are tested with a fake `exec` in `modelProfiles.test.js`.
- Three extra ipc tests: asked once and not for intents open at start; No runs nothing; the `modelProfile:saved` handler.
- New keys `modelProfiles.yes`/`no`; a bad profile name reuses `errors.invalidValue`.
