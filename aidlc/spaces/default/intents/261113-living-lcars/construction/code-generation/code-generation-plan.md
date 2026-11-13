# Kodgenereringsplan — EPIC-04 US-0402 Living LCARS och US-0403 LCARS-designlyft

Underlag:
- `inception/requirements-analysis/requirements.md` (FR1–FR4, NFR1–NFR4)
- **den godkända mockupen** i `inception/requirements-analysis/mockup/` (`Main.dc.html`, `Designsystem.dc.html`, `Konsol.dc.html`, `Splash.dc.html`). Mockupen är facit för mått, färger, typografi och struktur.
- kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/`

Express och Minimal, inga enheter och inga nya beroenden. Antonio används från den lokala bundlingen (CSP). Varje befintlig `data-testid`, och varje klass som tester eller kod är beroende av, ska finnas kvar: `.intent-slug`, `.event`, `.event-row`, `.event-fields`, `is-new`, `is-leaving`, `role="img"` "Auctum" i splashen och de `role="status"` som tester räknar.

## Steg

- [x] **Steg 1 — Tokens och LCARS-primitiver** (FR1.1, FR1.4, FR2.3, FR2.4, FR3.9)
  - I `src/renderer/theme.css` ersätts tokens på `:root` med exakt mockupens: `--bg`, `--slate-1..5`, `--steel-deep`, `--steel`, `--steel-text`, `--coral`, `--coral-soft`, `--amber`, `--text`, `--text-2`, `--muted` och `--on-light`. Den gamla paletten tas bort (amber/orange/lavendel som struktur, blå, röd och grön), och varje användning mappas om enligt färgreglerna i FR1.3.
  - Nya primitiver med mått från mockupen:
    - **`.lcars-elbow`** med varianterna `--top`, `--bottom` och `--inner`. Ytterradien är 40–44 px. Armen är 150 px, balken 18 px och den inre ramen 14 px. Den inre radien följer av border-tekniken.
    - **`.lcars-bar` med `.lcars-seg`:** segment med 6 px mellanrum.
    - **`.lcars-block`:** etiketten ligger nere till höger, i versaler. Modifierarna är `--active` (stålblå), `--attn` (korall), `--light` (`--slate-4/5` med `--on-light`), `--dark` (`--slate-3` med ljus text) och `--disabled`.
    - **`.lcars-tab`:** statusflik på 6 px.
    - **`.lcars-chip`:** kontur.
    - **`.lcars-readout`:** rutnät med tabellsiffror och en fyrkantig markör.
    - **`.lcars-dots`:** prickar med tillstånden `done`, `current`, `attn`, `todo` och `skip`.
    - **`.lcars-hairlines`:** grupper av hårfina linjer, alltid `aria-hidden`.
  - Fokus visas med en amber `outline` på 2 px.

- [x] **Steg 2 — Inga hårdkodade färger** (FR1.2)
  - Ny fil `src/renderer/tokens.js` med paletten som JS-konstanter, för de ställen som inte kan läsa CSS-variabler. Den används av xterm-temat i `TerminalPanel.jsx`: bakgrund `--bg`, text `--text-2`, markör `--amber` och markering `--steel-deep`.
  - `src/main/index.js`: fönstrets `backgroundColor` blir `#05060a`.
  - Banners, `::backdrop` och keyframes i `theme.css` använder tokens.
  - Nytt test `tests/main/theme.test.js`: utanför `:root`-blocket i `theme.css` får det inte finnas några hex- eller `rgb(`-literaler. Undantaget är `rgba(` som bygger på tokenvärden i keyframes, som listas uttryckligen.

- [x] **Steg 3 — Rörelse och inställningen Animationer** (FR4.1–FR4.4, NFR2)
  - I `theme.css` läggs keyframes till: `lcars-breathe` (2,4 s), `lcars-attn` (1,6 s), `lcars-sweep` (400 ms), `lcars-draw` (uppstart, högst 600 ms) och `lcars-dot`. Övergångarna är 150–250 ms. Bara `opacity`, `filter`, `box-shadow` och `transform` animeras, och tidslinjens rader aldrig med `transform`.
  - Läget styrs av `html[data-motion="full|reduced|off"]`:
    - `reduced` ger statisk glöd, inga loopar och inget svep
    - `off` stänger av alla animationer och övergångar
    - den befintliga regeln för `prefers-reduced-motion` ersätts av standardvalet nedan
  - `src/main/settings.js`: `sanitize()` godtar `animations: 'full'|'reduced'|'off'`. Ett ogiltigt värde utelämnas, så att standard gäller.
  - `src/renderer/App.jsx` sätter `data-motion`. När inställningen saknas används `reduced` om `matchMedia('(prefers-reduced-motion: reduce)')` matchar, annars `full`.
  - Ny fil `src/renderer/AppSettingsDialog.jsx` (`<dialog>` med `showModal`). Den har radiogruppen "Animationer: Full / Dämpad / Av" (`data-testid="app-settings-animations-<v>"`) och sparar med `setSettings`. Den öppnas från blocket Inställningar i armen.
  - `Timeline.jsx` och `theme.css`: `.event.is-new` använder ljussvepet (en `background`-gradient med `background-position`) i stället för `flash`. Klassen behålls.

