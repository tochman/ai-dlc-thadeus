# Code Summary: US-0605, create a release by hand in the release list

## Files changed

- `src/main/parsers/releases.js`: new `nextVersions(tags)`, which gives the next patch, minor and major. `releaseOptions` and `buildReleases` take `plans = []`, and each entry now has `plan`. New `newReleaseError`, `canDelete`, `planHeading` and `isHeadingOnly`.
- `src/main/features.js`: `loadFeatures` now returns `plans`, read from `docs/releases/X.Y.Z.md`. Other names are ignored, and an unreadable plan becomes a warning. New `plansDir`. `featureWatchPaths` now also watches the plans folder.
- `src/main/releases.js`: new `createRelease(root, overviewRel, version, tags)` and `deleteRelease(root, overviewRel, {version, hash}, tags)`.
- `src/main/ipc.js`, `src/preload/index.js`: new `features:createRelease` and `features:deleteRelease`, which send `features:changed`. The bridge gets `createRelease` and `deleteRelease`.
- `src/renderer/FeaturesView.jsx`: `ReleasesView` takes `projectId` and shows New release (`NewRelease`), Add story, Remove and Delete. While a write runs, everything is locked until the next `features` arrives. The story picker also offers plan versions.
- `src/shared/locales/{sv,en}.json`: new `features.release.*` keys (`new.*`, `add`, `remove`, `removeLabel`, `delete.*`, `planUnreadable`).
- Tests: `tests/main/releases.test.js` and `tests/renderer/FeaturesView.test.jsx`.

## Key decisions

- **No overwrite on create (NFR1).** A new plan is written with `fs.writeFile(..., {flag: 'wx'})`, not `writeAtomic`. A rename would replace anything that appeared after the check, while `wx` fails if anything is already there. The plans folder is resolved again after `mkdir`, so a symlink that points outside the root is refused.
- **Tags in main.** `createRelease` and `deleteRelease` take the tags as a 4th argument, so main can refuse a version that is already tagged. The IPC layer passes `listReleaseTags`.
- **Suggestions** are always the three next versions. A suggestion that already exists is refused with the "exists" message when the person creates it (FR1.1, FR1.2).
- **Lock (FR3.3).** The view remembers the `features` object that a write went out with. A new prop unlocks it. A refusal or a failure unlocks it at once. A `ponytail:` comment records the limit: if a reload is lost, the list stays locked until the view reloads.
- **Add story** offers every story that has no "for" or "Released in" marker. A 🚀 Deployed story without a marker is included.

## Tests and results

- Red, business logic: 5 failed. Examples: `expected [ 'v0.3.0', 'v0.2.5' ] to deeply equal [ 'v1.0.0', 'v0.3.0', 'v0.2.5' ]` and `TypeError: newReleaseError is not a function`.
- Red, plan files: 4 failed. Examples: `expected undefined to deeply equal []` and `TypeError: createRelease is not a function`.
- Red, release list: 3 failed with `Unable to find an element by: [data-testid="releases-new"]` or `[data-testid="releases-delete"]`. The FR5 test passed from the start, because Continuous delivery already hides the list.
- Green: the 3 files of this work pass 39 tests. The full suite passes 1362 tests in 104 files.
- 11 new tests: 7 main and 4 renderer. Three existing expectations were updated for the new major option: two `releaseOptions` cases and the first picker test.

## Not run

- The app itself and the `.dmg` were not run. That is the manual check in Build and Test.
- Coverage was not measured. That is Build and Test's job.

## Deviations

- `createRelease` writes with `wx` instead of `writeAtomic`, and both writes take `tags` (see Key decisions).
- `nextVersions` is a new export, used for the suggestions.
- The locale keys were added during Step 6, because main's messages needed them. Step 10 checked them.
- `prettier --write` was run on the four changed files that Prettier flagged.
