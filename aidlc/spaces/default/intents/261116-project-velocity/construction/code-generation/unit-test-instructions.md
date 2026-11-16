# Unit Test Instructions: US-0303 Project velocity

## Framework

vitest 5.1.0 from `vitest.config.mjs`, with two projects: `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale). No setup beyond `npm ci`.

## Run this work's tests

The runner is ready before the first Red step:

```bash
npx vitest run tests/main/velocity.test.js tests/main/velocityLoad.test.js tests/main/git.test.js tests/main/ipc.test.js tests/main/preload.test.js tests/main/i18nKeys.test.js tests/renderer/VelocityView.test.jsx
```

## Scope (Minimal strategy, about 14 new tests)

| File | Tests | Requirements |
|---|---|---|
| `tests/main/velocity.test.js` | `intentMetrics` (active, parked, phases and stages, waiting, reviews, running), `storyMetrics` (intent start, git fallback, unknown span, per release), `projectMetrics` (week and month, averages, archived), `parseMarkerHistory`, 20 000-event timing | FR1.1–FR1.4, FR2.1–FR2.3, FR3.1–FR3.4, FR4.1, FR4.4, NFR3 |
| `tests/main/velocityLoad.test.js` | missing, unreadable and empty records kept apart and named | FR3.4, FR4.2 |
| `tests/main/git.test.js` (added to) | `storyMarkerHistory` with fixed args, and null when git fails | FR2.4, NFR4 |
| `tests/main/ipc.test.js`, `preload.test.js` (added to) | `project:velocity` and `getVelocity` | FR3.5 |
| `tests/renderer/VelocityView.test.jsx` | view, switch, unfinished, missing record, sources, intent tab, arm block | FR1.5, FR3.3, FR3.5, FR4.1–FR4.3, NFR2 |
| `tests/main/i18nKeys.test.js` (existing) | the same keys in sv and en | NFR1 |

## Expected coverage

The project floor is 80% line coverage (team rule). Build and Test checks it on the full suite, and no coverage threshold is changed here. The new `velocity.js` should be close to fully covered by its own tests.

## Mocking and test data

- Events are built inline as `{timeMs, event, fields}` objects with fixed local timestamps. Tests that bucket weeks set `process.env.TZ`, or build dates with local constructors.
- git is injected through the existing `{ exec }` option, as in `git.test.js`. No real repository is used.
- `loadVelocity` uses a temporary fixture root under `tests/fixtures/` (or `fs.mkdtemp` inside the project's test temp folder), following `crossMachineCost.test.js`.
- Renderer tests stub `window.bridge.getVelocity`, as the existing view tests stub the bridge.
