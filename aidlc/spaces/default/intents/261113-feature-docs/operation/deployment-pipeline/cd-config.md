# CD-konfiguration — EPIC-06

Underlag: `.github/workflows/release.yml`.

Pipelinen är oförändrad: `verify`, `build-mac` (universell dmg), `build-linux` (deb på ubuntu-22.04 med glibc-kontroll) och `release`. CI-körningen på PR:en bygger båda paketen.
