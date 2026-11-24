# Cross-unit traceability

**Verdict: FAIL (expected).** 5 of 9 IDs are covered. The 4 uncovered IDs are release steps that Deployment Execution, the next stage, owns. They were deferred in Code Generation, not missed.

| ID | Covered | Target / owner |
|---|---|---|
| FR1.1 | yes | package.json |
| FR1.2 | yes | docs/FEATURES.md, epic files |
| FR1.3 | yes | docs/releases/0.2.15.md |
| FR1.4 | yes | docs/releases/0.2.15.md |
| NFR1 | yes | tests/main/releaseVersion.test.js |
| FR2 | no | deployment-execution: `.dmg` hand check |
| FR3 | no | deployment-execution: merge #117 |
| FR4 | no | deployment-execution: tag and publish |
| FR5 | no | deployment-execution: close the record |
