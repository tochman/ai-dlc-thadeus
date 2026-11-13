# Prestandatester — EPIC-04 US-0402 och US-0403

Underlag: `requirements.md` NFR2.

- **Bildfrekvens:** 60 fps med rörelseläget Full i projektvyn med en aktiv intent, mätt med `requestAnimationFrame` under 3 s.
- **Animationer:** bara `opacity`, `box-shadow`/`filter`, `transform` och `background-position` för svepet animeras. Inga layoutanimationer.
- **Antal animationer:** 5 körs i läget Full, 0 i Dämpad och 0 i Av.
