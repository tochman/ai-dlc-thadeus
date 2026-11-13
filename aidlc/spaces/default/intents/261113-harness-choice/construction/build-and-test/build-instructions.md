# Build Instructions: US-0801 Choose the harness per project

- **Dependencies:** `npm install`. This work adds no new dependencies.
- **Environment:** none. To try opencode, have `opencode` on the login shell's PATH (verified with v2.1.4). The project needs opencode's AI-DLC files (`.aidlc/`, `.opencode/command/aidlc.md` or an `opencode.json` mentioning aidlc).
- **Build:** `npx electron-vite build`. `npm run build` packages for macOS. `npm run dev` runs the app.
- **Verify:**
  1. Open a project and open Projektinställningar.
  2. "Agent-terminal" lists Claude Code and opencode with their versions, plus any other detected harness as "not supported yet".
  3. Choose opencode. The agent tab restarts as "opencode".
- **Troubleshooting:** if the tab says the CLI is not found, check `opencode --version` in a login shell.
