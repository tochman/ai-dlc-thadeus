# Tech Stack Decisions: U10 u10-speckit-agent-status

Sources: `technology-stack.md` (code KB), NFR1, NFR2 and NFR8 in `requirements.md`, and the U10 `functional-spec.md`. No new dependency.

| ID | Decision | Why |
|---|---|---|
| NFR8.1 | `loadSpeckitProgress(root, events)` and the pure `waitingFrom(events)` go into the existing `src/main/agentProgress.js`, beside the AI-DLC reader. The events come from the running agent event store (`agentEvents.js`), in its pager order (`byPager`). | BR10.2 follows the popup's own order; most tests need no files |
| NFR8.2 | `agents:progress` in `ipc.js` branches on the project's framework, or on a missing dir name; the preload call keeps its name and arguments. | C9, BR10.1; the token detail keeps working unchanged |
| NFR8.3 | The readout refreshes on the existing agent event push and U6's `speckit:changed`; no new watcher, timer or channel. | BR10.7, NFR7.4 |
| NFR8.4 | Tests are vitest: `main` project for `waitingFrom`, `loadSpeckitProgress` and the IPC branch; `renderer` project (jsdom, Swedish locale) for `SpeckitProgress` and the popup's source note. Tests are written first; 80% line coverage holds. | NFR8, team practice |
| NFR1.1 | Every text, the source notes and the empty line included, goes through `t()` with ICU placeholders, with the same keys in `sv.json` and `en.json`. | NFR1, `i18nKeys.test.js` |
| NFR2.1 | The readout uses the LCARS frame, heading and colours of the Specs view; the source notes use the existing small label style. | NFR2, project rule |
