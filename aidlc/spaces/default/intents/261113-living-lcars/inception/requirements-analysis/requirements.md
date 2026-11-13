# Krav — EPIC-04 US-0402 Living LCARS och US-0403 LCARS-designlyft

Källor:
- `docs/features/epic-04-branding-and-desktop.md` (US-0402, US-0403)
- referensbilderna som användaren delade
- svaren i `requirements-analysis-questions.md` (Q1: B, med ändringarna gjorda och godkända, Q2–Q4: A)
- **den godkända mockupen**: https://claude.ai/artifact/Ugk4woaPui4R3278LagRnD. Källan är kopierad till `mockup/`:
  - `Main.dc.html` (projektvyn)
  - `Designsystem.dc.html` (tokens, element och rörelse)
  - `Konsol.dc.html` (Claude och Shell)
  - `Splash.dc.html`
- kodbaskunskapen i `aidlc/spaces/default/codekb/aidlc-dash/` (full skanning, med tokens, layoutprimitiver och tester som är kopplade till markup)

## Avsiktsanalys

Användaren vill att appen ska se ut som mockupen. Det innebär en mer återhållsam LCARS-stil:
- skiffer för strukturen, stålblått för det som är aktivt och korall för det som kräver användaren
- kapslade armbågsramar, block med etikett nere till höger, dataavläsningar och en prickindikator
- levande men behärskad rörelse

**Auctum-symbolen är "jätteviktig"** och ska vara framträdande. Designen omfattar hela appen [Q4: A]. Navigeringen flyttar in i vänsterarmen [Q2: A]. Animationerna är som standard Full [Q3: A]. Mockupen är facit. Avvikelser från den ska motiveras.

## Funktionella krav

### FR1 — Tokens och palett (US-0403)
- **FR1.1** `theme.css` ska få tokens på `:root` exakt enligt ritytan Designsystem:
  - bakgrund: `--bg #05060a`
  - skiffer: `--slate-1 #11151f`, `--slate-2 #2b3145`, `--slate-3 #4a5370`, `--slate-4 #6f7894`, `--slate-5 #9aa2bb`
  - stålblått: `--steel-deep #1f3b57`, `--steel #4fa3d9`, `--steel-text #7cc0ea`
  - korall: `--coral #ee6c56`, `--coral-soft #f2a389`
  - amber: `--amber #ff9e40`
  - text: `--text #e6e9f2`, `--text-2 #c3c9d8`, `--muted #9aa3b8`
  - text på ljusa block: `--on-light #000000`
- **FR1.2** Varje färg i `theme.css` och i komponenterna ska komma från tokens. Det gäller också de färger som i dag är hårdkodade:
  - xterm-temat i `TerminalPanel.jsx`
  - banners
  - `::backdrop`
  - keyframes
  - fönstrets `backgroundColor` i `src/main/index.js`, som sätts till `#05060a`
- **FR1.3** Färgreglerna:
  - stålblått används bara för aktivt eller pågående
  - korall bara för "väntar på dig", fel och misslyckade steg
  - amber bara för Auctum-märket, den primära åtgärden och markören
  - ljusa block har svart text och mörka block ljus text, och alla par klarar WCAG AA
- **FR1.4** Den gamla paletten (amber/orange/lavendel som struktur) tas bort.

### FR2 — Ramar och navigering (US-0403, Q2: A)
- **FR2.1** Den yttre ramen ska se ut som i Main:
  - en ambergul armbåge uppe till vänster med **Auctum-symbolen** (`AuctumMark`) och texten "Auctum / Aidlc control"
  - en segmenterad topbalk
  - en högerjusterad rubrik i stålblått: projekt • vy
  - en vänsterarm på 150 px
  - en nedre armbåge som ramar in terminalen
- **FR2.2** Vänsterarmen ersätter dagens projektflikar och växel. Den innehåller etikettblock:
  - **projekt:** de öppna projekten. Det aktiva är stålblått, och varje projekt har ett kugghjul för Projektinställningar och en stängknapp, båda nåbara med tangentbordet.
  - **"+ Öppna"**
  - **vyer:** Intents, Features (visas enligt EPIC-06-inställningen), Kostnad (öppnar kostnadspanelen) och Github (öppnar panelen för GitHub-uppdatering)
  - **Inställningar**
  - **längst ned:** ett block med Auctum-symbolen som vattenstämpel och antalet intents
- **FR2.3** Innehållet ligger i en inre kapslad ram med en armbåge och segmenterade balkar. Ramen byggs med en ny återanvändbar primitiv (CSS-klasser `lcars-frame`, `lcars-elbow`, `lcars-bar`/segment och `lcars-block`) i stället för radier spridda i koden.
- **FR2.4** Dekorativa element (hårfina linjer, segment och vattenstämplar) är `aria-hidden` och har aldrig `role="status"`.

