# CI/CD Pipeline: U9 u9-feature-token-log

Sources: `security-design.md` and `logical-components.md` (NFR Design), `functional-spec.md`, C8 in
`contract-summary.md`, and the team's Deployment practice. No component catalogue was made for this work (Domain
Design was not run), so the topology comes from `logical-components.md`. There is no `performance-design.md` for this library Unit. No
question was needed.

U9 is a main-process library in the desktop app. It adds no service, cloud resource, secret or pipeline stage. It
ships inside the existing pipeline unchanged.

## Stages and gates

| Stage | Where | What it checks for U9 | Gate |
|---|---|---|---|
| Unit tests + coverage | `verify` job, every PR into `main` | New module tests and opencode plugin tests (vitest `main` project); 80% line coverage per module and plugin (NFR8.1) | Blocks merge |
| ESLint + Prettier | `verify` job | New files | Blocks merge |
| gitleaks | `verify` job | No secret in new code or fixtures (none expected) | Blocks merge |
| Built-app e2e | `verify` job | Unchanged suite stays green; U9 has no view to test | Blocks merge |
| Packaging | `release/v0.3.0` PR: `build-mac`, `build-linux` | The cursor store path from `app.getPath('userData')` works in the packaged app | Blocks release merge |
| Release | Tag `v0.3.0` | Same `verify`, then publish | Manual `.dmg` check before the tag |

## Test data

Fixtures are small transcript JSONL files and a temp project directory with a `.specify/feature.json`; tests create
symlinks in a temp dir for the link-out cases. No real `~/.claude/projects` is read in CI.

## Rollout and rollback

Ships in v0.3.0 with Epic 14. Rollback is fix forward, as the team practice sets: mark the release a prerelease and
ship the fix as v0.3.1. A bad cursor file is harmless to delete: the next turn counts from first sight again
(NFR3.6), with no project file to repair.
