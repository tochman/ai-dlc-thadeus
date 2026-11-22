# Performance Requirements: U6 u6-speckit-features

Sources: NFR7 in `requirements.md`, contract C5 in `contract-summary.md`, and the U6 `functional-spec.md` and `rules.md` (BR6.7). The app is a desktop Electron app (`technology-stack.md`): one person, one project open at a time, so there is no load or throughput target.

| ID | Requirement | Measure |
|---|---|---|
| NFR7.1 | A change to any file under `specs/`, a new or removed feature folder, or a change to `.specify/feature.json` or `.specify/init-options.json` shows in the open features view within 2 s. This includes non-Markdown files and files in `contracts/` and `checklists/`. A new folder must not depend on `feature.json` being written after it. | Watcher test: write, add a folder, delete a file; `speckit:changed` arrives within 2 s each time |
| NFR7.2 | Changes are batched: a burst of writes (an agent ticking many tasks) gives one refresh at most every 800 ms, as `watchFiles` does today (debounce 300 ms, at most 800 ms). | Test: 20 writes in 1 s give at most 2 pushes |
| NFR7.3 | `speckit:features` for a project with 50 features and a 500-line `tasks.md` each returns within 500 ms on the CI runner. | Timed test on a generated fixture |
| NFR7.4 | Files are read only when the list is built; the view never reads a feature's files again on a plain re-render. | Renderer test: one IPC call per `speckit:changed` |

Notes:
- NFR7.1 tightens BR6.7: the current folder target in `watchFiles` only sees `.md` files directly in a folder. NFR Design picks how to meet it.
