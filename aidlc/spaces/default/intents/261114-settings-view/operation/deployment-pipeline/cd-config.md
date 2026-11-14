# CD Configuration — US-0405 Inställningar som vy

**Utfall: ingen ändring i pipelinen.** Storyn använder den pipeline som redan finns; den här filen beskriver vad som gäller och varför inget behöver läggas till.

## Vad som redan finns

| Del | Fil | Beteende |
|-----|-----|----------|
| Workflow | `.github/workflows/release.yml` | `verify` → `build-mac` + `build-linux` → `release` |
| Triggers | samma fil | `push` på tagg `v*.*.*`; `pull_request` mot `main` (test + bygge, ingen publicering) |
| Testgrind | `verify` (ubuntu-latest) | `npm ci` och `npx vitest run tests/` — samma svit som Build and Test körde |
| Taggkontroll | `verify` | `v${package.json.version}` måste vara exakt `GITHUB_REF_NAME` |
| macOS-paket | `build-mac` (macos-latest) | `npm run build:mac`, `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` (osignerat internt bygge), artefakt `dist/*.dmg` |
| Linux-paket | `build-linux` (ubuntu-22.04) | `npm run build:linux`, `node scripts/check-glibc.mjs dist/linux-unpacked`, artefakt `dist/*.deb` |
| Publicering | `release` | `gh release create <tagg> dist/*.dmg dist/*.deb --generate-notes` |
| Rättigheter | samma fil | `contents: read` i hela flödet utom `release`, som har `contents: write` |

Paketeringen ligger i `electron-builder.yml` (`se.auctum.thadeus`, `THADEUS`, dmg universal, deb x64, `node-pty` utanför asar).

## Vad US-0405 bidrar med i bygget

- Ren JS/JSX i `src/main`, `src/preload` och `src/renderer`; inga nya npm-beroenden (C5), ingen ny native modul, ingen ändring i `electron-builder.yml`.
- Nya strängar i `src/shared/locales/{sv,en}.json`, som bundlas i renderer- och main-bygget — `i18nKeys.test.js` i `verify` fångar en nyckel som bara finns i en av filerna.
- `out/` byggs om av `electron-vite build`, som både `build:mac` och `build:linux` kör.

## Vad som medvetet inte läggs till

| Förslag | Varför inte |
|---------|-------------|
| Eget build-jobb på PR | `pull_request`-triggen kör redan hela `verify`-jobbet och båda paketeringsjobben; det var syftet med dem (Linux-glibc-felet i v0.1.0) |
| Signering/notarisering | Osignerat internt bygge är ett uttalat val (`identity: null`, `CSC_IDENTITY_AUTO_DISCOVERY: 'false'`) |
| Feature flags | Ingen server, ingen fjärrkonfiguration |
| Databasmigrering | Enda skrivna filen är `settings.json`; nya nycklar är additiva och saknas → tomma |

## Releaseflöde för v0.2.3

1. Alla fyra stories i `docs/releases/0.2.3.md` är klara och godkända.
2. Epic-filer och `docs/FEATURES.md` uppdaterade per projektmandatet (story-status, `- [x]`, epicens `**Status (…)`-rad, `FEATURES.md`-raden).
3. `package.json` bumpas till `0.2.3`; commit på `main`.
4. Tagg `v0.2.3` pushas → `verify` (tester + taggkontroll) → `build-mac` + `build-linux` → GitHub Release med `.dmg` och `.deb`.
5. Storyn märks "Released in v0.2.3" i epic-filen och `FEATURES.md` när releasen finns (se `rollback-runbook.md` för vad som händer om den inte blir grön).

**Tidpunkt:** enligt svaret på fråga 2 sätts ingen tagg i den här körningen — väntar på besked.
