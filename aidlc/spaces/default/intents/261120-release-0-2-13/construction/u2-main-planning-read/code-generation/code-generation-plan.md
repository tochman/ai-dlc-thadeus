# Code Generation Plan: U2 u2-main-planning-read (US-0036)

## Summary

- Builds: on a story branch, the Features and Releases views read the planning from `origin/<target>` with git, lay the branch's own story blocks on top, name the branch they read, reload after a fetch that moved it, and drop a queued planning change that only holds an older copy
- Touches: `src/main/parsers/features.js`, `src/main/features.js`, `src/main/planningSync.js`, `src/main/ipc.js` (`features:load`, the cycle's reload), `src/renderer/FeaturesView.jsx`, the locales, their tests
- Tests: 16 new tests (4 in `planningSplit.test.js`, 3 in `features.test.js`, 7 in `planningSync.test.js`, 2 in `FeaturesView.test.jsx`), test first

Story: US2.1 (US-0036), AC2.1.1–AC2.1.5; FR2.1–FR2.5; NFR1–NFR5. Design: ADR-001 (`../../../inception/domain-design/decisions.md`).

## Design

- `parsers/features.js`: a pure `overlayOwn(target, work, own)` returns `target` with every story block of `work` whose ids are in `own` put in its place (replaced, or inserted after the block it follows in `work`). It reuses `storyBlocks`.
- `planningSync.js`: a new exported `planningSource(ctx)` gives `{inPlace, branch, ref, remote}`. `inPlace` (checkout on the target) reads the disk as today. Otherwise `ref` is `targetRef(ctx, target)` (origin's target, else origin's main, else the local target or `main`), and `remote` is whether it is an `origin/` ref (FR2.5). It exports `ownStories` too, plus a `showAt(ctx, ref, file)` read.
- `features.js`: `loadFeatures(root, overviewRel, {read})` takes an optional reader (default: the root-confined `readText`). The new `loadPlanningFeatures(ctx)` calls `planningSource`. In place it is `loadFeatures` as today; otherwise its reader returns, per file, `overlayOwn(git show <ref>:<file>, disk text, ownStories)`, with the target's text alone for the plans folder and the target's listing of the plans folder (`git ls-tree`). The result adds `source: {branch, ref, remote, inPlace}`. Hashes are of the text shown. Writes made off the target already run in the worktree with fresh hashes, so the shown hashes are never written against the disk.
- Stale queued change (FR2.3): in `replayStep`, before a content entry is marked a conflict, it is dropped when its content equals the file at one of the last 20 commits of that file on the read ref (`git log -n 20 --format=%H <ref> -- <file>`), an older copy the target already had. `ponytail:` comment: only the last 20 commits are compared.
- Reload after a fetch (FR2.2): `pushStep` records the read ref's commit before and after its fetch, and the cycle's result carries `moved: true` when it changed. In `ipc.js`, the scheduler's `run` sends `features:changed` on `moved` as it does on `reapplied || pushed`. `features:load` calls `loadPlanningFeatures(await planningCtx(projectId))`.
- `FeaturesView.jsx`: a line `data-testid="features-source"` under the view header shows `t('features.source.remote', {ref})` ("Planning from origin/main"), `t('features.source.local', {ref})` ("Planning from main (local, no remote fetched)") or, in place, `t('features.source.here', {branch})`. It uses the existing muted LCARS label classes; no native `title=`.

## Steps

- [ ] **Step 1** (setup): from `main`, create the branch `fix/US-0036`. Set US-0036 to 🚧 In progress, for v0.2.13, in its marker in `docs/features/epic-00-fixes.md`, in the epic's **Status** line and in its `docs/FEATURES.md` cell. Run `npx vitest run tests/main/featureDocsStatus.test.js`.
- [ ] **Step 2** (runner): run `npx vitest run tests/main/planningSplit.test.js tests/main/features.test.js tests/main/planningSync.test.js tests/renderer/FeaturesView.test.jsx` on the unchanged code and record that it is green.
- [ ] **Step 3** (business logic, Red, overlay): in `tests/main/planningSplit.test.js`, add `describe('overlayOwn (US-0036 FR2.1)')`:
  - an own block that differs replaces the target's;
  - an own block the target lacks is inserted after the block it follows;
  - other stories' blocks keep the target's text;
  - with no own ids the target comes back unchanged.

  Run `npx vitest run tests/main/planningSplit.test.js` and record the failing output.
- [ ] **Step 4** (Green): implement `overlayOwn`. Run it green.
- [ ] **Step 5** (Refactor) with the tests green.
- [ ] **Step 6** (data access, Red, source and stale drop): in `tests/main/planningSync.test.js` (temporary repos with an origin, as the file already builds), add:
  - on a story branch, `planningSource` gives `origin/main` (AC2.1.1);
  - with a protected `main`, it gives `origin/<docs branch>` (AC2.1.2);
  - with no remote, it gives the local `main` and `remote: false` (AC2.1.5);
  - on the target, `inPlace: true`;
  - a queued entry whose content equals an older commit of the file on `origin/main` is dropped, not marked a conflict (AC2.1.4);
  - a queued entry with text that is on no commit still becomes a conflict;
  - a cycle whose fetch moves `origin/main` returns `moved: true` (AC2.1.3).

  Run `npx vitest run tests/main/planningSync.test.js` and record the failing output.
- [ ] **Step 7** (Green): `planningSource`, the exports, the stale drop and `moved`. Run it green.
- [ ] **Step 8** (Refactor) with `npx vitest run tests/main/planningSync.test.js tests/main/planningRecord.test.js` green.
- [ ] **Step 9** (business logic, Red, loader): in `tests/main/features.test.js`, add with a temporary repo:
  - on a story branch, `loadPlanningFeatures` shows a release that is only on `origin/main` (AC2.1.1, AC2.1.3);
  - the branch's own story block shows its branch text, and another story shows `origin/main`'s (AC2.1.1);
  - the result's `source` names the ref (AC2.1.5).

  Run `npx vitest run tests/main/features.test.js` and record the failing output.
- [ ] **Step 10** (Green): the reader in `loadFeatures` and `loadPlanningFeatures`. In `ipc.js`, `features:load` uses it, and the scheduler's `run` sends `features:changed` on `moved`. Run it green, plus `npx vitest run tests/main/ipc.test.js`.
- [ ] **Step 11** (Refactor) with the tests green.
- [ ] **Step 12** (frontend, Red): in `tests/renderer/FeaturesView.test.jsx`, add: with `source` naming `origin/main`, `features-source` shows the remote text; with `remote: false` it shows the local text (AC2.1.5). Run `npx vitest run tests/renderer/FeaturesView.test.jsx` and record the failing output.
- [ ] **Step 13** (Green): the line in `FeaturesView.jsx`, and `features.source.remote`, `.local` and `.here` in `sv.json` and `en.json`. Run it and `npx vitest run tests/main/i18nKeys.test.js` green.
- [ ] **Step 14** (Refactor) with the tests green.
- [ ] **Step 15** (checks): this Unit's command from `unit-test-instructions.md`, then `npx eslint` and `npx prettier --check` on the changed files.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "ultra-express",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided at the practices interview (test first for new work), carried over from the baseline. Git history cannot show test-first ordering, so this is not re-proven from evidence.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with three projects: `main` (node, `tests/main/**`, 98 files), `scripts` (the timed hook-script tests, run after the others, retried twice), and `renderer` (jsdom, `tests/renderer/**`, 53 files, Swedish locale).\n- **End-to-end**: Playwright 1.65 drives the built app through Electron (`tests/e2e`, US-0608). This is new since the baseline.\n- **Test count**: about 1,630 `it`/`test` lines by a static grep (1,136 in `main`, 497 in `renderer`). The baseline's 353 was out of date. Not counted by running the suite.\n- **Coverage floor**: 80% line coverage, v8, over `src/**` and the app's opencode plugin. Some agent and dialog files each hold 80% on their own. Set up in `vitest.config.mjs` and checked in CI. Current percentage not measured here.\n- **Suite green before merge**: the full suite (`npx vitest run tests/ --coverage`) runs in CI on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is still checked by hand before a release tag. The built-app Playwright tests in CI do not replace this check."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
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
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:62e0e9fa98cd86fbefaed196456b1ab91473689ff98919dd339561dd96d35b90",
  "contract_sha256": "sha256:b4ae8e1ec7217b124511fee47f9c29395d19f01a4e3b3abd23c00abd3e6afb59"
}
```
