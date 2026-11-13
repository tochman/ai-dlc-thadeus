# Prestandatester — EPIC-05

Underlag: `requirements.md` NFR3.

- **Ledig/arbetar-signalen:** uppdateras efter 1,5 s tystnad. Målet är inom 2 s, och det verifieras med fejkade timers i `tests/renderer/terminalControl.test.jsx` och i riktig app.
- **Git-status i aidlc-dash:** svarar direkt i provkörningen, under målet 1 s.

Inga lasttester behövs för Minimal-strategin.
