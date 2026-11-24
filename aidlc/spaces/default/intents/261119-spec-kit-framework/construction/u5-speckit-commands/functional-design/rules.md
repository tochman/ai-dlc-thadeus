# Rules: U5 u5-speckit-commands

Source-of-truth rules for U5, story US3.1 (US-1403). Sources:
- U5 in `unit-of-work.md` and its row in `unit-of-work-story-map.md`;
- AC3.1.1–AC3.1.4 in `stories.md`, and FR5 and FR6.2 in `requirements.md`;
- contracts C5 (features, U6), C6 (extensions, U7) and C7 (command form, owned here) in `contract-summary.md`;
- the installed Spec Kit 1.4.3 tool, which settles the command form (open question O1, see `functional-spec.md`).

```yaml
rules:
  - id: BR5.1
    statement: A command is written in the form of the agent tab's harness.
    category: calculation
    applies_to: speckitCommand(harness, name, args)
    trigger: every command the app types
    logic: The name is a core stem (`plan`) or an extension command (`speckit.git.commit`); a core stem becomes `speckit.<stem>`. IF harness is claude THEN `/` + the name with every `.` replaced by `-` (`/speckit-plan`, `/speckit-git-commit`). IF harness is opencode THEN `/` + the name as it is (`/speckit.plan`, `/speckit.git.commit`). Arguments follow after one space.
    violation: any other harness gives no command (BR5.7)
    source: FR5.3, C7
  - id: BR5.2
    statement: The next command follows from where the feature stands (C5 flow and tasks).
    category: calculation
    applies_to: nextCommand(feature)
    trigger: the feature detail is shown, and every speckit:changed refresh
    logic: IF no spec THEN specify. ELSE IF no plan THEN plan. ELSE IF no tasks.md THEN tasks. ELSE IF any task, in a phase or a round, is open THEN implement. ELSE converge.
    violation: none; there is always one next command
    source: FR5.1, FR6.2
  - id: BR5.3
    statement: After converge, converge stays the next command, and the view says the files cannot show whether the feature converged.
    category: policy
    applies_to: nextCommand(feature)
    trigger: every task done, at least one round present
    logic: Spec Kit's converge appends tasks when work is left and writes nothing when the feature converged. So a feature whose tasks are all done, with rounds, still offers converge, with that note.
    violation: none
    source: FR5.1, FR6.2
  - id: BR5.4
    statement: The next command is offered only for the active feature.
    category: constraint
    applies_to: Feature detail
    trigger: the feature detail is shown
    logic: Spec Kit's commands act on the active feature. IF the shown feature is active THEN offer its next command. ELSE show where it stands and say the commands act on the active feature, by name, or that no feature is active.
    violation: no button for a feature that is not active
    source: FR5.1
  - id: BR5.5
    statement: The quick commands are specify, clarify, analyze, constitution, and each command of each installed extension.
    category: policy
    applies_to: Quick commands
    trigger: open of the Spec Kit view, and every speckit:changed refresh
    logic: The core four always show. Extension commands come from speckit:rules (C6), grouped by extension id, in the order the reader gives. IF speckit:rules fails or names errors THEN the core four still show, and a note says the extension commands could not all be read.
    violation: an unreadable extensions file hides no core command
    source: FR5.2
  - id: BR5.6
    statement: The description for specify is required, one line, and plain text.
    category: validation
    applies_to: Specify description
    trigger: typing in the description field
    logic: Line breaks and tabs become spaces, control characters are removed, ends are trimmed, and at most 1000 characters are kept. IF nothing is left THEN the specify button is disabled.
    violation: the button stays disabled; nothing is typed
    source: FR5.2, construction guardrail (validate input at a boundary)
  - id: BR5.7
    statement: A click types the command and Enter into the agent tab; nothing else ever types one.
    category: policy
    applies_to: Every command button
    trigger: a click
    logic: The command goes through the existing terminal control to the agent tab, the last agent tab used. No command is typed when the view opens, when files change, or on any timer.
    violation: none
    source: FR5.1, FR5.4
  - id: BR5.8
    statement: A button that cannot run is disabled and says why.
    category: validation
    applies_to: Every command button
    trigger: render
    logic: Disabled, with the reason, while there is no agent tab or its harness is not known yet, when the harness is not claude or opencode, while an agent is working, or while an agent waits on a question.
    violation: the reason shows as the button's note; nothing is typed
    source: FR5.4, NFR6
  - id: BR5.9
    statement: The Spec Kit views type commands only through speckitCommand.
    category: constraint
    applies_to: SpeckitFeatures, SpeckitRules
    trigger: build
    logic: The two hard-coded strings (`/speckit-specify ` in the empty features view, `/speckit-constitution ` in the rules view) are replaced by speckitCommand, so opencode projects get their own form too.
    violation: none
    source: FR5.3, C7
```

| Rule | In short |
|---|---|
| BR5.1 | Claude `/speckit-plan`, opencode `/speckit.plan` |
| BR5.2 | specify → plan → tasks → implement → converge |
| BR5.3 | after converge, converge stays, with a note |
| BR5.4 | next command for the active feature only |
| BR5.5 | the core four plus extension commands |
| BR5.6 | the description: required, one line, plain text |
| BR5.7 | only a click types a command, with Enter |
| BR5.8 | a button that cannot run says why |
| BR5.9 | the two hard-coded strings go |
