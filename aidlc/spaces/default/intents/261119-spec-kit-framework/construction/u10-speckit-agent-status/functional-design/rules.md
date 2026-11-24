# Rules: U10 u10-speckit-agent-status

Source-of-truth rules for U10, story US5.2 (US-1410). Sources:
- U10 in `unit-of-work.md` and its row in `unit-of-work-story-map.md`;
- FR10 in `requirements.md`;
- contract C9 in `contract-summary.md` (and C5, U6's features);
- the answers in `functional-design-questions.md` (Q1 = A, Q2 = A).

```yaml
rules:
  - id: BR10.1
    statement: In a Spec Kit project, agents:progress(projectId) answers with the C9 shape and never throws for a missing AI-DLC workspace.
    category: constraint
    applies_to: agents:progress
    trigger: agents:progress called for a Spec Kit project, or with no intent dir name
    logic: IF the project's framework is speckit OR no dirName is given THEN build the C9 result from the hook events (BR10.2) and the active feature (BR10.3) ELSE keep today's AI-DLC per-intent rows unchanged.
    violation: a read that fails gives the part it feeds as null; the call still resolves
    source: FR10.2
  - id: BR10.2
    statement: The waiting question is the oldest open hook question or permission of the project.
    category: calculation
    applies_to: Waiting
    trigger: agents:progress, a hook event change
    logic: From the hook event store's events for the project, take the open ones of kind question or permission, oldest first. waiting = { question (its header, else the first line of its body, as plain text), agent (the agent's name, else the harness label) }. None open gives waiting null.
    violation: none
    source: FR10.1
  - id: BR10.3
    statement: The feature progress is the active feature from the Spec Kit features reader.
    category: calculation
    applies_to: Feature progress
    trigger: agents:progress, speckit:changed
    logic: Call U6's loadSpeckitFeatures. IF active is set THEN feature = { name, done, total } of that feature's tasks ELSE feature null.
    violation: a failing read gives feature null; the call still resolves
    source: FR10.1
  - id: BR10.4
    statement: The result names where it comes from.
    category: calculation
    applies_to: Source
    trigger: agents:progress
    logic: source = hooks when waiting is set, ELSE tasks when feature is set, ELSE none.
    violation: none
    source: FR10.1, FR10.2
  - id: BR10.5
    statement: The readout sits at the top of the Specs view and says where each part comes from.
    category: policy
    applies_to: Progress readout
    trigger: Specs view shown
    logic: One LCARS readout above the features list. A waiting question shows its text, the agent and "from the agent hooks". A feature shows its name, done/total and "from tasks.md". Both can show. With neither, one line says "nothing to show yet: no agent hooks or active feature".
    violation: none
    source: FR10.1, FR10.2
  - id: BR10.6
    statement: The popup stays as it is in a Spec Kit project; each hook page names its source.
    category: policy
    applies_to: AgentDialog
    trigger: a hook question or permission arrives
    logic: The popup opens only for an arriving event, as today (Q2 = A). A hook page carries a short "from the agent hooks" note.
    violation: none
    source: FR10.1
  - id: BR10.7
    statement: The readout refreshes on a hook change and on speckit:changed.
    category: policy
    applies_to: Progress readout
    trigger: agent events pushed for the project, speckit:changed
    logic: Each push makes the readout call agents:progress again; nothing is polled.
    violation: none
    source: FR10.1
  - id: BR10.8
    statement: U10 reads only; it never writes in .specify/ or specs/.
    category: constraint
    applies_to: All U10 readers
    trigger: agents:progress
    logic: The Spec Kit part goes through U6's reader only; a test runs the handler with a write spy.
    violation: a write is a test failure
    source: NFR3
```

| Rule | Summary |
|---|---|
| BR10.1 | `agents:progress(projectId)` gives C9 for Spec Kit, never throws; AI-DLC per-intent unchanged |
| BR10.2 | Waiting = oldest open hook question or permission: its text and agent |
| BR10.3 | Feature = the active feature's name and done/total from U6's reader |
| BR10.4 | Source: hooks, else tasks, else none |
| BR10.5 | Readout at the top of the Specs view, each part with its source, one empty line |
| BR10.6 | Popup unchanged; hook pages say "from the agent hooks" |
| BR10.7 | Refresh on hook push and `speckit:changed` |
| BR10.8 | Read-only |
