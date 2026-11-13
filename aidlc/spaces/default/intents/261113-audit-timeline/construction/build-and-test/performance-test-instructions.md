# Prestandatester — EPIC-03

Underlag: `requirements.md` NFR1.

- **Mål:** med 20 000 händelser ska listan vara renderad inom 200 ms efter en filterändring, och scrollningen ska vara jämn.
- **Mätt i riktig Electron:**
  - filterändring: 24–34 ms, mätt över två `requestAnimationFrame`
  - scrollning: bildrutetid p50 20 ms, p95 25 ms och en enstaka topp på 95 ms
  - 22–32 rader renderade i taget
- **Mätt i jsdom (indikativt):** 26–46 ms per filterändring. Mätningen kan köras om med `npx vitest run --config tests/.tmp/vitest.perf.mjs`.

Målet är uppfyllt.
