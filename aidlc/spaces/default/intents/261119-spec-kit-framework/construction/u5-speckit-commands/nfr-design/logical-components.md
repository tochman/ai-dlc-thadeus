# Logical Components: U5 u5-speckit-commands

Sources: `performance-design.md` and `security-design.md` in this folder, `tech-stack-decisions.md` in `../nfr-requirements/`, and the U5 `functional-spec.md` and `frontend-components.md`. Everything runs inside the one Electron app; the only failure domain is one button.

| Component | Process | Responsibility | NFRs it carries |
|---|---|---|---|
| `src/shared/speckitCommands.js` | shared (pure) | `speckitCommand`, `nextCommand`, `specifyText`; the one place that knows the command form | NFR4.2, NFR4.3, NFR7.3, NFR8.1 |
| `SpeckitCommandButton.jsx` (new) | renderer | LCARS pill; ready or disabled with reason; `sending` guard; one `type` call with Enter; failed-send note | NFR2.1, NFR4.4, NFR6.1, NFR7.2, NFR7.4, NFR8.2 |
| `SpeckitQuickCommands.jsx` (new) | renderer | Core four, extension commands, specify field; reads `speckit:rules` on mount and on `speckit:changed` | NFR1.1, NFR5.1, NFR7.1 |
| `SpeckitFeatureDetail.jsx` (changed) | renderer | Next-command button for the active feature, the not-active note, the converge note | NFR1.1, NFR7.1 |
| `SpeckitFeatures.jsx`, `SpeckitRules.jsx` (changed) | renderer | Hard-coded `SPECIFY` and `RUN_CONSTITUTION` replaced by `speckitCommand` | NFR8.3 |
| `TerminalContext.jsx` `type` (unchanged) | renderer | Writes the text and Enter to the agent tab's pty | NFR4.1 |

Blast radius: a failed send or a failed rules read shows a note on that button or bar only; the features list, the rules view and the terminal are unaffected. Nothing U5 does writes to disk.

Shared with other Units: U6's `speckit:features` data and `speckit:changed` push, and U7's `speckit:rules` result, both read only; `sv.json` and `en.json` gain `speckit.commands.*` keys.
