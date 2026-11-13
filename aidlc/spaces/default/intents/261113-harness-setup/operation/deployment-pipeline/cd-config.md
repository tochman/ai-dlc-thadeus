# CD Configuration: US-0802 Set up AI-DLC for another harness

Source: `.github/workflows/release.yml`. No change for this work.

| Trigger | Jobs | What this work needs from them |
|---------|------|--------------------------------|
| `pull_request` | verify (`npm ci` + 161 tests), build-mac, build-linux | Nothing new |
| tag `v*.*.*` | Same, plus the release | Not used |

- **Gate:** CI green before merge.
- **Environments:** none (desktop app).
- **Feature flags:** none. Setup still defaults to Claude Code.
