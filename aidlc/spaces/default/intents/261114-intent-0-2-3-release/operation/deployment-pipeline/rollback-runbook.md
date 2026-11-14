# Rollback-runbook: v0.2.3

Strategi: **rätta framåt** [Q2]. En trasig v0.2.3 dras inte tillbaka genom att taggen tas bort. Den görs osynlig för uppdateraren och ersätts av v0.2.4.

## När

- Kontrollen efter publicering misslyckas: appen startar inte, visar fel version eller öppnar inte ett projekt, på macOS eller Linux.
- Releasen saknar `.dmg`, `.deb` eller `SHA256SUMS.txt`.
- En användare rapporterar ett fel som stoppar arbetet.

## Steg

1. **Stoppa erbjudandet.** Markera releasen som prerelease:
   `gh release edit v0.2.3 --repo tochman/aidlc-dash --prerelease`
   Uppdateraren läser bara "latest" och hoppar över prereleaser (`releaseStatus` i `src/main/updater.js`). Då blir v0.2.2 åter "latest" och ingen erbjuds v0.2.3.
2. **Kontrollera** att `gh release view --repo tochman/aidlc-dash --json tagName` visar `v0.2.2`.
3. **Den som redan har installerat v0.2.3 och inte kan arbeta** installerar `THADEUS-0.2.2-universal.dmg` eller `.deb` från v0.2.2-releasen för hand. Appens inställningar ligger kvar i userData.
4. **Rätta felet.** Lägg till en story i EPIC-00 och rätta direkt (`project.md` Way of Working). Höj sedan `package.json` till `0.2.4`, gå via `release/v0.2.4` och en PR, och tagga.
5. **När v0.2.4 är publicerad och kontrollerad** får v0.2.3 ligga kvar som prerelease. Den tas inte bort.

## Det som inte ångras

- Taggen `v0.2.3` och dess commit ligger kvar på `main`.
- En v0.2.3-installation uppdaterar sig till v0.2.4 med sin egen uppdaterare. Om felet sitter i uppdateraren sker uppdateringen för hand (steg 3, med v0.2.4:s filer).

## Kontakt

Ägare och eskalering: personen som äger repot, `tochman`. Det finns ingen jourlista, eftersom appen är ett internt verktyg.
