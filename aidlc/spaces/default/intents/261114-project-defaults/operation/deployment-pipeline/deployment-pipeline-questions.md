# Deployment Pipeline Questions

## Deployment Configuration
- Target environment: staging (automatic), production (manual approval)
- Deployment window: Business hours (9am-5pm UTC)
- Notify team: #deployments Slack channel

## Rollback Preferences
- Auto-rollback on health check failure: Enabled
- Manual review required before re-deploy: Enabled
- Maximum retry attempts: 2

## Artifact Versioning
- Use semantic versioning: semver-X.Y.Z
- Tag format: v<major>.<minor>.<patch>
- Archive previous artifacts: 30-day retention