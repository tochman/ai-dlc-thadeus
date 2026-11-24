# Performance Requirements: U7 u7-constitution

Sources: NFR7 in `requirements.md`, contract C6 in `contract-summary.md`, and the U7 `functional-spec.md` and `rules.md` (BR7.8). The app is a desktop Electron app (`technology-stack.md`): one person, one project open at a time, so there is no load or throughput target.

| ID | Requirement | Measure |
|---|---|---|
| NFR7.1 | A change to `.specify/memory/constitution.md`, `.specify/extensions.yml` or any file under `.specify/extensions/` shows in the open Spec Kit section within 2 s (BR7.8). | Watcher test: write each file; `speckit:changed` arrives within 2 s each time |
| NFR7.2 | Changes are batched the same way as U6's: a burst of writes gives one refresh at most every 800 ms. | Test: 20 writes in 1 s give at most 2 pushes |
| NFR7.3 | `speckit:rules` for a project with 20 extensions, 50 hooks and a 100 KB constitution returns within 300 ms on the CI runner. | Timed test on a generated fixture |
| NFR7.4 | The view calls `speckit:rules` once when it opens and once per `speckit:changed`, never on a plain re-render. | Renderer test counts IPC calls |
