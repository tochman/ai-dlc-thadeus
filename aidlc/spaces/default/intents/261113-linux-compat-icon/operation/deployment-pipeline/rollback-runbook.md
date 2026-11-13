# Rollback-runbook — v0.1.1

Underlag: `construction/build-and-test/test-results.md`. Runbooken från EPIC-01 (`intents/261113-bridge-console-mvp/operation/deployment-pipeline/rollback-runbook.md`) gäller också här. Det här är tilläggen för v0.1.1.

## Smoke-test på Ubuntu 22.04

1. Kör `sudo apt install ./aidlc-dash_0.1.1_amd64.deb`.
2. Starta från startmenyn. **Auctum AIDLC Control** ska ha Auctum-ikonen. Starta den också från en terminal med `auctum-aidlc-control`, så att eventuella fel syns.
3. Startskärmen ska visas och appen ska öppnas. Öppna ett AI-DLC-projekt.
4. Öppna terminalpanelen. Både shell- och claude-fliken ska starta. Om terminalmodulen inte går att ladda ska resten av appen ändå fungera, och panelen ska visa "Kunde inte starta …: Terminalmodulen kunde inte laddas: …".

## Om v0.1.1 inte fungerar

- **Linux:** v0.1.0 startar inte på 22.04, så det finns ingen fungerande version att gå tillbaka till där. Kör `auctum-aidlc-control` i en terminal, spara utskriften och rapportera den. Dra tillbaka releasen med `gh release edit v0.1.1 --prerelease` om felet är allmänt.
- **macOS:** Gå tillbaka till v0.1.0 från Releases. Inställningarna är kompatibla.
- Rätta felet och släpp `v0.1.2`. Återanvänd inte en tagg som redan är publicerad.
