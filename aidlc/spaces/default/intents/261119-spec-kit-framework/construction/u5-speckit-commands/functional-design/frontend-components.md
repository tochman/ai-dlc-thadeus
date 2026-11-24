# Frontend Components: U5 u5-speckit-commands

LCARS look and arm navigation (NFR2); every text through `t()` with keys in `sv.json` and `en.json` under `speckit.commands.*` (NFR1). Behaviour is in `functional-spec.md`, rules in `rules.md`.

| Part | Where | What it does |
|---|---|---|
| `src/shared/speckitCommands.js` | shared, pure | `speckitCommand(harness, name, args)` (C7, BR5.1), `nextCommand(feature)` (BR5.2, BR5.3), `specifyText(raw)` (BR5.6). |
| `SpeckitCommandButton.jsx` | new | One LCARS pill: shows the typed text, disabled with its reason (BR5.8), a click calls `terminal.type('agent', text, { submit: true })` and shows the terminal (BR5.7). |
| `SpeckitQuickCommands.jsx` | new, in `SpeckitFeatures` above the list | The core four and the extension commands grouped by id (BR5.5), and the specify description field. Reads `speckit:rules` once and on `speckit:changed`. |
| `SpeckitFeatureDetail.jsx` | changed | The next command button for the active feature, or the note naming the active one (BR5.4), and the converge note (BR5.3). |
| `SpeckitFeatures.jsx`, `SpeckitRules.jsx` | changed | The hard-coded commands go through `speckitCommand` (BR5.9); the empty state's specify uses the quick bar. |

`data-testid`s: `speckit-commands-root`, `speckit-commands-button`, `speckit-commands-specify-input`, `speckit-commands-extension`, `speckit-commands-next`, `speckit-commands-not-active`, `speckit-commands-converge-note`, `speckit-commands-rules-error`.

The disabled reasons reuse the existing texts where they say the same thing (`terminal.checking`, `intents.resume.busy`, `intents.resume.asking`); the rest are new keys.
