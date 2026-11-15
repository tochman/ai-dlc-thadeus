# Krav — EPIC-03 Audit Timeline

Källor:
- `docs/features/epic-03-audit-timeline.md` (US-0301, US-0302)
- svaren i `requirements-analysis-questions.md` (Q1: A, Q2: A)
- kodbaskunskapen i `aidlc/spaces/default/codekb/aidlc-dash/`, med den fokuserade skanningen av `Timeline.jsx`, `parsers/audit.js`, `watcher.js`, `useProject.js` och `projectService.js`

## Avsiktsanalys

Riktiga intents har tusentals audit-händelser. a reference project's `epic02-finish` har till exempel 1 726. Användaren vill kunna bläddra i hela historiken utan att appen blir långsam eller döljer händelser. Användaren vill också se exakt vilka händelser som är nya när en körning pågår.

Skanningen visar fyra brister i dag:
- ett tak på 1 500 rader
- ingen virtualisering
- "nytt" bestäms av antal och numreras efter sortering, så fel rader markeras när en händelse med äldre tidsstämpel kommer från en annan dators fil
- `seq` används som React-nyckel och tidsstämplar sorteras som text

## Funktionella krav

### FR1 — Virtualiserad tidslinje (US-0301, Q1: A)
- **FR1.1** Taket på 1 500 rader i `Timeline.jsx` ska tas bort. Varje händelse som matchar filtren ska gå att nå.
- **FR1.2** Bara synliga rader plus en buffert ska renderas, med `@tanstack/react-virtual`. Versionen ska vara fastlåst och minst två veckor gammal, till exempel `3.14.24`. Det är det enda nya beroendet.
- **FR1.3** Utfällda rader med varierande höjd ska fungera. Radhöjden ska mätas efter att raden har fällts ut, så att listan inte hoppar.
- **FR1.4** Det ska finnas en knapp "Till senaste" och en knapp "Till stage-start". Stage-starten väljs ur pipelinens stages.
- **FR1.5** När nya händelser kommer ska scrollpositionen behållas. Undantaget är när användaren redan står vid den nyaste änden. Då följer listan med.
- **FR1.6** Tangentbordsnavigering ska fungera med virtualiseringen. Pil upp/ned flyttar fokus och scrollar raden i bild, och Enter fäller ut. Listan har `role="list"` eller motsvarande. Rader och antal ska ha etiketter för skärmläsare, till exempel "Händelse 120 av 1 726".
- **FR1.7** Filtrering, sortering och vändning ska beräknas med `useMemo` och bara när händelser eller filter ändras, inte vid varje rendering.

### FR2 — Stabil identitet och exakt markering av nytt (US-0302, Q2: A)
- **FR2.1** `parseAudit` ska ge varje händelse en stabil nyckel `<källfil>#<blockindex>`. Index räknas från 0 inom filen. Nyckeln används som React-nyckel i stället för `seq`.
- **FR2.2** Nya händelser avgörs genom att nycklarna före och efter en liveuppdatering jämförs. Det som inte fanns förut är nytt. Antalet används inte längre.
- **FR2.3** En ny händelse med äldre tidsstämpel från en annan dators fil ska markeras där den hamnar i listan. Inga andra rader får blinka.
- **FR2.4** När nya händelser kommer utanför det synliga området visas en räknare, "N nya händelser". Ett klick på räknaren scrollar till den första nya händelsen, och räknaren försvinner när händelserna har visats.
- **FR2.5** Markeringstimern ska rensas vid nya uppdateringar och när komponenten avmonteras. En ny uppdatering förlänger markeringen av de nya händelserna.

### FR3 — Korrekt kronologi
- **FR3.1** Händelser sorteras på tidsstämpel tolkad som datum (`Date.parse`), inte som text, så att blandade tidszoner sorteras rätt. Vid lika tid avgör källfilens namn och sedan blockindex, så att ordningen är stabil.
- **FR3.2** En händelse utan giltig tidsstämpel placeras efter sin föregångare i samma fil, inte först i listan.

## Icke-funktionella krav

- **NFR1 — Prestanda:** med 20 000 händelser ska tidslinjen rendera inom 200 ms efter en filterändring. Mätningen görs i en riktig Electron-renderer. Scrollningen ska vara jämn.
- **NFR2 — Tillgänglighet:** fokus ska gå att se, och tangentbordsnavigering och etiketter för skärmläsare ska fungera enligt FR1.6. Markering av nytt får inte förmedlas bara med färg. Den ska också ha texten eller etiketten "ny".
- **NFR3 — Robusthet:** befintliga tester och `data-testid` ska behållas. En trasig audit-fil ska fortsatt visa varning och de block som gick att läsa, som i EPIC-01.

## Begränsningar

- Electron 45, React 19 och plain JS. Det enda nya beroendet är `@tanstack/react-virtual`, med fastlåst version.
- jsdom gör ingen layout. Renderartester av den virtualiserade listan måste därför stubba mått, till exempel `getBoundingClientRect`/`offsetHeight`, eller använda virtualiserarens `initialRect`.

## Antaganden

- `[assumption]` Audit-filerna (`audit/*.md`) växer bara i slutet. Därför är `<fil>#<index>` stabil [Q2: A].

## Utanför omfånget

- Sökning i fritext i tidslinjen.
- Export av tidslinjen.

## Öppna frågor

None.
