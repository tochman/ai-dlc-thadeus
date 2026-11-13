# Driftsättningslogg — Auctum AIDLC Control v0.1.0

Strategi: versionerad GitHub Release. Den startas av en git-tagg och installeras av användarna själva (se `operation/deployment-pipeline/deployment-strategy.md`). Inga miljöer, migreringar eller beroende tjänster.

## Tidslinje (UTC, 2026-11-13)

| Tid | Händelse |
|-----|----------|
| ca 07:25 | Allt arbete committat på `feat/epic01-bridge-console-mvp` (`bac1a8d`) och pushat. PR #1 skapad. Användaren mergade (Q1: B). |
| 07:30 | Taggen `v0.1.0` sattes på `origin/main` (`bb0984a`) och pushades. Release-körning 43386262310 startade. |
| 07:31 | **Körning 43386262310 misslyckades** i `build-mac`. `verify` och `build-linux` gick igenom, och `release` hoppades över. Ingen release publicerades. |
| 07:35 | Diagnos: `@electron/universal` vägrade slå ihop x64- och arm64-apparna, eftersom node-pty:s filer under `prebuilds/` är identiska i båda (`Detected file ... prebuilds/darwin-arm64/pty.node that's the same in both x64 and arm64 builds and not covered by the x64ArchFiles rule`). |
| 07:37 | Rättelse i stagens egen konfiguration: `mac.x64ArchFiles: "Contents/Resources/app.asar.unpacked/node_modules/node-pty/prebuilds/**"` i `electron-builder.yml`. Verifierad lokalt: `npm run build:mac` gav en universal `.dmg`, `lipo` visade `x86_64 arm64` och appen startade. |
| ca 07:39 | PR #2 (`f58b754`) skapad. Användaren mergade (`90ff209`). |
| ca 07:40 | Användaren valde att flytta taggen (Q4: A), eftersom `v0.1.0` aldrig publicerats. Taggen togs bort på GitHub, sattes om på `90ff209` och pushades. Körning 43387223452 startade. |
| ca 07:41 | **Körning 43387223452 lyckades:** `verify`, `build-mac`, `build-linux` och `release` blev alla `success`. |
| ca 07:42 | Releasen publicerad: https://github.com/tochman/aidlc-dash/releases/tag/v0.1.0 |

## Publicerade filer

| Fil | Storlek |
|-----|---------|
| `Auctum.AIDLC.Control-0.1.0-universal.dmg` | 217 MB |
| `aidlc-dash_0.1.0_amd64.deb` | 99 MB |

## Ändringar under steget

- `electron-builder.yml`: `x64ArchFiles` för node-pty (PR #2).
- Inga ändringar i appens kod.

## Rollback

Det har inte behövts. Om det blir aktuellt gäller `operation/deployment-pipeline/rollback-runbook.md`. Det finns ingen tidigare version att gå tillbaka till, eftersom det här är första releasen.