- [x] **Steg 4 — Appens skal: yttre ram och navigering i armen** (FR2.1, FR2.2, NFR1)
  - `src/renderer/App.jsx` byggs om till mockupens Main:
    - **Header:** en ambergul armbåge (`lcars-elbow--top`, amber) med `AuctumMark` (46 px) och texten "Auctum / Aidlc control", en segmenterad topbalk och rubriken "<PROJEKT> • <VY>" i stålblått, högerjusterad.
    - **Vänsterarm** (150 px, `<nav aria-label="Projekt och vyer">`):
      - **projektblock:** aktivt stålblått med `aria-current`. Varje projekt behåller kugghjulet `project-settings-open` och sin stängknapp.
      - **"+ Öppna"**
      - **vyblock:** Intents och Features (Features syns enligt EPIC-06-regeln), med `aria-current="page"` och flik på det valda
      - **Kostnad:** fäller ut kostnadspanelen
      - **Github:** fäller ut RefreshPanel
      - **Inställningar:** öppnar AppSettingsDialog
      - **ett block längst ned** med `AuctumMark` som vattenstämpel (`aria-hidden`) och "N intents"
    - **Test-id:n behålls:** `project-tabs` på nav och `project-view-switch-intents`/`-features` på vyblocken. Den gamla vyväxeln och projektflikarna tas bort.
  - `src/renderer/ProjectView.jsx`:
    - vyvalet styrs nu från armen, och tillståndet för vald vy lyfts till `App`
    - sidofältet (360 px) och innehållet ligger i den inre ramen (`lcars-frame` med segmenterad topp)
    - layouten fungerar från 1100 px, och sidofältet krymper först

- [x] **Steg 5 — Sidofältet: kostnadsavläsning och intent-lista** (FR3.2, FR3.5)
  - **`CostPanel.jsx`:**
    - rubriken "Kostnad", en hårfin linje och märkningen "Uppskattad · API-pris"
    - totalen i stor storlek med tokens bredvid
    - en avläsning med fyrkantiga markörer per modell och agent
    - de befintliga tabellerna i utfällt läge behålls (`closest('tr')` i testet)
  - **`IntentList.jsx`:**
    - rader med statusflik (`lcars-tab`), slug (`.intent-slug` behålls), kostnad i `--steel-text` och tabellsiffror
    - meta "scope · status" och små stegprickar med "n/m"
    - den aktiva raden i `--steel-deep` med märket "Aktiv"
    - Fortsätt-knappen (`intent-resume`) finns kvar

- [x] **Steg 6 — Intent-detaljen och pipelinen** (FR3.3, FR3.4, FR3.5)
  - **`IntentDetail.jsx`:**
    - stålblå rubrik (48 px) och chips för scope, depth, test och story-id
    - `lcars-dots` med "Steg n av m" och "Pågår · <stage>"
    - flikar som `lcars-block` (`role="tab"`, test-id:n behålls)
    - en högerkolumn med avläsningar (Stages, Kostnad, Modell, Läge med andande prick när det är live)
  - **`ResumeButton.jsx`:** Fortsätt blir ett ambergult block i två delar med rundad vänsterkant, som i mockupen.
  - **`Pipeline.jsx`:** en rad per fas, med ett fasblock och ett rutnät av stage-block.
    - **Stage-blocket:** uppe står "NN · Status", nere till höger namnet.
    - **Tillstånd:** klar, pågår (andning, modell och kostnad), väntar på godkännande (korallpuls), misslyckades (korallram), väntar (kontur) och ingår inte (streckad).
    - **Stages som inte ingår** göms bakom raden "<fas> · N stages ingår inte" med knappen "Visa".

- [x] **Steg 7 — Konsolen** (FR3.6)
  - **`TerminalPanel.jsx`:**
    - flikarna Claude och Shell blir block i den nedre armen (`lcars-elbow--bottom`), med status på blocket ("Ledig", "Arbetar" eller "Avslutad", `terminal-panel-state-*` behålls)
    - Claude-blocket andas när den arbetar
    - en segmenterad balk över och under terminalen
    - snabbkommandon som konturknappar
    - xterm-temat kommer från `tokens.js`
  - **`TerminalContext.jsx`:** `type(tab, text, { submit: false })` markerar fliken som `pendingEnter` tills personen skriver i fliken, eller tills data med `\r` skickas.
  - När `pendingEnter` är satt visar fliken etiketten "Väntar på din Enter" (`data-testid="terminal-panel-pending-<tab>"`, korall, pulserande).

