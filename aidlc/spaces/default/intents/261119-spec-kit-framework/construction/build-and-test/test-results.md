# Test results

Run 2 on 2026-11-25, macOS: `origin/main` at 0a99bda (all ten stories and US-0047, #127) plus three new tests in `tests/main/watcher.test.js`, uncommitted in the worktree `.claude/worktrees/spec-kit-checks` on branch `chore/spec-kit-watcher-tests`. Run 1 was `main` at 994d04d: 2554 passed, lines 93.15%.

| Command | Exit | Result |
|---|---|---|
| `npx electron-vite build` | 0 | built |
| `npx vitest run tests/ --coverage` | 0 | 184 files, 2561 passed, 1 skipped, 0 failed |
| `npx eslint . --max-warnings 0` | 0 | 0 problems |
| `npx prettier --check .` | 0 | all files formatted |
| `npx playwright test` (built app, Electron's Chromium) | 0 | 10 passed; AI-DLC views only |
| `gitleaks detect` | 0 | 470 commits, no leaks; the new change has none either |

In run 1 a first suite run was piped through `tail`, which hid the totals and the exit code. It was discarded and run again.

## Coverage (full suite, v8)

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| 91.07% | 84.54% | 88.57% | 93.16% |

The single-file floors held in the same run: `speckitTokens.js` 96.77% lines; `.opencode/plugins/thadeus-dialog.js` at or above 80%. `projectFile.js` on its own (U2's command, run 1): 98.21%.

## Commands of each Unit

All 23 distinct commands in the ten `unit-test-instructions.md` files exited 0 in run 1. They were not run one by one again in run 2, where the full suite covers the same tests.

## The new tests

In the `scripts` project (`watcher.test.js`, 21 passed):

- 20 writes within 1 s to feature files, and the same to rule files: at most two pushes, and every file is named (U6, U7 NFR7.2).
- A removed feature folder, and a removed empty one, are each reported within 2 s (U6 NFR7.1).

They can fail: with batching removed, the burst tests got 17–19 pushes; with folder removals ignored, the removal test failed. The watcher was restored after each try. They have not run on CI yet.

## Speed, measured (run 1)

| Target | Limit | This machine | CI (Linux) |
|---|---|---|---|
| U4 NFR4.3 `frameworkScan` | 300 ms | 11 ms | 12 ms (whole file) |
| U6 NFR7.3 `speckit:features` | 500 ms | 110 ms | 122 ms (whole file) |
| U7 NFR7.3 `speckit:rules` | 300 ms | 76 ms | 134 ms (whole file) |
| U8 NFR7.3 `switchPreview` | 500 ms | 61 ms (both ways) | 29 ms (whole file) |
| U10 NFR7.3 `agents:progress` | 1 s (aim 300 ms) | 3 ms | 3 ms (whole file) |

The CI column is run 45537985529 on US-0047's branch: `verify` passed.

## Look of the Spec Kit views in the built app

A one-off script opened the built app in Electron's Chromium with made-up Spec Kit projects and took pictures at 1280 and 1920 (the Specs view also in Swedish): Specs with features and empty, feature detail, Configuration › Spec Kit and › Framework with the switch preview, the first-open choice, and the setup panel. Every one uses the LCARS frame, headings, font and colours, and the arm navigation. Nothing overflowed sideways in the Specs, Configuration and choice pictures, where it was measured.

Not seen: the waiting-question row, error messages, a setup run, the setup step inside a switch, a running agent.

Faults found, none of them fixed:

| # | View | Fault | Cause |
|---|---|---|---|
| L1 | left arm | always "0 features" in a Spec Kit project | U1 left the count to U6, and U6 never reports it; `AppShell.test.jsx` expects 0 |
| L2 | Configuration › Spec Kit | mandatory, optional and turned-off hook tags are the same blue | `.speckit-list .speckit-tag` overrides the mode colours |
| L3 | Specs, feature list | a long name squeezes the number to "0 0 2" and the tag to "Act ive"; a 30-character name already splits the tag | the parts of `.speckit-list .link` can shrink |
| L4 | Specs | no gap (0 px) between Commands and the features below, or between the next command and the flow steps | missing gap in `theme.css` |
| L5 | first-open choice | the two options stack instead of standing side by side | probably the options box, which shrinks to its content inside `.setup-panel`; not traced |
| L6 | Configuration › Framework | the disabled "Switch to AI-DLC" is grey on light grey | `.config-frame .btn-accent` overrides the disabled style; it affects every such button there, not only Spec Kit's |

The pictures are in `.claude/worktrees/spec-kit-checks/tests/.tmp/look/out/` (not in git).

The Target Verification Matrix is in `build-and-test-summary.md`.

## Failures

No command failed. No loop-back was needed. L1–L6 are faults the checks found; no target's stated value fails because of them.
