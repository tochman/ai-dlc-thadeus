# Unit Test Instructions: U9 u9-feature-token-log

## Framework

vitest 5.1.0, `main` project (node environment), as set up in `vitest.config.mjs`. No new dependency.

## Run this Unit's tests

```bash
npx vitest run --project main tests/main/speckitTokens.test.js tests/main/tokenReadings.test.js tests/main/tokenHistory.test.js tests/main/speckitFeatures.test.js tests/main/agentAdapters.test.js
```

Runnable before the first Red step: all five files exist except `speckitTokens.test.js`, which Step 3/6 creates.

Baseline (Step 2, 2026-11-24, before any test change): `Test Files 4 passed (4)`, `Tests 79 passed (79)`.

## Tests (about 22)

| File | New tests |
|---|---|
| `tests/main/speckitTokens.test.js` | cursor store (3), Claude turn, first sight, path checks (3), opencode increase and ignored event, bucket choice, unknown model, symlinked `.thadeus`, write spy, queue order: about 14 |
| `tests/main/tokenReadings.test.js` | `mergeReading` add, replace inside 30 s, append, thin: 4 |
| `tests/main/tokenHistory.test.js` | id and model kept per call: 1 |
| `tests/main/speckitFeatures.test.js` | `activeFeature` valid, missing, missing folder: 2 |
| `tests/main/agentAdapters.test.js` | opencode `usage` with and without tokens: 1 |

## Coverage targets

- `src/main/speckitTokens.js`: 80% lines, its own entry in `vitest.config.mjs` (checked by this command with `--coverage` only for that file's threshold).
- The project-wide 80% floor is measured by Build and Test on the full suite, not by this command.

## Mocking and test data

- Temp directories (`fs.mkdtemp` under the OS temp dir) for the project root, `userData` and a fake `~/.claude/projects`; symlinks made there for the link-out cases. No real home folder is read.
- Transcripts are small JSONL fixtures written by the test (assistant lines with `message.id`, `message.model`, `usage`).
- `.specify/feature.json` and `specs/<dir>/` created per test; rates passed in as a plain object (`ratesOf`).
- The fs-write spy wraps `writeAtomic` through the module's injected writer, not a global mock.
