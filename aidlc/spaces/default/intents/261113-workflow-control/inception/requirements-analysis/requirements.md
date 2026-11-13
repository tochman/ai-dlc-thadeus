# Krav — EPIC-05 Workflow Control

Källor:
- `docs/features/epic-05-workflow-control.md` (US-0501, US-0502, US-0503)
- svaren i `requirements-analysis-questions.md` (Q1–Q4)
- kodbaskunskapen i `aidlc/spaces/default/codekb/aidlc-dash/`:
  - `business-overview.md`: appen är skrivskyddad mot AI-DLC-filer
  - `architecture.md`: huvudprocessen äger all fil- och processåtkomst, och renderaren når den via `window.bridge`
  - `code-structure.md`:
    - `TerminalPanel.jsx` (`insert`, bara för claude-fliken och utan Enter)
    - `pty.js`
    - `ipc.js` (en bevakning startas bara för AI-DLC-projekt)
    - `models.js` (mönstret `execFile` med fasta argument, timeout och PATH från inloggningsskalet)

## Avsiktsanalys

Användaren vill styra AI-DLC från konsolen utan att komma ihåg slash-kommandon. Det gäller tre saker:
- återuppta en intent som stannat
- hämta in AI-DLC-arbete som andra eller andra datorer har pushat till GitHub
- sätta upp AI-DLC i en mapp som saknar det

Grundprincipen från EPIC-01 gäller oförändrad: **appen skriver aldrig AI-DLC-filer och ändrar aldrig arbetsträdet själv.** Allt som ändrar något skrivs in i en synlig terminal. Själv kör appen bara läsande kommandon med fasta argument och utan skal.

## Funktionella krav

### FR1 — Terminalstyrning (gemensam grund för US-0501 och US-0503)
- **FR1.1** Renderaren ska kunna skriva text i claude- eller shell-fliken för ett projekt från andra vyer än terminalpanelen. Detta sker via ett gemensamt API, till exempel `terminal.type(projectId, tab, text, { submit })`. Med `submit: true` skickas Enter, och med `submit: false` lämnas texten för personen att bekräfta.
- **FR1.2** Varje flik ska ha en tillståndssignal `idle | busy | exited`. Fliken räknas som `idle` när pty:n inte har skrivit ut något på 1,5 s, `busy` när utskrift har kommit inom de senaste 1,5 s, och `exited` när processen har avslutats eller inte har startats [Q1: C].
- **FR1.3** Behöver ett kommando en flik som har status `exited`, ska fliken startas i projektroten först. Kommandot skrivs när fliken har nått `idle` första gången, eller efter högst 20 s med ett felmeddelande.
- **FR1.4** När ett kommando skrivs ska terminalpanelen visas och fliken få fokus.

### FR2 — "Fortsätt" för intents som pågår (US-0501, Q1: C)
- **FR2.1** En intent med status `in-flight` i `intents.json` ska visa knappen "Fortsätt" i intent-listan och i detaljvyn. En intent med status `complete` visar ingen knapp.
- **FR2.2** För den aktiva intenten (`active-intent`) ska knappen skriva `/aidlc` i claude-fliken **utan Enter**. Personen bekräftar.
- **FR2.3** För en intent som inte är aktiv ska knappen först skicka `/aidlc intent <dirName>` **med Enter**. När fliken har gått från `busy` tillbaka till `idle`, alltså när kommandot är klart, skrivs `/aidlc` **utan Enter**.
- **FR2.4** Är claude-fliken `busy` ska ingenting skrivas. Appen visar då "Claude arbetar — vänta eller avbryt först".
- **FR2.5** Knappen ska visa var arbetet tar vid, till exempel "Fortsätt vid Code Generation (steg 3 av 7)". Uppgifterna läses ur intentens pipelinedata, som redan finns i appen.
- **FR2.6** Knappen ska vara tillgänglig med tangentbordet (`data-testid="intent-resume"`), och statustexten får inte vara beroende av färg.

### FR3 — Uppdatera från GitHub (US-0502, Q2: C, Q3: C, Q4: A)
- **FR3.1** Huvudprocessen ska bara köra läsande git-kommandon med `execFile`, fasta argument, ingen shell, timeout och PATH från inloggningsskalet. Tillåtna kommandon är `git fetch`, `git rev-parse`, `git rev-list`, `git log`, `git diff --name-only`, `git status --porcelain` och `git show`.
- **FR3.2** `git fetch` körs **bara när personen trycker "Uppdatera"** i projektvyn [Q3: C]. Det sker ingen automatisk hämtning.
- **FR3.3** Efter en hämtning ska appen visa hur många commits på upstream (eller på `origin/main` när det inte finns någon upstream) som berör `aidlc/` och som inte finns lokalt. Den visar också hur många ändrade filer utanför `aidlc/` som kommer in, på en rad [Q4: A].
- **FR3.4** Vyn "Visa" ska lista vad som är nytt under `aidlc/` på fjärren:
  - nya intents, ur fjärrens `intents.json` via `git show`
  - ändrade stages och artefakter
  - antal nya audit-händelser

  Intents som bara finns på fjärren visas i intent-listan märkta "på GitHub" och kan öppnas skrivskyddat ur git-objekten.
- **FR3.5** Före en hämtning ska den lokala statusen visas:
  - aktuell gren
  - antal commits efter och före fjärren
  - ändringar som inte är committade, uppdelade på `aidlc/` och övrigt
  - om ett AI-DLC-arbete pågår, det vill säga claude-fliken är `busy` eller `active-directive.json` har ändrats under de senaste 5 minuterna
