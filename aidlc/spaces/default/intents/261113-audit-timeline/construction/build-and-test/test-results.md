# Testresultat — EPIC-03 Audit Timeline

Underlag: `construction/code-generation/code-generation-plan.md`, `unit-test-instructions.md` och `code-summary.md`.

## Enhetstester och bygge

| Kommando | Exit | Resultat |
|----------|------|----------|
| `npx vitest run tests/` | 0 | 68/68 gröna i fyra körningar i rad. En tidigare körning hade ett tillfälligt fel, troligen watcher-testet på macOS (FSEvents). |
| `npx electron-vite build` | 0 | Bygget lyckades |

## Kontroll i riktig Electron

Kontrollen kördes med ett tillfälligt skript i `tests/.tmp/`, som är git-ignorerat.

| Kontroll | Resultat |
|----------|----------|
| visinvs `epic02-finish`, inget tak (FR1.1) | "1726 av 1726 händelser" med brus påslaget och "868 av 1726" utan brus. 22 rader renderas. |
| 20 000 händelser i två filer (NFR1, FR1.2) | "20000 av 20000 händelser", 22 rader renderade |
| Tid från filterändring till renderad lista (NFR1, < 200 ms) | 24, 34, 34, 32, 34 och 33 ms |
| Scrollning genom 20 000 händelser | Bildrutetid p50 20 ms, p95 25 ms, max 95 ms (en enstaka topp), 32 renderade rader |
| Liveuppdatering med en händelse med äldre tidsstämpel (FR2.2, FR2.3) | 20 001 händelser. Ingen synlig rad blinkar. |
| Räknaren (FR2.4) | "1 ny händelse". Ett klick scrollar dit och visar exakt 1 markerad rad. |
| ARIA (FR1.6) | `aria-posinset` och `aria-setsize` (20001) är satta på raderna |
| Konsolfel | 0 |

## Fel

### F-01: Pil ned flyttar inte fokus varannan gång (FR1.6)
- **Repro:** fokusera första raden och tryck Pil ned, Pil ned, Pil ned, Pil upp, End och Home, med 500 ms mellan tangenterna. Fokus hamnar på position 2, **2**, 3, 2, 20001 och 1. Det andra trycket på Pil ned flyttar alltså inte fokus.
- **Orsak:** `goTo` i `Timeline.jsx` sätter bara `pendingFocus`, och fokus flyttas i en effekt efter nästa rendering. När målraden redan syns scrollar inte `scrollToIndex`, så ingen ny rendering sker. Fokus flyttas då först vid nästa rendering.
- **Ansvarigt steg:** code-generation.
- **Förslag:** `goTo` fokuserar målraden direkt om den redan är renderad (`[data-index=i] .event-row`). Annars sparas `pendingFocus` som i dag. Ett renderartest i `tests/renderer/Timeline.test.jsx` kontrollerar att två tryck på Pil ned i följd flyttar fokus till rad 3.
- **Uppskattad påverkan:** cirka 5 rader kod och 1 test. Ingen kostnad och låg risk.

**Beslut:** användaren valde "Accept failure" (meddelande 8ec11ea2). F-01 lämnas som känt fel och rättas inte i den här intenten. Ingen loop-back görs.

## Loop-Back Log

Inga loop-backs gjordes.
