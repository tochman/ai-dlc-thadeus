# Rollback Runbook — US-0405 Inställningar som vy

## Vad som kan gå fel, och vad man gör

| Händelse | Upptäcks av | Rollback |
|----------|-------------|----------|
| `verify` fallerar (test eller tagg ≠ `package.json`) | `release`-workflowen | Ingen release skapas. Rätta felet på `main`, ta bort taggen (`git tag -d v0.2.3 && git push origin :refs/tags/v0.2.3`) och tagga om när `main` är grön. |
| `build-mac` eller `build-linux` fallerar | workflowen | Samma som ovan: ingen release, ingen artefakt. Ta bort taggen, rätta, tagga om. |
| Released artefakt är trasig (startar inte, kraschar) | rökprovet, eller användaren | Markera releasen som pre-release eller radera den (`gh release delete v0.2.3`), och be användarna installera föregående version. Taggen kan ligga kvar som historik om `main` redan är rättad — annars tas den bort och sätts om. |
| Regression i en specifik story | användaren | Samma som ovan; en fix går ut som `v0.2.4` (ingen nedgradering av redan installerade maskiner sker automatiskt). |
| Inställningsfilen blev oanvändbar efter uppgradering | användaren | `settings.json` i `~/Library/Application Support/aidlc-dash/` (macOS) eller `~/.config/aidlc-dash/` (Linux) kan tas bort — appen startar med tomma standardvärden. Inget projekt påverkas. |

## Nedgradering för användaren

- **macOS:** stäng appen, dra `THADEUS.app` till papperskorgen, installera föregående `.dmg` från GitHub Releases.
- **Linux:** `sudo apt install ./thadeus_<föregående version>_amd64.deb` (apt tillåter nedgradering när filen ges explicit) eller `sudo apt install --reinstall thadeus=<version>` ur release-arkivet.

Ingen datamigrering behöver rullas tillbaka: de nya nycklarna i `settings.json` saknas bara i den äldre versionen, som ignorerar dem via `sanitize()`. En nedgradering förlorar därför inga inställningar som fanns i v0.2.2 — men den tappar de tre sparade verktygssökvägarna och standardmappen.

## Vad som aldrig får göras som "rollback"

- Att sätta `--no-verify`, hoppa över `npx vitest run tests/` eller peka en tagg på en annan commit efter publicering. En tagg som redan är publicerad är historik; en fix är en ny version.
- Att lägga in en manifeständring i `electron-builder.yml` för att få ett bygge igenom utan att förstå varför det föll. Glibc-kontrollen (`scripts/check-glibc.mjs`) finns för att v0.1.0-kraschen inte ska upprepas.
- Att återställa användares `settings.json` som en del av en release.

## Ansvar och kontakt

| Roll | Vem |
|------|-----|
| Releaseägare | den som taggar (Auctum Solutions AB) |
| Felrapportering | `https://github.com/tochman/aidlc-dash/issues` — nås också från **Inställningar → Om → Rapportera problem** i appen |

## Efter en rullad tillbaka release

Skriv ner i releasen eller i en issue: vilken version som drogs tillbaka, vilket symptom som syntes, vilken commit som orsakade det, och vilken version som ersatte den. Storyns status i epic-filen ska då **inte** stå som "Released in v0.2.3" — den återgår till pågående tills en fungerande release finns.
