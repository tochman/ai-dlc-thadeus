# Contract Summary: EPIC-14 Spec Kit

Sources:
- the Units (`unit-of-work.md`) and the dependency graph (`unit-of-work-dependency.md`);
- the requirements (`requirements.md`);
- the answers in `contract-design-questions.md`;
- the existing IPC conventions in `src/main/ipc.js`: channels named `domain:verb` in the `handlers` map; a handler that throws reaches the renderer as a rejected promise; a failure the user should see is returned as `{ ok: false, error: { code, message } }`; push events go through `sender.send`.

There is no external API. Every contract is in-process, except C2, which is a file committed to the repository.

## Contracts

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| C1 | U1 u1-framework-views | U2, U4–U10, renderer | IPC push `project:detected` (extended) | U1 |
| C2 | U2 u2-framework-file | U1, U4, U8, other clones | Shared file `.thadeus/project.json` | U2 |
| C3 | U3 u3-speckit-setup | U4, U8 | IPC `speckit:setupPreview`, `speckit:setup` | U3 |
| C4 | U4 u4-framework-choice | renderer | IPC `project:frameworkScan`, `project:chooseFramework` | U4 |
| C5 | U6 u6-speckit-features | U5, U9, U10, renderer | IPC `speckit:features` and push `speckit:changed` | U6 |
| C6 | U7 u7-constitution | U5, renderer | IPC `speckit:rules` | U7 |
| C7 | U5 u5-speckit-commands | agent terminal | Function `speckitCommand(harness, name, args)` and the existing terminal send | U5 |
| C8 | U9 u9-feature-token-log | Tokens view | Token log file under `.thadeus/tokens/` | U9 |
| C9 | U10 u10-speckit-agent-status | popup, progress view | IPC `agents:progress` (extended) | U10 |
| C10 | U8 u8-framework-switch | Project settings | IPC `project:switchPreview`, `project:switch` | U8 |

## Specs

### C1: Framework in the detection push

This extends the current `{ isAidlc, activeSpace, spaces }` object. `isAidlc` stays for one release as `framework === 'aidlc'`, then goes.

```yaml
# shared-schema: Detection
framework: aidlc | speckit | null   # null = the person must choose (US2.2)
source: file | detected | ask       # where the value came from
found: { aidlc: boolean, speckit: boolean }
reason: string | null               # set when source != file (FR2.3); text via t()
views: [string]                     # ids from the one shared view list (FR1.2)
activeSpace: string | null          # AI-DLC only, unchanged
spaces: [string]                    # AI-DLC only, unchanged
```

### C2: `.thadeus/project.json` (Q1 = A)

```yaml
# shared-schema: ProjectFile, version 1
version: 1          # integer; an unknown version falls back to detection and says why
framework: aidlc | speckit
# Unknown extra keys are kept when the file is rewritten. The write is atomic (temp file, then rename).
```

Read result: `{ ok: true, value }`, or `{ ok: false, reason: missing | unreadable | invalid | unknownVersion | unknownFramework }`.

### C3: Spec Kit setup

```yaml
# IPC
speckit:setupPreview(projectId) -> { specifyOnPath: boolean, installHint: "uv tool install specify-cli",
                                     harnesses: [claude | opencode], command: [string] }
speckit:setup(projectId, harness) -> { ok: true, output: string } | { ok: false, error: { code: notFound | failed | timeout, message }, output: string }
```

`specify init` runs with fixed arguments and no shell, with a timeout. A timeout returns `timeout`, and the project is left as it was in the app.

### C4: First open and the choice

```yaml
project:frameworkScan(projectId) -> { found: { aidlc: boolean, speckit: boolean }, cli: { aidlc: boolean, specify: boolean }, proposal: aidlc | speckit | null }
project:chooseFramework(projectId, framework) -> { ok: true, file: ".thadeus/project.json" | null, next: setupAidlc | setupSpeckit | none }
```

Nothing is written before this call. `file` is null when nothing was written: the chosen framework was not found and its setup comes first (US-1406 BR4.6, an additive change). After a write, a `project:detected` push (C1) is sent before the call returns.

### C5: Spec Kit features

```yaml
speckit:features(projectId) -> {
  version: { found: string | null, supported: boolean },  # warning when newer than v1.4.x (NFR5)
  features: [ { dir: string, number: string | null, name: string, active: boolean,
                flow: { spec: bool, clarify: bool, plan: bool, tasks: bool, implement: bool, converge: bool },
                tasks: { done: int, total: int, skipped: int,
                         phases: [ { name: string, round: int | null,
                                     items: [ { id: string, parallel: bool, story: string | null, done: bool } ] } ] },
                files: [string] } ],
  active: string | null,     # null when feature.json is missing, unreadable, or names a missing folder
  errors: [ { path: string, reason: string } ] }
push speckit:changed { projectId, paths: [string] }   # within 2 s (NFR7)
```

### C6: Constitution and extensions

```yaml
speckit:rules(projectId) -> { constitution: { path: string, exists: bool },
  extensions: [ { id: string, commands: [string],
                  hooks: [ { when: before | after, command: string, mode: optional | mandatory | off } ] } ],
  errors: [ { path: string, reason: string } ] }
```

### C7: Command form

`speckitCommand(harness, name, args)` returns a string, which goes to the existing terminal control. The form per harness is set by the test project (open question O1). Until then the epic's `/speckit-<name> <args>` form is used for both harnesses.

### C8: Token log

`.thadeus/tokens/speckit-<feature-dir>.json` holds a feature's readings, and `.thadeus/tokens/speckit-project.json` holds the project-wide bucket. Both have the same shape as the existing per-intent token log. Each reading is credited to the feature active when it is read.

### C9: Agent progress

```yaml
agents:progress(projectId) -> { source: hooks | tasks | none,
  waiting: { question: string, agent: string } | null,
  feature: { name: string, done: int, total: int } | null }   # never throws when there is no AI-DLC workspace
```

### C10: Switch

```yaml
project:switchPreview(projectId, to) -> { setupNeeded: bool, inProgress: [ { kind: intent | feature, name: string } ], keeps: [string] }
project:switch(projectId, to) -> { ok: true } | { ok: false, error: { code, message } }
# The order is: setup if needed (C3 or US-0503), then the C2 write. A failed setup leaves the file and the views unchanged.
```

## Contract ownership rules

- Each contract has one owner, named in the table. The owner changes the spec, and its consumers' tests pin it.
- **IPC (C1, C3–C6, C9, C10):** the provider and the consumer ship in one build. A change is agreed in the owner's pull request, and the consumers are updated in that same pull request.
- **Additive changes are safe:** consumers ignore fields they don't know.
- **C2** is the only contract that crosses app versions. A breaking change bumps `version`, older apps fall back to detection, and unknown keys are always kept.

## Open questions

| Contract | Question | Blocks |
|---|---|---|
| C7 | The command form per harness (`/speckit-plan` or something else) is still to be confirmed on the test project. | U5 |
| C5 | Which file shows that `clarify`, `checklist` and `analyze` are done is still to be confirmed on the test project. | U6 |
