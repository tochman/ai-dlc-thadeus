# Build Instructions: US-0506 agent dialogs

## Sources

- Per-unit plans: `construction/u1-questions/code-generation/code-generation-plan.md` … `construction/u5-notifications/code-generation/code-generation-plan.md`
- Per-unit test instructions: `construction/<unit>/code-generation/unit-test-instructions.md` (u1–u5)
- Per-unit code summaries: `construction/<unit>/code-generation/code-summary.md` (u1–u5)
- `package.json` scripts, `vitest.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`

## Prerequisites

- macOS or Linux, Node 22 (checked with v22.14.0, npm 11.7.0).
- `sh`, `cat`, `mv`, `rm`, `date`, `sleep` on the path (the hook script tests spawn them); `dash` when present is tested too.
- Symbolic links creatable in the test temp folder (u4 installer tests).

## Install

```sh
npm ci
```

No unit added a dependency. `postinstall` rebuilds `node-pty` for Electron.

## Environment

None for the build or the tests. For a development run with real hooks: `THADEUS_AGENT_HOOKS=1 npm run dev`; `THADEUS_TIMING=1` turns on the timing log (`<userData>/logs/agent-timing.jsonl`) used by the manual release-Mac runs.

## Build

| Step | Command | Expect |
|---|---|---|
| Compile and bundle | `npx electron-vite build` | exit 0, `out/` written |
| Package (release only) | `npm run build:mac`, `npm run build:linux` | `.dmg` / `.deb` in `dist/` |
| Lint | `npm run lint` | 0 errors (warnings allowed) |
| Format | `npm run format:check` | "All matched files use Prettier code style!" |
| Tests with coverage | `npm run coverage` | all pass, line coverage ≥ 80% and every per-file threshold in `vitest.config.mjs` met |

## Troubleshooting

- A wall-clock test (hook script, watcher) fails once on a busy machine: it is retried up to twice with the same limit (US-0010). Three failures in a row is a real failure.
- `node-pty` load errors after a Node or Electron change: `npm rebuild` then `npx electron-builder install-app-deps`.
