# Deployment Strategy: v0.2.13

A desktop app, released by tag, with no staging (team.md § Deployment). Five story pull requests merge first, then the release pull request.

## Story merges, in build order

| # | Story | Branch | Before it merges |
|---|---|---|---|
| 1 | US-0035 | `fix/US-0035` | Green CI |
| 2 | US-0036 | `fix/US-0036` | Merge `main` in, rerun suite, ESLint, Prettier; green CI |
| 3 | US-0609 | `feat/US-0609` (cut from `fix/US-0036`) | Commit the uncommitted work first (person's OK). Merge `main` in after US-0036 is squashed, so only US-0609's change remains; rerun; green CI |
| 4 | US-0510 | `feat/US-0510` | Merge `main` in, rerun; green CI |
| 5 | US-0415 | `feat/US-0415` | Merge `main` in, rerun; green CI |

Each PR updates its story's feature docs (status, ticked criteria, epic line, FEATURES.md row, "for v0.2.13"). Feature-doc status lines conflict between stories: keep each story's line. Conflicts or failures after a merge go into `construction/build-and-test/test-results.md` § "After merge with main" with a `Recovery:` audit note (project rule). US-0609 also touches Spec Kit files shared with draft PRs #85–87; those merge later and resolve then.

US-1103 and US-1102 (docs only) go in their own PRs, outside this workflow, before the release PR.

## Release

1. Release PR `release: v0.2.13 (#NN)` from `release/v0.2.13`: bumps `package.json` to 0.2.13, marks every story "Released in v0.2.13", ticks the release checklist; stages `docs/releases/0.2.13.md` by blob so the merge keeps it.
2. Green CI; download the `.dmg` from its `build-mac` run. The person installs it and checks by hand: About shows 0.2.13, and one pass over each story's behaviour.
3. Squash-merge, tag `v0.2.13` on the merge commit, push the tag.
4. Smoke test after `release` publishes: all three files present and the checksums match; an install of 0.2.12 is offered the update; About shows 0.2.13.
5. Close the intent record on `main` (project rule): record, `intents.json`, codekb, `.thadeus/`, and remove the worktree `.claude/worktrees/v0213-assembled`.
