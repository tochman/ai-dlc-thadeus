# Functional Design Questions: u2-framework-file (US1.2, US-1408)

The contract (C2) already settles the file's shape, the atomic write, that unknown keys are kept, and that a missing, unreadable or unknown file falls back to detection and says why. These three corners are still open.

## Q1. [Developer] Writing over a file that cannot be read

The person confirms a framework, but the existing `.thadeus/project.json` is not valid JSON (for example a half-resolved git conflict). Its keys cannot be kept. What should the write do?

A. Replace it with a fresh file (`version: 1` and the framework), and say the old content was replaced
B. Refuse the write, name the file and the reason, and leave it for the person to fix
X. Other (please specify)

[Answer]: A

## Q2. [Developer] Writing over a file from a newer app version

The existing file has a `version` higher than 1, written by a newer THADEUS. This app reads it as unknown and falls back to detection. If the person then confirms a framework here, what should the write do?

A. Refuse the write and say the file belongs to a newer app version, so the newer app's data is never downgraded
B. Rewrite it as version 1, keeping every key it has
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] A saved framework whose folder is gone

The file says `speckit`, but the project has no `.specify/` folder (or it says `aidlc` and there is no `aidlc/spaces/`). For example, someone deleted the folder or checked out an old branch. What should the app do?

A. Fall back to detection (FR1.5) and say the saved framework was not found in the project; the file is left as it is
B. Follow the saved framework anyway and show its empty views
X. Other (please specify)

[Answer]: A
