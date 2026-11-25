# Build and Test summary

Sources: each Unit's `code-generation-plan.md` (Testing Contract), `unit-test-instructions.md`, `code-summary.md`, `nfr-requirements/` and `nfr-design/`. Results are in `test-results.md`.

- **Build:** `origin/main` at 0a99bda (with US-0047) plus the new watcher tests builds. ESLint, Prettier and gitleaks are clean.
- **Tests:** unit and integration tests in Node and jsdom (2561 passed, 1 skipped, 0 failed). Built-app end-to-end tests in Electron's Chromium (10 passed), for AI-DLC views only. The look of the Spec Kit views was checked by a one-off script in the built app.
- **Coverage expected:** 80% lines for the project and for each single-file floor. **Actual:** 93.16%.

## Target Verification Matrix

"Suite" is the full run in `test-results.md`. Test files are named without their folder. Every row's owning stage is build-and-test unless it says otherwise. `.jsx` tests ran in jsdom, the rest in Node.

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-floor | Testing Contract, team.md | ≥ 80% lines | 93.16% | suite, exit 0 | build-and-test | Met |
| TC-green | Testing Contract | suite green | 0 failed | suite | build-and-test | Met |
| TC-style | team.md | ESLint, Prettier green | both exit 0 | test-results | build-and-test | Met |
| TC-e2e | team.md | built-app tests pass | 10 passed | Playwright, Electron's Chromium | build-and-test | Met |
| TC-CI | Testing Contract | CI before merge | — | the plan runs no CI Pipeline | — | N/A |
| U2 NFR8.1 | security | 80% on module, gitleaks | 98.21%, no leaks | U2 coverage command, gitleaks | build-and-test | Met |
| U9 NFR8.1 | security | 80% on module and plugin | 96.77%; plugin floor held | suite thresholds | build-and-test | Met |
| NFR1.1 (U2, U4–U7, U9, U10), NFR1.2 (U8) | security, tech-stack | same keys, sv and en | 4 passed | i18nKeys | build-and-test | Met |
| NFR2.1 (U4–U7, U10), NFR2.2 (U8) | tech-stack | LCARS look | frame, headings, font, colours and arm as required; faults L1–L6 | built app in Electron's Chromium, pictures and measures; see test-results | build-and-test | Met |
| U2 NFR3.1 | security | no symlinks followed | refused | projectFile | build-and-test | Met |
| U2 NFR3.2 | security | over 64 KiB unreadable | as expected | projectFile | build-and-test | Met |
| U2 NFR3.3 | security, as changed in security-design | no pollution; keys kept | as designed | projectFile | build-and-test | Met |
| U2 NFR3.4 | security | atomic write | old bytes kept | projectFile | build-and-test | Met |
| U2 NFR3.5 | security | writes only project.json | one new file | projectFile | build-and-test | Met |
| U2 NFR3.6 | security | reads never write | no change | projectFile | build-and-test | Met |
| U4 NFR3.1 | security | scan writes nothing | 0 writes | frameworkChoice | build-and-test | Met |
| U4 NFR3.2 | security | bad input refused first | refused | frameworkChoice, ipc | build-and-test | Met |
| U4 NFR3.3 | security | no path from renderer | extra arguments ignored | ipc | build-and-test | Met |
| U4 NFR4.1 | security | scan starts no program | lookup only | frameworkChoice | build-and-test | Met |
| U4 NFR4.2 | security | choice runs no setup | `next` only | frameworkChoice | build-and-test | Met |
| U4 NFR4.3 | performance | 300 ms on CI | 12 ms | CI 45537985529 | build-and-test | Met |
| U4 NFR7.1 | performance | views switch in 2 s | under 2 s | ipc | build-and-test | Met |
| U4 NFR7.2 | performance | one call each | one call | FrameworkChoice.jsx | build-and-test | Met |
| U5 NFR3.1 | security | no writes | 0 bridge writes | SpeckitFeatures.jsx | build-and-test | Met |
| U5 NFR4.1 | security | no process | no such import | speckitCommands | build-and-test | Met |
| U5 NFR4.2 | security | unsafe name refused | null, no button | speckitCommands, SpeckitCommandButton.jsx | build-and-test | Met |
| U5 NFR4.3 | security | one plain line, ≤ 1000 | as expected | speckitCommands | build-and-test | Met |
| U5 NFR4.4 | security | types only on a click | as expected | SpeckitCommandButton.jsx, SpeckitQuickCommands.jsx | build-and-test | Met |
| U5 NFR5.1 | security | core four stay on failure | as expected | SpeckitQuickCommands.jsx | build-and-test | Met |
| U5 NFR6.1 | security | claude and opencode only | others disabled | SpeckitCommandButton.jsx | build-and-test | Met |
| U5 NFR7.1 | performance | new command on push | shown | SpeckitFeatures.jsx | build-and-test | Met |
| U5 NFR7.2 | performance | follows agent state | disabled | SpeckitCommandButton.jsx | build-and-test | Met |
| U5 NFR7.3 | performance | pure, no I/O | no imports | speckitCommands | build-and-test | Met |
| U5 NFR7.4 | performance | one command per click | one | SpeckitCommandButton.jsx | build-and-test | Met |
| U6 NFR3.1 | security | no writes | 0 writes | speckitFeatures, watcher | build-and-test | Met |
| U6 NFR3.2 | security | opens read-only | no edit button | SpeckitFeatures.jsx, fileWrite | build-and-test | Met |
| U6 NFR3.3 | security | paths inside project | named in errors | speckitFeatures | build-and-test | Met |
| U6 NFR3.4 | security, as changed in security-design | outside path refused; no list check | refused | projectAccess | build-and-test | Met |
| U6 NFR5.1 | security | script shown as text | text | SpeckitFeatures.jsx | build-and-test | Met |
| U6 NFR5.2 | security | unreadable file named | named, rest shown | speckitFeatures | build-and-test | Met |
| U6 NFR5.3 | security | version warning | shown | speckitFeatures, SpeckitFeatures.jsx | build-and-test | Met |
| U6 NFR7.1 | performance | change shows in 2 s | under 2 s, removed folders too; init-options 318 ms | watcher (new test); init-options one-off measure | build-and-test | Met |
| U6 NFR7.2 | performance | ≤ 2 pushes for 20 writes | at most 2 | watcher (new test) | build-and-test | Met |
| U6 NFR7.3 | performance | 500 ms on CI | 122 ms, whole file | CI 45537985529 | build-and-test | Met |
| U6 NFR7.4 | performance | one read per push | one | SpeckitFeatures.jsx | build-and-test | Met |
| U7 NFR3.1 | security | no writes | 0 writes | speckitRules | build-and-test | Met |
| U7 NFR3.2 | security | unsafe id builds no path | as expected | speckitRules | build-and-test | Met |
| U7 NFR3.3 | security | safe command names | others left out | speckitRules | build-and-test | Met |
| U7 NFR3.4 | security | opens the constitution only | as expected | SpeckitRules.jsx | build-and-test | Met |
| U7 NFR5.1 | security | script shown as text | text | SpeckitRules.jsx | build-and-test | Met |
| U7 NFR5.2 | security | bad file or YAML named | named | speckitRules | build-and-test | Met |
| U7 NFR7.1 | performance | change shows in 2 s | under 2 s each | watcher | build-and-test | Met |
| U7 NFR7.2 | performance | ≤ 2 pushes for 20 writes | at most 2 | watcher (new test) | build-and-test | Met |
| U7 NFR7.3 | performance | 300 ms on CI | 134 ms, whole file | CI 45537985529 | build-and-test | Met |
| U7 NFR7.4 | performance | one read per push | one | SpeckitRules.jsx | build-and-test | Met |
| U8 NFR3.4 | security | writes project.json only | one write | frameworkSwitch | build-and-test | Met |
| U8 NFR3.5 | security | bad input refused first | refused | frameworkSwitch, ipc | build-and-test | Met |
| U8 NFR3.6 | security | no path from renderer | fixed names only | ipc | build-and-test | Met |
| U8 NFR3.7 | security | folder checked again | `setupNeeded` | frameworkSwitch, ipc | build-and-test | Met |
| U8 NFR4.5 | security | starts no program | none | frameworkSwitch, ipc | build-and-test | Met |
| U8 NFR7.3 | performance | 500 ms on CI | 29 ms | CI 45537985529 | build-and-test | Met |
| U8 NFR7.4 | performance | push before reply, 2 s | push first | ipc | build-and-test | Met |
| U8 NFR7.5 | performance | one call each | one | FrameworkSection.jsx, ipc | build-and-test | Met |
| U9 NFR3.1 | security | writes only token files | as expected | speckitTokens | build-and-test | Met |
| U9 NFR3.2 | security | transcript path inside | others skipped | speckitTokens | build-and-test | Met |
| U9 NFR3.3 | security, as changed in the approved plan | bad name to project bucket | project bucket | speckitTokens | build-and-test | Met |
| U9 NFR3.4 | security | linked `.thadeus` refused | refused | speckitTokens | build-and-test | Met |
| U9 NFR3.5 | security | no text in cursor | none | speckitTokens | build-and-test | Met |
| U9 NFR3.6 | security | earlier calls to project | as expected | speckitTokens | build-and-test | Met |
| U9 NFR6.1 | security, as changed in the approved plan | both harnesses, running totals | as planned | agentAdapters, speckitTokens | build-and-test | Met |
| U9 NFR6.2 | security | only the increase | as expected | speckitTokens | build-and-test | Met |
| U10 NFR3.1 | security | no writes | 0 writes | ipc | build-and-test | Met |
| U10 NFR3.2 | security | unknown id, `../x` refused | refused | ipc | build-and-test | Met |
| U10 NFR3.3 | security | no tool input returned | as expected | agentProgressSpeckit | build-and-test | Met |
| U10 NFR5.1 | security | text, 200 characters | as expected | agentProgressSpeckit, SpeckitProgress.jsx | build-and-test | Met |
| U10 NFR5.2 | security | failing part is null | null, rest shown | agentProgressSpeckit | build-and-test | Met |
| U10 NFR7.1 | performance | refresh on `tasks.md` | one call | SpeckitProgress.jsx | build-and-test | Met |
| U10 NFR7.2 | performance | refresh on hook event | one call | SpeckitProgress.jsx | build-and-test | Met |
| U10 NFR7.3 | performance | 1 s (aim 300 ms) | 3 ms | CI 45537985529 | build-and-test | Met |
| U10 NFR7.4 | performance | no polling | one call per push | SpeckitProgress.jsx | build-and-test | Met |

