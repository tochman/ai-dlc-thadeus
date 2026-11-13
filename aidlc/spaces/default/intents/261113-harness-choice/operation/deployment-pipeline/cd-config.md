# CD Configuration: US-0801 Choose the harness per project

Source: `.github/workflows/release.yml`. No change for this work.

| Trigger | Jobs | What this work needs from them |
|---------|------|--------------------------------|
| `pull_request` | verify (`npm ci` + 150 tests), build-mac, build-linux | Nothing new: no dependencies or build config changed |
| tag `v*.*.*` | Same, plus the GitHub release | Not used: no tag |

- **Quality gate:** CI must be green before merge.
- **Environments:** none (desktop app).
- **Feature flag:** none. The harness defaults to Claude Code, so existing projects behave as before.
