# Smoke Test Results: US-0030

The story is not released yet; it ships with v0.2.10.

| Check | Where | Result |
|-------|-------|--------|
| App bundles and packages | `npm run build` (Build and Test) | Passed |
| Agent progress behaviour | jsdom and Node unit tests (Build and Test) | Passed, 1931/1931 |
| In the running app: task, activity text, "waiting for <agent>", "seen N ago" | Built app, by hand | Pending: the team's manual `.dmg` check before the v0.2.10 tag |

Manual steps for that check are in `operation/deployment-pipeline/deployment-strategy.md` (Smoke test after release).
