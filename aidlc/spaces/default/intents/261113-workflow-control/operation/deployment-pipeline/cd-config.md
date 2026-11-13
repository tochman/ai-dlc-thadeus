# CD-konfiguration — EPIC-05

Underlag: `.github/workflows/release.yml` och `construction/build-and-test/build-instructions.md`.

`.github/workflows/release.yml` är oförändrad: `verify`, `build-mac` (universell dmg), `build-linux` (deb på `ubuntu-22.04` med glibc-kontroll) och `release`.

En sak är ny: `postinstall` lyder nu `electron-builder install-app-deps && node scripts/fix-pty-perms.cjs`. `npm ci` i båda byggjobben sätter därmed körrättighet på `spawn-helper`. Den unpackade kopian i den universella dmg-filen är körbar. På Linux används inte `spawn-helper`.

Verifiering: CI-körningen på PR:en bygger båda paketen. När v0.2.0 släpps röktestas den installerade Mac-appen så att claude-fliken startar.
