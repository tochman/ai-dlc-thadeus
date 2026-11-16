# Code Quality Assessment

## Tests

- **Runner**: vitest 5.1.0 with three projects. `main` runs in node (`tests/main/**/*.test.js`). `scripts` runs the timed hook-script tests. `renderer` runs in jsdom with Swedish i18n (`tests/renderer/**/*.test.jsx`).
- **Size**: 82 main and 48 renderer test files at `bbfb4c0` (72 and 39 at `721e051`). No tests were run in this scan.
- **Coverage**: v8, with an 80% line floor across `src/**` (`vitest.config.mjs`). CI runs `npx vitest run tests/ --coverage`.
- **Tests near US-0303**: `parsers.test.js` (audit, state, graph, pipeline, intents), `features.test.js`, `releases.test.js`, `git.test.js` (with an injected `exec`, so no real git runs), `auditCost.test.js`, `agentProgress.test.js`, `projectService.test.js`, `featureDocsStatus.test.js`; renderer `CostPanel.test.jsx`, `FeaturesView.test.jsx`, `Timeline.test.jsx`, `IntentDetail.test.jsx`, `ProjectView.test.jsx`, `noNativeTitle.test.jsx`.

## Lint, Format, CI

| Check | State |
|---|---|
| ESLint 9 flat config | in CI (`npx eslint .`) |
| Prettier | in CI (`npx prettier --check .`) |
| Secret scan | gitleaks on every PR commit |
| Build | mac universal dmg and Linux deb on every PR |

`team.md` still says coverage, ESLint and Prettier are "not set up yet". That is out of date: all three run in `.github/workflows/release.yml`.

## Quality Ratings

| Aspect | Rating | Evidence |
|---|---|---|
| Naming clarity | good | intent-revealing names; story ids in the headers |
| Function size | fair | most functions are small and pure; `ipc.js` (1038 lines), `App.jsx` (748) and `FeaturesView.jsx` (682) are large |
| Error handling | good | never-throw readers, the last good value, root confinement, warnings shown; but see note 3 below |
| Test presence | good | 130 test files, coverage floors |
| Duplication | fair | the events are walked once per consumer (`workingAgents`, `progressRows`, `stageRollups`, `pendingQuestions`), each with its own "current stage" tracking |
| Accessibility | good | one focusable tooltip (US-0414), names kept, status never colour alone |
| Dead code | good | 0 TODO/FIXME |

## Technical Debt

- 12 `ponytail:` comments in the scanned main files and 9 in the renderer. Examples: the unbounded caches in `projectService.js`; one open dispatch per agent type and stage in `workingAgents`; the two-step story marker write in `releases.js`; `loadStoryLinks` reading two files per intent on every call.
- `parsers/agentProgress.js` imports `projectService.js`, so the parsers folder is no longer free of Node imports.
- `.thadeus/tokens/<intent>.json` is written into the project and shows as untracked.

## Brownfield Notes for US-0303

1. **`runtime-graph.json` is git-ignored.** Stage durations from `parseRuntimeGraph` exist only on the machine that ran the intent. Durations taken from the audit events work on every clone.
2. **Shards are per machine.** `mergeAudits` merges all committed shards by time. An intent worked on two machines has interleaved events; pairs (start/complete, awaiting/approved) should be matched by `Stage`, not by order alone.
3. **Missing is not empty.** `loadAuditEvents` returns `[]` for a missing audit folder, and `auditEventsOrEmpty` turns a read error into `[]` with only a console warning. AC 4 needs a missing or unreadable record named in the view, so the velocity loader must keep `missing`/`error` per intent, as `readJsonSafe` does.
4. **Inherited times.** A block without a valid `Timestamp` gets the previous block's `timeMs`, and the first ones get `-Infinity`. Durations must ignore non-finite times.
5. **Repeated stages.** A stage can start more than once (revisions, `STAGE_JUMPED`, unit-by-unit builds with a `Unit` field). Stage time should sum its runs, and approval waits and review rounds should be counted per run.
6. **Story history needs git.** No history call exists today. A new `git log` over the epic files (fixed arguments, `safeArg`, `--follow` not needed when the paths are stable) can date when 🚧 and ✅ first appear on a story's head line. Commits are squash-merged per story, so 🚧 and ✅ often land in the same commit; a zero or missing span must show as unknown, not as zero.
7. **"Released in" date.** The release date is the tag's `creatordate` from `listReleaseTags`. A shallow clone has no tags, and `buildReleases` then relies on the "Released in" marker alone, with no date.
8. **Intent end.** `WORKFLOW_COMPLETED` exists on finished intents. `intents.json` has a `status` but no dates, and the state file's `Last Updated` is not an end time. A running intent has no end event and shows "so far".
9. **All-intents cost.** Reading every audit log once per view open costs about what `project:cost` costs today. Caching per intent (as `listCache` does) may be needed for large spaces.
10. **UI rules.** A new view must use LCARS primitives and `Tooltip` (no `title=`), give every text a key in both locale files, and follow `data-motion`.
