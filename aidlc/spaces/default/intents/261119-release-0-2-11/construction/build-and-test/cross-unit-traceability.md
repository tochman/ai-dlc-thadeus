# Cross-Unit Traceability — v0.2.11 release

No Units (ultra-express). From `aidlc engine sensor-traceability --stage build-and-test`.

**Verdict: pass for this stage.** The sensor reports `pass: false` only because the Deployment Execution requirements are not built yet; each one has its owning stage below.

| ID | Covered | Where | Owning stage |
|---|---|---|---|
| FR1 | yes | `package.json`, `package-lock.json` | code-generation |
| FR1.1 | yes | release PR #83 CI green (`test-results.md`) | build-and-test |
| FR2 | yes | `tests/main/releaseVersion.test.js`, the feature docs | code-generation |
| NFR1 | yes | `package.json` (docs and version only; Step 3b's test fix is the person's exception) | code-generation |
| FR3, FR3.1, FR3.2 | not yet | hand checks, including US-0032's one-commit criterion | deployment-execution |
| FR4 | not yet | `.dmg` check by hand (PR #83 artifact) | deployment-execution |
| FR5 | not yet | merge and tag `v0.2.11` | deployment-execution |
| FR6 | not yet | smoke test of the published release | deployment-execution |
| NFR2 | not yet | | deployment-execution |
