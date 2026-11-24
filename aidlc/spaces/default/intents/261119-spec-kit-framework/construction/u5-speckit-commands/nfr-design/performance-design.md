# Performance Design: U5 u5-speckit-commands

Sources: `performance-requirements.md` and `tech-stack-decisions.md` in `../nfr-requirements/` (and the review's double-click point), the U5 `functional-spec.md` and `frontend-components.md`, and contracts C5–C7 in `contract-summary.md`. One person, one project; U5 reads no file and adds no IPC call.

| NFR | Design |
|---|---|
| NFR7.1 | `SpeckitFeatureDetail` gets the feature object U6 already refreshes on `speckit:changed`; `nextCommand(feature)` runs in render, so a new `plan.md` turns the button into tasks on the same render. No watcher, poll or timer in U5. `SpeckitQuickCommands` reads `speckit:rules` once on mount and again on each `speckit:changed` push, as U7's view does. |
| NFR7.2 | The ready or disabled state is derived in render from `useTerminal()`: the agent tab, its harness and its state (idle, busy, asking, gone). The tab state change re-renders the buttons; no IPC call and no stored copy of the state. |
| NFR7.3 | `speckitCommand`, `nextCommand` and `specifyText` live in `src/shared/speckitCommands.js` (the functional design's name; `tech-stack-decisions.md` says `speckitCommand.js`, same module). They take plain values and return a string or `null`. Main tests call them directly; a renderer test counts IPC calls on a click: zero. |
| NFR7.4 | Each `SpeckitCommandButton` holds a `sending` flag. A click sets it before `await terminal.type(...)` and clears it in `finally`; while it is set the button is disabled, so a second click in the same render types nothing, even before the tab shows busy. Test: two `click` calls in a row with `type` held pending give one `type` call. |

Speed of a click: one `type` call, one write to the pty. There is nothing else to budget.
