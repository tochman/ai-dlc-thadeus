# Performance Requirements: U4 u4-framework-choice

Sources: NFR4 and NFR7 in `requirements.md`, contracts C1 and C4 in `contract-summary.md`, and the U4 `functional-spec.md` and `rules.md` (BR4.2, BR4.5). The app is a desktop Electron app (`technology-stack.md`): one person, one project open at a time, so there is no load or throughput target. The screen shows once per project.

| ID | Requirement | Measure |
|---|---|---|
| NFR4.3 | `project:frameworkScan` returns within 300 ms on the CI runner once the login PATH has been read. The first read can take up to `exec.js`'s 20 s; meanwhile the screen shows its Scanning state and stays usable, and a timeout gives the app's own PATH, not an error. | Timed test in the retried `scripts` project with a stubbed PATH and a 1 s bound; renderer test for the Scanning state |
| NFR7.1 | After Confirm on a found framework, the file is written and the views switch (the C1 push) within 2 s, the same bound NFR7 sets for the Spec Kit files. | Test: confirm, then the `project:detected` push with the chosen framework arrives within 2 s |
| NFR7.2 | The screen calls `frameworkScan` once when it opens and once per Retry, never on a plain re-render; Confirm sends one `chooseFramework` call and is disabled while it runs. | Renderer test counts IPC calls; a double click sends one call |
