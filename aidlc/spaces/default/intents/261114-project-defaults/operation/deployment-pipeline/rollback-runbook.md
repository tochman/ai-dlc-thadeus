# Rollback Runbook

## Rollback Triggers
- Health check failure (HTTP 5xx error rate > 5%)
- Latency breach (p95 > 2x baseline)
- Error rate spike (error rate > 5% of requests)
- Critical security vulnerability detected

## Automated Rollback Procedure
1. Detect failure condition
2. Invoke `aidlc engine worktree rollback --slug <deployment-slug>`
3. Verify rollback: confirm service healthy on previous version
4. Notify on-call team via PagerDuty
5. Post-rollback analysis within 24 hours

## Manual Rollback Procedure
1. Identify rollback trigger
2. Access previous deployment artifact from registry
3. Run: `aidlc engine worktree revert --target <previous-version>`
4. Validate service health
5. Document incident in post-incident review

## Database Rollback
- Forward-only migrations with backward-compatible design
- If rollback needed: execute downgrade migration script
- Data integrity check: verify referential integrity after rollback
- Always test downgrade migration in staging first