# Build and Test — sammanfattning EPIC-04 US-0402 och US-0403

Underlag: `test-results.md` och `construction/code-generation/code-summary.md`.

- **Tester och bygge:** 90/90 gröna, och bygget lyckas.
- **Utseende:** appen motsvarar den godkända mockupen vid 1440 och 2560 px:
  - den ambergula armbågen med Auctum-symbolen
  - vänsterarmen och den inre ramen
  - etikettblock och prickindikatorn
  - pipelinen med fas- och stage-block
  - avläsningar och konsolen
- **Kontrast:** alla viktiga par klarar AA (4,79–10,22).
- **Rörelse:** 60 fps. Full, Dämpad och Av ger 5, 0 och 0 körande animationer.
- **F-01 rättad i loop-back 1:** i låga fönster följer konsolens höjd fönstret, beskrivningen visas på 2 rader med "Visa mer", och rubriken och Fortsätt blir mindre. Konsolen går fortfarande att dra i och styra med tangentbordet.
- **Kvar, inte blockerande:**
  - Vid 1440 × 900–980 nås pipelinens sista rader genom att rulla eller göra konsolen mindre.
  - Tre mindre animationer från US-0402 är inte byggda (antecknat i epic-dokumentet).
