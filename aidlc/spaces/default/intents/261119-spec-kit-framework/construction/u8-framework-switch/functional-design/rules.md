# Business Rules — u8-framework-switch (US-1407)

Sources: `requirements.md` FR8.1–FR8.3 and FR2.1, `stories.md` US2.3 (AC2.3.1–AC2.3.4), `unit-of-work.md` U8,
`unit-of-work-story-map.md`, `contract-summary.md` C10 (and C2, C3, C4 it builds on). No question was needed: the
requirements and contracts settle each point.

```yaml
rules:
  - id: BR8.1
    statement: The switch is offered only to the framework the project is not on, from the project settings.
    category: validation
    applies_to: SwitchPreview
    trigger: the person opens the Framework section of the project's Configuration
    logic: IF to equals the current framework or is not aidlc or speckit THEN refuse before any file access.
    violation: error naming the framework; nothing read or written.
    source: FR8.1
  - id: BR8.2
    statement: The preview says whether the other framework's setup runs (its folder is missing), that the views change, and that the old framework's files stay.
    category: policy
    applies_to: SwitchPreview
    trigger: the person chooses to switch
    logic: setupNeeded = NOT found[to] (detection's own folder check); keeps = the old framework's folders that exist.
    violation: none
    source: FR8.1
  - id: BR8.3
    statement: The preview names work in progress and says it is not carried over.
    category: policy
    applies_to: SwitchPreview
    trigger: building the preview
    logic: AI-DLC — every intent whose state is not completed or archived; Spec Kit — every feature with open tasks (done < total). A read that fails adds no item and is logged.
    violation: none; the list may be empty.
    source: FR8.2
  - id: BR8.4
    statement: When setup is needed it runs first, through the existing setup (US-0503 for AI-DLC, C3 for Spec Kit, with the project's harness); the framework file is written only after it succeeds.
    category: constraint
    applies_to: Switch
    trigger: the person confirms the preview
    logic: IF setupNeeded THEN run setup; IF it fails or is cancelled THEN stop, file and views unchanged; ELSE project:switch writes .thadeus/project.json through U2.
    violation: the setup's own output is shown; the app stays on the old framework.
    source: AC2.3.3, R-05
  - id: BR8.5
    statement: The switch writes only `.thadeus/project.json`, through U2's atomic write, and deletes nothing.
    category: constraint
    applies_to: Switch
    trigger: writing the switch
    logic: project:switch re-checks found[to]; IF still missing THEN refuse (setupNeeded); ELSE writeProjectFile(root, to).
    violation: { ok: false, error: { code: setupNeeded | writeFailed, message } }; file unchanged.
    source: FR8.3, FR2.1
  - id: BR8.6
    statement: After a written switch, only the new framework's views show; switching back is the same flow.
    category: policy
    applies_to: Switch
    trigger: the file write succeeded
    logic: send the C1 detection push before project:switch returns, so the arm and views follow (U1).
    violation: none
    source: FR8.3
```

| Rule | In short | Source |
|---|---|---|
| BR8.1 | Only to the other framework | FR8.1 |
| BR8.2 | Preview: setup, views, files kept | FR8.1 |
| BR8.3 | Preview names work in progress | FR8.2 |
| BR8.4 | Setup first; failure changes nothing | AC2.3.3 |
| BR8.5 | One atomic write, nothing deleted | FR8.3, FR2.1 |
| BR8.6 | Views follow; switch back the same way | FR8.3 |
