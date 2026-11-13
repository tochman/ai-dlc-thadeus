# Health Check Report: US-0801 Choose the harness per project

- **Target:** the `main` branch of tochman/aidlc-dash. This is a desktop app, so there is no running service to probe.
- **Health signal:** CI on PR #14 was all green, and the merge commit `a19b0b42` is on `main`.
- **Error signal:** an unknown harness id is refused in the main process. A missing CLI shows one sentence in the agent tab and starts nothing.
- **Status:** healthy. Only the manual check in the running app from `smoke-test-results.md` is outstanding.