- **FR3.6** "Hämta in" ska fråga hur ändringarna tas in [Q2: C]. Valen är **Rebase** (`git pull --rebase --autostash`) och **Merge** (`git pull --no-rebase --autostash`), med en mening om vad vart och ett innebär. På en annan gren än `main` finns också "Uppdatera från main", med samma två val mot `origin/main`. Det valda kommandot skrivs i shell-fliken **utan Enter**.
- **FR3.7** Medan ett AI-DLC-arbete pågår (FR3.5) ska "Hämta in" och "Uppdatera från main" vara avstängda, med texten "Vänta tills AI-DLC-steget är klart eller parkera arbetet först".
- **FR3.8** När git rapporterar konflikter ska de konfliktande filerna listas, efter `git diff --name-only --diff-filter=U`. För `intents.json` och `aidlc-state.md` visas en kort vägledning, och avbrytkommandot (`git rebase --abort` eller `git merge --abort`) föreslås. Appen löser aldrig konflikter själv och kastar aldrig något.
- **FR3.9** Uppdateringar av själva AI-DLC-ramverket (`.claude/`) ingår inte. De blir en egen story (US-0504) [Q4: A].

### FR4 — Initiera AI-DLC (US-0503)
- **FR4.1** Skärmen "inte ett AI-DLC-projekt" ska visa "Initiera AI-DLC". Ingenting ändras i mappen förrän personen väljer att fortsätta.
- **FR4.2** Innan något görs visas förutsättningarna:
  - `aidlc --version` (läsande)
  - om mappen är ett git-repo (`git rev-parse --is-inside-work-tree`)
  - om det finns andra harnesses (`.kiro/`, `.codex/`, `.cursor/`, `.aidlc/`)

  Saknas `aidlc` visas en länk till installationsanvisningen, och processen stannar där. Saknas git erbjuds `git init -b main` som ett första kommando.
- **FR4.3** En förhandsvisning hämtas med `aidlc config --harness claude --dry-run`. Om det rapporteras konflikter med befintliga filer listas de, och "Initiera" är avstängt.
- **FR4.4** "Initiera" skriver kommandona i shell-fliken **utan Enter**: `git init -b main &&` när det behövs, och sedan `aidlc config --harness claude --yes`.
- **FR4.5** Avancerade inställningar ska ligga i en hopfälld sektion:
  - plugins, ur `aidlc config project --show --json`, valda med kryssrutor
  - modellnivå, `thorough`, `balanced` eller `minimal`

  Standard är AI-DLC:s egna standardinställningar. Varje val läggs till som ett eget kommando efter grundkommandot, sammanfogat med `&&`, så att personen ser hela kedjan innan Enter trycks.
- **FR4.6** Projektet ska upptäckas igen när `aidlc/spaces/` dyker upp. Samma flik växlar då till den vanliga projektvyn och startar filbevakningen. Det kräver att en enkel bevakning körs även för mappar som inte är AI-DLC-projekt.
- **FR4.7** Efter uppsättningen ska claude-fliken startas om, med meddelandet "Claude startas om så att AI-DLC laddas". Sedan erbjuds "Kör /aidlc --doctor" och "Starta första arbetet". Båda skriver i claude-fliken utan Enter, och "Starta första arbetet" skriver `/aidlc `.
- **FR4.8** Om uppsättningen misslyckas ligger terminalens utskrift kvar, och appen föreslår `aidlc doctor`. Inget rullas tillbaka eller tas bort.

## Icke-funktionella krav

- **NFR1 — Säkerhet:** varje kommando som appens egen process kör har fasta argument (inga argument som användaren skrivit) och körs utan shell, med timeout 10 s (`git fetch` 30 s). Allt som ändrar arbetsträdet eller AI-DLC-filer skrivs i en synlig terminal. Inga nya skrivanrop läggs till i `projectAccess`.
- **NFR2 — Robusthet:** saknar ett projekt git eller fjärr, eller misslyckas ett kommando, visas felet i den aktuella vyn med en mening. Resten av appen fortsätter fungera, och den gemensamma felbannern används inte.
- **NFR3 — Respons:** tillståndet `idle`/`busy` ska uppdateras inom 2 s efter att utskriften har ändrats. Statusraden för lokal git-status ska vara klar inom 1 s i ett repo i visinvs storlek.

## Begränsningar

- Electron 45, React 19 och plain JS. Inga nya beroenden. `child_process.execFile` och den befintliga PATH-sonden i `models.js` återanvänds.
- Testerna i Vitest använder injicerad `exec` och fejkade pty-flöden. Ingen riktig git-fjärr behövs i testerna.

## Antaganden

- `[assumption]` Claude Code skriver kontinuerligt till terminalen medan den arbetar, så att 1,5 s tystnad betyder att den väntar på inmatning. Därför skickas bara bytet av intent automatiskt, och `/aidlc` bekräftas av personen [Q1: C].
- `[assumption]` `aidlc config --harness claude --dry-run` finns och sammanfattar vad som skapas och vilka konflikter som finns. Om formatet skiljer sig visas utskriften rått.

## Utanför omfånget

- Uppdateringar av AI-DLC-ramverket (`.claude/`, en ny `aidlc`-version). Detta blir US-0504.
- Automatisk hämtning i bakgrunden [Q3: C].
- EPIC-06 Feature Docs.

## Öppna frågor

None.
