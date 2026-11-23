# Test Instructions: US-0045

**Framework:** vitest. The `main` project (node) covers the event store, and the `renderer` project (jsdom, Swedish locale) covers the app shell. Run in the worktree `.claude/worktrees/fix-0045`.

**Run this fix's tests:**

```bash
npx vitest run tests/main/agentEvents.test.js tests/renderer/AppAlerts.test.jsx
```

**Related existing tests** (must stay green):

```bash
npx vitest run tests/renderer/AgentDialog.test.jsx tests/main/sessionHandoff.test.js
```

**Tests:**
- AC1, in `agentEvents.test.js`: a shown handoff page ends at its session's next session start or compaction; a page whose choice is under way stays; another session's page stays.
- AC2, in `AppAlerts.test.jsx`: an open dialog moves to a newly arrived message, with Previous reaching the old page; a closed dialog opens on the newest arrival.

**Test data and mocking:** the existing fakes in each file (a fake channel for the store, `window.bridge` for the app). No real hooks or terminals.

**Coverage:** the project floor is 80% line coverage, measured by Build and Test on the full suite.
