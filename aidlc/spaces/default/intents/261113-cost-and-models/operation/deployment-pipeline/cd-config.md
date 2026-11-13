# CD-konfiguration — EPIC-02

Underlag: `.github/workflows/release.yml` och `261113-linux-compat-icon/operation/deployment-pipeline/cd-config.md`.

Konfigurationen är oförändrad. `.github/workflows/release.yml` kör fyra jobb på taggar `v*.*.*`:

- `verify`
- `build-mac`: universell dmg
- `build-linux`: deb på `ubuntu-22.04`, med `scripts/check-glibc.mjs`
- `release`: `gh release create`

På en PR mot `main` körs verify och byggena.

EPIC-02 lägger inte till några nya beroenden eller nativa moduler.
