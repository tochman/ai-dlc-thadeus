# Krav — EPIC-01 Bridge Console MVP

Källa: `docs/features/epic-01-bridge-console-mvp.md` (US-0101–US-0110), den ursprungliga beställningen och svaren i `requirements-analysis-questions.md` (Q1–Q4). Varje FR-grupp motsvarar en user story i feature-dokumentet. Feature-dokumentet är fortsatt källan för acceptanskriterierna.

## Avsiktsanalys

Användaren kör AI-DLC-workflows med Claude och har svårt att följa vad agenterna gör. Målet är en skrivskyddad, levande överblick över ett eller flera AI-DLC-projekt: vilka intents som finns, var varje workflow befinner sig, vad som hänt och vad som producerats. Man ska kunna styra Claude från samma fönster. Gränssnittet ska vara roligt att använda, med en återhållsam sci-fi-känsla inspirerad av LCARS, men läsbarheten går alltid först.

## Funktionella krav

### FR1 — Öppna AI-DLC-projekt i flikar (US-0101, Q3)
- **FR1.1** Systemet ska låta användaren välja en projektmapp via en native mappväljare och öppna den i en ny projektflik.
- **FR1.2** Systemet ska känna igen ett AI-DLC-projekt på `aidlc/spaces/` och läsa aktiv space från `aidlc/active-space`. Är mappen inget AI-DLC-projekt ska fliken visa ett tydligt meddelande om det, i stället för att krascha eller visa en tom vy.
- **FR1.3** Systemet ska visa en space-väljare i fliken när projektet har mer än en space.
- **FR1.4** Systemet ska visa flera projekt som flikar i samma fönster. En flik ska kunna stängas, och man byter projekt genom att byta flik.
- **FR1.5** Systemet ska komma ihåg senast öppnade projekt och öppna samma flikar igen vid nästa start.

### FR2 — Intent-lista (US-0102)
- **FR2.1** Systemet ska lista alla intents från `intents.json`, nyaste först enligt datumprefixet i `dirName`.
- **FR2.2** Varje rad ska visa slug, scope, status, startdatum och antal klara av antal körda stages.
- **FR2.3** Den aktiva intenten (`active-intent`) ska markeras.
- **FR2.4** Listan ska kunna filtreras på status och scope och fritextsökas på slug och beställningstext.
- **FR2.5** Intents som finns på disk men saknas i `intents.json`, eller tvärtom, ska visas med en markering och inte döljas.

### FR3 — Fas- och stage-pipeline per intent (US-0103)
- **FR3.1** Detaljvyn ska visa beställningstexten (`project-description.json`) och scope-konfigurationen (depth, test strategy) från `aidlc-state.md`.
- **FR3.2** Stages ska visas grupperade per fas. Varje stage ska ha status (ej startad, pågår, väntar på godkännande, revideras, klar, överhoppad), agent, start- och sluttid och varaktighet.
- **FR3.3** Överhoppade stages ska visas nedtonade och den aktuella stagen ska framhävas.
- **FR3.4** Status ska slås ihop från checkboxarna i `aidlc-state.md` och `runtime-graph.json`. Vid konflikt gäller state-filen och avvikelsen markeras.
- **FR3.5** Vyn ska fungera när `runtime-graph.json` saknas. Då används bara `aidlc-state.md` och audit-loggen.

### FR4 — Audit-tidslinje (US-0104)
- **FR4.1** Systemet ska tolka alla `audit/*.md`-filer för en intent till händelser med tidsstämpel, händelsetyp och alla nyckel/värde-fält.
- **FR4.2** Flera audit-filer (en per maskin) ska slås ihop till en tidslinje sorterad på tidsstämpel.
- **FR4.3** Händelser ska färgkodas per kategori: stage, subagent, gate/godkännande, fråga/människa, unit, fel, guard/sensor.
- **FR4.4** Brusiga händelsetyper (`GUARD_DISABLED`, `SENSOR_PASSED`, `SENSOR_FIRED`, `GUARD_STOOD_ASIDE`) ska vara dolda som standard och gå att visa.
- **FR4.5** Tidslinjen ska kunna filtreras på händelsetyp och stage. Ett klick på en händelse ska visa alla dess fält.
- **FR4.6** Parsern ska tåla okända händelsetyper och fält utan att tappa händelser.

### FR5 — Bolt/unit-DAG (US-0105)
- **FR5.1** Systemet ska rita `bolt_dag.units` som en riktad graf med en kolumn per batch i `batches`.
- **FR5.2** Varje nod ska visa unit-namn och typ (`kind`) och färgas efter status från `UNIT_STARTED`/`UNIT_COMPLETED` i audit-loggen.
- **FR5.3** Saknar intenten `bolt_dag` ska DAG-vyn döljas och en kort förklaring visas.

### FR6 — Artefaktläsare (US-0106)
- **FR6.1** Varje stage i pipelinen ska lista sina filer under `<fas>/<stage>/`.
- **FR6.2** Markdown ska renderas med rubriker, tabeller, kod och checkboxar. JSON ska visas formaterat.
- **FR6.3** Artefakter ska kunna visas i Finder och öppnas i standardeditorn.
- **FR6.4** Renderad markdown ska saneras så att inget skript eller ingen aktiv HTML från artefaktinnehåll körs.

