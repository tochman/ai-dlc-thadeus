# Rules: U1 u1-framework-views

The source of truth for U1's rules. `functional-spec.md` carries the same table as a readable summary. Sources: U1 in `unit-of-work.md`, and FR1/NFR6 in `requirements.md`.

```yaml
rules:
  - id: BR1.1
    statement: A valid AI-DLC workspace (aidlc/spaces/ with at least one space) makes the project AI-DLC unless a saved choice says otherwise.
    category: policy
    applies_to: Detection
    trigger: project open or re-detection
    logic: IF aidlc workspace valid AND no usable saved choice AND NOT (BR1.3 active AND .specify/ exists) THEN framework = aidlc
    violation: n/a
    source: FR1.3
  - id: BR1.2
    statement: Only .specify/ makes the project Spec Kit.
    category: policy
    applies_to: Detection
    trigger: project open or re-detection
    logic: IF .specify/ is a directory AND aidlc/spaces/ absent THEN framework = speckit, source = detected
    violation: n/a
    source: FR1.5
  - id: BR1.3
    statement: Both frameworks found and no usable saved choice means the person chooses; it is switched on by U4.
    category: policy
    applies_to: Detection
    trigger: project open
    logic: IF both found AND no usable saved choice AND U4 present THEN framework = null, source = ask
    violation: n/a
    source: FR4.2
  - id: BR1.4
    statement: Neither framework, or an empty aidlc/spaces/, gives no framework and today's reason.
    category: policy
    applies_to: Detection
    trigger: project open
    logic: IF neither found OR aidlc/spaces/ empty THEN framework = null, source = detected, reason as today
    violation: n/a
    source: FR1.3
  - id: BR1.5
    statement: Views come from one shared table keyed by framework.
    category: constraint
    applies_to: View set
    trigger: render
    logic: views = VIEWS[framework]; no component builds its own offered map
    violation: lint/test failure
    source: FR1.2
  - id: BR1.6
    statement: The view set per framework.
    category: constraint
    applies_to: View set
    trigger: render
    logic: aidlc = today's set exactly; speckit = features, config, editor, specs; null = features, config, editor
    violation: test failure
    source: FR1.4
  - id: BR1.7
    statement: isAidlc stays for one release as framework == aidlc.
    category: constraint
    applies_to: Detection
    trigger: detection built
    logic: isAidlc = (framework == aidlc)
    violation: n/a
    source: FR1.1
  - id: BR1.8
    statement: The menu state carries framework, and its AI-DLC items show only for aidlc.
    category: constraint
    applies_to: Menu
    trigger: menu state sent
    logic: IF framework != aidlc THEN hide AI-DLC menu items
    violation: n/a
    source: FR1.1
  - id: BR1.9
    statement: watchSpace runs only for aidlc; watchForSetup runs for null and also fires on .specify/; the push and the open return carry the same Detection.
    category: constraint
    applies_to: Watchers
    trigger: open, re-detection
    logic: IF framework changes THEN push project:detected with the new Detection
    violation: n/a
    source: FR1.5
  - id: BR1.10
    statement: opencode counts as installed in a Spec Kit project when .opencode/ exists.
    category: policy
    applies_to: Harness detection
    trigger: harness scan
    logic: IF framework == speckit AND .opencode/ exists THEN opencode installed
    violation: n/a
    source: NFR6
  - id: BR1.11
    statement: The shared shell does not depend on framework.
    category: constraint
    applies_to: Shell
    trigger: render
    logic: terminal, dialogs, hooks, editor, git, Features and settings render for every framework
    violation: test failure
    source: FR1.6
  - id: BR1.12
    statement: New labels go through t() in sv and en and use the LCARS styles.
    category: constraint
    applies_to: UI text
    trigger: build
    logic: i18nKeys test passes
    violation: test failure
    source: NFR1
```

| ID | Summary |
|---|---|
| BR1.1–BR1.4 | Which framework detection finds |
| BR1.5–BR1.6 | One shared views table and its contents |
| BR1.7–BR1.9 | Compatibility, the menu and the watchers |
| BR1.10 | opencode detection |
| BR1.11–BR1.12 | The shared shell, i18n and LCARS |
