# CD Configuration: US-0901 See a project's AI-DLC configuration

Source: `.github/workflows/release.yml`. No change for this work.

| Trigger | Jobs | What this work needs from them |
|---------|------|--------------------------------|
| `pull_request` | verify (`npm ci` + 181 tests), build-mac, build-linux | Nothing new |
| tag `v*.*.*` | Same, plus the release | Not used |

- **Gate:** CI green before merge.
- **Environments:** none (desktop app).
- **Feature flags:** none. The view only reads; it changes nothing in a project.
