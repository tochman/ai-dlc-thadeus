# Unit Test Instructions: US-0608

## Framework

vitest 5.1.0 (`vitest.config.mjs`, projects `main` in node and `renderer` in jsdom, Swedish locale). End-to-end: `@playwright/test` with its `_electron` launcher, added by Step 18, config `playwright.config.mjs`, tests in `tests/e2e/` (outside both vitest projects).

## Commands (this work only)

Runner check before the first Red (Step 2):

```bash
npx vitest run tests/main/planningRecord.test.js
```

The work's unit tests:

```bash
npx vitest run tests/main/planningRecord.test.js tests/main/planningSplit.test.js tests/main/planningSync.test.js tests/main/releases.test.js tests/main/fileWrite.test.js tests/renderer/FeaturesView.test.jsx tests/renderer/useFeatures.test.jsx
```

End-to-end, after a build (its own command, run after the one above):

```bash
npx electron-vite build && npx playwright test tests/e2e/planning.spec.js
```

On Linux without a display: `xvfb-run -a npx playwright test tests/e2e/planning.spec.js`.

## Expected coverage targets

About 14 new vitest tests, one per requirement (FR1.1, FR1.2, FR1.3, FR2.1, FR2.3, FR3, FR4.1, FR4.2, FR5.2, FR5.3, FR6, FR7) plus the record and split helpers, and 2 Playwright tests (FR9.1, FR9.2). The project floor is 80% line coverage; Build and Test checks it on the full suite (`npx vitest run tests/ --coverage`), not on this command.

## Mocking and test data

- Git: real git in a temp folder with a local bare `origin`, as `planningSync.test.js` already does; no mocked git for the cycle tests.
- `gh`: a fake function in `ctx.gh`; `online` a stub returning true.
- Time: vitest fake timers for the 30-second window (FR6).
- `userData`: a temp folder per test, removed after.
- Renderer: `window.bridge` mocks as in `FeaturesView.test.jsx`, with a controllable `onPlanningChanged`.
- Feature docs: small fixture epics with two stories (US-0608 and US-0999) and a `FEATURES.md` with their rows.

## Red evidence

Each Red step's failing command output is pasted below before its Green step.

### Step 2 runner check

`npx vitest run tests/main/planningRecord.test.js`: 1 file, 6 tests passed.

### Step 3 (data model) `npx vitest run tests/main/planningRecord.test.js`

```
     × keeps a content entry and reads it back; a later save of the same file replaces it and keeps its earlier base
     × drops a content entry outside the docs or without a base hash, and refuses to add one (FR2.2)
     × marks an entry as a conflict and resolves it with a new base (FR5.2)
TypeError: addContent is not a function
AssertionError: expected [] to deeply equal [ 'g' ]
TypeError: addContent is not a function
      Tests  3 failed | 6 passed (9)
```

### Step 6 (data access) `npx vitest run tests/main/planningSplit.test.js`

```
     × cuts an epic into its text and one block per story, and joins back to the same text
     × cuts the overview into one block per table row, keyed by the id it names
     × keeps the own block in the story tree and returns only the other block as a change
     × applies the other change onto a target that moved on elsewhere, and names a block that moved on as a conflict
     × a new story and a file that is not on the target are other changes; nothing changed gives no change
TypeError: storyBlocks is not a function
TypeError: splitChange is not a function
      Tests  5 failed (5)
```

### Step 9 (business logic) `npx vitest run tests/main/planningSync.test.js`

