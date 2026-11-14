# Release strategy: v0.2.4

Same path as v0.2.3 [Q1]: a regular release that becomes "latest", and fix forward if it is broken.

## Order

1. **Check the local build.** Build `dist/THADEUS-0.2.4-universal.dmg` (`npm run build:mac` after the version bump) and install it. Check the four things that were only checked in jsdom in Build and Test:
   - the About window in the new LCARS design (US-0409);
   - the live token view while work runs (US-0207);
   - the Plans view (US-0903);
   - the Monaco editor (US-1001): a 1 MB file opens in under 1 second, start time is unchanged, and the editor works in the built `.dmg` (its workers load).
2. **Release branch and PR.** Branch `release/v0.2.4` from `main` with the version bump to `0.2.4`, `docs/releases/0.2.4.md` checked off, and the feature docs marked "Released in v0.2.4". The PR run of `release.yml` must be green.
3. **Merge and tag.** After merge: `git tag v0.2.4 && git push origin v0.2.4` on `main`. `verify` stops if the tag does not equal `package.json`.
4. **Publish.** The workflow publishes a regular release that becomes "latest". No prerelease.
5. **Smoke test after publishing.**
   - The release has three files: `THADEUS-0.2.4-universal.dmg`, the `.deb` and `SHA256SUMS.txt` (`gh release view v0.2.4 --repo tochman/aidlc-dash`).
   - A v0.2.3 install offers the update to v0.2.4, and the download passes the checksum.
   - The app from the release starts and shows 0.2.4 in About.

## Gates

| Gate | Type | Stops |
|------|------|-------|
| Check of the local `.dmg` | manual (you) | a view that only works in jsdom |
| PR run of `release.yml` | automatic | red tests or a broken build |
| Merging the PR | manual (you) | anything not approved |
| Tag equals `package.json` version | automatic | a wrongly numbered tag |
| Smoke test after publishing | manual (you) | see `rollback-runbook.md` |

## Abort

If the local check in step 1 fails, nothing is tagged. The fault becomes an EPIC-00 story, is fixed on `main`, and step 1 starts again.
