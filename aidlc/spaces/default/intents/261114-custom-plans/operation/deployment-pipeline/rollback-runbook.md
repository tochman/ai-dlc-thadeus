# Rollback runbook: v0.2.4

Strategy: **fix forward** [Q1]. A broken v0.2.4 is not pulled by deleting its tag. It is hidden from the updater and replaced by v0.2.5.

## When

- The smoke test after publishing fails: the app does not start, shows the wrong version, or one of the four new views breaks.
- The release is missing the `.dmg`, the `.deb` or `SHA256SUMS.txt`.
- A user reports a fault that stops their work.

## Steps

1. **Stop the offer.** Mark the release as a prerelease:
   `gh release edit v0.2.4 --repo tochman/aidlc-dash --prerelease`
   The updater reads only "latest" and skips prereleases, so v0.2.3 becomes "latest" again and nobody is offered v0.2.4.
2. **Check** that `gh release view --repo tochman/aidlc-dash --json tagName` shows `v0.2.3`.
3. **Anyone who already installed v0.2.4 and cannot work** installs `THADEUS-0.2.3-universal.dmg` or the `.deb` from the v0.2.3 release by hand. Settings stay in userData. Custom plans saved by v0.2.4 (US-0903) live in the project's AI-DLC files and are left alone by v0.2.3.
4. **Fix the fault.** Add a story to EPIC-00 and fix it directly (`project.md` Way of Working). Then bump `package.json` to `0.2.5`, go through `release/v0.2.5` and a PR, and tag.
5. **Once v0.2.5 is published and checked**, v0.2.4 stays as a prerelease. It is not deleted.

## What is not undone

- The tag `v0.2.4` and its commit stay on `main`.
- A v0.2.4 install updates to v0.2.5 with its own updater. If the fault is in the updater, update by hand (step 3, with v0.2.5's files).

## Contact

Owner and escalation: the repo owner, `tochman`. There is no on-call rota, because the app is an internal tool.
