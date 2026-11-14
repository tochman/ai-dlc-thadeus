# Environment Inventory

## Target Environments
- **dev**: Local development environment
- **staging**: Pre-production staging environment
- **production**: Live production environment

## Environment Specifications
- **Language**: JavaScript
- **Framework**: React
- **Build System**: npm
- **Deployment Target**: Cloud infrastructure (AWS)

## Environment Health Checks
- Smoke test endpoint: `/health`
- Metrics endpoint: `/metrics`
- Availability target: 99.9% over 30-day rolling window

## Access and Credentials
- SSH access: bastion host required
- API credentials: managed via secrets manager
- Database credentials: rotated weekly

## Deployment Targets
- **dev**: localhost:3000
- **staging**: https://staging.us-0902.example.com
- **production**: https://us-0902.example.com