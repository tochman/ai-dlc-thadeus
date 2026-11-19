# Smoke Test Results — v0.2.11 (FR6)

| Check | Result | Evidence |
|---|---|---|
| All three files present | pass | `THADEUS-0.2.11-universal.dmg` (233,928,668 bytes), `thadeus_0.2.11_amd64.deb` (117,318,536 bytes), `SHA256SUMS.txt` (186 bytes) |
| Files downloadable without signing in | pass | `SHA256SUMS.txt` returns HTTP 200 |
| Marked Latest, not a prerelease | pass | `gh release list`: v0.2.11 Latest |
| Installed app shows 0.2.11 in About | pass | the person's hand check of the same build (PR #83 artifact) |
| A v0.2.10 install is offered the update | by the person | see the approval gate |
