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
| Live | Filbevakning av intents och usage-ledger, laddar om bara det som ändrats | EPIC-01, EPIC-02 |
| Kostnad | Uppskattad kostnad (API-pris) per projekt, intent, stage, agent, modell och scope | EPIC-02 |
| Modeller | Konfigurerad kontra faktisk modell per agent, med avvikelseflagga | EPIC-02 |
| Terminal | `claude`- och `shell`-flik per projekt, snabbkommandon som skrivs in utan Enter | EPIC-01 |
| Varumärke | Auctum-ikon, splash, logga | EPIC-04 (US-0401) |

## Affärsregler som präglar koden

- Appen är **skrivskyddad mot AI-DLC-filer**. Enda filen den skriver är sina egna inställningar (`settings.json` i userData). Se [architecture.md](architecture.md) § Key Design Decisions.
- Kostnad är AI-DLC:s egen uppskattning ur `usage-ledger.json`, aldrig en faktura; appen räknar inga priser själv.
- Trasiga eller halvskrivna filer påverkar bara sin egen vy; senaste giltiga värde visas.

## Aktiv intent: EPIC-05 Workflow Control

`docs/features/epic-05-workflow-control.md` beskriver nästa steg: att **styra** AI-DLC från konsolen, alltid via kommandon i den synliga terminalen:

- **US-0501** Fortsätt-knapp för intents med status `in-flight` (`/aidlc intent <dirName>` vid byte, sedan `/aidlc`).
- **US-0502** Uppdatera från GitHub: `git fetch` i bakgrunden, förhandsvisning via `git show`, inhämtning som kommando i skalfliken.
- **US-0503** Initiera AI-DLC i en mapp som saknar det (`aidlc config --harness claude`), med förkontroller och förhandsvisning.

Var i koden dessa landar beskrivs i [component-inventory.md](component-inventory.md) och [code-quality-assessment.md](code-quality-assessment.md) § Intent-relevanta luckor.

## Planerat i övrigt

EPIC-03 (virtualiserad tidslinje), EPIC-04 US-0402 (ljus/rörelse), EPIC-06 (feature-dokument i konsolen). Status per epic finns i `docs/FEATURES.md`.
