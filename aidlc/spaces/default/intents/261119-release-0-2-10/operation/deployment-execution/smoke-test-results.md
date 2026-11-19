# Smoke Test Results — v0.2.10 (FR6)

| Check | Result | Evidence |
|---|---|---|
| All three files present | pass | `THADEUS-0.2.10-universal.dmg` (233,916,357 bytes), `thadeus_0.2.10_amd64.deb` (117,262,592 bytes), `SHA256SUMS.txt` (186 bytes) |
| Files downloadable without signing in | pass | `SHA256SUMS.txt` returns HTTP 200 |
| Marked Latest, not a prerelease | pass | `gh release list`: v0.2.10 Latest |
| Installed app shows 0.2.10 in About | pass | the person's hand check of the same build (PR #80 artifact) |
| A v0.2.9 install is offered the update | by the person | see the approval gate |
