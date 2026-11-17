# Build Instructions: US-0210 model profile switch

Nothing new to install or configure. This work adds no dependency.

1. Dependencies: `npm ci` (its `postinstall` rebuilds native deps for Electron).
2. Build the bundles: `npx electron-vite build` (writes `out/`). The full `npm run build` also packages the `.dmg`; that is the release check by hand, not this stage's.
3. Checks: `npx eslint .` (0 errors), `npx prettier --check .`, `npm run coverage` (full suite plus the 80% line floor from `vitest.config.mjs`).
4. Run it: `npm run dev`, then open a project's Configuration arm, section "Model profiles".

Troubleshooting: the shell-hook timing tests (`tests/main/dialogScript.test.js`, `tests/main/agentHooksGuard.test.js`) measure wall-clock time in ms and fail on a heavily loaded machine. Rerun with `--maxWorkers=2`, or when the machine is idle.
