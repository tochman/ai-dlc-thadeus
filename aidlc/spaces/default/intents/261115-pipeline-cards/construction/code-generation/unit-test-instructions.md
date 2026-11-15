# Unit Test Instructions — US-0411 Pipeline cards

## Setup

Existing vitest 5.1.0 config (`vitest.config.mjs`), projects `main` (node) and `renderer` (jsdom, Swedish locale, `tests/renderer/setup-i18n.js`). No new dependency or config.

## Run this work's tests

```bash
npx vitest run tests/main/parsers.test.js tests/renderer/Pipeline.test.jsx
```

This command must be runnable before the first Red step (the new renderer file is created in Step 5; until then vitest runs the parser file alone).

## Tests (about 8)

- `tests/main/parsers.test.js` — `parseRuntimeGraph` unit counts; `mergePipeline` `units` (bolt_dag total, instance fallback, null) and `failed`. (FR2.1, FR3.4)
- `tests/renderer/Pipeline.test.jsx` — `levelBar` (≤ 8 units, > 8 units, no units); rendered card anatomy, state classes, level label, click opens files. (FR1–FR3, FR5)

## Coverage

The team floor is 80% line coverage on the full suite; Build and Test checks it there (coverage tooling is not set up yet in this repository). No unit-scoped threshold.

## Mocking and data

No mocks. Parser tests build small runtime-graph objects inline, as the existing US-0011 test does. Renderer tests pass a hand-built `pipeline` prop (`{ phases: [{ name, stages: [...] }] }`), `files: []`, `cost: null`, and render under the existing i18n setup.
