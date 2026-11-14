## Summary

- Builds: US-0408 ("Om T.H.A.D.E.U.S." window, Steps 22–24, new in this revision) on top of the already-built US-0902, US-0904, US-0407 (through `gh`) and US-0803 (Steps 1–21)
- Touches: new `src/main/aidlcWrite.js`, `src/main/modelChoice.js`, `src/main/updater.js`, `src/renderer/ConfigEdit.jsx`, `src/renderer/UpdateNotice.jsx`; changes to `ipc.js`, `preload/index.js`, `settings.js`, `menu.js`, `ConfigView.jsx`, `TerminalContext.jsx`, `TerminalPanel.jsx`, `ProjectSettingsDialog.jsx`, `SettingsView.jsx`, `App.jsx`, the sv/en locales and `.github/workflows/release.yml`
- Tests: about 15 new unit tests (Vitest), one or more per requirement, plus the existing suite kept green

# Code Generation Plan: v0.2.3 release

Zero-Unit work (ultra-express). Requirements: `inception/requirements-analysis/requirements.md`. Every story's acceptance criteria are in its epic file; each step names the criteria it covers.

## Decisions taken while planning

- **US-0902 is built here.** The earlier intent produced no code (person: "Build all four").
- **US-0407 uses the `gh` CLI**, because the repository is private (person: "Use the gh CLI"). `gh release view --repo tochman/aidlc-dash --json tagName,body,isDraft,isPrerelease,assets` replaces the anonymous API call, and `gh release download` replaces the HTTPS download. When `gh` is missing or not logged in, the check says so in one sentence and never blocks the app.
- **Assets follow what the workflow builds:** `THADEUS-<v>-universal.dmg` on macOS, `thadeus_<v>_amd64.deb` on Linux x64. Other Linux architectures get "no package for this machine".
- **Checksum:** the release workflow starts publishing `SHA256SUMS.txt`; the updater verifies it when present and stops on a mismatch.
- **Every AI-DLC write is a fixed-argument `execFile` through `runFixed`** (`src/main/exec.js`). Keys and values are checked against allow-lists in main before anything runs (NFR4). The renderer never sends a command string, only `{kind, key, value, where}`.
- **US-0904's opencode rows are built from the epic's rule table**, with the parts marked "to verify" read at run time from `opencode models` and `aidlc config models --show --json --harness opencode`. When either command fails, that harness's section is read-only and says why.
- Feature docs (status markers, ticked criteria, epic Status lines, FEATURES.md rows) are updated in Deployment Execution, per the project rule. This plan does not touch `docs/`.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "ultra-express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:6f8adf2d6d2f23d3a600d90970ef67f4819d061b592e46d5c9ed4bfe67a35dd3",
  "contract_sha256": "sha256:91a3ddbca508f56d1a2f627eda0975405de847674beb23f092e1f43f68275812"
}
```

## Steps

Layers that don't apply: there is no database or repository layer; app settings in `settings.js` are the data layer.

### Setup

- [ ] **Step 1: Baseline.** Run the full existing suite once on the unchanged tree (`npx vitest run tests/`) and record the pass/fail count in `code-summary.md` (NFR1).
- [ ] **Step 2: Runner check.** Confirm `npx vitest run tests/main/settings.test.js` runs; the unit-scoped commands in `unit-test-instructions.md` use the same runner and config (`vitest.config.mjs`, projects `main` and `renderer`).

### Data layer: app settings (US-0407, US-0803)

- [ ] **Step 3: Implement.** `src/main/settings.js`: sanitize and persist `updates: {lastCheckMs, skipVersion, deleteAfterInstall}` (default `deleteAfterInstall: true`) and per project `harnessTabs: ['claude'] | ['opencode'] | ['claude','opencode']` (only selectable harness ids, deduplicated; absent means the single-harness choice from US-0801). (FR1.4 skip/cleanup criteria, FR1.5 tab choice)
- [ ] **Step 4: Test.** Extend `tests/main/settings.test.js`: valid `updates` and `harnessTabs` round-trip; an unknown harness id and a non-boolean `deleteAfterInstall` are dropped.

### Business logic: AI-DLC writes (US-0902)

- [ ] **Step 5: Implement `src/main/aidlcWrite.js`.**
  - `buildCommand({kind, key, value, where})` returns `{args, dryRunArgs|null}` from fixed tables only:
    - project defaults: `config project --default-scope <plan>`, `config flags --swarm <on|off>`, `config providers …`, `config project --plugins <list>`, each with `--project | --local | --global` chosen explicitly;
    - active work: `engine config set <key> <value>` for depth, test-strategy, review, guard-policy, sensors, learnings, summary-confirmation, plan-approval, collaborators;
    - guard switches: `config flags --bypass <switch> --local|--global --yes` to turn off, `--clear-bypass <switch> --yes` to turn on, with the switch names from the guard table in `.claude/CLAUDE.md`.
  - Anything outside the tables throws before running (NFR4).
  - `preview(root, change)` runs `--dry-run` where AI-DLC has one; otherwise it returns the command only.
  - `apply(root, change)` runs it with `runFixed` and returns stdout or the CLI's error.
  - Tier 2: `guardLockDiff(text, mode)` replaces only the body of `## Guard Policy` in a memory file and returns `{next, diff}`; `applyGuardLock` writes that file after re-reading it unchanged.
  - (FR1.2: project defaults, active-work settings, guard switches, preview/apply, Guard Policy lock)