Four US-0606/US-0607 tests were changed to the behaviour this story replaces (commit after the 30-second window, one
subject per burst, the story's own block on a story branch); they fail with the new tests.

```
     × leaves a story branch, its index and its working tree byte for byte as they were, and pushes to origin/main (NFR1, FR2.1, FR3.2)
     × puts several actions in a row into one commit with one subject (FR2.3, US-0608 FR6.2)
     × agent edits to the feature docs are committed and pushed on main, and an own story edit stays on a story branch (FR2.5)
     × a commit hook refusing returns the reason and the files, and keeps the change (FR4.2)
     × FR1.1: a second assignment on main with the hashes read before the first succeeds
     × FR1.3: a file changed outside the app is refused with the file named, and the change stays in the record
     × FR2.1, FR2.3: an editor save and an agent write are recorded once each, the app own writes not at all, and leave only on origin/main
     × FR3: on a story branch another story and a release file go to dash/planning and leave the tree and index; the own block stays
     × FR4.1: after a discard, a stash, a restart and a branch switch, the next cycle applies every waiting change again
     × FR5.2, FR5.3: a conflict keeps the target in the file and mine in the record; Use mine and Keep theirs do so
     × FR6: three changes within 30 s are one commit, 30 s after the last, with the FR6.2 subject
AssertionError: expected [ 'docs: plan v2.0.0', …(3) ] to deeply equal [ …(2) ]
AssertionError: expected 'docs: update the feature docs' to be 'docs: update US-0102'
AssertionError: expected { ok: false, inPlace: true, …(1) } to match object { ok: true }
AssertionError: expected { Object (conflict) } to match object { ok: true }
AssertionError: expected { Object (conflict) } to deeply equal { …(2) }
TypeError: recordContent is not a function
TypeError: recordTree is not a function
AssertionError: expected 'e23473e2…' to be 'e33eded7…' (FR6: committed at once, not after the window)
      Tests  11 failed | 12 passed (23)
```

### Step 12 (API) `npx vitest run tests/main/ipc.test.js`

`ipc.test.js` is the boundary test for `ipc.js`; it is run on its own here because the plan's command does not list it.

```
     × creates and deletes a release through the planning record, and reports and pushes planning (US-0607 FR4.1, FR1.3)
     × records an editor save before writing it, and remembers the app wrote it (FR2.2, D2)
     × sends every cycle result as features:planningChanged, also a failed one, and resolves a conflict (FR7.2, FR5.3)
     × records what the docs watcher sees
AssertionError: expected { pending: +0, reapplied: 2, …(3) } to deeply equal { pending: +0, reapplied: 2, …(5) }
AssertionError: expected last "vi.fn()" call to have been called with [ ObjectContaining{…}, …(3) ]
AssertionError: expected "vi.fn()" to be called with arguments: [ Array(2) ]
AssertionError: expected "vi.fn()" to be called with arguments: [ ObjectContaining{…} ]
      Tests  4 failed | 73 passed (77)
```

### Step 15 (frontend) `npx vitest run tests/renderer/FeaturesView.test.jsx tests/renderer/useFeatures.test.jsx tests/main/planningSync.test.js -t "FR1.2|FR7|FR5.3|US-0608|answers after"`

The planningSync test is for the `changed` field the lock needs from `planAction`. Before this, the starting run showed one
red test left by Steps 9–14: `fileWrite.test.js` lists the modules that may import `writeAtomic`, and `planningSync.js`
now does (it writes only checked doc paths); it was added to the list with its reason, as earlier stories did.

```
     × ignores a load that answers after a later one, so older hashes never replace newer (US-0608 FR1.2)
     × keeps the list and the story picker locked until a load with other hashes, and unlocks at once when no reload follows (FR1.2)
     × lists each waiting change with its stories and target and Push now, and follows every cycle, also a failed one (FR7, FR4.2)
     × shows the waiting list beside the story-detail picker too (FR7.1)
     × a conflict names the file and offers Use mine, Keep theirs and Open both in the editor (FR5.3)
     × FR1.2: an action says whether it changed the docs, so the view knows a reload with new hashes follows
AssertionError: expected { ok: true, inPlace: true } to deeply equal { ok: true, inPlace: true, …(1) }
AssertionError: expected false to be true // Object.is equality
TestingLibraryElementError: Unable to find an element by: [data-testid="planning-entry"]
AssertionError: expected 'old' to be 'new' // Object.is equality
      Tests  6 failed | 23 passed | 31 skipped (60)
```

Step 16 Green: the work's command above plus `tests/main/ipc.test.js` and `tests/main/i18nKeys.test.js`: 9 files, 190 tests passed.

### Step 18 (end-to-end) `npx electron-vite build && npx playwright test tests/e2e/planning.spec.js`

No Red run was recorded. Before `THADEUS_E2E_USER_DATA` existed, the built app could only start on the person's real
userData, with their open projects and settings, so the spec could not be run safely first. The env var went in
first (`src/main/index.js`, one line). After that the spec passed on its first run: the behaviour it covers was built
in Steps 1–17, and the spec needed no other change to pass.

```
  ✓  1 tests/e2e/planning.spec.js › on main: create, assign, move, remove, the waiting list, Push now, the commit on origin/main (FR9.1) (9.5s)
  ✓  2 tests/e2e/planning.spec.js › on a story branch: the same run leaves the branch, its index and its tree as they were (FR9.2) (8.1s)
  2 passed (18.4s)
```

Repeated with `--repeat-each=2`: 4 passed. On a story branch the view shows the story's own tree, which the plan never
touches, so that run checks each step in the waiting list and removes US-0102 through its picker (assign, move to
v0.10.0, None). Playwright's output goes to `tests/.tmp/e2e-results` (already ignored by git).
