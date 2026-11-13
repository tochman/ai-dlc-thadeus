# Code Quality Assessment: aidlc-dash

## Quick rating

| Area | Rating | Comment |
|------|--------|---------|
| Naming | good | Clear component, function and class names; consistent `data-testid`s. One misleading name: the tab id `'claude'` stands for "the agent tab" and for the CLI at once |
| Function size | fair | Most functions are small; `App` (519 lines), `ProjectContent`, `TerminalPanel`/`TermSession`, `SetupAidlc`, `RefreshPanel` and `Timeline` are long but cohesive |
| Error handling | good | IPC errors are logged in main and shown with `role="alert"`; readers that must not break the view never throw (`loadCost`, `getConfiguredModels`, `readJsonSafe`, `getSetupInfo` for a missing tool); half-written AI-DLC files keep the last good value; node-pty failing to load breaks only the terminal; no silent catch without a comment |
| Test presence | fair | Main modules and the stateful views have tests; `useProject`, `createWindow`, `applyMenu` and `ProjectContent` (setup restart, `terminalCommand`) have none of their own |
| Duplication | fair | `errorText()` in 10+ renderer files; the `'claude'` literal in about 15 places across main and renderer; the per-project settings fields listed in three places (`settings.js` twice, `ipc.js:274`) |
| Dead code | good | No TODO/FIXME or `eslint-disable` in the files read |

## Tests

- **Framework**: Vitest 5 with two projects (`main` in node, `renderer` in jsdom), Testing Library React. Renderer tests run in Swedish (`tests/renderer/setup-i18n.js`).
- **main** (22 files): `appName`, `check-glibc`, `configuredModels`, `features`, `git`, `i18n`, `i18nKeys`, `icon`, `ledger`, `menu`, `notify`, `parsers`, `projectAccess`, `projectService`, `pty`, `ptyPerms`, `questions`, `settings`, `setup`, `theme`, `watcher`, `windowOptions`.
- **renderer** (16 files): `AppSettingsDialog`, `AppShell`, `CostPanel`, `FeaturesView`, `IntentDetail`, `IntentList`, `ProjectSettingsDialog`, `QuestionPopup`, `RefreshPanel`, `ResumeButton`, `SetupAidlc`, `Splash`, `TerminalPanel`, `Timeline`, `format`, `terminalControl`.
- **Coverage**: no configuration or threshold.
- **In CI**: `npx vitest run tests/` in the `verify` job on every PR to `main` and on tags (earlier scan).
- **Translation lint** (`tests/main/i18nKeys.test.js`): identical keys in sv/en, no empty texts, every literal `t('…')`/`translate('…')` key present in `en.json` (at least 300 calls found), identical ICU placeholders per key, and no å/ä/ö interface text in `src/renderer/` or `src/main/menu.js` outside comments and `console.*`.

### Tests that assert Claude-specific behaviour (US-0801)

| Test | Asserts | Affected by |
|------|---------|-------------|
| `tests/renderer/TerminalPanel.test.jsx` | test ids `terminal-panel-state-claude`, `terminal-panel-pending-claude`; `type('claude', …)`; `ptyWrite('pty-claude', '/aidlc')`; mount order claude then shell | renaming the tab id or changing `KINDS` |
| `tests/renderer/ResumeButton.test.jsx` | `type('claude', '/aidlc', …)`, `sequence('claude', [/aidlc intent …, /aidlc])`, busy text "Claude arbetar — vänta eller avbryt först" | per-harness commands and texts |
| `tests/main/setup.test.js` | `aidlc --project-dir <root> config --harness claude --dry-run`, `buildSetupCommand({})` = `… --harness claude --yes`, `harnesses: ['.kiro/']` | detection that adds `.claude/`/`.github/`; US-0802 |
| `tests/renderer/SetupAidlc.test.jsx` | typed chain with `--harness claude` | US-0802 |
| `tests/main/configuredModels.test.js` | `['config','models','--show','--json','--harness','claude']` | a per-harness model source |
| `tests/main/pty.test.js` | lazy loading with kind `shell`; Swedish error `Terminalmodulen kunde inte laddas` | unaffected unless `shellArgs` changes shape |
| `tests/main/settings.test.js` | project settings equal exactly `{featureDocs, featuresPath}` | adding a `harness` field changes these `toEqual`s |
| `tests/main/i18nKeys.test.js` | key and placeholder parity | every new or reworded harness text |

## Linting, formatting, CI

- No ESLint, Prettier or EditorConfig in the repo. The style is consistent anyway (2 spaces, single quotes, semicolons).
- CI: tests on PRs and tags, tag vs `package.json` version, macOS and Linux builds, glibc check, release (earlier scan). No lint step; `i18nKeys.test.js` covers translations.

## Documentation

`README.md`, `docs/FEATURES.md` and one file per epic carry the requirements (`docs/features/epic-08-harnesses.md` for this intent). Code comments are short and cite requirement ids. `src/shared/i18n.js:4-9` documents the locale format for translators (US-0702).

