# Code Quality Assessment

## Tests

- **Runner**: vitest 5.1.0 with three projects. `main` runs in node (`tests/main/**/*.test.js`). `scripts` runs the timed hook-script tests. `renderer` runs in jsdom with Swedish i18n (`tests/renderer/**/*.test.jsx`).
- **Size**: 85 entries in `tests/main` and 50 in `tests/renderer` at `2b5d6a4`. No tests were run in this scan.
- **Coverage**: v8, with an 80% line floor across `src/**` (`vitest.config.mjs`). CI runs `npx vitest run tests/ --coverage`.
- **Tests near US-0608** (skimmed by name and grep):
  - `tests/main/planningSync.test.js` runs real git in a temp folder with a local bare `origin`. It covers a story branch left byte for byte, an in-place commit and push on main, several actions in one push, agent edits on main versus a story branch, a refusing commit hook, a rebase onto a moved main, a rebase conflict, protected main with and without gh, offline and refused pushes, record removal only after the push, re-apply after `git checkout -- <files>`, no origin, and the scheduler.
  - `planningRecord.test.js`, `releases.test.js` (one stale-hash conflict, `:248`), `releasesPlan.test.js`, `releaseVersion.test.js`, `features.test.js`, `fileWrite.test.js`.
  - `tests/renderer/FeaturesView.test.jsx` (mocks the bridge; 14 planning references) and `useFeatures.test.jsx`.
  - Not covered: two actions in quick succession from the view, a reload that arrives mid-action or out of order, a pick queued behind a push, git lock contention, two app instances, the story-detail picker after a pick, and any run of the built app. So the story's "every test mocks git" holds for the IPC and renderer layers, not for `planningSync`.
- **Tests near US-0031** (by name): `tests/renderer/AgentDialog.test.jsx` (65 cases; `:259` pins BR2.1, page stays and "+n nya"), `AgentDialogHandoff.test.jsx` (8), `tests/main/agentEvents.test.js` (63), `agentOrder.test.js` (5). No case closes and reopens the dialog, or keeps a settled page in the list.
- **Tests near US-0030 and US-0210** (kept): `agentActivity.test.js`, `agentProgress*.test.js`, `agentEvents*.test.js`, `AgentProgress.test.jsx`, `TokenDetail.test.jsx`; `modelChoice.test.js`, `settings.test.js`, `watcher.test.js`, `ipc.test.js`, `ProjectSettingsView.test.jsx`, `useProject.test.jsx`, `noNativeTitle.test.jsx`.

## Lint, Format, CI

| Check | State |
|---|---|
| ESLint 9 flat config | in CI (`npx eslint .`) |
| Prettier | in CI (`npx prettier --check .`) |
| Secret scan | gitleaks on every PR commit |
| Build | mac universal dmg and Linux deb on every PR, after `verify` |
| End-to-end | none; no built-app test, no display server in `verify` |

`team.md` still says that coverage, ESLint and Prettier are "not set up yet". That is out of date: all three run in `.github/workflows/release.yml`.

## Quality Ratings

| Aspect | Rating | Evidence |
|---|---|---|
| Naming clarity | good | intent-revealing names; story ids in the headers |
| Function size | fair | most functions are small; `ipc.js` (1300 lines), `agentHooks.js` (864), `FeaturesView.jsx` (758), `agentEvents.js` (569), `AgentDialog.jsx` (775) are large |
| Error handling | good | never-throw readers, results as values, refused commits unstaged again, worktrees removed in `finally`; but see note 3 below for a throw after a write |
| Input validation | good | story ids, versions and branch names checked before git runs; `safeArg`; no shell |
| Test presence | good | real-git planning tests; pure parsers; an injectable `exec` |
| Duplication | fair | the project-settings field list repeats; the docs are loaded several times per action (`fingerprint`, `freshHashes`, `setStoryRelease`, `currentReleases`) |
| Dead code | good | no TODO/FIXME in the scanned files |

## Technical Debt

