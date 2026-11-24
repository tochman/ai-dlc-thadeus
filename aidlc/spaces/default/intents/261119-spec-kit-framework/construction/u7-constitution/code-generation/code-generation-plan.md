# Code Generation Plan: U7 u7-constitution (US4.2 / US-1404)

## Summary

- Builds: the read-only Spec Kit rules reader (constitution, `extensions.yml`, extension manifests, hooks) and the Configuration › Spec Kit section that shows it
- Touches: `src/main/speckitRules.js` (new), `src/main/speckitFeatures.js`, `src/main/ipc.js`, `src/preload/index.js`, `src/shared/frameworkViews.js`, `src/renderer/SpeckitRules.jsx` (new), `src/renderer/ProjectView.jsx`, the sv/en locales, `package.json` and its lock file (`yaml`)
- Tests: about 40 tests: hooks (7), reader (14), read-only guard (2), watcher and IPC (4), sections (2), renderer (11)

**Branch:** `feat/US-1404`, created from `main` (U6 is merged, #87). The intent record changes already in the tree travel with it and are committed on it. `thadeus-0-3-0-blog-post.md` is the person's and is left out of every commit.

**Sources:** `functional-spec.md`, `rules.md` (BR7.1–BR7.9), `frontend-components.md`, `security-design.md`, `performance-design.md`, `logical-components.md`, contract C6. Each step's criteria are in brackets.

## Steps

- [x] **Step 1: Branch and story status.**
  - `git switch -c feat/US-1404`.
  - Set US-1404 to 🚧 In progress, "for v0.3.0", in its epic marker, the epic's Status line and its FEATURES.md row.
- [x] **Step 2: Runner check and dependency.** Run the unit-scoped commands from `unit-test-instructions.md` on the unchanged tree and record the baseline. Then `npm install yaml@^2` (the lock file pins the exact version; record it and its ISC licence in `code-summary.md`). [NFR8.1]
- [x] **Step 3: Hooks, Red.** `tests/main/speckitRules.test.js`, `hooksFrom(config)`: `before_<x>` and `after_<x>` keys give `when` and `target`; a single mapping counts as a list of one; a key that does not match and an entry without `command` are skipped and counted; mode `off` when `enabled: false`, `mandatory` when `optional: false`, `optional` by default; `condition` kept as a note; a command name that fails `^[a-z0-9][a-z0-9._-]{0,99}$` (`a; rm -rf ~`, a line break, 101 characters) is left out and counted. Record the failing output. [AC4.2.2, BR7.4, BR7.5, NFR3.3]
- [x] **Step 4: Hooks, Green.** `src/main/speckitRules.js` with the pure `hooksFrom`. Header names `US-1404 FR7`.
- [x] **Step 5: Rules reader, Red.** In the same file, on real `fs.mkdtemp` fixtures, `loadSpeckitRules(root)` gives the C6 shape:
  - constitution present (`exists: true`), missing (no error), a folder (error) [BR7.1];
  - `extensions.yml` missing (no extensions, no error), invalid YAML, a list root, an alias bomb (each: no extensions, an error with the reason) [BR7.3, NFR5.2];
  - `installed` as strings and as mappings with `id`; an id found only in a hook; ids deduplicated and sorted; commands from `.specify/extensions/<id>/extension.yml` `provides.commands[].name`; a manifest missing, invalid, or with a bad command name (commands `[]` or the bad one left out, plus an error) [BR7.6, NFR3.3];
  - an unsafe id (`../x`, `a/b`, `..`, `/abs`) builds no path and gives an error [NFR3.2];
  - a constitution or manifest linked to a file outside the root, a file over 1 MB, a non-UTF-8 file, and a FIFO: each named in errors, the rest still shown [NFR3.2, NFR5.2];
  - every returned path is root-relative [NFR3.4];
  - 20 extensions, 50 hooks and a 100 KB constitution: after one warm-up call, the second call is under 300 ms [NFR7.3].

  Record the failing output.
- [x] **Step 6: Rules reader, Green.** `loadSpeckitRules(root)`: `realRoot = fs.realpath(root)`; every read goes through `readSpeckitFile(realRoot, rel)`, which calls `resolveInRoot` (containment), checks `isFile()`, then U6's `readLimited` (now exported from `speckitFeatures.js`, its behaviour unchanged) for the 1 MB and UTF-8 checks; `YAML.parse` with default options; manifests read with `Promise.all`. A thrown error is caught per file and becomes an `errors` entry. `ponytail:` comment on the stat-then-read window (a file growing between the two calls is read in full; a bounded `open`+`read` if it matters).
- [x] **Step 7: Read-only guard, Red then Green.** A test spies on every `fs` write call (`writeFile`, `rename`, `mkdir`, `rm`, `unlink`, `appendFile`, `copyFile`, `open` with a write flag) and runs `loadSpeckitRules` and `hooksFrom` on a fixture: no call. [BR7.7, NFR3.1]
- [x] **Step 8: Reader, Refactor** with the tests green.
- [x] **Step 9: Watcher and IPC, Red.**
  - `tests/main/speckitFeatures.test.js`: `SPECKIT_WATCH_PATHS` also holds `.specify/memory/constitution.md`, `.specify/extensions.yml` and `.specify/extensions/**`.
  - `tests/main/watcher.test.js`: a change to `.specify/extensions.yml` and to a manifest under `.specify/extensions/` pushes within 2 s [NFR7.1, NFR7.2].
  - `tests/main/ipc.test.js`: `speckit:rules` returns the reader's result for a Spec Kit project and rejects for an AI-DLC one.

  Record the failing output. [BR7.8, AC4.2.3]
- [x] **Step 10: Watcher and IPC, Green.** Add the three paths to `SPECKIT_WATCH_PATHS`; register `speckit:rules` in `ipc.js` (Spec Kit projects only); `preload/index.js` gets `speckitRules(projectId)`.
- [x] **Step 11: Sections, Red then Green.** `tests/main/frameworkViews.test.js`: `sectionsFor('speckit')` is `['docs', 'agent', 'speckit']`; AI-DLC and none unchanged. Then `frameworkViews.js`: add `speckit` to `PROJECT_SECTIONS` and a `SPECKIT_SECTIONS` list so only Spec Kit offers it. [BR7.9]
- [x] **Step 12: View, Red.** `tests/renderer/SpeckitRules.test.jsx` (and `ProjectView.test.jsx` for the mount):
  - the section only for a Spec Kit project; `ProjectSettingsView` not rendered for it [BR7.9];
  - constitution shown through `FileView` only when `exists` is true; Open in editor calls the editor's `open` with `.specify/memory/constitution.md` [AC4.2.1, BR7.2, NFR3.4];
  - no constitution: the text and the button that types `/speckit-constitution ` to the agent terminal only on click [BR7.1];
  - each extension with its commands and hooks (when, target, command, mode, condition note); no extensions text [AC4.2.2];
  - the skipped count, the "no hooks checked" note after a parse failure, the errors list [BR7.3, BR7.4, FR7.3];
  - a refresh on `speckit:changed`, one call per push, the listener removed on unmount [AC4.2.3, NFR7.4];
  - a `<script>` line in the constitution shows as text [NFR5.1].

  Record the failing output.
- [x] **Step 13: View, Green.** `SpeckitRules.jsx` in the LCARS frame with the test ids in `frontend-components.md`; `ProjectView.jsx` renders it for `configSection === 'speckit'` and keeps `ProjectSettingsView` for the project's own sections only. Add the `settings.project.sections.speckit` and `speckit.rules.*` keys and the reader's reason keys to `sv.json` and `en.json`. [NFR1.1, NFR2.1]
- [x] **Step 14: View, Refactor** with the tests green; run ESLint and Prettier on the changed files.
- [x] **Step 15: Documentation and traceability.**
  - Update C6 in `contract-summary.md` with `target` and `skipped` (additive, as `functional-spec.md` says).
  - Write `code-summary.md`, `source-manifest.json` and `traceability.json`.
  - Set US-1404 to ✅ Done, tick its criteria, keep "for v0.3.0", and update the FEATURES.md row.

## Story-to-step map

| Story / AC | Steps |
|---|---|
| US4.2 AC4.2.1 (constitution rendered, opens in editor) | 5, 6, 12, 13 |
| AC4.2.2 (extensions and hooks: command, target, mode) | 3–6, 12, 13 |
| AC4.2.3 (unreadable file named; view refreshes) | 5, 6, 9, 10, 12, 13 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "classic",
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
  "input_sha256": "sha256:36dbd137c1dafd3e8f4a29e23917b2a23c6dca6c2eacae2219e2473d1661458b",
  "contract_sha256": "sha256:bfe3fc216905988409d5a13f51ed4ab2709768afac7dac9ce951c1faa1c86abd"
}
```
