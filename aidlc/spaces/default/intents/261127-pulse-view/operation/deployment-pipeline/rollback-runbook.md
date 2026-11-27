# Rollback Runbook: US-0418

We fix forward. To pull a broken release, run `gh release edit v0.3.3 --prerelease`, which stops the updater from offering it. The fix becomes an EPIC-00 story and ships as v0.3.4. The tag is not deleted. Escalation goes to the repository owner.
