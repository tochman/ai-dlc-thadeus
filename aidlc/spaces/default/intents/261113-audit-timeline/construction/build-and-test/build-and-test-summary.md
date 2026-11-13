# Build and Test — sammanfattning EPIC-03

Underlag: `test-results.md` och `construction/code-generation/code-summary.md`.

- **Enhetstester:** 68/68 gröna och **bygget** lyckas. Ett tillfälligt fel i en tidigare körning sågs, troligen watcher-testet på macOS.
- **Riktig app:**
  - visinv visar alla 1 726 händelser.
  - Med 20 000 händelser tar en filterändring 24–34 ms (målet är under 200 ms), och scrollningen är jämn.
  - En sen händelse från en annan fil markeras exakt, och räknaren visar "1 ny händelse".
- **Känt fel F-01 (accepterat av användaren):** Pil ned flyttar inte fokus vid varannan tryckning när målraden redan syns. Rättelsen är cirka 5 rader kod och kan göras senare.
