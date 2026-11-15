# Functional Design questions: u2-permissions

No questions for this Unit. Everything it needs is settled upstream: the permission choices are the agent's own (Claude Code's `PermissionRequest` hook with its `permission_suggestions`, opencode's `permission.asked` with once, always and reject), no choice is ever made by the app on its own (FR3.4), the amber permission layout is approved (mockup M3), and the channel, store and dialog come from u1-questions.
