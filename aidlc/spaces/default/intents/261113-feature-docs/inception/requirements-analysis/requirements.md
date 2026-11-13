# Krav — EPIC-06 Feature Docs

Källor:
- `docs/features/epic-06-feature-docs.md` (US-0601, US-0602, formatbeskrivningen)
- svaren i `requirements-analysis-questions.md` (Q1: A, Q2: A, Q3: A)
- kodbaskunskapen i `aidlc/spaces/default/codekb/aidlc-dash/`, där den fokuserade skanningen omfattar `ProjectView.jsx`, `SetupAidlc.jsx`, `ArtifactReader.jsx`, `App.jsx`, `settings.js`, `setup.js`, `ipc.js`, `projectAccess.js` och preload

## Avsiktsanalys

Användaren beskriver gärna sina produkter i feature-dokument: en översikt `docs/FEATURES.md` och en fil per epic med user stories. Formatet är inte en del av AI-DLC men passar ihop med det. Användaren vill två saker:
- **Bläddra i appen:** finns feature-dokumenten i ett projekt ska de gå att bläddra i, oavsett hur de kom till.
- **Erbjudande vid uppsättning:** när AI-DLC sätts upp ska appen erbjuda att skapa dokumenten.

Appen skriver fortfarande inga filer i projektet. Allt som skapas, skapas av Claude i den synliga terminalen.

## Funktionella krav

### FR1 — Läsa och tolka feature-dokument (US-0602)
- **FR1.1** Huvudprocessen ska läsa översikten, som standard `docs/FEATURES.md`, via den rotbegränsade `projectAccess`. Den ska också läsa de epic-filer som översiktens tabell länkar till, med sökvägar relativa till översikten. En länk som pekar utanför projektroten ignoreras med en varning.
- **FR1.2** En ren tolkningsfunktion ska ur översiktens tabell ta fram epics med id, länk, ämne och status.
- **FR1.3** Ur varje epic-fil ska tolkningsfunktionen ta fram:
  - beskrivning, `**Stories:**` och `**Status (…):**`
  - storys från rubrikerna `**US-XXYY: Titel** <status>`, med id, titel, statusmarkör (📋, 🚧 eller ✅) och den som/för att/vill-text som finns
  - prioritet, komplexitet, beroenden och anteckningar
  - acceptanskriterier som en lista med `checked` och text, samt antal klara av totalt
- **FR1.4** Tolkningen ska tåla filer som inte följer formatet exakt. Det som går att läsa visas, och för resten faller vyn tillbaka på att visa filen som Markdown. Den ska aldrig krascha eller visa en tom vy.

### FR2 — Features-vyn (US-0602, Q1: A, Q3: A)
- **FR2.1** Projektvyn ska få en växel högst upp, "Intents | Features" (`data-testid="project-view-switch"`). Features ersätter sidofältet och innehållsytan, och terminalen ligger kvar. I ett projekt utan AI-DLC heter växeln "Uppsättning | Features" och visas när feature-dokument finns [Q3: A].
- **FR2.2** Vyn ska lista epics med ämne och status, och för varje epic visa hur många storys som är klara av totalt.
- **FR2.3** När en epic öppnas visas dess beskrivning och storys, med id, titel, status, prioritet, komplexitet och kriterier i formen "5/8 kriterier".
- **FR2.4** När en story öppnas visas hela texten, med acceptanskriterier som skrivskyddade kryssrutor, anteckningar och beroenden. Texten renderas med den befintliga Markdown-renderingen (`FileContent`). Knapparna "Öppna i editor" och "Visa i Finder" finns för epic-filen.
- **FR2.5** Storys ska gå att filtrera på status (Planerad, Pågår eller Klar) och på prioritet.
- **FR2.6** Ett story-id, till exempel `US-0201`, som nämns i en intents beskrivning (`project-description.json`) eller i `inception/requirements-analysis/requirements.md` ska ge en länk från storyn till intenten. Intentens detaljvy visar på samma sätt länkar tillbaka till storyn.
- **FR2.7** Vyn ska uppdateras live när feature-dokumenten ändras, inom cirka 1 s.

