# Entities: u2-framework-file (US1.2, US-1408)

Sources: `unit-of-work.md` (U2), `requirements.md` (FR2.1–FR2.3, FR1.5, NFR3), `contract-summary.md` (C1, C2), `stories.md` (US1.2), and the answers in `functional-design-questions.md` (Q1–Q3). Domain Design was skipped, so there is no `components.md`. The boundaries come from the Units and the code KB.

```yaml
entities:
  - name: ProjectFile
    description: The framework kept in the repository, at `.thadeus/project.json` under the project root (contract C2). Committed, so every clone reads the same value.
    attributes:
      - { name: version, type: integer, required: true, allowed: [1], constraints: "a higher integer is a newer app's file (unknownVersion)" }
      - { name: framework, type: enum, required: true, allowed: [aidlc, speckit] }
      - { name: extra, type: map, required: false, constraints: "any other key; kept unchanged when the file is rewritten" }
    constraints:
      - The path is fixed and root-relative; it is never inside `.specify/` or `specs/` (NFR3).
  - name: ReadResult
    description: What reading the ProjectFile gives.
    attributes:
      - { name: ok, type: boolean, required: true }
      - { name: value, type: ProjectFile, required: false, constraints: "only when ok" }
      - { name: reason, type: enum, required: false, allowed: [missing, unreadable, invalid, unknownVersion, unknownFramework], constraints: "only when not ok" }
  - name: WriteResult
    description: What writing a confirmed choice gives.
    attributes:
      - { name: ok, type: boolean, required: true }
      - { name: file, type: string, required: false, default: ".thadeus/project.json", constraints: "only when ok" }
      - { name: replaced, type: boolean, required: false, default: false, constraints: "true when an unreadable or invalid file was replaced (Q1)" }
      - { name: error, type: object, required: false, constraints: "{ code: newerVersion | invalidFramework | writeFailed, message }, only when not ok" }
relationships:
  - { from: ReadResult, to: ProjectFile, cardinality: "0..1", direction: "ReadResult carries the file it read" }
  - { from: ProjectFile, to: Detection, cardinality: "0..1 to 1", direction: "a readable file gives Detection its saved framework (C1, owned by U1)" }
```

The Unit has one stored entity, the ProjectFile, and two result values. The Detection it feeds belongs to U1 (contract C1). U2 only supplies the saved value and, when it cannot be used, the reason.
