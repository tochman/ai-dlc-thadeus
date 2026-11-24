# Smoke Test Results: v0.2.15

| Check (team.md) | Result | Evidence |
|---|---|---|
| All three files on the release | Pass | `THADEUS-0.2.15-universal.dmg` (234,024,407 B), `thadeus_0.2.15_amd64.deb` (119,255,876 B), `SHA256SUMS.txt` |
| Checksums match | Pass | `shasum -a 256 -c SHA256SUMS.txt` on the downloaded files: both OK |
| Installed app shows the new version in About | Pass | the person's hand check on the locally built `.dmg` from the same commit 881bbba |
| An earlier install is offered the update | Not checked here | The person's own install is already 0.2.15 from the hand check. Checking this needs a 0.2.14 install, so it is left to the person. |
