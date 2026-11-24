# Performance Requirements: U8 u8-framework-switch

Sources: NFR7 in `requirements.md`, contract C10 (built on C1 and C2) in `contract-summary.md`, and the U8 `functional-spec.md` and `rules.md` (BR8.3, BR8.5, BR8.6). The app is a desktop Electron app (`technology-stack.md`): one person, one project open at a time, and a switch is rare, so there is no load or throughput target. The setup step's own time (an `aidlc` or `specify init` run) is the setup's, bounded by its own timeout (C7), and is not counted here.

| ID | Requirement | Measure |
|---|---|---|
| NFR7.3 | `project:switchPreview` returns within 500 ms on the CI runner for a project with 20 intents and 20 Spec Kit features. It reads only what it lists: the folder check, the intents' state and the features' task counts. A list that fails to read is skipped and named, never retried (BR8.3). | Timed test in the retried `scripts` project with fixture folders and a 2 s bound |
| NFR7.4 | After a written switch, the C1 `project:detected` push with the new framework arrives before `project:switch` returns, and the arm and views show the new framework within 2 s of Confirm (no setup), the bound NFR7 sets (BR8.6). | Test: confirm, then the push arrives before the reply and within 2 s |
| NFR7.5 | The section calls `switchPreview` once per "Switch to" click and `switch` once per Confirm. The switch button and Confirm are disabled while any step runs, so a double click sends one call. | Renderer test counts IPC calls |
