# Smoke Test Results: US-0701 i18n foundation and English

| Check | Where | Result |
|-------|-------|--------|
| `npm ci` with the new dependencies | GitHub Actions, verify job | Pass |
| Full test suite, 138 tests, including the i18n key checks | GitHub Actions, verify job | Pass |
| macOS package build (`npm run build:mac`) | GitHub Actions, build-mac | Pass |
| Linux package build plus glibc check | GitHub Actions, build-linux | Pass |
| App start, language switch and long LCARS labels in the running app | Manual, `npm run dev` | Not run here: this needs the desktop app in front of a person |

The automated smoke checks passed. The manual check in the running app is left to the person:

1. Open Settings → "Språk / Language" and choose English. The view and the menu bar switch at once.
2. Switch back to Svenska or Automatiskt.
3. Look at the longest LCARS labels in both languages.
