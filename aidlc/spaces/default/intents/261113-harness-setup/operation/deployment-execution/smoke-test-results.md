# Smoke Test Results: US-0802 Set up AI-DLC for another harness

| Check | Where | Result |
|-------|-------|--------|
| `npm ci` and the full suite (161 tests) | GitHub Actions, verify | Pass |
| macOS and Linux package builds | GitHub Actions | Pass |
| Setting up a scratch folder with opencode, and adding a harness from Projektinställningar | Manual, `npm run dev` | Not run here: it needs the desktop app and a real project in front of a person |

The automated checks passed. The manual check in the running app is left to the person:

1. Set up an empty scratch folder with opencode.
2. Add Claude Code to it from Projektinställningar.
3. Confirm the existing files are kept, and accept the offer to switch the agent tab.
