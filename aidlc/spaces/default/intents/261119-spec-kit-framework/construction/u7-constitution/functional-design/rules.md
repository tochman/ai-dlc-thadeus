# Rules: U7 u7-constitution

Source-of-truth rules for U7, story US4.2 (US-1404). Sources:
- U7 in `unit-of-work.md` and its row in `unit-of-work-story-map.md`;
- FR7, FR5.2 and NFR3 in `requirements.md`;
- contract C6 in `contract-summary.md`;
- the answers in `functional-design-questions.md` (Q1, Q2);
- the installed Spec Kit 1.4.x tool, which settles the file shapes (see `functional-spec.md`).

```yaml
rules:
  - id: BR7.1
    statement: The constitution is `.specify/memory/constitution.md`; a missing one is not an error.
    category: validation
    applies_to: Constitution
    trigger: speckit:rules
    logic: IF the path is a readable file THEN constitution = { path, exists true } ELSE IF it does not exist THEN exists false and the view says there is no constitution yet and offers /speckit-constitution ELSE exists false plus an errors entry with the reason.
    violation: an unreadable path (a folder, no permission) is named in errors with the reason
    source: FR7.1, FR7.3
  - id: BR7.2
    statement: The constitution shows rendered and opens in the editor, which may save it.
    category: policy
    applies_to: Constitution
    trigger: open of Configuration › Spec Kit, click on Open in editor
    logic: The view renders the file with the artifact reader's FileView. Open in editor hands the relative path to the project editor; the editor's existing rule keeps every other Spec Kit file read-only.
    violation: none
    source: FR7.1
  - id: BR7.3
    statement: `.specify/extensions.yml` is read with the `yaml` package; a missing file means no extensions and no error.
    category: validation
    applies_to: Extensions file
    trigger: speckit:rules
    logic: IF missing THEN extensions [] and no error. ELSE parse it. IF the parse fails or the root is not a mapping THEN extensions [] plus an errors entry with the parser message, and the view says no hooks were checked, mandatory ones included.
    violation: errors entry with the parser's reason; nothing is hidden
    source: FR7.2, FR7.3
  - id: BR7.4
    statement: Each hook comes from a `hooks` key `before_<command>` or `after_<command>`.
    category: calculation
    applies_to: Hook list
    trigger: speckit:rules
    logic: For each key matching (before|after)_<name>, take its value as a list (a single mapping counts as a list of one). Each mapping with a `command` gives { when, target <name>, command, mode } under its `extension`. A key that does not match, or an entry without a command, is skipped and counted.
    violation: skipped entries show as a count, the rest still show
    source: FR7.2
  - id: BR7.5
    statement: A hook's mode is off, mandatory or optional, as Spec Kit reads it.
    category: calculation
    applies_to: Hook mode
    trigger: speckit:rules
    logic: IF enabled is false THEN off; ELSE IF optional is false THEN mandatory; ELSE optional (Spec Kit's default for both fields).
    violation: none
    source: FR7.2
  - id: BR7.6
    statement: The extensions are the ids in `installed` plus any id a hook names; each one's commands come from its own manifest.
    category: calculation
    applies_to: Extension list
    trigger: speckit:rules
    logic: Ids are taken from `installed` (a string, or a mapping with `id`) and from hook `extension` fields, deduplicated and sorted. IF an id matches ^[a-z0-9][a-z0-9._-]*$ THEN read `.specify/extensions/<id>/extension.yml` and take provides.commands[].name ELSE commands [] plus an errors entry.
    violation: a missing, unreadable or invalid manifest gives commands [] plus an errors entry; the extension and its hooks still show
    source: FR7.2, FR5.2
  - id: BR7.7
    statement: Reading the rules never writes in `.specify/` or `specs/`.
    category: constraint
    applies_to: All U7 readers
    trigger: speckit:rules
    logic: The readers use the existing read helpers only; a test runs them with a write spy.
    violation: a write is a test failure
    source: NFR3
  - id: BR7.8
    statement: A change to the constitution or the extension files refreshes the view.
    category: policy
    applies_to: Watcher
    trigger: file change
    logic: `.specify/memory/constitution.md`, `.specify/extensions.yml` and `.specify/extensions/` join the Spec Kit watch paths; a change pushes speckit:changed and the view calls speckit:rules again.
    violation: none
    source: FR7.1, FR7.2
  - id: BR7.9
    statement: The rules sit in Configuration › Spec Kit, shown only for a Spec Kit project.
    category: policy
    applies_to: Configuration sections
    trigger: sectionsFor(framework)
    logic: IF framework is speckit THEN the sections are docs, agent, speckit ELSE unchanged (AI-DLC keeps its own sections).
    violation: none
    source: FR7.1, FR7.2
```

| Rule | Summary |
|---|---|
| BR7.1 | Constitution at `.specify/memory/constitution.md`; missing is not an error, unreadable is named |
| BR7.2 | Rendered in the view; Open in editor, which may save it |
| BR7.3 | `extensions.yml` through `yaml`; parse failure named, no hooks checked |
| BR7.4 | Hooks from `before_<cmd>` / `after_<cmd>` keys; bad entries skipped and counted |
| BR7.5 | Mode: off, mandatory or optional |
| BR7.6 | Extensions from `installed` and hooks; commands from each manifest |
| BR7.7 | Read-only |
| BR7.8 | Watched; refresh within 2 s |
| BR7.9 | Configuration › Spec Kit, Spec Kit projects only |