### FR7 — Liveuppdatering (US-0107)
- **FR7.1** Systemet ska bevaka den aktiva spacens `intents/`-mapp rekursivt för varje öppen projektflik och ignorera `.aidlc-engine/` utom `active-directive.json`.
- **FR7.2** Ändringar ska debouncas, och bara de intents som berörs ska tolkas om.
- **FR7.3** Nya audit-händelser ska framhävas kort i tidslinjen, och en "live"-indikator ska visas för intents som pågår.
- **FR7.4** En halvskriven fil, till exempel ogiltig JSON mitt i en skrivning, får inte krascha gränssnittet. Senaste giltiga tillstånd ska fortsätta visas.

### FR8 — Inbäddad terminal (US-0108, Q2)
- **FR8.1** Varje projektflik ska ha en terminalpanel (xterm.js + node-pty) med två terminalflikar: en som kör `claude` och en med användarens inloggningsskal. Båda startar med projektroten som arbetskatalog.
- **FR8.2** Terminalprocesserna ska få inloggningsskalets miljö, så att `PATH`, nvm och `aidlc` hittas.
- **FR8.3** Terminalen ska vara fullt interaktiv: färger, storleksändring, kopiera/klistra in och tangentbordsinmatning till väljare och gates.
- **FR8.4** Panelen ska kunna visas, döljas och ändras i storlek, och sessionerna ska överleva vybyten och flikbyten.
- **FR8.5** Snabbknappar ska skriva in `/aidlc --status`, `/aidlc --doctor` och `/aidlc continue` i claude-fliken. Kommandot ska infogas men inte skickas.
- **FR8.6** När en terminalprocess avslutas ska en knapp för att starta om den visas.
- **FR8.7** När en projektflik stängs ska dess terminalprocesser avslutas.

### FR9 — Bridge-tema (US-0109)
- **FR9.1** Mörkt tema som standard: nästan svart bakgrund, rundade "elbow"-paneler och en liten accentpalett (amber/orange, lavendel, blått, rött för fel).
- **FR9.2** Kondenserat sans-serif-typsnitt för rubriker (lokalt paketerat, t.ex. Antonio), ett läsbart typsnitt för innehåll och monospace för terminalen.
- **FR9.3** Status visas aldrig enbart med färg, utan alltid också med text eller ikon.
- **FR9.4** Animationerna ska vara subtila (t.ex. puls på live/pågår) och stängas av när `prefers-reduced-motion` är satt.
- **FR9.5** Inga Star Trek-varumärken, logotyper eller kopierade tillgångar. Temat är bara inspirerat av LCARS.

### FR10 — Säkerhet, körning och paketering (US-0110, Q1, Q4)
- **FR10.1** Renderaren körs med `contextIsolation: true`, `nodeIntegration: false` och sandbox. Filsystem och pty nås bara via ett smalt preload-API.
- **FR10.2** All åtkomst till AI-DLC-filer ska vara skrivskyddad och begränsad till öppnade projektrötter. Sökvägar utanför roten ska avvisas.
- **FR10.3** `npm run dev` ska starta appen med hot reload.
- **FR10.4** `npm run build` ska producera en osignerad macOS-app (.app/.dmg) för lokalt bruk.
- **FR10.5** Parsrarna för intents, state, audit och runtime graph ska ha enhetstester mot fixtures kopierade från ett riktigt AI-DLC-projekt.

## Icke-funktionella krav

- **NFR1 — Prestanda:** Ett projekt med 25 intents och 2 000 audit-händelser per intent ska visa intent-listan inom 2 s efter att det öppnats, och en filändring ska synas i vyn inom 1 s.
- **NFR2 — Robusthet:** En trasig eller okänd fil i en intent får bara påverka den intenten. Resten av projektet och övriga flikar ska fungera.
- **NFR3 — Tillgänglighet:** Brödtext ska ha minst WCAG AA-kontrast (4,5:1), och alla interaktiva element ska gå att nå med tangentbordet.
- **NFR4 — Säkerhet:** Appen skriver aldrig till AI-DLC-filer. Artefaktinnehåll behandlas som opålitlig data (se FR6.4 och FR10.1–FR10.2).
- **NFR5 — Plattform:** macOS är målplattformen i den här omgången.

## Begränsningar

- Electron med React och vanlig JavaScript (Q1: D) och electron-vite som bygg- och dev-verktyg.
- Terminalen byggs med xterm.js och node-pty (från beställningen).
- AI-DLC 2.11.x filformat enligt tabellen "Data sources" i feature-dokumentet.
- Arbetet görs på grenen `feat/epic01-bridge-console-mvp`.
- Feature-dokumentet ska uppdateras med varje storys status när den byggs, och med besluten Q2 och Q3 som ändrar US-0101 och US-0108.

## Antaganden

- Varje projektflik har egna terminalsessioner och en egen filbevakning (följer av Q2 och Q3).
- `claude` och `aidlc` finns installerade på användarens maskin. Appen installerar dem inte.
- Det räcker att återöppna senaste flikar vid start. Terminalsessioner återställs inte mellan körningar.
- Referensdata för fixtures hämtas från `~/Projects/visinv`. Fixtures innehåller ingen hemlig data, bara AI-DLC-filer.

## Utanför omfånget

- Skriva till AI-DLC-filer, till exempel godkänna gates via filer. Det görs bara via terminalen.
- Signering och notarisering (Q4).
- Windows- och Linux-byggen.
- Headless styrning via Claude Agent SDK.
- Fjärrprojekt och projekt som delas mellan flera användare.

## Öppna frågor

Inga.
