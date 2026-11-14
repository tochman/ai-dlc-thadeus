# CD-konfiguration: v0.2.3

## Pipeline

Det finns redan en pipeline, `.github/workflows/release.yml`, och den byggs inte om. För den här releasen ändrades bara en sak: ett steg som skapar kontrollsummor.

| Jobb | Körs på | Trigger | Gör |
|------|---------|---------|-----|
| `verify` | ubuntu-latest | PR till `main`, tagg `v*.*.*` | På en tagg kontrolleras att taggen är lika med `package.json`-versionen. Sedan körs `npm ci` och `npx vitest run tests/`. |
| `build-mac` | macos-latest | efter `verify` | `npm run build:mac` utan signering (`CSC_IDENTITY_AUTO_DISCOVERY=false`) och sedan upload av `dist/*.dmg`. |
| `build-linux` | ubuntu-22.04 | efter `verify` | `npm run build:linux` och `scripts/check-glibc.mjs` (glibc 2.35 / GLIBCXX_3.4.30), sedan upload av `dist/*.deb`. |
| `release` | ubuntu-latest | bara på tagg | **Nytt i v0.2.3:** `SHA256SUMS.txt` skapas över `.dmg` och `.deb`. Sedan körs `gh release create` med de tre filerna och `--generate-notes`. |

## Varför ändringen behövs

Uppdateraren i US-0407 (`src/main/updater.js`) kontrollerar nedladdningen mot `SHA256SUMS.txt` och stoppar om summan inte stämmer. Utan filen kan v0.2.3 inte uppdatera sig till senare releaser. Därför måste ändringen finnas i `release.yml` innan `v0.2.3` taggas.

## Säkerhet

- `permissions: contents: read` gäller överallt. `contents: write` ges bara till jobbet `release`.
- Ingen hemlighet används utöver `github.token`. Bygget signeras inte, eftersom det är internt och repot är privat.
- Kontrollsummefilen skyddar mot en korrupt eller utbytt nedladdning (NFR3). Den skyddar inte mot den som kan skriva till repot.

## Miljöer

En enda miljö: GitHub Releases i `tochman/aidlc-dash`. Det finns ingen staging. PR-körningen är grinden innan något publiceras.
