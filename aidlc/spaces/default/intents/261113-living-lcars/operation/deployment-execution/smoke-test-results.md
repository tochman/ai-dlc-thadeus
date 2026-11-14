# Röktestresultat — EPIC-04 US-0402 och US-0403

Underlag: CI-körningen på PR #9 och `construction/build-and-test/test-results.md`.

## CI på PR #9

| Jobb | Resultat |
|------|----------|
| `verify` (enhetstester och bygge) | SUCCESS |
| `build-mac` (universell dmg) | SUCCESS |
| `build-linux` (deb på ubuntu-22.04 med glibc-kontroll) | SUCCESS |
| `release` | SKIPPED (ingen tagg, som väntat) |

## Lokal körning efter mergen

Det gick inte att köra `npx vitest run tests/` och `npx electron-vite build` på `main` i den här utcheckningen: `node_modules` saknas, och felet var `ERR_MODULE_NOT_FOUND` för `vitest`. Inga beroenden installerades, eftersom planen inte nämner någon installation. CI-jobbet `verify` ovan körde samma tester och samma bygge.

## Från Build and Test

- 90/90 enhetstester gröna och bygget lyckades.
- Kontroll i riktig Electron: kontrast AA för alla par, 60 fps med Full, rörelselägena fungerar, och layouten fungerar vid 2560 × 1440, 1440 × 900 och 1100 × 800. Inga konsolfel.

## Uppskjutet

Röktestet i den installerade appen på Mac och Linux görs vid releasen v0.2.0, enligt releasestrategin.
