# CD-konfiguration — EPIC-04 US-0402 och US-0403

Underlag: `.github/workflows/release.yml`.

Pipelinen är oförändrad. Den har jobben `verify`, `build-mac` (universell dmg), `build-linux` (deb på ubuntu-22.04 med glibc-kontroll) och `release`. CI-körningen på PR:en bygger båda paketen.
