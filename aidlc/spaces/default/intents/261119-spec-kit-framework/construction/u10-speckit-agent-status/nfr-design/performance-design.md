# Performance Design: U10 u10-speckit-agent-status

Sources: `performance-requirements.md` and `tech-stack-decisions.md` in `../nfr-requirements/`, the U10 `functional-spec.md`, and contract C9 in `contract-summary.md`.

| NFR | Design |
|---|---|
| NFR7.1 | `SpeckitProgress` subscribes to U6's existing `speckit:changed` push (preload `speckit.onChanged`). Each push for this project id makes one `agents:progress` call. U6's watcher already holds the 2 s bound for `tasks.md`; no new watcher. |
| NFR7.2 | It also subscribes to `agentEvents.onChanged` (`agent-events:changed`, sent by `agentIpc.js` on every store change). A payload whose `projectId` is not this project is ignored. The store emits at once, well inside 2 s. |
| NFR7.3 | Main does no file work for the waiting part: it reads `store.list(projectId)`, already in memory and in pager order. The feature part is one `loadSpeckitFeatures(root)` call. The two run with `Promise.allSettled`. The timed test (30 features, 200 events) goes in its own file, which is added to the `TIMED` list in `vitest.config.mjs` so it runs in the retried `scripts` project; bound 1 s, target 300 ms. |
| NFR7.4 | One `useEffect` keyed on the project id and a refresh counter; each push bumps the counter. Pushes that arrive while a call is in flight set one "again" flag, so a burst gives at most one extra call. No timer, no polling. |

No cache: both sources are already cheap, and a cache would need its own invalidation on the same two pushes.
