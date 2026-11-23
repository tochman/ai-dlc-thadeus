# Unit Test Instructions: US-0046

Run in the worktree `.claude/worktrees/fix-0046`.

## Setup

vitest 5.1.0, `renderer` project (jsdom, Swedish locale), configured in `vitest.config.mjs`. No new configuration. `npm ci` once in the worktree.

## Commands (this work only)

```bash
npx vitest run --project renderer tests/renderer/AgentDialog.test.jsx
npx vitest run --project main tests/main/i18nKeys.test.js
```

If Step 5 adds a test to the app shell:

```bash
npx vitest run --project renderer tests/renderer/AppShell.test.jsx
```

Lint and format the changed files:

```bash
npx eslint src/renderer/AgentDialog.jsx src/renderer/App.jsx tests/renderer/AgentDialog.test.jsx
npx prettier --check src/renderer/AgentDialog.jsx src/renderer/App.jsx src/renderer/theme.css src/shared/locales/sv.json src/shared/locales/en.json tests/renderer/AgentDialog.test.jsx
```

## Tests (Minimal, one per criterion)

1. `showProject` on: the page shows `agent-dialog-project` with the event's project name (AC1).
2. Two events from different projects: Next and Previous each show their own project (AC2).
3. `showProject` off: no `agent-dialog-project`; the where line reads as before (AC3).
4. `i18nKeys.test.js` covers the new key in both locales (AC4).

## Mocking and data

Use the existing helpers in `AgentDialog.test.jsx` for events and `projectNameOf`. Project names "alpha" and "beta". No real IPC.

## Coverage

The project's 80% line floor over `src/**` stays; `AgentDialog.jsx` keeps its own floor. Not lowered.
