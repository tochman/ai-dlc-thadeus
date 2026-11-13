# CD Configuration: US-0701 i18n foundation and English

Source: `.github/workflows/release.yml`. No change for this work.

| Trigger | Jobs | What this work needs from them |
|---------|------|--------------------------------|
| `pull_request` | `npm ci` → `npx vitest run tests/` (138 tests, including the i18n key checks); `npm run build:mac`; `npm run build:linux` + glibc check | Installs the four new dependencies from `package-lock.json`; bundles `src/shared/locales/*.json` |
| tag `v*.*.*` | Same, plus the GitHub release | Not used: no tag for this story |

- **Quality gate:** the PR's CI must be green before merge.
- **Environments:** none. This is a desktop app, and merging to `main` is the delivery.
- **Feature flags:** none. The language setting defaults to Automatic, so Swedish users keep Swedish.
