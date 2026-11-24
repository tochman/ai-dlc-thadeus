# Performance Design: U7 u7-constitution

Sources: `performance-requirements.md` (NFR7.1–NFR7.4), `tech-stack-decisions.md`, the U7 `functional-spec.md` (BR7.8), and contract C5's `speckit:changed` push in `contract-summary.md`.

| Requirement | Design |
|---|---|
| NFR7.1 | `SPECKIT_WATCH_PATHS` gains `.specify/memory/constitution.md`, `.specify/extensions.yml` and `.specify/extensions/**`. The existing Spec Kit watcher (`watchFiles` in `ipc.js`) pushes `speckit:changed`; no second watcher. A watched link whose target is outside the root may trigger a refresh, but the refresh reads through `resolveInRoot`, so nothing outside is read. |
| NFR7.2 | The same `watchFiles` debounce (300 ms, at most 800 ms) batches bursts for U6 and U7 together. |
| NFR7.3 | Reads run in parallel (`Promise.all` over the manifests); no caching, since a refresh only happens on a file change. The timed test makes one warm-up call, then asserts the second call on the generated fixture (20 extensions, 50 hooks, 100 KB constitution) is under 300 ms. That is far above the expected few milliseconds, so the runner's jitter does not make it flaky. |
| NFR7.4 | `SpeckitRules` calls `speckit:rules` in an effect keyed on the project id and on a `speckit:changed` counter, never on render. The constitution text is fetched by `FileView` only when the path or the counter changes. |

Skipped: a cache of parsed manifests. Add one only if NFR7.3's test shows the reads matter.