- [ ] **Step 6: Test.** `tests/main/aidlcWrite.test.js` with an injected `exec`:
  - a project-default change builds the exact args and `--dry-run` args;
  - an active-work key builds `engine config set`;
  - an unknown key or a value with a space or `;` throws and `exec` is never called;
  - `guardLockDiff` changes only the `## Guard Policy` section and leaves every other line of the file byte-identical.

### Business logic: models and effort (US-0904)

- [ ] **Step 7: Implement `src/main/modelChoice.js`.**
  - Rule tables for `claude` and `opencode` from epic-09 § "Model rules per harness": model lists (Claude aliases/ids plus `inherit`; opencode ids from `opencode models`), effort levels `low…max` plus `default`, and opencode's applied effort (`xhigh` → `high`; `max` as `aidlc` reports it).
  - Other harnesses are read-only, with the IDE-picker note for Cursor and Copilot.
  - `buildModelCommand({harness, agent|preset|group, model, effort, where})` → `aidlc config models … --harness <h> --project|--local`, plus its `--dry-run` form. Presets are `thorough|balanced|minimal`; groups are deciding, reviewing and writing-up.
  - `estimateCost(ledgerRows, prices, change)` returns the change in cost for this project's ledger, labelled as an estimate.
  - `checkDrift()` runs `aidlc config models --check`.
  - (FR1.3)
- [ ] **Step 8: Test.** `tests/main/modelChoice.test.js`:
  - a Claude agent change builds the exact args;
  - opencode `xhigh` is shown as applying `high`;
  - a model id that is not in the harness's list is refused;
  - a preset builds one command for all agents;
  - `estimateCost` on a two-row fixture ledger returns the expected difference.

### Business logic: updater (US-0407)

- [ ] **Step 9: Implement `src/main/updater.js`.**
  - `checkForUpdate({force})` runs at most once a day unless forced, using `gh release view --repo tochman/aidlc-dash --json …` through `runFixed`. It ignores drafts and pre-releases, compares the tag with `app.getVersion()` by semver, and respects `skipVersion`. Offline, rate-limited, missing `gh` or a logged-out `gh` each give `{status: 'unavailable', reason}` in one sentence.
  - `pickAsset(platform, arch, assets)` returns the universal `.dmg` or the amd64 `.deb`.
  - `assertOwnAsset(asset)` checks the repository and the asset name pattern before any download (NFR3).
  - `download()` runs `gh release download <tag> --repo tochman/aidlc-dash --pattern <name> --dir <userData>/updates/<tag>`, reporting progress by polling the file size against the asset size. It verifies `SHA256SUMS.txt` when that asset exists.
  - `install()` on macOS: `hdiutil attach -nobrowse`, `ditto` the new `THADEUS.app` over `app.getPath('exe')`'s bundle (through `osascript … with administrator privileges` only when the parent folder isn't writable), `xattr -dr com.apple.quarantine`, then `hdiutil detach`. On Linux: `pkexec dpkg -i <deb>`.
  - `relaunch()` calls `app.relaunch()` + `app.quit()`. Any failed step leaves the old version running and returns `{error, file}` so the notice can offer "Visa i Finder".
  - The downloaded file is deleted after a successful install when `deleteAfterInstall` is on.
  - (FR1.4, NFR3, NFR5)
