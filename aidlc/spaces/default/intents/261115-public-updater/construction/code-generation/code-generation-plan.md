# Code Generation Plan: US-0413, update from the public release without `gh`

## Summary

- Builds: the update check and download over GitHub's public API with Node's `fetch`, with the current `gh` path as a fallback
- Touches: `src/main/updater.js`, `tests/main/updater.test.js`, `src/renderer/locales/{sv,en}.json`
- Tests: 8 new unit tests in `tests/main/updater.test.js` (the 12 existing ones stay green)

## Design in brief

- `createUpdater` gets an injected `fetch = globalThis.fetch` (NFR1). Tests pass a fake; `src/main/ipc.js` needs no change.
- `fromApi(json)` maps the REST answer to the shape the code already reads (`tagName`, `body`, `isDraft`, `isPrerelease`, `assets[{name, size, url: browser_download_url}]`) (FR1.1). `releaseStatus`, `pickAsset` and `assertOwnAsset` stay as they are, so FR2.2 holds for both paths.
- The check calls `fetch(API, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(20 s) })` (FR1, NFR3). A non-2xx answer throws an error carrying its `status`.
- The download streams `res.body` into `fs.open(file, 'w')`, counts the bytes and sends `{received, total}` (FR2, FR2.1). `fetch` follows GitHub's 302 by default. Any failure removes the partial file (FR4).
- `unavailableReason`/`downloadReason` gain: a 403/429 status means "try again later" (FR4.1); `TimeoutError`/`AbortError` means a timeout; `ENOSPC` means a full disk; another status means "HTTP <status>"; a `fetch failed` with ENOTFOUND/ECONN* means no connection (FR4).
- Fallback (FR5): when the public step fails, the `gh` step runs once. When that also fails, the public reason is shown. A checksum mismatch or a refused asset never falls back (FR5.1). A failed check is still not recorded (FR1.2, FR4.1).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.",
  "scope": "ultra-express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: tdd\n- **Methodology evidence**: Decided by the person at the practices interview (Q1: test first, TDD, for new work). Earlier Code Generation plans recorded the framework default `test-after`; the affirmed choice replaces it for new work.\n- **Ordering**: For each behaviour, write a failing test first, then the code that makes it pass, then refactor with the suite green.\n- **Runner**: vitest 5.1.0 with two projects, `main` (node, `tests/main/**/*.test.js`) and `renderer` (jsdom, `tests/renderer/**/*.test.jsx`, Swedish locale). Currently 353 `it`/`test` call sites by static count; the knowledge base's \"about 490\" is not reconciled.\n- **Coverage floor**: 80% line coverage, checked in CI with `@vitest/coverage-v8` (Q2). Not set up yet; it is to be added to the repository and to the `verify` job of `.github/workflows/release.yml`. No coverage is measured today.\n- **Suite green before merge**: the full `npx vitest run tests/` suite must pass before any story pull request merges. CI runs it on every pull request into `main` and on every version tag.\n- **Manual check**: the built macOS `.dmg` is checked by hand before a release tag. Jsdom tests do not run the built app."
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
  "input_sha256": "sha256:5d2edc438462ecd58d1a189f25096b14e109e68759a39bd787110cab4319df72",
  "contract_sha256": "sha256:4b20260229f72394250d9ed3f4261eb56cb5d29b1135cd7ade31c323a93c7425"
}
```

Inapplicable layers: no data model, repository, API endpoint or frontend behaviour changes. Only the business logic in `updater.js` and two locale texts change, so the TDD cycle runs on the business-logic layer.

## Steps

- [x] **Step 1: Structure.** No new files; the work stays in `src/main/updater.js` (US-0413).
- [x] **Step 2: Runner.** Verify `npx vitest run tests/main/updater.test.js` passes as it stands (12 tests).
- [x] **Step 3: Business logic, Red.** Add a `fakeFetch` and an `open` to `fakeFs` in `tests/main/updater.test.js`, then these failing tests:
  1. The check reads `releases/latest` from `api.github.com` with no token and no `gh` call; a draft or prerelease API answer offers nothing (FR1, FR1.1).
  2. At most once a day unless forced, through the API (FR1.2).
  3. The download streams the asset and `SHA256SUMS.txt` from `browser_download_url`, reports progress up to the asset size, and verifies the checksum (FR2, FR2.1, FR3).
  4. An asset from another repository is refused without any fetch or `gh` call (FR2.2, FR5.1).
  5. A checksum mismatch deletes the file and does not fall back to `gh` (FR3, FR5.1).
  6. A failing download (an HTTP 500, ENOSPC, a timeout) says why and removes the partial file (FR4).
  7. A 403/429 check says "try again later" and is not recorded as the day's check (FR4.1).
  8. A failed public check falls back to `gh release view`; when that also fails (ENOENT), the public reason is shown. A failed public download falls back to `gh release download` (FR5).

  Existing tests that relied on `gh` as the first path are given a `fetch` that fails, so they test the fallback unchanged (NFR2).
- [x] **Step 4: Business logic, Green.** Implement `fromApi`, the `fetch` check and download, the reasons and the fallback in `updater.js` until all 20 tests pass.
- [x] **Step 5: Business logic, Refactor.** Update the module header comment (no longer "the repository is private"), and keep the shared reason logic in one function, with the suite green.
- [x] **Step 6: Texts (FR6, FR7).** In `sv.json` and `en.json`: change `settings.tools…gh` to say it is used for the GitHub features and as an update fallback; add `update.tryLater`, `update.diskFull`, `update.httpStatus`. Run `npx vitest run tests/main/i18nKeys.test.js`.
- [x] **Step 7: Documentation and traceability.** Write `code-summary.md` and `traceability.json` (FR1–FR7, NFR1–NFR3 to tests).

Environment/build configuration: none (no new dependency, NFR1).
