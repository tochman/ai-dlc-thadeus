# Tech Stack Decisions: U5 u5-speckit-commands

Sources: `technology-stack.md` (code KB), NFR1, NFR2 and NFR8 in `requirements.md`, contract C7 in `contract-summary.md`, and the U5 `functional-spec.md` and `rules.md`. No new dependency.

| ID | Decision | Why |
|---|---|---|
| NFR8.1 | `speckitCommand(harness, name, args)`, `nextCommand(feature)` and the description cleaner are pure functions in one new shared module (`src/shared/speckitCommand.js`), so main-side tests need no DOM. | C7 has one owner and one place that knows the form (BR5.1) |
| NFR8.2 | Commands reach the agent through the existing `useTerminal().type('agent', text, { submit: true })` in `TerminalContext.jsx`; no new IPC channel or terminal path. | BR5.7, NFR4.1; the other quick commands already use it |
| NFR8.3 | The next-command button lives in the existing feature detail of `SpeckitFeatures.jsx`, and the quick bar beside it; the two hard-coded strings (`SPECIFY`, `RUN_CONSTITUTION`) are replaced by `speckitCommand` (BR5.9). | Smallest change; opencode gets its own form |
| NFR8.4 | Tests are vitest: `main` project for the pure functions; `renderer` project (jsdom, Swedish locale) for the buttons, their disabled reasons and the click. Tests are written first; 80% line coverage holds. | NFR8, team practice |
| NFR1.1 | Every text, the disabled reasons, the converge note and the active-feature note included, goes through `t()` with ICU placeholders, with the same keys in `sv.json` and `en.json`. The command text itself is not translated. | NFR1, `i18nKeys.test.js` |
| NFR2.1 | The buttons and quick bar use the LCARS button styles of the Specs view (`btn`, `btn-accent`); a disabled reason shows in the existing small label style. | NFR2, project rule |
