# Rules: U4 u4-framework-choice

Source-of-truth rules for U4, story US2.2 (US-1406). Sources: U4 in `unit-of-work.md` and its row in `unit-of-work-story-map.md`; FR4 in `requirements.md`; contracts C1, C2, C3 and C4 in `contract-summary.md`; the answers in `functional-design-questions.md` (Q1 = A, Q2 = A).

```yaml
rules:
  - id: BR4.1
    statement: A project with no saved framework opens on the choice screen.
    category: policy
    applies_to: Detection (C1)
    trigger: a project is opened or detected again
    logic: IF `.thadeus/project.json` is missing THEN framework = null and source = ask, whatever folders are found (Q1 = A) ELSE U1/U2's rules hold unchanged (a valid file is followed; an unreadable or invalid file falls back to detection with its reason).
    violation: none
    source: FR4.1, FR4.2
  - id: BR4.2
    statement: The screen shows what was found and which command-line tools are on the PATH.
    category: calculation
    applies_to: project:frameworkScan (C4)
    trigger: the choice screen opens
    logic: found = { aidlc: an AI-DLC space exists, speckit: `.specify/` exists }; cli = { aidlc: `aidlc` found as the tools list finds it, specify: `specify` found as U3's setup preview finds it }. A tool lookup that fails counts as not found.
    violation: none
    source: FR4.1
  - id: BR4.3
    statement: The proposal follows what was found.
    category: calculation
    applies_to: project:frameworkScan (C4)
    trigger: the choice screen opens
    logic: IF exactly one framework is found THEN proposal = that framework ELSE proposal = null (both or neither: the person chooses).
    violation: none
    source: FR4.2
  - id: BR4.4
    statement: With one framework found, one click confirms the proposal.
    category: policy
    applies_to: Choice screen
    trigger: proposal is set
    logic: The proposed framework is preselected; one Confirm click calls chooseFramework with it. The other framework can still be picked.
    violation: none
    source: FR4.2
  - id: BR4.5
    statement: With both found, the chosen framework is saved and the other is not shown.
    category: policy
    applies_to: project:chooseFramework (C4)
    trigger: Confirm with both found
    logic: chooseFramework writes the file through U2; the C1 push that follows carries only the chosen framework's views. The other framework's folders are left as they are.
    violation: none
    source: FR4.2
  - id: BR4.6
    statement: A framework whose folder is missing goes on to its setup, and is saved only after the setup succeeds.
    category: constraint
    applies_to: project:chooseFramework (C4), setup panels
    trigger: Confirm for a framework that was not found
    logic: IF the chosen framework is found THEN write `.thadeus/project.json` and next = none ELSE write nothing and next = setupAidlc or setupSpeckit; the screen shows that setup (US-0503 or U3). When the setup succeeds, the screen calls chooseFramework again, which now finds the folder and writes. A failed or closed setup writes nothing, so the next open shows the choice screen again (Q2 = A).
    violation: none
    source: FR4.2, FR4.3
  - id: BR4.7
    statement: Nothing is written in the project before the person confirms.
    category: constraint
    applies_to: Detection, project:frameworkScan
    trigger: opening, scanning, picking without Confirm
    logic: Detection and the scan only read. The only write is U2's atomic write inside chooseFramework (BR4.5, BR4.6); setup writes are U3's and US-0503's, after their own confirm.
    violation: a write before Confirm is a test failure
    source: FR4.3
  - id: BR4.8
    statement: chooseFramework accepts only a known framework for a known project.
    category: validation
    applies_to: project:chooseFramework (C4)
    trigger: the call from the renderer
    logic: IF the project id is unknown OR framework is not aidlc or speckit THEN reject, writing nothing.
    violation: the call rejects with a translated reason
    source: FR4.3
```

| Rule | Summary |
|---|---|
| BR4.1 | No `.thadeus/project.json`: the choice screen, whatever is found |
| BR4.2 | Shows the frameworks found and whether `aidlc` and `specify` are on the PATH |
| BR4.3 | Exactly one found is proposed; both or neither, no proposal |
| BR4.4 | One click confirms the proposal |
| BR4.5 | Both found: the chosen one is saved and only its views show |
| BR4.6 | Not found: setup first, saved only after it succeeds |
| BR4.7 | Nothing written before Confirm |
| BR4.8 | Unknown project or framework is refused |
