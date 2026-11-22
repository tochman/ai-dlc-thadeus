# Health Check Report: v0.2.14

A desktop app with no running service, so health is the release itself: CI green on the PR and the tag, the GitHub release published as Latest with matching checksums, and the packaged app at version 0.2.14 (see `smoke-test-results.md`). No rollback was needed. If one is: `gh release edit v0.2.14 --prerelease`, then fix forward as v0.2.15 (`../deployment-pipeline/rollback-runbook.md`).

Open after release: the LCARS layout checked by eye on the installed app; US-0039's park request with the real agent CLIs; US-1203's GitHub thread read on a real pull request.