## Accessibility (existing patterns)

- Status always has text, never colour alone (`format.js` labels, `.tag`, `StatusBadge`). The terminal tab shows its state as text on the tab block (`terminal.state.<state>`).
- Global `:focus-visible` outline.
- Motion: `data-motion` (`full | reduced | off`).
- `<html lang>` follows the language (`main.jsx`).
- Dialogs: native modal `dialog` with `aria-labelledby`; Esc closes through `onCancel`; errors in `p.refresh-error[role=alert]`. `ProjectSettingsDialog` uses `aria-invalid` and `aria-describedby` on its field.
- Terminal: tabs with `role="tab"` and `aria-selected`; the resize handle is a focusable `role="separator"` with arrow keys; the toggle has `aria-expanded`.

## Risks for US-0801

1. **The tab id is the CLI name.** `'claude'` is the pty kind (`pty.js:24`), the context key (`TerminalContext.jsx:12-16`), the menu action (`menu.js:105`, `App.jsx:316`), the CSS modifier (`theme.css:687`) and part of three test ids. Option A: keep `'claude'` as the internal id of "the agent tab" and change only the label and the command (smallest diff, misleading name). Option B: rename it to a neutral id such as `agent` (honest, but it touches every caller, the CSS and the tests). The decision belongs in design.
2. **The command must stay fixed in main.** `shellArgs` is a whitelist today. The harness id must travel from the renderer (or from settings read in main) and be validated in main against a fixed table, and the CLI name must come from that table, never from the renderer. `pty:spawn` already looks up the root in main.
3. **Switching kills the session.** `TermSession`'s mount effect re-runs when `kind` changes (`spawn` depends on `kind`), and its cleanup calls `ptyKill`. "The old tab is closed only after the person confirms if it is working" must be checked before the prop changes. `terminal.state(tab) === 'busy'` is the available signal.
4. **The busy signal is unverified for other TUIs.** `idle` = 1.5 s without output. A TUI that redraws constantly never goes idle; `type`/`sequence` would then fail after 20 s (`terminal.noResponse`), and the breathing indicator would never stop. This must be checked against each CLI. Nothing in the code shows how opencode, Codex or Kiro behave.
5. **Command syntax per harness is unverified.** `/aidlc …` appears in `QUICK_COMMANDS`, `ResumeButton`, `SetupDone`. The AC's per-harness table (slash command in Claude Code and opencode; skill or prompt form in Codex and Kiro) has no evidence in this repo. `featureDocsPrompt` is plain language and portable.
6. **Detection gaps.** `getSetupInfo` lists only `.kiro`, `.codex`, `.cursor`, `.aidlc` and only when the person opens the setup view. `.claude/` and `.github/` (with an AI-DLC check) are missing, and an AI-DLC project never runs this code. Detection on open needs a new call, and `--version` probes (four CLIs, 10 s timeout each) should run in parallel and be cached per opened project, like `p.models`.
7. **The settings schema is whitelisted in three places.** A `harness` per project needs `sanitizeProject`, `setProjectSettings`'s validation, the `ipc.js:274` field pick and `ProjectSettingsDialog`'s save to change together, plus the `settings.test.js` expectations. The key is the realpath root, which matches how projects are opened.
8. **Claude-specific dashboard parts.** The model table reads `--harness claude` and `.claude/agents` (`models.js`). The ledger path is shared, but `summarizeLedger` has no harness field, and the epic says only the Claude hooks fill it. Both views need a "covers <harness>" label under the AC.
9. **Texts name Claude.** At least 11 locale keys. New texts must use the same `{placeholders}` in sv and en, and no literal Swedish may enter `src/renderer/` or `menu.js`.
10. **The menu cannot know the harness.** `menu:state` accepts only three booleans, so a "Terminal > opencode" label needs that validation extended.

## Technical debt

1. The agent tab's identity is spread across main, renderer, CSS and tests as the literal `'claude'` (see above).
2. `--harness claude` is hard-coded in three places (`setup.js:12`, `:62`, `models.js:8`).
3. Per-project settings fields are listed in three places in main and one in the renderer.
4. `errorText()` is copied into 10+ renderer files.
5. Some main-process error texts that reach the person are still Swedish literals: `exec.js:43` (`Ogiltiga argument till …`) and `models.js:56` (`aidlc config models misslyckades …`, shown as the model table's warning title).
6. `getSetupInfo` runs its tool calls one after another (git, `aidlc --version`, dry run, plugins), up to about 40 s worst case with 10 s timeouts.
7. No window reference in main: `ipc.js`, `menu.js` and `notify.js` look up the window per call (earlier scan).
8. `settings.js` whitelists keys; every new setting needs a change in `sanitize()`.
9. Two debounce implementations in `watcher.js`; watching covers one space per project (earlier scan).
10. `hidden` sets `display: none !important`, so transitions on hidden tabs need another technique (earlier scan).
