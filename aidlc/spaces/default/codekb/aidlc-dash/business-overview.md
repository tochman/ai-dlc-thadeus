# Affärsöversikt: aidlc-dash (Auctum AIDLC Control)

## Syfte

Auctum AIDLC Control är en skrivbordsapp (Electron) för utvecklare på Auctum Solutions AB som arbetar med AI-DLC. Den visar läget i ett eller flera AI-DLC-projekt som en "bridge console": intents, deras pipeline av stages, en levande tidslinje från audit-loggen, unit-DAG, kostnad per intent och modell, och projektets feature-dokument. Bredvid visningen finns en inbäddad terminal med två flikar (`claude` och `shell`) där personen styr arbetet.

Appen är skrivskyddad mot AI-DLC-filer. Allt som ändrar något (`/aidlc`-kommandon, `git pull`, AI-DLC-uppsättning) skrivs in i en synlig terminalflik och körs först när personen trycker Enter.

## Användare

- Utvecklare som kör AI-DLC i Claude Code och vill se vad agenterna gör medan de arbetar.
- Konsolen hålls öppen hela dagen, vilket gör läsbarhet, kontrast och lugn rörelse viktiga (EPIC-04).

## Huvudfunktioner (per epic i `docs/FEATURES.md`)

| Epic | Innehåll | Status |
|------|----------|--------|
| EPIC-01 | Grundkonsolen: projektflikar, intent-lista, detaljvy (Pipeline, Tidslinje, Units, Filer), terminal, splash och Auctum-märke, återhållsamt LCARS-tema | Släppt v0.1.0 |
| EPIC-02 | Kostnad och modeller från `usage-ledger.json` och `aidlc config models` | Byggd, ej släppt |
| EPIC-03 | Virtualiserad tidslinje med precisa liveuppdateringar | Byggd, ej släppt |
| EPIC-04 | Ikon och OS-integration (US-0401), glöd och rörelse (US-0402), LCARS-designuppdatering (US-0403) | US-0401 släppt v0.1.1; US-0402 och US-0403 planerade |
| EPIC-05 | Arbetsflödesstyrning: Fortsätt, Uppdatera från GitHub, Initiera AI-DLC | Byggd, ej släppt |
| EPIC-06 | Feature-dokument: Features-vy, projektinställningar | Byggd, ej släppt |

## Denna intent

Intent `261113-living-lcars` ska genomföra US-0402 och US-0403: ny palett (skiffer, stålblå, korall; Auctum-amber bara för märket och den primära åtgärden), nästlade elbow-ramar, märkta block, dataavläsningar, punktindikator för pipeline-progress, glöd och korta övergångar, plus en inställning "Animationer: Full / Dämpad / Av". Befintliga tester och `data-testid` ska behållas.

## Affärsregler som påverkar en omdesign

- Status visas aldrig enbart med färg (FR9.3, NFR3): varje tagg har text.
- Brödtext ska ha minst 4,5:1 kontrast mot `--bg` och `--panel` (NFR3, WCAG AA).
- Inga Star Trek-varumärken, logotyper, ljud eller kopierade resurser (FR9.5). Den enda logotypen är Auctum-märket.
- Alla kostnader är uppskattningar och märks så (`COST_LABEL`).
- Dekorativa siffror får inte se ut som riktiga data (US-0403).

Komponentdetaljer finns i `component-inventory.md`, arkitektur i `architecture.md`.
