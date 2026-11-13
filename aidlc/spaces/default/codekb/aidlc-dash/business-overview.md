# Business Overview — aidlc-dash

## Syfte

**Auctum AIDLC Control** (repo `aidlc-dash`, v0.1.1, Auctum Solutions AB) är en Electron-"bridge console" för projekt som drivs med AI-DLC. Den visar vad AI-DLC-agenterna gör i ett projekt och bäddar in en terminal med `claude` och ett inloggningsskal i projektroten, så att användaren kan styra arbetet utan att lämna appen. Utseendet är LCARS-inspirerat men återhållsamt.

## Användare

Utvecklare som arbetar med AI-DLC i ett eller flera projekt, på en eller flera maskiner (macOS och Ubuntu 22.04+). EPIC-06 lägger till produktägare som följer epics och stories.

## Huvudfunktioner (byggda)

| Område | Funktion | Epic |
|---|---|---|
| Projekt | Öppna valfri mapp med `aidlc/spaces/`, flera projekt som flikar, flikar återställs vid start | EPIC-01 |
| Intents | Lista med filter, sökning, sortering (datum/kostnad/namn), aktiv- och live-markering | EPIC-01, EPIC-02 |
| Detaljvy | Flikarna Pipeline, Tidslinje, Units (bolt-DAG), Kostnad, Filer | EPIC-01, EPIC-02 |
| Tidslinje | Audit-händelser nyast först, filter för typ/stage/brus, virtualiserad lista utan radtak, nya händelser markeras på stabil nyckel (ytligt) | EPIC-01 (US-0104), EPIC-03 (US-0301, US-0302; byggt, ej releasat) |
| Live | Filbevakning av intents och usage-ledger, laddar om bara det som ändrats | EPIC-01, EPIC-02 |
| Kostnad | Uppskattad kostnad (API-pris) per projekt, intent, stage, agent, modell och scope | EPIC-02 |
| Modeller | Konfigurerad kontra faktisk modell per agent, med avvikelseflagga | EPIC-02 |
| Terminal | `claude`- och `shell`-flik per projekt, snabbkommandon som skrivs in utan Enter | EPIC-01 |
| Styrning | Fortsätt-knapp, Uppdatera från GitHub, Initiera AI-DLC (förkontroller, förhandsvisning, plugins, modellnivå); alla ändringar skrivs som kommandon i terminalen | EPIC-05 (US-0501–US-0503, byggt, ej releasat) |
| Varumärke | Auctum-ikon, splash, logga | EPIC-04 (US-0401) |

## Affärsregler som präglar koden

- Appen är **skrivskyddad mot projektets filer**. Enda filen den skriver är sina egna inställningar (`settings.json` i userData). Se [architecture.md](architecture.md) § Key Design Decisions.
- Allt som ändrar ett projekt skrivs som kommando i den synliga terminalen och körs först när personen trycker Enter.
- Kostnad är AI-DLC:s egen uppskattning ur `usage-ledger.json`, aldrig en faktura; appen räknar inga priser själv.
- Trasiga eller halvskrivna filer påverkar bara sin egen vy; senaste giltiga värde visas.
- Audit-loggen är den ärligaste källan till vad agenterna gjort; den består av en shard per maskin (`audit/<host>-<clone-id>.md`) som slås ihop i tidsordning.

## Aktiv intent: EPIC-06 Feature Docs

`docs/features/epic-06-feature-docs.md` (📋 Planned). Feature-dokumenten säger *vad* och *varför*; AI-DLC:s records säger *hur* och *när*.

**Formatet** (projektets egen konvention, inte en del av AI-DLC; repot använder det själv):
- `docs/FEATURES.md`: kort inledning och en tabell med en rad per epic (länk, ämne, status).
- `docs/features/epic-XX-<slug>.md`: beskrivning, raden `**Stories:**`, raden `**Status (datum):**` och stories som `**US-XXYY: Titel** <status>` följt av As a / in order to / I would like to, Epic, Priority, Complexity, Acceptance Criteria (checkboxar, helst Given/When/Then), Notes och Dependencies.
- Statusmarkörer: 📋 Planned, 🚧 In progress / built not released, ✅ Done. Epics ordnas efter ämne, inte release.

**Stories:**
- **US-0601** Erbjud feature-dokument vid uppsättning: ett val i uppsättningsdialogen (av som standard); är det på och `docs/FEATURES.md` saknas skrivs en förfrågan i claude-terminalen om att skapa dokumenten och lägga till en projektregel via AI-DLC:s eget sätt att spela in regler. Finns dokumenten redan läggs bara regeln till. Samma åtgärd erbjuds i Features-vyn för projekt som redan har AI-DLC. Appen skriver inga filer själv.
- **US-0602** Features-vy: visas bredvid intents; inställningen "Feature-beskrivningar" per projekt i appens `settings.json` med Automatiskt (standard, visas när filen finns), Visa och Dölj, och en valfri annan sökväg. Epic-vy med stories, status, prioritet, komplexitet och kriterieprogress; story-vy renderad som artefaktläsaren med skrivskyddade checkboxar; filter på status och prioritet; länkar mellan story-ID i intents records och stories; liveuppdatering; reserv till ren Markdown när formatet inte följs; "Öppna i editor" och "Visa i Finder".

Var i koden dessa landar beskrivs i [component-inventory.md](component-inventory.md) § Intent-relevans och [code-quality-assessment.md](code-quality-assessment.md) § Intent-relevanta luckor.

## Planerat i övrigt

EPIC-04 US-0402 (ljus/rörelse) och US-0403 (designuppfräschning), EPIC-05 US-0504 (ramverksuppdateringar). Status per epic finns i `docs/FEATURES.md`.
