# Krav — EPIC-02 Kostnad och modeller

Källor:
- `docs/features/epic-02-cost-and-models.md` (US-0201–US-0205)
- svaren i `requirements-analysis-questions.md` (Q1–Q4)
- kodbas-kunskapen i `aidlc/spaces/default/codekb/aidlc-dash/`:
  - `business-overview.md`: appen är skrivskyddad mot AI-DLC-filer
  - `architecture.md`: huvudprocessen äger all fil- och processåtkomst, och renderaren når den via `window.bridge`
  - `code-structure.md`: projektladdningen i `projectService.js`, filbevakningen i `watcher.js`, `useProject.js`, `IntentList.jsx` och `Pipeline.jsx`

## Avsiktsanalys

Användaren vill se vad AI-DLC-körningar kostar och vilken modell agenterna använder, direkt i appen. Kostnaden är en **uppskattning** som AI-DLC räknar fram från tokens gånger API-pris. Den är inte en faktura, och den får aldrig visas som en faktisk kostnad. Alla modeller är Claude-modeller som körs via Claude Code.

## Datakällor (verifierade mot `~/Projects/visinv`)

- `aidlc/.aidlc-sessions/usage-ledger.json` (`schemaVersion: 3`) innehåller `totals`, `byStage`, `byModel`, `byAgent` och `workflows`. Varje nod har `tokens` (`input`, `output`, `cacheCreate5m`, `cacheCreate1h`, `cacheRead`) och `usd`.
- Nycklarna i `workflows` är **`intent:<uuid>`**, där uuid är samma som `uuid` i `intents.json`. Körningar från före uuid-tiden ligger under `record:<space>/legacy`. Detta rättar antagandet `record:<space>/<dir>` i feature-dokumentet.
- `aidlc config models --show --json --harness claude` ger `data.effective[]` med `agent`, `model`, `effort` och `modelSource`. `inherit` betyder att agenten använder sessionens modell.
- Varje fil `.claude/agents/aidlc-*-agent.md` har ett frontmatter-fält `model:`.

## Funktionella krav

### FR1 — Kostnad per intent (US-0201)
- **FR1.1** Systemet ska läsa `usage-ledger.json` skrivskyddat via projektåtkomsten (`projectAccess`) och knyta `workflows["intent:<uuid>"]` till intents via `uuid` i `intents.json`.
- **FR1.2** Intent-listan ska visa uppskattad kostnad i USD med 2 decimaler per intent.
- **FR1.3** Detaljvyn ska visa totalen och tokens uppdelade på input, output, cache write (5m + 1h) och cache read.
- **FR1.4** En intent utan post i ledgern ska visa "–" med en förklaring, aldrig 0.
- **FR1.5** Saknas ledgern eller går den inte att läsa ska kostnadsvisningen döljas med en kort förklaring. Resten av appen påverkas inte.
- **FR1.6** Intent-listan ska kunna sorteras på kostnad, datum (standard) och namn.

### FR2 — Fördelning per stage, agent och modell (US-0202)
- **FR2.1** En ny flik "Kostnad" i detaljvyn ska visa intentens kostnad per stage (i pipeline-ordning), per agent och per modell.
- **FR2.2** Varje rad ska visa USD, andel av intentens total (%) och tokens. Största posten ska framhävas.
- **FR2.3** Varje stage-rad i pipelinen ska visa sin kostnad bredvid varaktigheten, när ledgern har den.
- **FR2.4** Värdena tas direkt från ledgern. Appen räknar inte ut några priser själv.

### FR3 — Projektets kostnadsöversikt (US-0203, Q4: B)
- **FR3.1** En hopfällbar panel överst i intent-listan ska visa projektets total (`totals.usd`) och fördelningen per modell och per agent.
- **FR3.2** Panelen ska visa kostnad per intent över tid som ett enkelt stapeldiagram, ordnat efter intentens datumprefix.
- **FR3.3** Panelen ska visa kostnad per scope, både total och snitt per intent.
- **FR3.4** Legacy-posten (`record:<space>/legacy`) ska räknas in i totalen och visas som en egen rad, "Äldre körningar (utan intent-id)".

