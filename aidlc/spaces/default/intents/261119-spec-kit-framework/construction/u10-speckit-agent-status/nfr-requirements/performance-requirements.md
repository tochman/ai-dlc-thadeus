# Performance Requirements: U10 u10-speckit-agent-status

Sources: NFR7 in `requirements.md`, contract C9 in `contract-summary.md`, and the U10 `functional-spec.md` and `rules.md` (BR10.2, BR10.3, BR10.7). The app is a desktop Electron app (`technology-stack.md`): one person, one project open at a time, so there is no load or throughput target. The hook events are already in memory in the agent event store, so the waiting part costs no file read.

| ID | Requirement | Measure |
|---|---|---|
| NFR7.1 | A change to a feature's `tasks.md` shows in the open readout within 2 s, through U6's `speckit:changed` (BR10.7). | Renderer test: a `speckit:changed` push makes one new `agents:progress` call; U6's watcher test already holds the 2 s bound |
| NFR7.2 | An arriving or settled hook question or permission shows in the open readout within 2 s, the same bound as the popup. | Renderer test: an agent event push for the project makes one new call; a push for another project makes none |
| NFR7.3 | `agents:progress(projectId)` for a Spec Kit project with 30 features and 200 open hook events returns within 1 s on the CI runner (target 300 ms). | Timed test on a generated fixture, in the retried `scripts` project so a slow runner does not flake it |
| NFR7.4 | The readout calls `agents:progress` once when it opens and once per push, never on a plain re-render, and nothing is polled. | Renderer test counts IPC calls |
