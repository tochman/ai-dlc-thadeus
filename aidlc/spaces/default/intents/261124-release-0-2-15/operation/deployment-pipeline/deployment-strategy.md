# Deployment Strategy: v0.2.15

A desktop app released by tag, with no staging (team.md § Deployment). All five stories are already merged into `main`: #97, #113, #114, #115, #116.

## Release

1. Squash-merge #117 as `release: v0.2.15 (#117)` without waiting for its CI, as the person chose [Q3]. Its `verify` and `build-linux` had already passed by then. Before merging, check that `docs/releases/0.2.15.md` is changed in the pull request, not deleted.
2. `.dmg` hand check before the tag [Q1]: build it locally on the merge commit with `npm run build:mac`. The person opens it, installs it, starts the app, and checks that About shows 0.2.15 and that an intent can be renamed from its detail.
3. Tag `v0.2.15` on the merge commit and push the tag. Watch the `release.yml` run until `release` publishes.
4. Smoke test (team.md):
   - all three files are on the release and the checksums match;
   - an earlier install is offered the update;
   - About shows 0.2.15.
5. Close the intent record on `main` (project rule): the record, `intents.json` and the token log, in one `chore` commit.
