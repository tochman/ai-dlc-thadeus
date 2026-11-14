# Releasestrategi: v0.2.3

## Ordning

1. **Taggen väntar på EPIC-00.** `v0.2.3` taggas först när alla småfixar i `docs/features/epic-00-fixes.md` som ska med är ✅ Klar [Q1].
2. **Releasebranch och PR.** Arbetet går från `wip/us-0902-project-defaults` till branchen `release/v0.2.3` och en PR mot `main` (FR3.4). PR-körningen av `release.yml` måste vara grön, både tester och bygget på båda plattformarna.
3. **Merge och tagg.** Efter merge sätts taggen på `main` med `git tag v0.2.3 && git push origin v0.2.3`. Jobbet `verify` stoppar om taggen inte är lika med `package.json` (`0.2.3`).
4. **Publicering.** Workflowet publicerar en vanlig release som blir "latest" [Q3]. Ingen prerelease.
5. **Kontroll efter publicering (smoke test).**
   - Releasen har tre filer: `THADEUS-0.2.3-universal.dmg`, `.deb` och `SHA256SUMS.txt` (`gh release view v0.2.3 --repo tochman/aidlc-dash`).
   - macOS: redan verifierat på det lokala bygget i Build and Test. Ett snabbtest av `.dmg` från releasen räcker: appen startar och visar 0.2.3.
   - Linux (FR2.2): installera `.deb` från releasen. Kontrollera att appen startar, visar 0.2.3 i "Om T.H.A.D.E.U.S." och öppnar ett projekt.
6. **Feature-dokumenten.** I Deployment Execution märks varje story med "Released in v0.2.3".

## Grindar

| Grind | Typ | Stoppar |
|-------|-----|---------|
| PR-körning av `release.yml` | automatisk | en PR med röda tester eller ett trasigt bygge |
| Merge av PR:en | manuell (du) | allt som inte är godkänt |
| Tagg = `package.json`-version | automatisk | en felnumrerad tagg |
| Kontroll efter publicering | manuell (du) | se `rollback-runbook.md` |

## Feature flags

Inga. En skrivbordsapp utan backend har ingen flaggtjänst. Den som inte vill ha en uppdatering hoppar över den i uppdateraren ("Hoppa över den här versionen").
