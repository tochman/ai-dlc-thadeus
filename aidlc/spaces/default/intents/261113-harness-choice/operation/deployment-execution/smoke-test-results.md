# Smoke Test Results: US-0801 Choose the harness per project

| Check | Where | Result |
|-------|-------|--------|
| `npm ci` and the full suite (150 tests) | GitHub Actions, verify job | Pass |
| macOS package build | GitHub Actions, build-mac | Pass |
| Linux package build plus glibc check | GitHub Actions, build-linux | Pass |
| Choosing opencode in the running app, Resume and quick commands in the opencode tab, switching back | Manual, `npm run dev` | Not run here: needs the desktop app in front of a person |

The automated checks passed. The manual check in the running app is left to the person:

1. Open Projektinställningar → Agent-terminal → opencode. The agent tab restarts as "opencode".
2. Use Resume and one quick command in the opencode tab.
3. Switch back to Claude Code.
