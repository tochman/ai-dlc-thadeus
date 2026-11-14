# Build Instructions: US-0901 Configuration view

## Dependencies

`npm ci` (Node from `.nvmrc`). No new dependency in this work.

## Environment

- The `aidlc` CLI on the login shell's PATH, for the view's live values. The tests inject the CLI and do not need it.
- No environment variables or local services.

## Build

```bash
npx electron-vite build
```

This builds `out/main`, `out/preload` and `out/renderer`. Packaging (`npm run build:mac`, `build:linux`) is unchanged and is not part of this check.

## Verify

- The build ends with `✓ built` for main, preload and renderer.
- `npm run dev`, then open an AI-DLC project and choose **Konfiguration** in the left arm.

## Troubleshooting

- If the view says AI-DLC is missing, check that `aidlc --version` works in a login shell.
- If every section shows "multiple project harnesses are present", the harness argument is not reaching the CLI. Check that the picker's harness is installed in the project.
