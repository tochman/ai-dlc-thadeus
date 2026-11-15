# Build Instructions: US-0410

Sources: `construction/code-generation/code-generation-plan.md`, `unit-test-instructions.md`, `code-summary.md`.

| Step | Command | Expect |
|---|---|---|
| Install | `npm ci` | no new dependency in this work |
| Build | `npx electron-vite build` | exit 0 |
| Lint / format | `npm run lint`, `npm run format:check` | 0 errors / clean |
| Tests with coverage | `npm run coverage` | all pass; 80% line floor and per-file thresholds met |
| This work's tests | the command in `unit-test-instructions.md` | all pass |
| Look in the app | `npm run dev`, open Settings | tabs in the rail; motion per animations setting |

Wall-clock script tests retry up to twice (`scripts` project, US-0010); three failures in a row is a real failure.
