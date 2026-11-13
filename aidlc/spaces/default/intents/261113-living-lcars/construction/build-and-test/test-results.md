# Testresultat — EPIC-04 US-0402 och US-0403

Underlag: `construction/code-generation/code-generation-plan.md`, `unit-test-instructions.md`, `code-summary.md` och mockupen i `inception/requirements-analysis/mockup/`.

## Enhetstester och bygge

| Kommando | Exit | Resultat |
|----------|------|----------|
| `npx vitest run tests/` | 0 | 90/90 gröna (efter loop-back 1) |
| `npx electron-vite build` | 0 | Bygget lyckades |

## Kontroll i riktig Electron

Skriptet `tests/.tmp/shots/bt.cjs` (git-ignorerat) körde med sandlådade inställningar och ett låtsasskal. Ingen riktig claude-session startades.

| Kontroll | Resultat |
|----------|----------|
| Kontrast, beräknad från de levande tokens (NFR1) | on-light/slate-4 4.79, on-light/steel 7.57, on-light/amber 10.22, on-light/coral 6.91, text/slate-3 6.26, text-2/slate-2 7.78, muted/bg 8.01, muted/slate-1 7.22, steel-text/slate-1 9.20. Alla par klarar AA. |
| Bildfrekvens med Full (NFR2) | 60 fps under 3 s |
| Rörelselägen (FR4.2) | `data-motion=full` ger 5 aktiva animationer. Dämpad ger 0 och Av ger 0. |
| 2560 × 1440 | Matchar mockupen: armbåge med Auctum-symbol, arm, inre ram, pipeline med fas- och stage-block, avläsningskolumn och konsol. Ingen horisontell scroll. |
| 1440 × 900 och 1440 × 980 | Pipelinen syns. Ingen horisontell scroll. |
| 1100 × 800 (efter loop-back 1) | Rubriken, chips, Fortsätt, prickarna, beskrivningen på 2 rader med "Visa mer", flikarna och pipelinens första rad syns hela. Resten nås genom att rulla i ramen. |
| Hela pipelinen utan rullning (efter loop-back 1) | Ja vid 2560 × 1440. Vid 1440 × 900 och 980 syns första raden och en del av följande, och resten nås genom att rulla eller göra konsolen mindre. |
| Ändra konsolens storlek (efter loop-back 1) | Dra med musen: 228 → 428 px. Pil ned ×3: 428 → 308 px. Dölj och visa behåller den valda höjden. |
| Konsolfel | 0 |

## Fel

### F-01 (rättad i loop-back 1): Pipelinen syns inte i ett lägre fönster (1100 × 800)
- **Repro:** fönstret är 1100 × 800 och en intent är vald. Konsolen tar nästan halva höjden, och beskrivningen tar mer än fyra rader. Rubriken, chipsen, Fortsätt och prickarna fyller resten av innehållsramen. Pipelinen och flikarna hamnar under kanten, och man måste scrolla inne i ramen. Samma sak gäller under 900 px höjd.
- **Orsak:**
  - konsolen har en fast standardhöjd, oberoende av fönstrets höjd
  - beskrivningen har ingen höjdbegränsning
  - Fortsätt-knappen och rubriken har storlekar för stora fönster även i små fönster
- **Ansvarigt steg:** code-generation.
- **Förslag:**
  - konsolens standardhöjd blir `clamp(180px, 28vh, 320px)`. Personen kan fortfarande dra i höjden.
  - beskrivningen begränsas till 2 rader (`line-clamp`) med knappen "Visa mer" / "Visa mindre"
  - under 900 px höjd blir rubriken 36 px och Fortsätt-blocket 44 px
  - ett renderartest kontrollerar knappen "Visa mer"
- **Uppskattad påverkan:** cirka 30 rader CSS och JSX samt 1 test. Ingen kostnad. Låg risk.

## Loop-Back Log

### Loop-back 1 — 2026-11-13T15:27:07Z
- **Diagnosis:** F-01. Konsolens fasta standardhöjd, beskrivningen utan höjdbegränsning och rubrik och Fortsätt i full storlek trycker ned pipelinen under kanten när fönstret är lägre än cirka 900 px.
- **Root-cause stage:** code-generation
- **Planned fix:**
  - konsolens standardhöjd blir `clamp(180px, 28vh, 320px)`
  - beskrivningen begränsas till 2 rader med "Visa mer" / "Visa mindre"
  - under 900 px höjd blir rubriken 36 px och Fortsätt-blocket 44 px
  - ett renderartest för "Visa mer"
- **Estimated impact:** cirka 30 rader och 1 test. Ingen finansiell kostnad. Låg risk. Användaren valde "Retry with fix".
