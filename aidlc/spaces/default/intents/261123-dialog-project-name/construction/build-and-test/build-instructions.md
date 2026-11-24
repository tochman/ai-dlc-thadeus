# Build Instructions: US-0046

Run in the worktree `.claude/worktrees/fix-0046` (branch `fix/US-0046`, `origin/main` merged in at `279a0ea`).

## Setup

- Node and npm as in `package.json`; `npm ci` once in the worktree.
- No env vars, config files or local services are needed for the tests.

## Build and checks

```bash
npx vitest run tests/ --coverage   # full suite, v8 coverage, 80% line floor from vitest.config.mjs
npx eslint .                        # 0 errors required
npx prettier --check .              # must be clean
```

The packaged app (`.dmg`, `.deb`) is not built for a fix; the release pull request builds it.

## Troubleshooting

- A `scripts` project test can be slow; it is retried twice by the config.
- If coverage fails on one file, check that file's own floor in `vitest.config.mjs`; never lower it.
