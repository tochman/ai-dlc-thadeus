# Rules: U3 u3-speckit-setup

This file holds the source-of-truth rules for U3, story US2.1 (US-1405). Sources:
- U3 in `unit-of-work.md`;
- FR3, NFR3 and NFR4 in `requirements.md`;
- contract C3;
- the existing AI-DLC setup in `src/main/setup.js` (US-0503), which U3 mirrors.

```yaml
rules:
  - id: BR3.1
    statement: Before anything runs, the app reads whether `specify` is on the login shell's PATH and its version, and which supported harnesses the project has.
    category: validation
    applies_to: Setup preview
    trigger: speckit:setupPreview
    logic: specify --version via runFixed (fixed args, no shell, timeout); harnesses = claude if .claude/ exists, opencode if .opencode/ or opencode.json exists
    violation: a missing specify gives specifyOnPath false and the install hint, never an error dialog
    source: FR3.2
  - id: BR3.2
    statement: The harness is the project's own. With none or two, the person picks claude or opencode in the preview. Any other value is refused.
    category: validation
    applies_to: Setup run
    trigger: speckit:setup
    logic: IF harness not in [claude, opencode] THEN throw before running
    violation: thrown error naming the value
    source: FR3.1, NFR6
  - id: BR3.3
    statement: Setup runs only after a preview for the same project and harness, and never twice at once for one project.
    category: constraint
    applies_to: Setup run
    trigger: speckit:setup
    logic: IF no preview OR preview.harness differs OR a run is in progress for this root THEN throw
    violation: thrown error (errors.previewFirst / errors.setupRunning, reused)
    source: FR3.1
  - id: BR3.4
    statement: The command is fixed, `specify init --here --integration <harness>`, run in the project folder with a timeout. The exact flag form is confirmed on the test project.
    category: constraint
    applies_to: Setup run
    trigger: speckit:setup
    logic: runFixed(specify, [init, --here, --force, --non-interactive, --integration, harness], {cwd: root, timeout}); specify resolved via toolPath with `specify` in TOOL_IDS
    violation: n/a
    source: FR3.1, NFR4
  - id: BR3.5
    statement: A failure or timeout returns ok false with its output and code (notFound, failed, timeout). The app changes nothing else.
    category: policy
    applies_to: Setup run
    trigger: specify exits non-zero or times out
    logic: return {ok:false, error:{code,message}, output}; no project-file write by the app
    violation: n/a
    source: FR3.3
  - id: BR3.6
    statement: The app never installs `specify`. The install hint is text only.
    category: constraint
    applies_to: Setup preview
    trigger: specify missing
    logic: show `uv tool install specify-cli` as text; no install command exists in code
    violation: n/a
    source: FR3.2
  - id: BR3.7
    statement: `specify init` is the only writer to `.specify/` and `specs/`. The app's own code writes nothing there.
    category: constraint
    applies_to: All U3 code
    trigger: always
    logic: no fs write path under .specify/ or specs/ in U3 code (test asserts)
    violation: test failure
    source: NFR3
  - id: BR3.8
    statement: After a successful setup, the project is detected again. U1's setup watcher sees `.specify/` appear and pushes `project:detected`.
    category: policy
    applies_to: Setup run
    trigger: ok result
    logic: return ok; detection follows from U1's watcher (no extra write)
    violation: n/a
    source: FR3.1
  - id: BR3.9
    statement: Every label goes through t() in sv and en, in the LCARS look.
    category: constraint
    applies_to: UI
    trigger: build
    logic: i18nKeys test passes
    violation: test failure
    source: NFR1
```

| IDs | Summary |
|---|---|
| BR3.1, BR3.6 | Preview: whether specify is on the PATH, its version, the harnesses found, and the install hint |
| BR3.2–BR3.4 | Run: the harness check, preview first, one run at a time, the fixed command |
| BR3.5, BR3.8 | Result: failure output, and detection again after success |
| BR3.7, BR3.9 | Read-only for the app; i18n and LCARS |
