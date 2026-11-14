# Driftsättningslogg — EPIC-04 US-0402 och US-0403

Underlag: `operation/deployment-pipeline/deployment-strategy.md`, `cd-config.md`, `rollback-runbook.md`, `construction/build-and-test/test-results.md` och PR #9.

## Vad som driftsattes

Enligt releasestrategin får designlyftet ingen egen tagg. Driftsättningen för den här intenten är mergen till `main`.

| Steg | Resultat |
|------|----------|
| PR #9 `feat/epic04-living-lcars` → `main` | Mergad 2026-11-13T15:49:00Z |
| Merge-commit | `fec505b` |
| Tagg | Ingen, enligt strategin |
| Paket (dmg, deb) | Byggda i CI på PR:en men inte publicerade (jobbet `release` hoppades över, som väntat utan tagg) |

## Förkontroller

- **Kontroller före driftsättning:** CI på PR #9 är grön (se `smoke-test-results.md`).
- **Databasmigreringar:** inga. Appen har ingen databas. Den nya inställningen `animations` i `settings.json` har ett standardvärde, och äldre versioner ignorerar den.
- **Beroende tjänster:** inga. Appen körs lokalt.
- **Driftsättningsfönster:** behövs inte. Ingen release publicerades.
- **Miljöinventering:** ingen egen fas för miljöer i express-planen. Den enda målmiljön är `main` och, senare, releasen v0.2.0 i GitHub Releases enligt `.github/workflows/release.yml`.

## Det som återstår (utanför den här intenten)

- US-0404 (helskärm och appmeny) byggs ovanpå designlyftet.
- Sedan taggas v0.2.0, och dmg och deb publiceras.
- Röktestet av v0.2.0 i den installerade appen på Mac och Linux, inklusive att terminalen startar på Mac, görs vid den releasen.

## Återställning

Före taggen v0.2.0: `git revert -m 1 fec505b` på `main` och en PR, enligt `rollback-runbook.md`.
