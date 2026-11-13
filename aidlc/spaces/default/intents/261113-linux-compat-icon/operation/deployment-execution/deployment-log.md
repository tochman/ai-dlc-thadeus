# Driftsättningslogg — v0.1.1

Underlag:
- `operation/deployment-pipeline/cd-config.md`
- `operation/deployment-pipeline/deployment-strategy.md`
- `construction/build-and-test/test-results.md`

## Tidslinje (2026-11-13)

| Händelse | Detalj |
|----------|--------|
| PR #4 hade grön CI | Tre körningar på grenen gick igenom: verify, build-mac och build-linux på ubuntu-22.04 med OK från glibc-kontrollen. |
| PR #3 och PR #4 mergades | Användaren mergade (Q1: A). `main` = `2b84d8b`, `package.json` 0.1.1. |
| Tagg `v0.1.1` | Sattes på `origin/main` (`2b84d8b`) och pushades. Release-körningen 43395952196 startade. |
| Release-körningen | verify, build-mac, build-linux och release blev alla `success`. |
| Releasen publicerades | https://github.com/tochman/aidlc-dash/releases/tag/v0.1.1 |

## Publicerade filer

| Fil | Storlek |
|-----|---------|
| `Auctum.AIDLC.Control-0.1.1-universal.dmg` | 217 MB |
| `aidlc-dash_0.1.1_amd64.deb` | 101 MB (v0.1.0: 99 MB med onödiga prebuilds) |

## Rollback

Det har inte behövts. Se `operation/deployment-pipeline/rollback-runbook.md`.