- `ponytail:` comments in the scanned files:
  - `planningSync.js:20`: a fixed `dash/planning` and a fixed `main`;
  - `planningSync.js:211`: one operation at a time per project, per process;
  - `planningSync.js:301`: a checked-out target only fast-forwards after a rebase;
  - `planningSync.js:323`: the docs branch is not deleted after its pull request merges;
  - `planningRecord.js:38`: one record write queue for every project;
  - `releases.js:41`: the epic and the overview are two writes;
  - `releases.js:139`: delete checks the hash, then unlinks;
  - `FeaturesView.jsx:300`: a successful write unlocks only on a reload;
  - `parsers/releases.js:53`: a segment naming several stories is left alone;
  - `ipc.js:563`: "an agent is running" is read from AI-DLC writes;
  - `fileWrite.js:95`: no fsync before rename;
  - kept from earlier scans: `parsers/agentProgress.js:69`, `projectService.js:158`, `agentEvents.js:345-347`, `agentAdapters.js:320`, `settings.js` (200 roots), `modelChoice.js` (alias price).
- `.thadeus/tokens/<intent>.json` is written into the project and shows as untracked (US-0609).

## Brownfield Notes for US-0031 (read at `6ec3546`)

1. **No page is chosen on open.** `AgentDialog` stays mounted (`App.jsx:741`), so `pageId`/`lastIndex` (`AgentDialog.jsx:559-565`, written back at `:587-590`) survive close and reopen. Only a `focus` (`:598-601`) or Previous/Next changes them; the `[open]` effect (`:603-611`) does not. `receiveAgentEvents` (`App.jsx:222-229`) opens the dialog without naming the fresh event. The "+n nya" snapshot (`:593-595`) also survives, so the new page shows only as "+1 ny".
2. **Settled pages stay in the list.** `move` deletes only on `ended` (`agentEvents.js:146-157`); `list` returns every state (`:133-137`). A question in `sent`/`handedBack`, a reply in `stale`, a handoff in `waiting` stay. A settled question ends only on the harness's answered event (`:232-239`), a newer non-reply event of the session (`:197`) or the session's end (`:400`); a reply (`:322`) and `addHandoff` (`:496`) do not end it.
3. **The handoff ranks last** (`agentOrder.js:6`), so the index fallback lands on older pages first. This is why the stale page shows mostly at the compact / fresh-session moment.
4. **The dialog cannot close by itself while a settled page is left:** `hasNewQuestion` (`App.jsx:258`) counts every non-early page.
5. **Keep:** BR2.1 (a live page being read stays put, `AgentDialog.test.jsx:259`); audit pages have no store state and count as open; a KEPT `ended` page lingers 3 s for its status line on purpose; a newer handoff offer replaces the old one silently (`agentEvents.js:496`).

## Brownfield Notes for US-0608

1. **What is kept today.** Only the three release-list kinds are kept (`planningRecord.js:9`). An editor save (`ipc.js:1008` → `writeFileSafe`), an agent's write in a terminal and a marker or criterion edit are held by nothing. The docs watcher (`ipc.js:308-329`) sees them but only reloads the view. On the target branch, the next cycle's `commitIn` sweeps them into a commit with the next action's subject, or into `docs: update the feature docs`. On a story branch they stay in the story's tree, because `commitActions` returns early when there are no actions (`planningSync.js:207`).
2. **The intermittent assignment error: out-of-date hashes (most likely).** This happens on the in-place path only, with the checkout on `main` (or the docs branch). `commitActions` passes the renderer's hashes when `inPlace` (`:195`), and `applyAction` uses them for the first story (`:71`). `writeFileSafe` then refuses a file whose sha256 changed (`fileWrite.js:82-85`), and the view says "the file changed" (`features.release.conflict`). The hashes go out of date because:
   - `features:changed` comes several times per action: from `planningAction` (`ipc.js:600`), from the docs watcher 300-800 ms after each write, and from the kick's cycle after a push (`ipc.js:574`);
   - `ReleasesView` unlocks on any new `features` (`FeaturesView.jsx:301`), so a watcher reload from action A can unlock the list while action B is still running, or queued behind a push in `serial`;
   - `loadDocs` has no request id (`useFeatures.js:31-40`), so an older reply can land last;
   - `ReleasePicker` has no lock at all (`:110-136`);
   - the cycle's `merge --ff-only` (`planningSync.js:303`) can change the checkout's files after a rebase onto a newer `origin/main`.
   A test can reproduce it: two `planAction` calls on main, the second with the hashes read before the first.