### FR3 — Inställningen "Feature-beskrivningar" (US-0602, Q2: A)
- **FR3.1** En kugghjulsknapp på projektfliken (`data-testid="project-settings-open"`) öppnar dialogen "Projektinställningar".
- **FR3.2** Dialogen har ett val för Feature-beskrivningar:
  - **Automatiskt** (standard): visas när översikten finns.
  - **Visa**: visas alltid, och utan dokument förklaras formatet och uppsättning erbjuds.
  - **Dölj**: visas aldrig.
- **FR3.3** Dialogen har en sökväg till översikten, som standard `docs/FEATURES.md`. Sökvägen valideras: den ska vara relativ, sluta på `.md` och ligga inom projektroten.
- **FR3.4** Inställningen sparas per projekt, nycklad på projektroten, i appens egen `settings.json` (nyckeln `projectSettings`). Den skrivs aldrig i projektet.
- **FR3.5** Skrivningar till `settings.json` ska ske i tur och ordning, med en kö i huvudprocessen, så att två samtidiga ändringar inte tappar varandra.
- **FR3.6** Med Automatiskt och utan dokument visas ingen växel. Kugghjulsdialogen erbjuder då "Sätt upp feature-beskrivningar".

### FR4 — Erbjudande vid uppsättning (US-0601)
- **FR4.1** Uppsättningsdialogen (`SetupAidlc`) ska få valet "Använd separata feature-beskrivningar (FEATURES.md + en fil per epic)". Valet är avstängt som standard och har en kort förklaring.
- **FR4.2** Finns redan en översikt visar dialogen "Feature-beskrivningar finns redan". Valet lägger då bara till projektregeln.
- **FR4.3** Valet ska överleva bytet till projektvyn. Det lyfts till `ProjectContent`, så att det finns kvar när `SetupDone` visas.
- **FR4.4** När valet är påslaget visas efter uppsättningen knappen "Skapa feature-beskrivningar" i `SetupDone`. Den skriver en förfrågan i claude-fliken utan Enter. Förfrågan ber Claude att:
  - skapa `docs/FEATURES.md` och `docs/features/epic-XX-*.md` i formatet ovan, utifrån det projektet redan innehåller, om de inte finns
  - lägga till en projektregel genom AI-DLC:s eget sätt att spara regler: nytt arbete beskrivs som storys i rätt epic-fil, och status och acceptanskriterier uppdateras när arbetet byggs och släpps
- **FR4.5** Samma knapp, "Sätt upp feature-beskrivningar", finns i kugghjulsdialogen för AI-DLC-projekt som saknar dokument (FR3.6). Den finns också i Features-vyn när inställningen är Visa och dokument saknas.
- **FR4.6** Appen skriver inga filer själv.

## Icke-funktionella krav

- **NFR1 — Prestanda:** en översikt med 10 epics och 100 storys ska tolkas och visas inom 300 ms.
- **NFR2 — Säkerhet:** all läsning går genom `projectAccess` (realpath inom roten). Sökvägar från inställningen och från länkar valideras. Inga skrivanrop läggs till i projektet. Text från dokumenten renderas som Markdown utan rå HTML, som i dag.
- **NFR3 — Tillgänglighet:** växeln och dialogen fungerar med tangentbordet. Dialogen har fokusfälla och kan stängas med Esc. Status visas med både markör och text, inte bara färg.

## Begränsningar

- Electron 45, React 19 och plain JS. Inga nya beroenden. `react-markdown` och `remark-gfm` finns redan.
- En ny lätt bevakning av översikten och epic-mappen (chokidar finns redan) med en push-kanal `features:changed`.

## Antaganden

- `[assumption]` Epic-filerna länkas från översiktens tabell, som i det här projektet. Filer i `docs/features/` som inte länkas visas inte.

## Utanför omfånget

- Redigering eller avbockning av kriterier från appen (vyn är skrivskyddad).
- Att skapa en enskild story från appen.

## Öppna frågor

None.
