# Deployment Execution Questions: v0.2.9

## Q1. [Release manager] The hand checks in the CI-built `.dmg`

The `.dmg` from release PR #72's `build-mac` run is at `dist/ci-v0.2.9/THADEUS-0.2.9-universal.dmg`. Install it, open it, and check:

- **The `.dmg` itself (FR3):** About shows 0.2.9.
- **US-0213/US-0026 (FR2.1):** resume at a gate after `/clear`, the PreCompact instruction, real opencode events, and the LCARS look.
- **US-0214 (FR2.2):** Agent progress shows live rows for the main chat and a dispatched agent; the legend toggles hide series, and the y-axis rescales.
- **US-0210 (FR2.3):** the model-profile question shows within 2 s.
- **US-0303 (FR2.4):** the Velocity view shows intent, story and project metrics.

What was the result?

A. All checks pass: merge, tag v0.2.9 and publish
B. Something failed (please say what); it becomes an EPIC-00 fix in this release before the tag
X. Other (please specify)

[Answer]: A
