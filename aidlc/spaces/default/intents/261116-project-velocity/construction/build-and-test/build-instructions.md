# Build Instructions: US-0303 Project velocity

## Install

```bash
npm ci
```

No new dependencies. No environment variables, config files or local services.

## Build and check

| Step | Command |
|---|---|
| Full suite with coverage (80% line floor in `vitest.config.mjs`) | `npm run coverage` (`vitest run tests/ --coverage`) |
| Lint | `npx eslint .` |
| Format | `npx prettier --check .` |
| App bundle (release only) | `npm run build`, then the `.dmg` is checked by hand before a tag (team rule) |

## Troubleshooting

- Prettier flags `.thadeus/tokens/*.json`: those are token logs the app writes. They are ignored in `.prettierignore` since this story; an older checkout needs that line.
- Week buckets depend on the time zone: the velocity tests set dates with local constructors, so they pass in any `TZ`.
