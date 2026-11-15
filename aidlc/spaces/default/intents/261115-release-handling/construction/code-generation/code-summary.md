# Code Summary — US-0603 Releases or continuous deployment

## Files

- New: `src/main/parsers/releases.js` (markers, `setReleaseMarker`, `releaseOptions`, `buildReleases`, `ruleStatus`), `src/main/releases.js` (`setStoryRelease`, `readRuleStatus`), `tests/main/releases.test.js`.
- Changed, main: `parsers/features.js` (🚀 Deployed), `features.js` (file hashes), `git.js` (`listReleaseTags`), `settings.js` (`delivery`), `ipc.js` (`features:setRelease`, `features:ruleStatus`, tags on `features:load`, `delivery` on `projectSettings:set`), `preload/index.js`.
- Changed, renderer: `FeaturesView.jsx` (Epics | Releases, release picker, Releases view, stale flag), `ProjectSettingsDialog.jsx` (delivery radios), `ProjectView.jsx` (rule notice), `useFeatures.js`, `featureDocsPrompt.js` (`lifecycleRulePrompt`), `theme.css` (three rules), `sv.json` / `en.json`.
- Tests changed: `features`, `settings`, `git`, `ipc`, `featureDocsStatus` (main); `FeaturesView`, `ProjectSettingsDialog`, `featureDocsPrompt`, `useFeatures`, `ProjectView` (renderer).

## Decisions and deviations from the plan

- `delivery` is not in `PROJECT_DEFAULTS`: it is left out until chosen (as `harness`), and `DELIVERY_DEFAULT = 'releases'` applies where it is read. The dialog saves it only when changed.
- `features:setRelease` takes `{storyId, version, epicHash, overviewHash}`; main finds the files itself, so the renderer never names a path.
- A status segment that names several stories ("US-0601 and US-0602 released…") is left alone by the picker (`ponytail:` comment).
- "Released in vX.Y.Z" counts as released even without its tag, so a checkout without tags still shows it.
- The rule check reruns on `project:changed` too, which is how the app sees the agent saving the rule.
- A rule with no tag that holds 📋, 🚧 and ✅ counts as `older`.
- Epic and overview are two writes, not one transaction; a refused second write leaves the first and the refusal is shown (`ponytail:` comment).

## Tests

- TDD: each Red run was recorded before its Green (missing modules, `statusOf('🚀')` null, 6 main failures, 10 renderer failures, 🚀/stale in the status test).
- This story's tests all pass. This repo's own docs pass the status test against its tags v0.1.0–v0.2.4.
- Full suite (`npx vitest run tests/`): 1306 or 1307 of 1307 pass depending on the run. The failure moves between shell-timing tests this story does not touch (`dialogScript.test.js` "hands back 2.0 to 2.5 s…", `agentChannelScript.test.js` "closeSession makes a waiting hook exit…"); each passes on its own. Their thresholds are unchanged.
- ESLint: 0 errors, 12 `react-hooks/exhaustive-deps` warnings.

## Not executed here

- Coverage: not measured in this repository yet (no coverage tooling), so the 80% floor (NFR3) is not checked.
- The built app in Electron (picker writing real files, Releases view, notice typing into the agent tab) is checked by hand in Build and Test.
