# Smoke Test Results: v0.2.14

| Check | Result |
|-------|--------|
| The release has all three files | `THADEUS-0.2.14-universal.dmg` (234 MB), `thadeus_0.2.14_amd64.deb` (119 MB), `SHA256SUMS.txt` |
| Checksums match (`shasum -a 256 -c SHA256SUMS.txt` on the downloaded files) | both OK |
| The app in the `.dmg` has the new version (`CFBundleShortVersionString`) | 0.2.14 |
| v0.2.14 is the latest release; v0.2.13 is no longer | yes |
| An earlier install is offered the update; About shows 0.2.14 | for the person to check on the installed app |