### FR3 — Element (US-0403)
- **FR3.1** **Etikettblock** har texten i versaler nere till höger. Tillstånden är normal, aktiv (stålblå, med en flik på 6 px), kräver dig (korall med puls) och avstängd.
- **FR3.2** **Intent-listan** som i mockupen:
  - statusflik på 6 px och slug
  - kostnad i stålblått med tabellsiffror
  - meta (scope · status) och prickar för stegen
  - den aktiva intenten i `--steel-deep` med märket "Aktiv"
- **FR3.3** **Intent-detaljen** har:
  - en stor stålblå rubrik och chips för scope, depth, test och story-id
  - prickindikatorn "Steg n av m" och texten "Pågår · <stage>"
  - Fortsätt-knappen som ambergult block
  - flikar som etikettblock
- **FR3.4** **Pipelinen** har ett fasblock (`--slate-2`) per fas och stage-block med index · status uppe och namnet nere till höger:
  - Klar: `--slate-4`
  - Pågår: stålblå med andning, modell och kostnad
  - Väntar på godkännande: korall med puls
  - Misslyckades: korallram
  - Väntar: kontur
  - Ingår inte: streckad, och dold bakom "Visa"
- **FR3.5** **Dataavläsningar:** kostnadspanelen och högerkolumnen (Stages, Kostnad, Modell, Läge) använder tabellsiffror med fyrkantiga färgmarkörer.
- **FR3.6** **Konsolen** som i Konsol:
  - flikarna Claude och Shell som block i den nedre armen, med status (Ledig / Arbetar / Avslutad) på blocket
  - Claude andas när den arbetar
  - en segmenterad balk över terminalen
  - snabbkommandon som konturknappar
  - xterm-tema från tokens med amber markör
  - etiketten "Väntar på din Enter" (korall, pulserande) när appen har skrivit ett kommando som inte är skickat
- **FR3.7** **Splashen** som i Splash: stor Auctum-symbol i amber med långsam glöd, "Auctum / Aidlc control", och ramar som ritas ut på högst 600 ms. Testkontraktet behålls (`role="img"` med namnet "Auctum" och `is-leaving`).
- **FR3.8** **Övriga vyer** får samma stil med samma primitiver och tokens: Tidslinje, Units/Bolt-DAG, Kostnad, Filer/artefaktläsare, Features, RefreshPanel, uppsättningsskärmen och Projektinställningar-dialogen [Q4: A].
- **FR3.9** **Typografi:** Antonio, den lokalt bundlade kopian (CSP), i versaler för rubriker och etiketter. Tabellsiffror för tal. `ui-monospace` för terminalen.

### FR4 — Rörelse (US-0402, Q3: A)
- **FR4.1** Animationerna:
  - andning 2,4 s (pågående stage, aktiv prick, Claude arbetar)
  - korallpuls 1,6 s (väntar på dig)
  - ljussvep 400 ms (ny audit-händelse, ändrad kostnad)
  - övergångar 150–250 ms
  - uppstart högst 600 ms (ramarna ritas ut när ett projekt öppnas)
- **FR4.2** Inställningen "Animationer: Full / Dämpad / Av" finns i appens inställningar och sparas i `settings.json`. `sanitize()` ska tillåta nyckeln.
  - Standard är Full. Med `prefers-reduced-motion` är standard Dämpad.
  - Dämpad: statisk glöd, inga loopar och inget svep.
  - Av: inga animationer.
- **FR4.3** Bara `opacity`, `filter`/`box-shadow` och `transform` animeras. Tidslinjens rader animeras inte med `transform`, eftersom virtualiseringen redan använder det. Högst 3 blinkningar per sekund.
- **FR4.4** Markeringen av nya händelser i tidslinjen (`is-new`) använder ljussvepet i stället för dagens `flash`. Klassen behålls.

## Icke-funktionella krav

- **NFR1 — Tillgänglighet:** alla textpar klarar WCAG AA (kontrastvärdena finns i Designsystem). Ingen status visas bara med färg. Fokus syns med en amber `outline`. All navigering i armen fungerar med tangentbordet och har `aria-current`.
- **NFR2 — Prestanda:** animationerna håller 60 fps i projektvyn med en aktiv intent. Inga layoutanimationer.
- **NFR3 — Regression:** alla befintliga tester och `data-testid` behålls. Det gäller också de klasser som tester eller kod är beroende av: `.intent-slug`, `.event`, `.event-row`, `.event-fields`, `is-new`, `is-leaving` och ett enda `role="status"` där tester kräver det.
- **NFR4 — Inga Star Trek-tillgångar:** inga skepp, namn, logotyper eller ljud.

## Begränsningar

- CSP: inga externa fonter eller resurser. Antonio används lokalt.
- Inga nya beroenden.
- Delade klasser (`.detail-tab`, `.intent-row`, `.cost-panel-toggle`) byts mot de nya primitiverna på ett ställe i taget, och varje vy kontrolleras.

## Antaganden

- `[assumption]` Mockupens bredd (1440 px) är riktmärket. Layouten ska fungera från 1100 px, och sidofältet krymper först.

## Utanför omfånget

- Ljud.
- Nya funktioner. Det här är enbart utseende och rörelse, utöver att navigeringen flyttar till armen.

## Öppna frågor

None.
