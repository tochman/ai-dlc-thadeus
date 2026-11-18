# Smoke Test Results: v0.2.9

| Check | Result |
|---|---|
| All three files on the release | `THADEUS-0.2.9-universal.dmg`, `thadeus_0.2.9_amd64.deb`, `SHA256SUMS.txt` are present |
| Checksums | `shasum -a 256 -c SHA256SUMS.txt`: both packages OK |
| Marked latest | `releases/latest` = v0.2.9; prerelease false; draft false |
| Rename note | at the top of the release notes |
| About shows 0.2.9 | checked by the person in the CI-built `.dmg` from #72 (same commit content, before the docs-only #73) |
| Updater | copies on v0.2.8 or earlier are not offered the update across the rename (expected, US-0027); the note tells them to download by hand |
