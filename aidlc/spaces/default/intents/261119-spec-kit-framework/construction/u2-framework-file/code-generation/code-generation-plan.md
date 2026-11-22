# Code Generation Plan: U2 u2-framework-file (US1.2 / US-1408)

## Summary

- Builds: reading and atomic writing of `.thadeus/project.json`, and detection that follows the saved framework or says why it can't
- Touches: `src/main/projectFile.js` (new), `src/main/projectService.js` (`detectProject`), `src/shared/locales/sv.json` and `en.json`
- Tests: about 18 unit tests on real temp folders in `tests/main/projectFile.test.js`, plus 4 detection tests in `tests/main/projectService.test.js`

**Branch:** `feat/US-1408`, created from `feat/US-1401` (U2 needs only U1's detection). The pull request opens after US-1401 is merged, then rebases on `main`. It is squash-merged as `feat(US-1408): keep the project's framework in the repository`.

**Sources:** `functional-spec.md` (W1, W2), `rules.md` (BR1.1–BR2.6), `entities.md`, `security-design.md`, contract C2. Each step's criteria are named in brackets.

**One change of place:** the design has the two `ipc.js` callers (open and re-detect) read the file and pass the saved value. Both already go through `detectProject(root)`, so `detectProject` reads the file itself. One place, and both paths are covered. The `saved` option goes; the three U1 tests that pass it write the file instead.

## Steps

- [x] **Step 1: Branch and story status.**
  - `git switch -c feat/US-1408 feat/US-1401`.
  - Set US-1408 to 🚧 In progress, "for v0.3.0", in its epic marker, the epic's Status line and its FEATURES.md row.
- [x] **Step 2: Runner check.** Run the unit-scoped command from `unit-test-instructions.md` on the unchanged tree and record the baseline (`projectFile.test.js` does not exist yet).
- [x] **Step 3: Read, Red.** In `tests/main/projectFile.test.js` (real `fs.mkdtemp` folders), test that `readProjectFile(root)` gives:
  - `missing` with no `.thadeus/`, and with `.thadeus/` but no file;
  - `unreadable` for bad JSON, a 70 KiB file, JSON nested 100,000 levels, a symlinked `.thadeus/`, a symlinked file, and a folder in the file's place;
  - `invalid` for an array, `version: "1"`, `version: 1` with no framework;
  - `unknownVersion` for `version: 2` (even with no framework);
  - `unknownFramework` for `framework: "bogus"`;
  - `ok` with the parsed value, and every read leaves the folder byte-identical.

  Record the failing output. [AC1.2.3, BR1.1, BR1.2, NFR3.1–NFR3.3, NFR3.6]
- [x] **Step 4: Read, Green.** Write `readProjectFile` in `src/main/projectFile.js` as `security-design.md` describes (`lstat` both, read at most 64 KiB + 1 byte, `JSON.parse` in `try`, classify in BR1.2's order). Header names `US-1408 FR2`.
- [x] **Step 5: Write, Red.** In the same file, test that `writeProjectFile(root, framework)`:
  - refuses `bogus` with `invalidFramework`, writing nothing;
  - creates `.thadeus/` and the file on a fresh project; afterwards only `.thadeus/project.json` is new in the tree;
  - keeps other keys, including a `__proto__` key that round-trips while `Object.prototype` stays unchanged;
  - replaces an unreadable or invalid file with `replaced: true`;
  - refuses `version: 2` with `newerVersion` naming the version, and `version: 1e400` with no number in the message;
  - gives `writeFailed` for a symlinked `.thadeus/` or file, and for a symlink swapped in before the rename (through `expect`), leaving the old bytes and no temp file;
  - never puts a hostile `framework` value from the file into a message.

  Record the failing output. [AC1.2.2, BR2.1–BR2.6, NFR3.1, NFR3.3, NFR3.4, NFR1.1]
- [x] **Step 6: Write, Green.** `writeProjectFile` per `security-design.md`: spread to keep keys, `mkdir` without `recursive`, `writeAtomic(abs, bytes, { expect })` with the two `lstat` rechecks, and a `ponytail:` comment on the rename race. Add the `projectFile.*` reason and error keys to `sv.json` and `en.json`.
- [x] **Step 7: Read and write, Refactor.** Refactor with the tests green.
- [x] **Step 8: Detection, Red.** In `tests/main/projectService.test.js`:
  - a saved `speckit` in a project with both folders gives `source: 'file'` and no question, even with `askWhenBoth`;
  - a saved `speckit` with no `.specify/` falls back to `aidlc`, `detected`, with the "saved framework not found" reason;
  - an unreadable file falls back with a reason naming the file and the read's reason;
  - a missing file falls back with no reason, as today.

  Rewrite the three tests that pass `saved` to write the file instead. Record the failing output. [AC1.2.1, AC1.2.3, BR1.3–BR1.5]
- [x] **Step 9: Detection, Green.** `detectProject` calls `readProjectFile(root)`, passes `value.framework` to `chooseFramework` when ok, and sets the reason per BR1.3 and BR1.4. Drop the `saved` option.
- [x] **Step 10: Detection, Refactor.** Refactor with the tests green; run ESLint and Prettier on the changed files.
- [x] **Step 11: Documentation and traceability.**
  - Write `code-summary.md`, `source-manifest.json` and `traceability.json`.
  - Set US-1408 to ✅ Done, tick its criteria, keep "for v0.3.0", and update the FEATURES.md row.

## Story-to-step map

| Story / AC | Steps |
|---|---|
| US1.2 AC1.2.1 (another clone follows the file, no question) | 3, 4, 8, 9 |
| AC1.2.2 (written only after confirm, names the file) | 5, 6 |
| AC1.2.3 (missing, unreadable, unknown: fall back and say why) | 3, 4, 8, 9 |

AC1.2.2's preview and confirm are U4's and U8's screens. U2 gives them `writeProjectFile` and its result naming the file; nothing in U2 calls it.

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

Layers: the project file is the data layer (Steps 3–7, read then write), detection is the business-logic layer (Steps 8–10). U2 has no API channel and no screen, so those layers do not apply; no build configuration changes.
