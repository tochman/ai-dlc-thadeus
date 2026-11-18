# Cross-Unit Traceability: v0.2.9 release

There is one stage-level build and no Units.

| ID | Where | Status |
|---|---|---|
| FR1, FR1.1 | `package.json`, `package-lock.json`; release PR CI | Built; CI runs on the PR |
| FR5 | `docs/releases/0.2.9.md`; `tests/main/releaseVersion.test.js` | Met |
| FR6 | `tests/main/releaseVersion.test.js` (slice all ✅) | Met; "Released in" set after the tag |
| NFR1 | release diff is version and docs only | Met |
| FR2–FR4, FR7, NFR2 | Deployment Execution | Pending |
