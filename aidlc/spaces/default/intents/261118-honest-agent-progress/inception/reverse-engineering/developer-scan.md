# Developer Code Scan: US-0030 (agent progress)

Focused scan at `0ebb196`, code read only (no tests, builds or app runs).

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - src/main/agentEvents.js
  - src/main/agentProgress.js
  - src/main/parsers/agentProgress.js
  - src/shared/agentActivity.js
  - src/renderer/AgentProgress.jsx
  - src/renderer/TokenDetail.jsx (the progress fetch and the `AgentProgress` mount, lines 430-530)
  - .thadeus/hooks/dialog.sh
  - src/main/ipc.js (the sections that serve progress: `agents:progress`, `agentActivity:list`, the `agent:activity` push)
  - src/preload/index.js (`getAgentProgress`, `agentActivity`)
- **Skimmed only**:
  - src/main/agentAdapters.js (the activity section, lines 266-345)
  - src/main/agentHooks.js (the kind table: `KINDS`, `ACTIVITY_KINDS`, hook entries)
  - src/main/projectService.js (`workingAgents`, `inflightCount`)
  - src/shared/locales/en.json (`tokenDetail.progress`)
  - tests/main/ (`agentActivity`, `agentProgress`, `agentProgressLoad`, `agentEvents*` by name and grep)
  - tests/renderer/ (`AgentProgress.test.jsx`, `TokenDetail.test.jsx` by name)
- **Left out**: node_modules/, out/, dist/, coverage/, tests/.tmp/, .claude/, aidlc/

### Packages Found
- `thadeus` — Electron desktop app — JavaScript/JSX — unchanged from the store.

### Build System
- **Type**: npm with electron-vite (unchanged).
- **Config Files**: `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`.
- **Build Dependencies**: none new.

### APIs Discovered
- IPC invoke — `src/main/ipc.js` — `agents:progress(projectId, dirName)` (audit rows) and `agentActivity:list(projectId)` (hook rows).
- IPC push — `agent:activity` `{projectId, rows}`, gathered for 250 ms, sent to every window.
- Hook channel — `.thadeus/hooks/dialog.sh` — kinds `question`, `permission` (wait), `answered`, `reply`, `session`, `notify`, `precompact`, `postcompact`, and nine activity kinds folded into `activity`.

### Frameworks & Libraries
- React 19, react-i18next, vitest 5.1.0 (unchanged; see `technology-stack.md`).

### Test Coverage
- **Test Directories**: `tests/main/agentActivity.test.js`, `agentProgress.test.js`, `agentProgressLoad.test.js`, `agentEvents*.test.js`, `tests/renderer/AgentProgress.test.jsx`.
- **Test Frameworks**: vitest (node and jsdom).
- **Coverage Config**: present (v8, 80% lines).
- `agentProgressLoad.test.js:101-115` already proves that a build with no Unit reads `construction/code-generation/code-generation-plan.md`.

### Code Quality Indicators
- **Linting**: ESLint 9 and Prettier in CI (unchanged).
- **CI/CD**: `.github/workflows/release.yml`.
- **Documentation**: every file header names its story and requirements. `agentActivity.js` states the NFR2 rule: identifier-shaped fields only.

### Technical Debt Signals
- `parsers/agentProgress.js:69`: a `ponytail:` comment. An open build or review whose end never came shows while any agent is in flight.
- `projectService.js:158`: a `ponytail:` comment. One open dispatch per agent type and stage.
- `agentActivity.js:111-112`: only the quiet states (working, writing, thinking) turn idle. Waiting, tool and error never age.

## Handoff Summary
- **Intent-relevant finding**: the four US-0030 symptoms have four separate causes.
  1. **Stale permission on main.** The `permission` dialog kind feeds `{name: 'waiting', reason: 'permission'}` with no `agentId` (`agentEvents.js:26-33`, `:289-293`), so a subagent's PermissionRequest also lands on the main row. Only the next event on that same row clears it (`agentActivity.js:46`). A subagent's later events go to its own row and touch only `main.lastMs` (`agentActivity.js:90-93`). An answer given in the app (`permissions.answer`/`answered`) feeds no activity at all.
  2. **No step count.** When the hooks are current, `AgentProgress.jsx:183-189` shows the hook rows instead of the audit rows. The step counts live only on the audit rows (`agentProgress.js:29-43`). The zero-Unit plan path itself works (`agentProgress.js:30`; test `agentProgressLoad.test.js:101-115`), so the "only per-Unit plans" hypothesis is false.
  3. **No task or tool description.** `dialog.sh:42-54` copies the whole payload, but the adapter keeps only identifier-shaped fields (`agentAdapters.js:269-301`, `IDENT`). `tool_input.description` and the Agent tool's task description never reach a row. `stateText` shows only the tool name (`AgentProgress.jsx:45-46`).
  4. **No staleness.** `view()` turns only quiet states idle (`agentActivity.js:111-112`). A row's `lastMs` is never exposed, so the renderer can only show time in state (`sinceMs`, `AgentProgress.jsx:53-56`), not time since the row was last seen.
- **Risks / follow-up**:
  - Letting a description through relaxes US-0214 NFR2 (no agent text in a row). It needs a bounded, sanitised text field. `src/shared/agentText.js` is the existing sanitiser.
  - Linking a subagent row to its task needs the Agent tool's `tool_use_id`, or the order of PreToolUse(Agent) and SubagentStart. Whether Claude Code's SubagentStart payload carries the description or the parent `tool_use_id` is not verified here [assumption].
  - opencode's field names are already marked unverified (`agentAdapters.js:320`).
