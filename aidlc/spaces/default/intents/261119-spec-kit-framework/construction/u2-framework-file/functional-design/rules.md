# Business Rules: u2-framework-file (US1.2, US-1408)

Sources: `requirements.md` (FR2, FR1.5, NFR3), `contract-summary.md` (C1, C2), `unit-of-work.md` (U2), and `functional-design-questions.md` (Q1–Q3).

```yaml
rules:
  - id: BR1.1
    statement: The file is `.thadeus/project.json` under the project root, resolved inside the root.
    category: constraint
    applies_to: ProjectFile
    trigger: every read and write
    logic: IF `.thadeus/` or the file exists and is a symlink, or is not a folder and a regular file THEN refuse it; a missing `.thadeus/` or file is not an error, so the path check works before the first write

    violation: the read gives unreadable, the write gives writeFailed
    source: FR2.1, NFR3
  - id: BR1.2
    statement: Reading sorts the file into one result.
    category: validation
    applies_to: ReadResult
    trigger: opening a project, and every detection after it
    logic: checked in this order. IF the file does not exist THEN missing; IF it cannot be read or is not valid JSON THEN unreadable; IF it is not a plain object (an array is not one) THEN invalid; IF version is an integer > 1 THEN unknownVersion, before any other field is looked at, so a newer app's file is never read as broken; IF version is not the integer 1 THEN invalid; IF framework is absent THEN invalid; IF framework is not aidlc or speckit THEN unknownFramework; OTHERWISE ok
    violation: the reason goes to BR1.3; nothing is written
    source: FR2.3
  - id: BR1.3
    statement: A file that cannot be used falls back to detection and says why.
    category: policy
    applies_to: Detection (C1)
    trigger: a ReadResult that is not ok, other than missing
    logic: IF the read is not ok THEN detection runs as FR1.5 with no saved value, and its reason names the file and the read's reason (text via t()); a missing file falls back with no reason, as today
    violation: none; the project still opens
    source: FR2.3, AC1.2.3
  - id: BR1.4
    statement: A saved framework whose folder is gone falls back too (Q3).
    category: policy
    applies_to: Detection (C1)
    trigger: an ok file whose framework has no folder (`.specify/` for speckit, a space under `aidlc/spaces/` for aidlc)
    logic: IF the saved framework is not found in the project THEN detection runs as FR1.5, and its reason says the saved framework was not found; the file is left as it is
    violation: none
    source: FR2.3
  - id: BR1.5
    statement: A usable saved framework is followed without asking.
    category: policy
    applies_to: Detection (C1)
    trigger: an ok file whose framework is found in the project
    logic: IF the file is ok and its framework is found THEN the detection takes it with source file and no question is asked
    violation: none
    source: FR2.2, AC1.2.1
  - id: BR2.1
    statement: The file is written only for a choice the person confirmed.
    category: authorization
    applies_to: ProjectFile
    trigger: a confirmed choice from the first-open screen (U4) or the switch (U8)
    logic: IF the write is not called from a confirmed choice THEN nothing is written; reading and detecting never write
    violation: no write happens
    source: FR2.1, FR4.3, AC1.2.2
  - id: BR2.2
    statement: Only aidlc or speckit can be written.
    category: validation
    applies_to: WriteResult
    trigger: every write
    logic: IF the framework given is not aidlc or speckit THEN refuse with invalidFramework
    violation: nothing is written
    source: FR2.1
  - id: BR2.3
    statement: A rewrite keeps the other keys of a readable file.
    category: constraint
    applies_to: ProjectFile
    trigger: a write over a file whose read was ok or unknownFramework
    logic: IF the existing file is an object at version 1 THEN keep every key, set version 1 and the new framework
    violation: none
    source: C2
  - id: BR2.4
    statement: An unreadable or invalid file is replaced (Q1).
    category: policy
    applies_to: WriteResult
    trigger: a write over a file whose read was unreadable or invalid
    logic: IF the existing file cannot be kept THEN write a fresh file with version 1 and the framework, and the result says replaced
    violation: none
    source: FR2.1
  - id: BR2.5
    statement: A newer app's file is never downgraded (Q2).
    category: constraint
    applies_to: WriteResult
    trigger: a write over a file whose read was unknownVersion
    logic: IF the existing version is higher than 1 THEN refuse with newerVersion, naming the file and its version
    violation: nothing is written
    source: C2
  - id: BR2.6
    statement: The write is atomic.
    category: constraint
    applies_to: ProjectFile
    trigger: every write
    logic: IF the write runs THEN `.thadeus/` is created when missing, the new content goes to a temp file in the same folder, and a rename puts it in place; IF any step fails THEN the temp file is removed and the result is writeFailed with the reason
    violation: the old file stays as it was
    source: C2
```

| Rule | In short |
|---|---|
| BR1.1 | Fixed path, inside the root |
| BR1.2 | Read gives ok or one of five reasons |
| BR1.3 | An unusable file falls back to detection and says why |
| BR1.4 | A saved framework not in the project falls back and says why |
| BR1.5 | A usable file is followed without asking |
| BR2.1 | Write only for a confirmed choice |
| BR2.2 | Only aidlc or speckit |
| BR2.3 | Other keys are kept |
| BR2.4 | A broken file is replaced, and the result says so |
| BR2.5 | A newer version is refused |
| BR2.6 | Temp file, then rename |