- [ ] **Step 10: Test.** `tests/main/updater.test.js` with an injected `exec`/`fs`:
  - a newer stable tag gives `available`; a draft, a pre-release, a skipped version and an equal version give `none`;
  - a `gh` failure gives `unavailable` and never throws;
  - `pickAsset` picks the `.dmg` on darwin and the `.deb` on linux/x64, and returns null on linux/arm64;
  - `assertOwnAsset` refuses another repository's URL (NFR3);
  - a checksum mismatch stops before install.

### API layer: IPC and preload

- [ ] **Step 11: Implement.**
  - `src/main/ipc.js` handlers: `config:preview`, `config:apply`, `config:guardLockPreview`, `config:guardLockApply` (US-0902); `models:options`, `models:preview`, `models:apply`, `models:check` (US-0904); `update:check`, `update:download`, `update:install`, `update:skip`, `update:reveal` (US-0407).
  - Every handler looks up the project root itself and passes the renderer's payload through the Step 5, 7 and 9 validators. `config:changed` is sent after an apply so the view reloads.
  - `src/preload/index.js` exposes each one as a named bridge call, plus `onUpdateState`.
  - `src/main/menu.js` gets "Sök efter uppdatering…" (sends `menu:command` `checkUpdate`).
  - `src/main/index.js` runs the daily check once the window is ready.
- [ ] **Step 12: Test.**
  - Extend `tests/main/menu.test.js`: the update item exists and sends `checkUpdate`.
  - Add one test to `tests/main/aidlcWrite.test.js`: the `config:apply` handler refuses a payload with an extra `args` field.

### Frontend: configuration view (US-0902, US-0904)

- [ ] **Step 13: Implement `src/renderer/ConfigEdit.jsx`.**
  - `ChangePanel` shows the exact command and its `--dry-run` result, then **Apply** with the result or error. It reloads the view after applying.
  - `WhereChoice` picks between this project, only me and this machine.
  - `GuardSwitches` lists each switch with what it protects. Turning one off needs a confirmation that names it; turning one on needs none.
  - `ModelPicker` covers per-agent model and effort, presets and group efforts. It shows the configured value and its source, the model the agent actually ran on, its cost share and the estimate, marks agents whose run differs from their configuration, and shows `--check` findings.
  - `ConfigView.jsx` hosts these in its existing Models, Switches and Active sections. Active-work changes are disabled while any agent tab is "Arbetar" (`terminal.anyBusy()`, Step 15).
  - All interactive elements get `data-testid`.
- [ ] **Step 14: Test.** Extend `tests/renderer/ConfigView.test.jsx`:
  - changing depth shows the command preview and Apply calls `bridge.applyConfigChange` with `{kind:'active', key:'depth', value}`;
  - turning a guard off asks for a confirmation naming it, and turning it on does not;
  - Apply is disabled while an agent tab is busy;
  - choosing a model shows the preview and the cost estimate labelled "uppskattning";
  - an opencode `xhigh` row shows "körs som high".

### Frontend: harness tabs side by side (US-0803)

- [ ] **Step 15: Implement.**
  - `TerminalContext.jsx` and `TerminalPanel.jsx`: agent sessions become one per open harness (`agent:claude`, `agent:opencode`) beside `shell`. Each tab has its own state and Restart.
  - The context tracks `lastAgent` and gains `anyBusy()`. `type('agent', …)` goes to the last-used agent tab, and buttons name it ("Fortsätt i opencode").
  - `RefreshPanel` and `ConfigView` busy checks use `anyBusy()`.
  - When two agent tabs are busy on the same active intent, one sentence warns once per busy period.
  - `ProjectSettingsDialog.jsx` picks the open harness tabs (one or both) when both are installed. The single-harness projects keep US-0801's choice.
