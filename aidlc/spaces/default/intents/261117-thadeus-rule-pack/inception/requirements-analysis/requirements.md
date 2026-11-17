# Requirements: US-0212 THADEUS cost rule pack

Source: the story in `docs/features/epic-02-cost-and-models.md` and the answers in `requirements-analysis-questions.md` (Q1–Q6).

## Intent analysis

Make each intent cheaper without changing AI-DLC. AI-DLC builds every stage's rules from whole memory files with fixed names, and those rules also reach delegated agents. The app keeps a short, marked block of cost rules inside those files, which the person turns on, edits and turns off from the app. The rules are text the model reads, not enforcement. Type: enhancement, one Configuration sub-block plus a main-process writer.

## Functional requirements

**FR1 Settings view**
- FR1.1 A "cost rules" sub-block in the Configuration arm (Q1), in the LCARS look, with an on/off switch and an editor for the pack's lines, grouped by target file.
- FR1.2 The view names every space it will write to and, per space, whether the block is present.

**FR2 Marked block**
- FR2.1 The app writes only between `<!-- thadeus:cost-rules:start -->` and `<!-- thadeus:cost-rules:end -->`. Bytes outside the markers stay identical.
- FR2.2 Turning on adds the block at the end of the target file when absent, or replaces its content when present.
- FR2.3 Turning off removes the block, markers included, so the file is byte-identical to how it was before the pack (Q2).
- FR2.4 A file with a broken marker pair (one marker, or start after end) is not written; the view names the file and the problem.

**FR3 Targets**
- FR3.1 General lines go in `project.md`; phase lines go in `phases/<phase>.md` (targeted tests in `phases/construction.md`).
- FR3.2 The pack is written to every space under `aidlc/spaces/` (Q5), the same lines in each.

**FR4 The first pack** (English, Q4; a handful of lines)
- FR4.1 `project.md`: `main` delegates reading and writing source code to the developer agent and keeps only its short report.
- FR4.2 `project.md`: agents report in a few lines, without file dumps.
- FR4.3 `project.md`: never read `node_modules`, lock files, `dist`/`build` or large logs.
- FR4.4 `phases/construction.md`: during the TDD loop only the test being worked on runs; the full suite runs once before Build and Test is approved.

**FR5 Preview and write**
- FR5.1 Before writing, the app shows a diff per file and writes only on the person's confirmation.
- FR5.2 A file that changed since the diff was made is not written; the view asks to show the diff again.
- FR5.3 After writing, the app runs `aidlc engine graph compile` (fixed arguments) and shows its output.
- FR5.4 When the compile fails (non-zero exit, timeout or missing `aidlc`), every file written in that save is put back as it was, and the view says so.

**FR6 Clash warning** (Q3)
- FR6.1 A fixed list of clash keyword pairs (for example "only the test being worked on" / "full suite", "suite green") is checked against each space's `team.md` and `org.md`.
- FR6.2 Edited and new lines are checked against the same list. A warning quotes the pack line and the clashing rule, with file and space. It does not block the save.

## Non-functional requirements

- **NFR1** The app writes no AI-DLC file other than `project.md` and `phases/*.md` under `aidlc/spaces/*/memory/`, and only inside the markers. Checked by a test over the writer.
- **NFR2** The shipped pack is at most 8 lines and 800 characters in total, since the files are read on every stage.
- **NFR3** Every text goes through `t()` with keys in `sv.json` and `en.json`; status is never shown by colour alone; every control works by keyboard.
- **NFR4** Every path goes through `resolveInRoot`; writes are atomic (write then rename).

## Constraints

- AI-DLC is never changed or forked; only the project-owned memory files are touched.
- The compile and any CLI call use `runFixed` with fixed arguments and a timeout.
- TDD, 80% line coverage, ESLint and Prettier (team rules).

## Assumptions

- `aidlc engine graph compile` compiles the active space; it is run once per save. A failure in any space restores every file of that save. [assumption]
- A space created later has no block until the person saves the pack again; FR1.2 shows it as absent. [assumption]
- Turning the pack on in this repository happens through the app after the build, as part of the manual release check (Q6).

## Out of scope

- Enforcing the rules, or starting fresh sessions (US-0213).
- Rules for agents' model or effort (US-0210).
- A pack per space, or several packs.

## Open questions

None.
