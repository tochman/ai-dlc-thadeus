# Build Instructions: US-0212 THADEUS cost rule pack

## Setup

- Node and npm as in `package.json`; `npm install` (its `postinstall` rebuilds native deps). No new dependency in this story.
- No env vars or local services.

## Build

```bash
npx electron-vite build
```

Checks that main, preload and renderer bundle with the new `costRules` modules. The packaged `.dmg` (`npm run build`) is the manual release check, not part of this story.

## Verify

- Exit code 0 and `✓ built` in the output.
- Style: `npx eslint <files>` (errors block, warnings do not) and `npx prettier --check src tests`.

## Troubleshooting

- A native module error after a Node upgrade: run `npm install` again so `postinstall` rebuilds it.
