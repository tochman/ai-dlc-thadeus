# Unit Test Instructions — US-0058

## Runner

Vitest 5.1.0, `main` project. Run the focused existing coverage before edits:

```bash
npx vitest run --project main tests/main/opencodeUsage.test.js tests/main/agentEvents.test.js tests/main/agentActivity.test.js tests/main/pulse.test.js
```

As tests are added, include their exact file paths in this command. Run it after each Red/Green/Refactor slice. Run the full suite (`npx vitest run tests/ --coverage`) in Build and Test; this quick-fix scope adds no new coverage threshold.

## Test scope

- Verify the read-only database timeline mapping with deterministic fixtures; do not depend on the person's live opencode database.
- Cover one successful main-session/tool flow and edge cases for a child session, absent optional fields, malformed records, and a missing database.
- Verify generated Activity rows do not expose prompts, message text, or raw tool input.
- Verify Pulse receives only supported tool touches and project-relative paths.
- Preserve existing opencode Cost attribution tests.

## Test data and isolation

Use the repository's Vitest mocks and in-memory fixtures. Inject database access where practical; never write to or mutate `~/.local/share/opencode/opencode.db` from tests. Keep fixtures isolated per test and use the stored opencode record shapes rather than guessed output.
