# Performance Requirements: U5 u5-speckit-commands

Sources: NFR7 in `requirements.md`, contracts C5, C6 and C7 in `contract-summary.md`, and the U5 `functional-spec.md` and `rules.md` (BR5.2, BR5.5, BR5.7, BR5.8). The app is a desktop Electron app (`technology-stack.md`): one person, one project open at a time, so there is no load or throughput target. U5 reads nothing from disk; it works on the data U6 (`speckit:features`) and U7 (`speckit:rules`) already deliver.

| ID | Requirement | Measure |
|---|---|---|
| NFR7.1 | When a feature's files change, the next-command button shows the new command within 2 s, through U6's `speckit:changed` refresh; U5 adds no watcher and no poll (BR5.2). | Renderer test: a `speckit:changed` push with a feature that gained `plan.md` turns the button from plan to tasks; U6's watcher test already holds the 2 s bound |
| NFR7.2 | A button's ready or disabled state follows the agent tab's state (idle, working, asking, gone) on the next render, with no extra IPC call (BR5.8). | Renderer test: an agent event that marks the tab working disables every button in the same render |
| NFR7.3 | `speckitCommand` and `nextCommand` are pure functions with no I/O; the view calls neither the main process nor the file system to build a command. | Main test: both run on plain objects; renderer test counts zero new IPC calls on a click |
| NFR7.4 | One click types exactly one command and one Enter; a double click while the agent starts working types nothing more (BR5.7, BR5.8). | Renderer test: two clicks in a row give one `terminal.type` call when the first click marks the tab working |