- [ ] **Step 16: Test.** Extend `tests/renderer/TerminalPanel.test.jsx` and `tests/renderer/ProjectSettingsDialog.test.jsx`:
  - with `harnessTabs: ['claude','opencode']`, two agent tabs and the shell tab render, each spawning its own harness;
  - the quick command goes to the last-used agent tab;
  - `anyBusy()` is true when only the second tab is busy;
  - the dialog saves both harnesses.

### Frontend: update notice and setting (US-0407)

- [ ] **Step 17: Implement.**
  - `src/renderer/UpdateNotice.jsx` is an LCARS notice, not a modal. It shows the version, the release notes through the existing `react-markdown` + `remark-gfm`, and **Uppdatera nu**, **Senare** and **Hoppa över den här versionen**. It shows download progress, the install error with "Visa i Finder/filhanteraren", and the kept file's path when cleanup is off.
  - Before restarting with an agent tab "Arbetar", it asks first.
  - `App.jsx` mounts it.
  - `SettingsView.jsx` gets "Ta bort hämtat paket efter uppdatering: På / Av".
- [ ] **Step 18: Test.** Add `tests/renderer/UpdateNotice.test.jsx`:
  - an available update renders the version, the notes and three buttons;
  - Skip calls `bridge.skipUpdate(version)`;
  - with a busy agent tab, Update asks before calling `installUpdate`;
  - an install error shows one sentence and the reveal button.
- [ ] **Step 19: Implement i18n.** Add every new key to the sv and en files under `src/shared/locales/`. The existing `tests/main/i18nKeys.test.js` checks parity; run it.

### Environment / build configuration

- [ ] **Step 20: Implement.** `.github/workflows/release.yml`: in the `release` job, write `SHA256SUMS.txt` (`sha256sum` over the `.dmg` and `.deb`) and attach it to `gh release create`. Bump `package.json` to `0.2.3`; the tag waits for Deployment Execution (FR3.3).

### Documentation and traceability

- [ ] **Step 21: Finish.** Run the full suite (`npx vitest run tests/`) and compare it with the Step 1 baseline (NFR1). Write `code-summary.md` and `traceability.json`. The feature-doc updates and "Released in v0.2.3" markers are left to Deployment Execution (FR3.1, FR3.2), and FR2.1/FR2.2 (render timing, installed-release check) to Build and Test.

### US-0408: "Om T.H.A.D.E.U.S." window (added by the person during Build and Test)

Steps 1–21 were built and approved in the previous attempt. Keep their code as it is. Only re-run their tests in Step 24.

- [ ] **Step 22: Implement.**
  - `src/main/menu.js`: replace `{ role: 'about' }` in the macOS app menu with `{ label: t('menu.about', { app: APP_NAME }), click: cmd('about') }`, and add the same item to Hjälp on Linux.
  - New `src/renderer/AboutDialog.jsx`: an LCARS popup with the splash screen's content (`AuctumMark`, `APP_NAME`, `APP_FULL_NAME`, `APP_TAGLINE` from `src/shared/appName.js`) plus the app version from `bridge.getAppInfo()`. That is the same value the Om section in Inställningar shows.
  - The popup closes with Esc, a Stäng button or a click outside, and focus returns to where it was. Elements carry `data-testid`.
  - `App.jsx` opens it on the `about` menu command.
  - sv/en locale keys. (FR1.6)
- [ ] **Step 23: Test.**
  - Extend `tests/main/menu.test.js`: the about item exists in the app menu on macOS and in Hjälp on Linux, sends `about`, and no `role: 'about'` remains.
  - Add `tests/renderer/AboutDialog.test.jsx`: it shows the name, tagline and the version from a stubbed `getAppInfo`; Esc and Stäng close it; a failed `getAppInfo` shows the dialog with "–" for the version.
### Fix: epic badge shows Done while stories are still planned (reported by the person during Code Generation)

