# Rollback-runbook — Auctum AIDLC Control

Appen är en lokal skrivbordsapp. Den skriver bara sina egna inställningar (`~/Library/Application Support/aidlc-dash/settings.json` på macOS, `~/.config/aidlc-dash/settings.json` på Linux) och aldrig något i AI-DLC-projekten. En rollback innebär därför att installera en tidigare version. Det finns ingen data att migrera tillbaka.

## När ska man rulla tillbaka?

- Appen startar inte, eller startskärmen försvinner aldrig.
- Ett AI-DLC-projekt går inte att öppna, eller vyerna visar fel data jämfört med filerna.
- Terminalflikarna startar inte (`claude` eller shell).

## Smoke-test efter varje release (ca 2 minuter)

1. Installera från releasen och starta appen. Startskärmen med Auctum-loggan ska visas och sedan tona bort.
2. Klicka på **+ Öppna projekt** och välj ett AI-DLC-projekt, till exempel `a reference project`. Intent-listan ska fyllas.
3. Klicka på en intent. Pipeline och tidslinje ska visa data.
4. Öppna terminalpanelen och fliken **shell**. Kör `pwd`, som ska visa projektmappen. I fliken **claude** ska Claude starta.

Om något steg fallerar: rulla tillbaka enligt nedan.

## Rulla tillbaka för användare

1. Gå till repots **Releases**. Alla tidigare releaser finns kvar.
2. Ladda ner föregående version:
   - **macOS:** öppna `.dmg`:en och dra appen till Program. Välj att ersätta den befintliga.
   - **Linux:** kör `sudo apt install --allow-downgrades ./auctum-aidlc-control_<föregående>_amd64.deb`.
3. Starta appen. Sparade flikar finns kvar, eftersom inställningsformatet är oförändrat.

## Dra tillbaka en trasig release (den som släpper)

```bash
gh release edit vX.Y.Z --prerelease --notes "Dras tillbaka: <orsak>. Använd vX.Y.(Z-1)."
# eller, om den aldrig borde ha publicerats:
gh release delete vX.Y.Z --yes && git push origin :refs/tags/vX.Y.Z && git tag -d vX.Y.Z
```

Rätta felet på `main` och släpp sedan en ny patch-version (`vX.Y.Z+1`). Återanvänd aldrig ett taggnamn som redan har publicerats.

## Om release-workflowen fallerar

- **verify:** taggen och `package.json` matchar inte, eller testerna är röda. Ta bort taggen (`git push origin :refs/tags/vX.Y.Z`), rätta felet och tagga igen.
- **build-mac eller build-linux:** ingen release skapas, så inget behöver rullas tillbaka. Läs loggen, rätta felet och tagga en ny version.
- **release:** byggena finns kvar som artefakter i körningen. Kör om jobbet med "Re-run failed jobs".
