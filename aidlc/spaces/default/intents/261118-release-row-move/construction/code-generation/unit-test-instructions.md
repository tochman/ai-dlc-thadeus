# Unit Test Instructions: US-0029 release row move

## Setup

vitest 5.1.0, already configured. The `main` project runs `tests/main/**/*.test.js` in node. Nothing to install.

## Run

```bash
npx vitest run tests/main/releasesPlan.test.js tests/main/releases.test.js
```

This command runs on the unchanged tree before the first Red step.

## Tests to write (4, in `tests/main/releasesPlan.test.js`)

| Test | Requirement |
|------|-------------|
| `removePlanRows` drops the story's slice-table row; every other line stays | FR1 |
| `removePlanRows` on the last row of a heading-plus-table file gives the heading only | FR2 |
| `setStoryRelease` v1.0.0 then v1.1.0: `1.0.0.md` is `# Release plan v1.0.0\n`, `1.1.0.md` lists US-0101 | FR1, FR2, FR4 |
| Old plan file with a second story: only the moved row goes | FR1 |

FR3 is covered by the existing conflict test in `tests/main/fileWrite.test.js`; `dropPlanRow` uses the same `writeFileSafe(…, { expectHash })` call.

## Coverage

The project floor is 80% line coverage. Build and Test checks it on the full suite; this run does not judge it.

## Mocks and data

No mocks. Reuse `PLAN`, `STORY`, `put`, `get` and `hashes` in the test file; the setStoryRelease tests use a temp folder, as today.