- [ ] **Step 23a: Fix and test.**
  - Root cause: `src/main/parsers/features.js:82` sets an epic's `statusKind` from `statusOf(status)`, which returns the FIRST marker in the FEATURES.md status cell. A row like "✅ US-0401 released … · 📋 US-0407 Planned" therefore gets a Done badge.
  - Fix: add `epicStatusOf(text)`, which looks at every marker in the cell. It returns `done` only when every marker is ✅, `planned` when every marker is 📋, `progress` for any mix or any 🚧, and `null` when there are none. Use it for the overview rows at line 82. Story headings (line 101) keep `statusOf`, because a story line has one marker.
  - Test: extend `tests/main/features.test.js`:
    - a mixed ✅/📋 row gives `progress`;
    - all ✅ gives `done`;
    - all 📋 gives `planned`;
    - a row with no marker gives `null`.
### Fix: busy agent tab sits 1px off the arm and the bar (reported by the person with screenshots)

- [ ] **Step 23b: Fix and test.**
  - Root cause: `.is-breathing` animates `lcars-breathe`, and both of its keyframes (plus the reduced-motion rule) draw a crisp `0 0 0 1px` ring outside the block. While a tab is WORKING, its left edge reads 1px left of the SHELL block below, and its top 1px above the bar.
  - Fix: in `src/renderer/theme.css`, make that ring `inset 0 0 0 1px …` in both keyframes and in the reduced-motion rule. The soft outer glow stays.
  - Test: extend `tests/main/theme.test.js` so that every `box-shadow` in `lcars-breathe` and `.is-breathing` draws its 1px ring inset, never outside.
### Fix: the feature-docs lifecycle rule ships with the app, for every harness (requested by the person)

- [x] **Step 23c: Implement and test.**
  - Root cause: when the app sets up feature docs in a project, `src/renderer/featureDocsPrompt.js` types `features.prompt.rule` (sv/en locales). That text only says status and criteria are updated "when the work is built and released". It says nothing about 🚧 when work starts or ✅ when it is done, and it does not name the target release. The project's own copy of the rule lives in this repo's `project.md`, so other projects never get it.
  - Fix: rewrite `features.prompt.rule` in `src/shared/locales/en.json` and `sv.json`. The new text asks the agent to save, through AI-DLC's own rule mechanism (so it lands in `aidlc/spaces/<space>/memory/project.md`), a project rule with five parts:
    - a new story goes into the right epic file right away;
    - when work on a story starts, it is set to 🚧 In progress in its marker, the epic's `**Status (…)**` line and its `FEATURES.md` row;
    - when it is built and approved, it is set to ✅ Done;
    - once the target release is known, it is written out as "for vX.Y.Z", and as "Released in vX.Y.Z" when the tag is cut;
    - a delivered story never stays in progress.
  - The rule lives in AI-DLC's memory, which Claude Code, opencode and the other harnesses all load, so it is not tied to Claude. Keep the text on one line, because a newline would send it.
  - Test: extend `tests/renderer/` or `tests/main/` with a `featureDocsPrompt` test. In both languages the prompt must mention 🚧, ✅, the release ("vX.Y.Z") and AI-DLC's rule mechanism, and must contain no newline.
- [ ] **Step 24: Re-check.** Run both unit-scoped commands and the full suite. Update `code-summary.md` and `traceability.json` with FR1.6.

## Story-to-step traceability

| Requirement | Steps |
|-------------|-------|
| FR1.1 US-0405 | 1, 21 (stays green) |
| FR1.2 US-0902 | 5, 6, 11, 12, 13, 14 |
| FR1.3 US-0904 | 7, 8, 11, 13, 14 |
| FR1.4 US-0407 | 3, 4, 9, 10, 11, 12, 17, 18, 20 |
| FR1.5 US-0803 | 3, 4, 15, 16 |
| FR1.6 US-0408 | 22, 23, 24 |
| FR3.3 version | 20 |
| NFR1 | 1, 21 |
| NFR2 | 4, 6, 8, 10, 12, 14, 16, 18 |
| NFR3 | 9, 10 |
| NFR4 | 5, 6, 12 |
| NFR5 | 9, 10 |
| FR2.1, FR2.2, FR3.1, FR3.2, FR3.4, FR3.5 | Build and Test, Deployment Pipeline and Deployment Execution |
