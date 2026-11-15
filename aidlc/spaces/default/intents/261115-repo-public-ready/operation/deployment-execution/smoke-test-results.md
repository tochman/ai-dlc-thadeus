# Smoke Test Results: US-1101

Run without any GitHub credentials (`curl`, no token), right after the repository went public (FR8.2).

| Check | Result |
|---|---|
| `https://github.com/tochman/aidlc-dash` | 200 |
| `api.github.com/repos/tochman/aidlc-dash/releases/latest` | v0.2.5 (v0.2.6 is not tagged yet) |
| `…/releases/download/v0.2.5/SHA256SUMS.txt` | 206 (download starts) |
| `…/releases/download/v0.2.5/THADEUS-0.2.5-universal.dmg` | 206 |
| `…/releases/download/v0.2.5/thadeus_0.2.5_amd64.deb` | 206 |
| Tracked files: personal home path, email, reference project | 0 hits |

**Verdict:** pass. Repeat the three download checks for v0.2.6 after its tag.
