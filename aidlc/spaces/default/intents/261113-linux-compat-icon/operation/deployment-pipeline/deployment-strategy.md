# Leveransstrategi — v0.1.1 (patch)

Underlag: `construction/build-and-test/build-and-test-summary.md`. Strategin är densamma som i EPIC-01: versionerade GitHub Releases som användarna installerar själva.

## Release-steg för v0.1.1

1. Merga PR #3 (epics och dokumentation) och PR #4 (den här rättelsen) till `main`. PR #4:s CI-körning är grön på båda plattformarna.
2. Tagga `v0.1.1` på `main` och pusha taggen. `package.json` har redan version `0.1.1`.
3. Workflowen bygger och publicerar `Auctum.AIDLC.Control-0.1.1-universal.dmg` och `aidlc-dash_0.1.1_amd64.deb`.
4. Smoke-test enligt `rollback-runbook.md`, framför allt på användarens Ubuntu 22.04.

## Kriterier för en lyckad release

- Alla jobb är gröna, och glibc-kontrollen säger OK.
- `.deb` installeras med `sudo apt install ./aidlc-dash_0.1.1_amd64.deb` och startar på Ubuntu 22.04.
- Auctum-ikonen syns i startmenyn på Linux och i Dock på macOS.

## Risker

| Risk | Hantering |
|------|-----------|
| GitHub fasar ut `ubuntu-22.04`-runnern | glibc-kontrollen stoppar då ett bygge på en nyare runner. Lösningen är att bygga i en `ubuntu:22.04`-container. |
| Användaren har en äldre Linux än 22.04 | Det stöds inte (glibc under 2.35). Det står i README och i krav NFR1. |