### FR4 — Modeller per agent: konfigurerad och faktisk (US-0204, Q1: A)
- **FR4.1** Huvudprocessen ska köra `aidlc config models --show --json --harness claude` med fasta argument via `execFile` (inget skal), med projektroten som arbetskatalog, inloggningsskalets `PATH` och en timeout på 10 s. Resultatet cachas per projekt tills projektet laddas om.
- **FR4.2** Om kommandot saknas, får timeout eller ger ogiltig JSON ska appen i stället läsa `model:` ur `.claude/agents/aidlc-*-agent.md`. Källan ska visas ("aidlc config" eller "agentfiler").
- **FR4.3** `inherit` ska visas som "Sessionens modell". Där ledgern visar vilken modell huvudsessionen använde ska den modellen anges.
- **FR4.4** Faktiska modeller per agent hämtas ur ledgern: `byAgent` tillsammans med `byModel` per workflow och stage.
- **FR4.5** En agent som är konfigurerad för en modell men har kört på en annan ska markeras.
- **FR4.6** Modellerna ska visas per projekt (alla agenter, i kostnadspanelen) och per intent (bara agenter som deltog, i fliken Kostnad). Pipelinen ska visa modellen bredvid agenten per stage när ledgern har den.

### FR5 — Livekostnad (US-0205)
- **FR5.1** Filbevakningen ska också bevaka `aidlc/.aidlc-sessions/usage-ledger.json` och skicka en ändringssignal (debouncad som övriga) som laddar om kostnaden.
- **FR5.2** En intent som pågår ska visa löpande kostnad bredvid live-indikatorn.
- **FR5.3** En halvskriven ledger ska behålla senast giltiga värden.

### FR6 — Märkning av uppskattning (gäller alla kostnadsstorys, Q3: A)
- **FR6.1** Varje kostnadssiffra ska vara i USD och märkas "Uppskattad kostnad (API-pris)". En förklaring ska ange att siffran är beräknad från tokens och inte är en faktura.
- **FR6.2** En modell med tokens men `usd: 0` (pris saknas) ska visas som "pris saknas", inte 0 USD. Totaler som innehåller sådana modeller ska markeras som ofullständiga.
- **FR6.3** Tokens ska alltid visas bredvid USD.

## Icke-funktionella krav

- **NFR1 — Prestanda:** Ledgern i visinv (flera MB) ska tolkas på under 300 ms, och en ändring i ledgern ska synas i vyn inom 1 s.
- **NFR2 — Säkerhet:** Appen skriver inte till några nya filer. Det enda nya processanropet är `aidlc config models` med fasta argument, utan skal och utan användarstyrd indata. Ledgern läses bara via den rotbegränsade projektåtkomsten.
- **NFR3 — Robusthet:** Ett fel i ledgern eller i `aidlc`-kommandot får bara påverka kostnads- och modellvisningen.

## Begränsningar

- Express-scope, React med vanlig JavaScript och Vitest, enligt befintlig arkitektur (`architecture.md`).
- Inga nya beroenden. Stapeldiagrammet görs med enkel SVG eller CSS.
- Grenen `feat/epic02-cost-and-models`. Feature-dokumentet uppdateras med storyernas status och det rättade nyckelformatet.

## Antaganden

- `usage-ledger.json` ligger på `aidlc/.aidlc-sessions/usage-ledger.json` i projektroten och är git-ignorerad. Den finns alltså bara på maskinen som körde arbetet.
- `aidlc` finns i inloggningsskalets `PATH`, som för terminalflikarna.

## Utanför omfånget

- CSV-export (Q2: B), som skjuts till en senare omgång.
- Andra valutor än USD (Q3).
- Faktiska fakturakostnader från Anthropic eller prenumerationsdata.

## Öppna frågor

Inga.
