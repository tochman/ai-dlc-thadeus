# CD-konfiguration — EPIC-03

Underlag: `.github/workflows/release.yml`.

Konfigurationen är oförändrad: `verify`, `build-mac` (universell dmg), `build-linux` (deb på ubuntu-22.04 med glibc-kontroll) och `release`. `npm ci` installerar `@tanstack/react-virtual` `3.14.24` från lockfilen. CI-körningen på PR:en bygger båda paketen.
