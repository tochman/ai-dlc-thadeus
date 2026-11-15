# Health check report: v0.2.4

T.H.A.D.E.U.S. is a desktop app. It has no service, endpoint or metric to watch after release, so health means: the release can be installed, is genuine, and works.

| Area | State |
|------|-------|
| Release workflow | Green on the PR (`43602914746`) and on the tag (`43603209241`) |
| Artifacts | dmg and deb published with `SHA256SUMS.txt`; the dmg checksum verified |
| App | Starts and shows 0.2.4; About, live token view, Plans, Monaco and the grey Resume checked by the person |
| Tests | 353 pass |
| Open risk | The in-app update from v0.2.3 has not been run on a real machine yet (US-0408). If it fails, follow `rollback-runbook.md`: mark v0.2.4 as prerelease and fix forward in v0.2.5 |

No rollback is needed.