3. **A conflict after a partial write.** `setStoryRelease` writes the epic, then the overview, then the plan rows (`releases.js:54-63`). A refused overview, or a throw from a plan-row write, leaves the epic changed. `planAction` then removes the action (`planningSync.js:234-241`). A throw from `git status`/`add` inside `commitIn` (for example `index.lock`) does the same after the files are written. The stray change is later committed under another subject, or never in the record.
4. **git contention in the person's checkout.** In-place commits share `.git/index` with the agent terminal, an editor's git and the person. A held `index.lock` makes `add`/`commit` fail as `{kind: 'commit'}`, or makes `git status` throw. Worktree add and remove also lock `.git/worktrees`.
5. **Two app instances on one repo** (a dev build and the installed app). They have different `userData`, so different records and worktree folders, but the same `dash/planning` branch. `worktree add` then fails with "already used by worktree", and `serial` cannot see across processes (`:211`). Both also push.
6. **Why the waiting changes never show.**
   - `PlanningSync` reads the status only on mount and on a `features` change (`FeaturesView.jsx:220-231`), and renders nothing at `pending === 0`.
   - When idle, `planning.kick` pushes right after the action (`ipc.js:601`), so the count is non-zero only for seconds.
   - When busy, the count is right after the action, but a tick's push, error or new count reaches the view only if the tick re-applied or pushed (`ipc.js:574`); a failed tick sends nothing.
   - Only the three kinds are counted (note 1). The block lives only in the Releases tab, not beside the story-detail picker.
   - On a story branch the action lands on `dash/planning` and the checkout never shows it (`planningSync.js:206-208`). So the list shows neither the change nor, once pushed, any count.
7. **Target and protection.** `protectedMain` is learned once (`gh api`) or from a refused push, and stored in the record. The docs branch is `planningBranch` or `docs/planning`. The pull request is squash-merged at once; the branch is kept.
8. **UI rules.** Every new text needs keys in both locale files under `features.planning.*`, in the LCARS look, and never colour alone. The tests read `planning-sync`, `planning-pending`, `planning-push-now`, `planning-error`, `releases-add-story`, `releases-remove-story` and `features-view-release-picker`.
9. **End-to-end tests are new.** Nothing builds or launches the app in CI. Playwright `_electron.launch` needs a dev dependency, `electron-vite build` (the `out/` entry in `package.json` `main`), `xvfb-run` on ubuntu, and a temp repo with a bare origin. The temp repo can follow the `planningSync.test.js` setup (`git -c init.defaultBranch=main`, `init --bare`). `node-pty`'s postinstall rebuild runs in `npm ci` already.

## Brownfield Notes for US-0030 (kept from `0ebb196`, not re-verified)

1. A permission wait sticks on the main row: dialog kinds carry no agent id (`agentEvents.js:26-33`), and only a later event on that row clears it.
2. The step count disappears when the hooks are current: `AgentProgress.jsx:183-189` swaps the audit rows for the hook rows.
3. No words for the tool call or the task: the adapter drops everything that is not identifier-shaped (`agentAdapters.js:269-301`).
4. Pair a task to its agent row by the Agent tool's `tool_use_id`, or by order [assumption].
5. Rows carry `sinceMs` but not `lastMs`; let the view age every state.
6. New texts under `tokenDetail.progress`; tests read `agent-progress-main`, `agent-progress-agent`, `agent-progress-state`.

## Brownfield Notes for US-0210 (kept, not re-verified)

- A saved AI-DLC profile is efforts per group, not models.
- New intent detection needs a baseline like `refreshQuestions`'s `startedWith`; take the plan from `plan ?? scope`.
- End detection uses `inProgress()` plus `missingOnDisk`.
- The question must be an LCARS dialog, not `window.confirm`.

## Brownfield Notes for US-0303 (kept, not re-verified)

`runtime-graph.json` is git-ignored; the shards are per machine; missing is not empty; repeated stages sum their runs; story history from `git log` is often a zero span after a squash merge; a shallow clone has no tag dates.
