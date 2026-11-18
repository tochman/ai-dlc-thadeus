# Integration Test Instructions: v0.2.9 release

No new integration boundaries. The existing integration tests run in the full suite (`npx vitest run tests/`). The real integration check for this release is the hand check in the built app, done before the tag (FR2):

- **US-0213/US-0026:** resume at a gate after `/clear`, the PreCompact instruction, real opencode events, the LCARS look.
- **US-0214:** live hook rows for the main chat and a dispatched agent; legend toggles and the y-axis rescale.
- **US-0210:** the model-profile question shows within 2 s.
- **US-0303:** the Velocity view.
