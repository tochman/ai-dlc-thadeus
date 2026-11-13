# Affärsöversikt: aidlc-dash

## Syfte

Auctum AIDLC Control (repo `aidlc-dash`, version 0.1.0, Auctum Solutions AB) är en Electron-skrivbordsapp, en "bridge console" för AI-DLC-projekt. Den visar skrivskyddat vad AI-DLC-agenterna gör i ett projekt och har en inbäddad terminal där användaren kan köra `claude` och ett skal i projektroten.

## Målgrupp

Utvecklare som driver arbete med AI-DLC och vill följa intents, stages, audit-händelser och units utan att läsa råfilerna.

## Huvudfunktioner (EPIC-01, släppt i v0.1.0)

| Funktion | Datakälla i det öppnade projektet |
|---|---|
| Projekt som flikar, återöppnas vid start | appens egen `settings.json` i userData |
| Intent-lista med filter (status, scope, fritext) | `intents.json`, intent-mappar, `active-intent`, `aidlc-state.md`, `project-description.json` |
| Pipeline per fas och stage | `aidlc-state.md` (vinner) + `runtime-graph.json` (tider, agent) |
| Tidslinje | `audit/*.md`-shards, sammanslagna i tidsordning |
| Unit-DAG | `bolt_dag` i `runtime-graph.json` + `UNIT_*`-händelser |
| Artefaktläsare | filer under intentens fasmappar |
| Liveuppdatering | filbevakning av `aidlc/spaces/<space>/intents/` |
| Terminal (`claude`, `shell`) med snabbkommandon | node-pty i projektroten |

## Affärsregler som koden upprätthåller

- Appen skriver aldrig till AI-DLC-filer; enda skrivningen är den egna inställningsfilen.
- All filåtkomst är begränsad till öppnade projektrötter.
- En trasig fil påverkar bara sin egen intent; senaste giltiga data visas i stället.
- Status visas alltid som text, inte bara färg.

## Planerat: EPIC-02 Cost & Models (aktiv intent)

Kostnad (tokens och uppskattad USD) per intent, stage, agent och modell, projektöversikt med CSV-export, konfigurerad kontra faktisk modell per agent och livekostnad. Datakällan `aidlc/.aidlc-sessions/usage-ledger.json` läses inte av appen i dag. Var den ansluter beskrivs i `architecture.md` (avsnittet om förbättringsmöjligheter) och i `code-quality-assessment.md`.

Övriga planerade epics: EPIC-03 (lång tidslinje), EPIC-04 (ikon och OS-integration), se `docs/FEATURES.md`.
