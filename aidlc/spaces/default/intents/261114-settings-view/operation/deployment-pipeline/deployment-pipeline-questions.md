# Deployment Pipeline — Frågor och svar (US-0405)

**Scope:** `ultra-express` (CI Pipeline och Infrastructure Design hoppas över; designen bygger på det som redan finns i repot).
**Ställda:** 2026-11-14 · **Besvarade:** 2026-11-14

## Fråga 1 — Behöver release-pipelinen ändras för den här storyn?

**Svar:** `[Answer]: 1`

1. **Nej, den räcker som den är** ← vald
2. Ja — säg vad som ska läggas till

**Motiv (registrerat i artefakterna):** storyn rör bara `src/` och `tests/`; `verify`-jobbet i `.github/workflows/release.yml` kör redan `npm ci` + `npx vitest run tests/` och taggkontrollen mot `package.json`. Inget nytt byggsteg, ingen ny plattform, ingen signering.

## Fråga 2 — När ska v0.2.3 taggas?

**Svar:** `[Answer]: 3`

1. Efter alla fyra stories
2. Nu direkt efter US-0405
3. **Senare, jag säger till** ← vald

**Motiv (registrerat i artefakterna):** US-0405 är första av fyra stories i `docs/releases/0.2.3.md`. Ingen tagg sätts i den här körningen; `package.json` behåller `0.2.2` tills alla fyra är klara.

## Fråga 3 — När stängs de två öppna kriterierna (US-0301, US-0401)?

**Svar:** `[Answer]: 1`

1. **Skjut till release-taggen** ← vald
2. Stäng dem nu med en manuell mätning

**Motiv (registrerat i artefakterna):** båda kräver en körande app respektive en installerad release, vilket Build and Test inte kunde köra. De står kvar i releasechecklistan för v0.2.3 och stängs när bygget är installerat.

## Följdval

- Ingen feature-flag-strategi behövs: appen har ingen server och ingen fjärrkonfiguration.
- Ingen databasmigrering: appens enda skrivna fil är `settings.json` i userData, och de nya nycklarna (`toolPaths`, `defaultProjectFolder`) är additiva och saknas → tomma.