- [x] **Steg 8 — Övriga vyer och splashen** (FR3.7, FR3.8)
  - Samma primitiver och tokens används i:
    - `Timeline.jsx`: filter som block och chips, rader i `--slate-1`, nya händelser med svep
    - `BoltDag.jsx`: noder som block med statusfärger enligt reglerna
    - `CostTab.jsx`: avläsningar
    - `ArtifactReader.jsx`: filträd och markdown
    - `FeaturesView.jsx`: epics och storys som block och rader, statusmarkörer med text
    - `RefreshPanel.jsx`, `SetupAidlc.jsx`, `ProjectSettingsDialog.jsx` och `AppSettingsDialog.jsx`
  - **`Splash.jsx`** som mockupens Splash:
    - `AuctumMark` i amber (cirka 300 px) med glöd och "Auctum / Aidlc control"
    - ramar och balkar som ritas ut på högst 600 ms
    - `role="img"`, "Auctum" och `is-leaving` behålls

- [x] **Steg 9 — Tester** (NFR3)
  - `tests/main/theme.test.js` (1): inga färglitteraler utanför `:root` (Steg 2).
  - `tests/main/settings.test.js` (+1): `animations` godtas och ett ogiltigt värde utelämnas.
  - `tests/renderer/AppShell.test.jsx` (3):
    - armen visar projekt och vyer med `aria-current`, och kugghjulet och stängknappen finns
    - `data-motion` sätts från inställningen, och `reduced` när `prefers-reduced-motion` matchar och inställningen saknas
    - Auctum-symbolen finns i headern (`role="img"` med namnet "Auctum")
  - `tests/renderer/TerminalPanel.test.jsx` (1): `type(..., { submit: false })` visar "Väntar på din Enter", och etiketten försvinner när personen skriver.
  - Alla befintliga tester ska passera utan ändrade förväntningar. Det är tillåtet att uppdatera ett test som letar upp ett element på ett sätt som designen medvetet ändrar, till exempel vyväxeln som nu ligger i armen, men varje sådan ändring motiveras i sammanfattningen.
  - Kör hela sviten med `npx vitest run tests/`.

- [x] **Steg 10 — Bygge och dokument**
  - `npx electron-vite build` ska gå igenom.
  - `docs/features/epic-04-branding-and-desktop.md`: US-0402 och US-0403 får status 🚧 Built, not released. Byggda kriterier bockas av, och mockupens länk antecknas.
  - `docs/FEATURES.md`: raden för EPIC-04 uppdateras.

- [x] **Steg 11 — Rättelse F-01: layout i låga fönster** (Loop-back 1. Användaren valde "Retry with fix". Gäller FR3.3, FR3.4 och FR3.6)
  - `src/renderer/theme.css` och `TerminalPanel.jsx`: konsolens standardhöjd blir `clamp(180px, 28vh, 320px)`. När personen drar i höjden gäller den valda höjden. Den högsta tillåtna höjden är också relativ till fönstret.
  - `IntentDetail.jsx`: beskrivningen begränsas till 2 rader (`-webkit-line-clamp: 2`). Knappen "Visa mer" / "Visa mindre" (`data-testid="intent-detail-description-toggle"`, `aria-expanded`) visas bara när texten är längre än två rader.
  - `theme.css`: `@media (max-height: 900px)` ger rubriken 36 px, Fortsätt-blocket 44 px och tätare avstånd i intent-detaljen, så att flikarna och pipelinens första rader syns vid 1100 × 800.
  - Ett test i `tests/renderer/IntentDetail.test.jsx` (ny fil, eller ett befintligt renderartest som utökas): knappen "Visa mer" växlar `aria-expanded`.
  - Kör `npx vitest run tests/` och `npx electron-vite build`. Kontrollera sedan med `tests/.tmp/shots/bt.cjs` att pipelinen syns vid 1100 × 800.

## Spårbarhet

| Krav | Steg |
|------|------|
| FR1.1–FR1.4 | 1, 2 |
| FR2.1–FR2.4 | 1, 4 |
| FR3.1–FR3.5 | 1, 5, 6 |
| FR3.6 | 7 |
| FR3.7, FR3.8 | 8 |
| FR3.9 | 1 |
| FR4.1–FR4.4 | 3 |
| NFR1 | 1, 4 |
| NFR2 | 3 |
| NFR3 | 9 |
| NFR4 | alla |
## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:c8f84e35190e007d9863fad236154d0269ab9bf633fc2a3ff106ed965ba4a9b9",
  "contract_sha256": "sha256:bb76c1b22f8307be6e5780d50cabab891684449d5b164bd0e825e9e4e5c61e5b"
}
```