The other `tech-stack-decisions.md` rows (NFR4.4, NFR4.6, NFR5.1, NFR8.x) are design choices with no measured value. U1 and U3 have no NFR documents (skipped).

## Readiness

- **Build-ready and test-ready:** yes. No command failed and every applicable target is Met.
- **Deployment-ready:** no. v0.3.0 needs the new tests merged, the release work, the `.dmg` hand check, and a decision on L1–L6.

## Outstanding

- L1–L6 in `test-results.md` are unfixed. L1 (the arm always says "0 features") and L2 (hook tags all the same colour) show wrong information; L3–L6 are layout.
- The new watcher tests are not committed, and have not run on CI.
- The Spec Kit views' behaviour was tested in jsdom. Only their look was checked in the built app; no Spec Kit view has an end-to-end test in the suite.
- A real Claude Code turn and a real opencode turn in a Spec Kit project are untested (K12).
- The speed tests for U6 and U7 (NFR7.3) sit in `main`, not in the retried `scripts` project, so a slow CI runner could make them flaky.
- The speed tests for U4 and U8 assert 1 s and 2 s, looser than their 300 ms and 500 ms targets, so a slowdown below those bounds would not fail CI.
- Minor review points remain open in the Units' `code-generation/reviews/`. U9's four concern edge-case double counts.
- US-0047 (#127) is in the tested code. The local `main` still has two docs commits that `origin/main` lacks (f7e0d94, 994d04d), and merging the two conflicts in `docs/FEATURES.md` and `docs/features/epic-00-fixes.md`.
