# CD-konfiguration — EPIC-04 US-0404

Underlag: `.github/workflows/release.yml`.

Pipelinen är oförändrad: `verify`, `build-mac` (universell dmg), `build-linux` (deb med glibc-kontroll) och `release`. Taggen `v0.2.0` startar releasen. Versionen i `package.json` höjs till 0.2.0 i samma PR.
