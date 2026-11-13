# API Documentation: aidlc-dash

The app has no HTTP, GraphQL or network APIs. Its API surface is Electron IPC between the renderer and the main process, exposed as `window.bridge` in `src/preload/index.js` (read in full in this scan). Invoke functions are built with `call(channel)` and subscriptions with `subscribe(channel)`. Every project handler in `src/main/ipc.js` looks up `projectId` (an unknown id throws `errors.unknownProject`) and routes paths through `projectAccess`. Errors are logged as `[ipc] <channel> misslyckades` and returned as a rejected promise. The renderer strips Electron's prefix with a local `errorText()`. Error messages from main are translated in main's current language (`t('errors.…')`).

## Invoke calls (renderer → main), 35

| `window.bridge` | Channel | Arguments | Result |
|-----------------|---------|-----------|--------|
| `pickProject` | `project:pick` | – | folder path or `null` (dialog title `app.pickFolder`) |
| `openProject` | `project:open` | `dir` | `{projectId, root, name, detection}`; `detection` = `{isAidlc: true, activeSpace, spaces}` or `{isAidlc: false, reason}`. Starts watching the space, or waits for AI-DLC |
| `closeProject` | `project:close` | `projectId` | – (kills the project's ptys and watchers; pushes `questions:changed`) |
| `getSpaces` | `project:spaces` | `projectId` | `string[]` |
| `getIntents` | `project:intents` | `projectId, space, onlyDirs?` | `{intents, warning}`; switches the watched space if it differs |
| `getIntent` | `project:intent` | `projectId, space, dirName` | `{dirName, base, request, state, graph, pipeline, events, units, directive, files, warnings, stale?}` |
| `getCost` | `project:cost` | `projectId, space` | `{available: true, project, perIntent, byScope, timeline, stale?, warning?}` or `{available: false, reason}` |
| `getModels` | `project:models` | `projectId` | `{source: 'aidlc-config'|'agent-files'|'none', agents: [{agent, model, effort}], error?}`; cached per opened project; Claude-only (see below) |
| `readFile` | `project:file` | `projectId, rel` | text |
| `revealInFinder` | `shell:reveal` | `projectId, rel` | – |
| `openInEditor` | `shell:openInEditor` | `projectId, rel` | – (only `.md .json .txt .yaml .yml`) |
| `getSettings` / `setSettings` | `settings:get` / `settings:set` | `partial` | sanitised settings (table below). `settings:set` switches main's language and rebuilds the menu when `language` changed |
| `getLanguage` | `i18n:language` | – | `'sv' | 'en'` (auto already resolved); new with US-0701 |
| `ptySpawn` | `pty:spawn` | `{projectId, kind: 'claude'|'shell', cols, rows}` | session id (UUID). An unknown kind throws `errors.unknownTerminal`; node-pty failing to load throws `errors.ptyLoadFailed` |
| `ptyWrite` | `pty:write` | `id, data` | – (`data` must be a string; unknown id throws `errors.noSession`) |
| `ptyResize` | `pty:resize` | `id, cols, rows` | – (clamped to 1-999; defaults 100x30) |
| `ptyKill` | `pty:kill` | `id` | – (unknown id is ignored) |
| `getGitStatus` | `git:status` | `projectId` | `{isRepo, branch, upstream, tracking, ahead, behind, dirtyAidlc, dirtyOther}` |
| `gitFetch` | `git:fetch` | `projectId` | – |
| `getRemoteChanges` | `git:remoteChanges` | `projectId, ref, space` | `{ref, aidlcCommits, aidlcFiles, otherFiles, auditLines, newIntents}` |
| `showRemoteFile` | `git:showRemote` | `projectId, ref, rel` | text (only under `aidlc/`) |
| `getConflicts` | `git:conflicts` | `projectId` | `string[]` |
| `getSetupInfo` | `setup:info` | `projectId` | `{git: {isRepo}, harnesses: string[], preview, plugins, presets, aidlc: {installed, version?, error?}, warning?}`; stored on the project for `setup:command` |
| `buildSetupCommand` | `setup:command` | `projectId, {needsGit, plugins, preset}` | command string (never run here) |
| `loadFeatures` | `features:load` | `projectId` | overview and epics |
| `getStoryLinks` | `features:storyLinks` | `projectId, space` | `{storyId: dirName[]}` |
| `getProjectSettings` | `projectSettings:get` | `projectId` | `{featureDocs, featuresPath}` |
| `setProjectSettings` | `projectSettings:set` | `projectId, partial` | `{featureDocs, featuresPath}`; the handler passes only these two fields on (`ipc.js:274`), then restarts the feature-docs watch and pushes `features:changed` |
| `toggleFullscreen` | `window:toggleFullscreen` | – | – |
| `isFullscreen` | `window:isFullscreen` | – | `boolean` |
| `sendMenuState` | `menu:state` | `{hasProject, isAidlc, showFeatures}` | – (only three booleans accepted, `parseMenuState`) |
| `openDocsUrl` | `app:openDocsUrl` | – | – (fixed `AIDLC_DOCS_URL`) |
| `listQuestions` | `questions:list` | – | waiting questions of every open project, newest first, each with `early` |
| `setActiveProject` | `questions:activeProject` | `projectId | null` | – (decides whether a notification shows) |

`platform` (`process.platform`) is exposed besides these.

## Push events (main → renderer), 10

| `window.bridge` | Channel | Payload |
|-----------------|---------|---------|
| `onProjectChanged` | `project:changed` | `{projectId, space, dirNames, indexChanged, costChanged}` |
| `onProjectDetected` | `project:detected` | `{projectId, detection}` |
| `onWatchError` | `project:watchError` | `{projectId, message}` |
| `onFeaturesChanged` | `features:changed` | `{projectId}` |
| `onPtyData` | `pty:data` | `{id, data}` |
| `onPtyExit` | `pty:exit` | `{id, exitCode, signal}` |
| `onFullscreen` | `window:fullscreen` | `boolean` |
| `onMenuCommand` | `menu:command` | `{command, ...args}`; `terminal {action: 'claude'|'shell'|'restart'}` among them |
| `onQuestions` | `questions:changed` | same list as `questions:list` |
| `onQuestionFocus` | `questions:focus` | the question's `id` when a notification is clicked |

Every `on*` returns an unsubscribe function. Project pushes go to the `webContents` that opened the project, after an `isDestroyed()` check.

## External commands the main process runs

All through `runFixed(file, args, {cwd: project root, timeout})` (`src/main/exec.js`): `execFile`, no shell, string arguments only, default timeout 10 s, PATH from the login shell. Missing tools reject with ENOENT; callers turn that into a state, not a crash.

| Caller | Command | Use |
|--------|---------|-----|
| `setup.getSetupInfo` | `aidlc --version` | installed or not |
| `setup.getSetupInfo` | `aidlc --project-dir <root> config --harness claude --dry-run` | preview counts, conflicts, notes |
| `setup.readPlugins` | `aidlc config project --show --json` | `data.installedPlugins` |
| `models.getConfiguredModels` | `aidlc config models --show --json --harness claude` | `data.effective[]` |
| `git.js` (earlier scan) | `git rev-parse`, `rev-list`, `diff`, `status`, `show`, `fetch` | read-only git |
| `exec.loginPath` | `$SHELL -l -i -c "printf <marker>$PATH"` | PATH once per process |

The pty (`pty.js`) is the only place that runs a CLI through the shell: `$SHELL -l -i -c claude` for the agent tab, `$SHELL -l` for the shell tab, both with `cwd` = project root.

## Commands the app types into a terminal (never run without the person's Enter, except a safe intent switch)

| Where | Tab | Text | Enter |
|-------|-----|------|-------|
| `ResumeButton` | `claude` | `/aidlc` (active intent) | no |
| `ResumeButton` | `claude` | `/aidlc intent <dirName>` then `/aidlc` | first yes (only when `dirName` matches `SAFE_DIR_NAME`), second no |
| `TerminalPanel` quick commands | `claude` | `/aidlc --status`, `/aidlc --doctor`, `/aidlc continue` | no |
| `SetupDone` (`ProjectView`) | `claude` | `/aidlc --doctor`, `/aidlc ` | no |
| feature docs (`ProjectView` via `featureDocsPrompt`) | `claude` | one-line request in the current language | no |
| `SetupAidlc` | `shell` | `buildSetupCommand` chain | no |
| `RefreshPanel` (earlier scan) | `shell` | git pull / from-main chains | no |

These are the strings US-0801 makes harness-dependent (Resume, quick commands, setup offers).

## Settings (`settings.json`)

`settings.js` keeps `settings.json` in userData (folder `aidlc-dash`) and runs `sanitize()` on every read and write:

| Key | Type | Rule |
|-----|------|------|
| `openProjects`, `recentProjects` | `string[]` | strings only, at most 50 |
| `activeProject` | `string | null` | else `null` |
| `animations` | `'full' | 'reduced' | 'off'` | left out when missing or invalid |
| `fullscreen` | `boolean` | saved by main |
| `questionAlerts` | `'popup-notify' | 'popup' | 'off'` | whitelist `QUESTION_ALERTS` |
| `notificationSound` | `boolean` | missing means on |
| `language` | `'auto' | 'sv' | 'en'` | whitelist `LANGUAGE_SETTINGS`; missing means auto (US-0701) |
| `projectSettings` | `{[realpath root]: {featureDocs: 'auto'|'show'|'hide', featuresPath}}` | at most 200 projects; invalid values fall back per field; unknown fields dropped |

Every other key is dropped silently. `setSettings` never touches `projectSettings`; only `setProjectSettings(root, partial)` does, with validation that throws `errors.unknownFeatureDocs` or `errors.invalidFeaturesPath`. A new per-project key (such as the harness choice) needs `sanitizeProject`, `setProjectSettings`'s validation and the `projectSettings:set` field pick to change together.

## Translation API (`src/shared/i18n.js`)

- `t(key, values)`: ICU MessageFormat text; `{name}` placeholders and `{n, plural, …}`. Falls back to English, then to the key.
- `resolveLanguage(setting, osLocale)`: `sv`/`en` as chosen, else Swedish when the locale starts with `sv`, else English.
- `LANGUAGES`, `LANGUAGE_SETTINGS`, `locale()` (Intl locale for dates and numbers), default export: the process's i18next instance.
- Main: `currentLanguage()`, `setLanguageFromSettings(settings)` (`src/main/i18n.js`).

## Audit events the renderer receives (`detail.events`)

From `projectService.loadAuditEvents` + `parsers/audit.js` (earlier scan, not re-read): one entry per block in each `<intent>/audit/*.md` with `timestamp`, `event`, `title`, `fields` (every `**Key**: value` verbatim), `source`, `index`, `key` (`<source>#<index>`), `timeMs`, `seq`, `category` (`categoryOf(event)`).

## Internal APIs

- `useTerminal()` (`TerminalContext.jsx`): `view`, `setView`, `error`, `register(tab, session)`, `show(tab)`, `state(tab)`, `exitCode(tab)`, `pending(tab)`, `input(tab)`, `type(tab, text, {submit})`, `sequence(tab, steps)`, `restart(tab)`. Tabs are `'claude'` and `'shell'`. Returns `null` outside a `TerminalProvider`.
- `createActivity({quietMs})`, `waitFor(activity, target, ms)`, `runSequence(term, steps)`, `withEnter(text, submit)` (`terminalControl.js`).
- `summarizeLedger(ledger, intents)` and `compareModels(configured, actualByAgent, {onlyParticipants})` (`parsers/ledger.js`): pure; the renderer imports `compareModels`.
- `featureDocsPrompt({exists, path})` (`featureDocsPrompt.js`): one line, current language.
- `APP_NAME`, `APP_FULL_NAME`, `APP_TAGLINE`, `APP_SHORT`, `APP_VENDOR` (`src/shared/appName.js`).
- `motionMode(saved)` (`App.jsx`), `windowOptions(settings, platform)` (`src/main/index.js`), `buildMenuTemplate`, `parseMenuState` (`src/main/menu.js`).
