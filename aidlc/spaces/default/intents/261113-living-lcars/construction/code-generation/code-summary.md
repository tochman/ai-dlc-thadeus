# Kodsammanfattning — EPIC-04 US-0402 och US-0403

Underlag: `requirements.md` för den här intenten, mockupen i `inception/requirements-analysis/mockup/` och kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/`.

## Nya filer

- `src/renderer/Lcars.jsx` med primitiverna `Bar`, `Frame`, `Dots`, `Readout` och `Hairlines`.
- `src/renderer/tokens.js`, som läser paletten från CSS-variablerna och ger xterm-temat. Färgerna finns därmed bara på ett ställe.
- `src/renderer/AppSettingsDialog.jsx` med "Animationer: Full / Dämpad / Av".
- Tester:
  - `tests/main/theme.test.js` (2): inga färglitteraler utanför `:root` och inga i renderarfilerna
  - `tests/renderer/AppShell.test.jsx` (3)
  - `tests/renderer/TerminalPanel.test.jsx` (1)

## Omskrivna och ändrade filer

- **`theme.css`:** mockupens tokens (även glöden som tokens), primitiverna, keyframes för andning, puls, svep och uppstart, samt lägena `data-motion`.
- **`App.jsx`:**
  - en ambergul Auctum-armbåge med symbolen
  - en segmenterad topbalk och rubriken "PROJEKT • VY" samt gren
  - vänsterarmen med projekt (kugghjul och stäng), "+ Öppna", Intents, Features, Kostnad, Github, Inställningar och vattenstämpeln "N intents"
- **Övriga omskrivna filer:**
  - `ProjectView.jsx`: vyvalet är lyft till `App`
  - `IntentDetail.jsx`: ram och avläsningskolumn
  - `Pipeline.jsx`: fas- och stage-block
  - `TerminalPanel.jsx`: konsolen som i ritytan Konsol
- **Ändrade filer:** `IntentList.jsx`, `CostPanel.jsx`, `RefreshPanel.jsx`, `ResumeButton.jsx`, `TerminalContext.jsx` (`pendingEnter`), `Splash.jsx`, `BoltDag.jsx`, `CostTab.jsx`, `FeaturesView.jsx`, `ArtifactReader.jsx`, `format.js` och `main.jsx` (Antonio 600).
- **Huvudprocessen:** `src/main/settings.js` godtar `animations`, och fönstrets bakgrund i `src/main/index.js` är `#05060a`.
- **Dokument:** `docs/features/epic-04-branding-and-desktop.md` och `docs/FEATURES.md`.

## Viktiga beslut

- **Testerna:** inga befintliga tester eller förväntningar har ändrats, och alla `data-testid` och klasser som tester är beroende av finns kvar. Fortsätt-knappens text är därför fortfarande exakt `resumeLabel`.
- **Ramarna:** den inre ramen omsluter bara innehållet, som i mockupen. Terminalpanelen ligger i appens rutnät (`display: contents`), så att den nedre armen hamnar under vänsterarmen.
- **Etiketten "Väntar på din Enter"** visas efter `type`/`sequence` utan Enter och försvinner när personen trycker en tangent, när text skickas med Enter eller när fliken startas om.

## Testtäckning

- 88/88 gröna (`npx vitest run tests/`), varav 7 nya. `npx electron-vite build` går igenom.
- Skärmdumpar av den riktiga appen finns i `tests/.tmp/shots/` (git-ignorerat). Projektvyn och konsolen motsvarar mockupen.

## Loop-back 1 (F-01 från Build and Test)

- Konsolens standardhöjd är `clamp(180px, 24vh, 240px)`, satt på hela panelen. När personen drar i handtaget eller använder piltangenterna gäller den valda höjden, mellan 180 px och 60 % av fönstret.
- Beskrivningen visas på högst 2 rader, med knappen "Visa mer" / "Visa mindre" (`intent-detail-description-toggle`, `aria-expanded`).
- `@media (max-height: 900px)`: rubriken är 36 px, Fortsätt-blocket 44 px, avstånden mindre och flikarna 32 px höga på en rad.
- Testet `tests/renderer/IntentDetail.test.jsx` (2) är nytt. Alla 90 av 90 tester är gröna.
- Kontroll i riktig Electron:
  - vid 2560 × 1440 syns alla pipelinens rader utan rullning
  - vid 1100 × 800 syns flikarna och den första raden
  - att dra i konsolen fungerar (228 → 428 px), och piltangenterna och knappen Dölj fungerar

## Avvikelser och det som återstår

- **Fönster på 900 px:** beställningstexten tar så mycket plats att pipelinen hamnar under flikarna, så man måste scrolla. Mockupen är ritad för 980 px.
- **Rubrikraden** visar inte aidlc-versionen. Avläsningskolumnen göms under 1280 px.
- **Statusen** i intent-listan visas rå ("in-flight", "complete"), eftersom ett test kräver det.
- **Inte byggt från US-0402:** övergång mellan flikar, blixten när en stage blir klar och animerad ambient-dekor. Det är antecknat i epic-dokumentet.
- **xtermens blinkande markör** följer inte läget Av.
- **watcher-testet** fallerade en gång vid en körning av hela sviten. Det är det kända tidskänsliga testet.
