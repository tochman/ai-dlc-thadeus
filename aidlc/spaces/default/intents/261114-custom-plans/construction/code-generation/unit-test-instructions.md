# Unit Test Instructions: v0.2.4

## Framework

The project already has Vitest 5 configured (`vitest.config.mjs`) with two projects:

- `tests/main/**` runs in node.
- `tests/renderer/**` runs in jsdom with Testing Library. Its setup file `tests/renderer/setup-i18n.js` loads the shared i18n.

No new test configuration is needed. Monaco is mocked in jsdom with `vi.mock('@monaco-editor/react', …)` and `vi.mock('monaco-editor/esm/vs/editor/editor.api', …)`, so the tests never load the real editor or workers.

## Runner check (before the first test step)

```bash
npx vitest run tests/main/settings.test.js
```

## Commands per story

Each command runs only that story's test files.

| Story | Command |
|-------|---------|
| US-0006 | `npx vitest run tests/renderer/picker.test.jsx tests/renderer/pickerSmoke.test.jsx tests/renderer/QuestionPopup.test.jsx tests/main/questions.test.js` |
| US-0409 | `npx vitest run tests/renderer/AboutDialog.test.jsx` |
| US-0207 | `npx vitest run tests/renderer/tokenFlow.test.js tests/renderer/TokenView.test.jsx` |
| US-0903 | `npx vitest run tests/main/plans.test.js tests/renderer/PlansView.test.jsx` |
| US-1001 | `npx vitest run tests/main/fileWrite.test.js tests/renderer/EditorPanel.test.jsx` |

The full suite (`npm test`) runs before each story's PR and in Build and Test, to keep the existing tests green (NFR1).

## Expected coverage targets

No line-coverage floor applies to this plan (ultra-express, Minimal strategy). The target is at least one test per requirement and a happy-path test per new component (NFR2), about 22 new tests:

| Requirement | Tests |
|-------------|-------|
| FR1.1 | 4 picker fixture tests and 1 popup close test |
| FR1.2 | 3 About window tests |
| FR1.3 | 5 token logic tests and 4 view tests |
| FR1.4 | 7 plans tests in main and 6 view tests |
| FR1.5 | 4 safe-write tests and 5 editor tests |
| NFR3, NFR4, NFR5, NFR6 | covered by the label, stale-ledger, root-confinement and read-only cases above |

## Mocking and stubbing

- **Main:** inject `exec` (the pattern `aidlcWrite.js` and `aidlcConfig.js` already use) so `aidlc engine scope save` and `aidlc engine graph compile` are asserted by their arguments, never run.
- **File writes:** run in a temp project folder created with `fs.mkdtemp` inside the OS temp folder from `os.tmpdir()`, created and removed by each test. Symlink tests create the link there.
- **Renderer:** stub `window.bridge` with `vi.fn()` per channel. Stub the terminal context's `type` to assert typed lines and `submit: false`.
- **Picker:** read the screens captured in Step 2 from `tests/fixtures/picker/*.txt`. Never hand-write the picker layout for these tests.

## Test data

- `tests/fixtures/picker/`: the captured Claude Code screens (single, batch, gate).
- A small `usage-ledger.json` fixture with one in-flight `workflows["intent:<uuid>"]` node, plus a second reading with higher totals, for the rate.
- A temp project with `aidlc/scopes/demo.md` (own plan, with the composed-grid block), `.claude/scopes/aidlc-demo.md` (harness copy) and `.claude/scopes/aidlc-bugfix.md` (stock plan).
