# Smoke test results: v0.2.4

| Check (from `deployment-strategy.md` step 5) | Result | Evidence |
|-------|--------|----------|
| The release has three files | ✅ pass | `gh release view v0.2.4`: `THADEUS-0.2.4-universal.dmg`, `thadeus_0.2.4_amd64.deb`, `SHA256SUMS.txt` |
| A regular release, "Latest", not draft or prerelease | ✅ pass | `gh release list`: `T.H.A.D.E.U.S. v0.2.4  Latest` |
| The download passes the checksum | ✅ pass | `shasum -a 256 -c SHA256SUMS.txt`: `THADEUS-0.2.4-universal.dmg: OK` |
| The app from the release shows 0.2.4 | ✅ pass | The downloaded dmg's `Info.plist` `CFBundleShortVersionString` = `0.2.4` |
| The four views in the built app | ✅ pass | The person's check of the local build, which uses the same commit and build [Q2, Q4] |
| A v0.2.3 install offers the update to v0.2.4 | ⏭️ not checked | This Mac already runs the local 0.2.4 build. It is checked on the next machine that still has v0.2.3; US-0408's "Install and restart" criterion stays open until then |

Verdict: the release is good. No rollback is needed.
