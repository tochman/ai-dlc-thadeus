# Build Instructions: US-0507 Agent progress

## Dependencies

`npm install` (the `postinstall` runs `electron-builder install-app-deps` and `scripts/fix-pty-perms.cjs`). No new dependencies in this story.

## Environment

None beyond Node and the installed packages. Tests write temp projects under `tests/.tmp/`.

## Build

- Bundle only (used here): `npx electron-vite build` → `out/`.
- Full macOS package: `npm run build` (bundle, third-party licenses, `electron-builder --mac`). Not run here; the `.dmg` is checked by hand before a release tag.

## Verify

- `npx vitest run tests/` passes.
- `npx vitest run tests/ --coverage` exits 0 (80% line floor, per-file floors for `src/main/agent*.js`).

## Troubleshooting

- `HTMLCanvasElement's getContext() … not implemented` in jsdom is a known, harmless notice.
- A stale `out/` can mask a bundle error; delete it and rebuild.
