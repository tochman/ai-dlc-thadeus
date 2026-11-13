# Business Overview — aidlc-dash

## Syfte

**Auctum AIDLC Control** (repo `aidlc-dash`, v0.1.1, Auctum Solutions AB) är en Electron-"bridge console" för projekt som drivs med AI-DLC. Den visar vad AI-DLC-agenterna gör i ett projekt och bäddar in en terminal med `claude` och ett inloggningsskal i projektroten, så att användaren kan styra arbetet utan att lämna appen. Utseendet är LCARS-inspirerat men återhållsamt.

## Användare

Utvecklare som arbetar med AI-DLC i ett eller flera projekt, på en eller flera maskiner (macOS och Ubuntu 22.04+).

## Huvudfunktioner (byggda)

| Område | Funktion | Epic |
|---|---|---|
| Projekt | Öppna valfri mapp med `aidlc/spaces/`, flera projekt som flikar, flikar återställs vid start | EPIC-01 |
| Intents | Lista med filter, sökning, sortering (datum/kostnad/namn), aktiv- och live-markering | EPIC-01, EPIC-02 |
| Detaljvy | Flikarna Pipeline, Tidslinje, Units (bolt-DAG), Kostnad, Filer | EPIC-01, EPIC-02 |
| Tidslinje | Audit-händelser nyast först, filter för typ/stage/brus, tak 1 500 rader, nya händelser blinkar i 4 s | EPIC-01 (US-0104) |
| Live | Filbevakning av intents och usage-ledger, laddar om bara det som ändrats | EPIC-01, EPIC-02 |
| Kostnad | Uppskattad kostnad (API-pris) per projekt, intent, stage, agent, modell och scope | EPIC-02 |
| Modeller | Konfigurerad kontra faktisk modell per agent, med avvikelseflagga | EPIC-02 |
| Terminal | `claude`- och `shell`-flik per projekt, snabbkommandon som skrivs in utan Enter | EPIC-01 |
| Styrning | Fortsätt-knapp, Uppdatera från GitHub, Initiera AI-DLC; alla ändringar skrivs som kommandon i terminalen (ytligt skannat) | EPIC-05 (US-0501–US-0503, byggt, ej releasat) |
| Varumärke | Auctum-ikon, splash, logga | EPIC-04 (US-0401) |

## Affärsregler som präglar koden

- Appen är **skrivskyddad mot AI-DLC-filer**. Enda filen den skriver är sina egna inställningar (`settings.json` i userData). Se [architecture.md](architecture.md) § Key Design Decisions.
- Kostnad är AI-DLC:s egen uppskattning ur `usage-ledger.json`, aldrig en faktura; appen räknar inga priser själv.
- Trasiga eller halvskrivna filer påverkar bara sin egen vy; senaste giltiga värde visas.
- Audit-loggen är den ärligaste källan till vad agenterna gjort; den består av en shard per maskin (`audit/<host>-<clone-id>.md`) som slås ihop i tidsordning.

## Aktiv intent: EPIC-03 Audit Timeline

`docs/features/epic-03-audit-timeline.md`: riktiga intents har tusentals händelser (visinv:s `epic02-finish` har 1 726).

- **US-0301** Virtualiserad tidslinje: inget radtak, bara synliga rader renderas (20 000 händelser, under 200 ms efter filterbyte), expanderbara rader med varierande höjd, "hoppa till nyast"/"hoppa till stagestart", bevarad scrollposition, tangentbord och skärmläsare. Inget nytt beroende om inte ett litet är klart enklare.
- **US-0302** Exakt markering av nya händelser: stabil nyckel i stället för antal, korrekt markering av äldre händelser från en annan maskins shard, räknare "N nya händelser" utanför synligt område.

Var i koden dessa landar beskrivs i [component-inventory.md](component-inventory.md) § Intent-relevans och [code-quality-assessment.md](code-quality-assessment.md) § Intent-relevanta luckor.

## Planerat i övrigt

EPIC-04 US-0402 (ljus/rörelse), EPIC-05 US-0504 (ramverksuppdateringar), EPIC-06 (feature-dokument i konsolen). Status per epic finns i `docs/FEATURES.md`.
