# Build Instructions — US-1304

- Node from `.nvmrc`; `npm ci` installs the dependencies. Nothing new was added.
- No new environment variables or config. The pull request and release reads use the person's own `gh`/`glab` login or the saved Bitbucket app password, as before.
- Build: `npm run build` (electron-vite). Packaging (`.dmg`, `.deb`) runs only on release pull requests and tags.
- Checks: `npx eslint .`, `npx prettier --check .`, `npx vitest run tests/ --coverage`.
- Troubleshooting: if the Delivery section shows "missing" for pull requests or releases, check `gh auth status` (GitHub) or the platform login under Settings › Tools; the rest of the Velocity view still loads.
