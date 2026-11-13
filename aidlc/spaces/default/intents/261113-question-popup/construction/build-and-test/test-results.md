# Testresultat — EPIC-05 US-0505 Claudes frågor som popup

Underlag: `construction/code-generation/code-generation-plan.md`, `unit-test-instructions.md` och `code-summary.md`.

## Enhetstester och bygge

| Kommando | Exit | Resultat |
|----------|------|----------|
| `npx vitest run tests/` | 0 | 112/112 gröna efter loop-back 1, varav 11 nya. Matchningen av frågor och svar täcks av `tests/main/questions.test.js` (6) |
| `npx electron-vite build` | 0 | Bygget lyckades |

## Kontroll i riktig Electron

Skriptet `tests/.tmp/shots/qpop.cjs` (git-ignorerat) öppnar visinv, som aktivt projekt, och aidlc-dash med sandlådade inställningar och ett låtsasskal. Inget skrivs till något projekt. Skriptet väntar på en **riktig** väntande fråga i aidlc-dash: grinden för Build and Test, som AI-DLC loggar när stagen läggs fram för godkännande. Ett första försök, som skulle skriva testfrågor i den riktiga audit-loggen, nekades och användes inte.

| Kontroll | Resultat |
|----------|----------|
| Vid start (FR1.4) | Ingen popup |
| Riktig grind i aidlc-dash medan visinv är aktivt (FR1.1, FR2.1, FR2.2) | Popupen öppnas mitt i fönstret med "Claude väntar på ditt svar", "aidlc-dash · 261113-question-popup · build-and-test" och "Godkännande: build-and-test → deployment-pipeline". Den visar "1 av 2", där den andra är en fråga som väntade redan vid start. |
| Systemnotis (FR3.1, FR3.3) | En notis: "aidlc-dash: Claude väntar på ditt svar" / "Godkännande: build-and-test → deployment-pipeline", `silent: false` |
| Eskalering efter 21 s (FR2.5, NFR5) | `is-overdue`, rubriken "Väntar fortfarande på ditt svar" i glödande rött (`qpop-overdue.png`) |
| "Svara i Claude" (FR2.3) | Popupen stängs, aidlc-dash blir aktivt och Claude-fliken är vald. **Fokus hamnar inte i terminalen** (se F-01). |
| "Svara i Claude" efter loop-back 1 (FR2.3) | Körningen gjordes med den riktiga grinden för kodgenereringen: popupen och notisen kom, popupen blev röd efter 21 s, aidlc-dash blev aktivt och `document.activeElement` låg i terminalpanelen. |
| Gamla grindar i listan | Popupen visade "1 av 3". De två andra är grindar som lämnades öppna när vi gick tillbaka till kodgenereringen. AI-DLC loggar ingen stängning av dem. De visas i listan men öppnar ingen popup, eftersom de är `early`. Användaren känner till det och godkände (meddelande cf92afd8). |
| Konsolfel | 0 |

## Fel

### F-01 (rättad i loop-back 1): "Svara i Claude" sätter inte fokus i terminalen
- **Repro:** en grind väntar och popupen är öppen. Klicka på "Svara i Claude". Projektet och fliken byts, men `document.activeElement` ligger inte i terminalpanelen, och markören syns inte.
- **Orsak (trolig):** en native `<dialog>` lämnar tillbaka fokus till det element som hade fokus före `showModal()` när den stängs. Det sker efter att terminalen har fått fokus.
- **Ansvarigt steg:** code-generation.
- **Förslag:** stäng dialogen först och ge terminalen fokus efteråt, till exempel i `requestAnimationFrame` eller efter dialogens `close`-händelse. Lägg till ett test som kontrollerar att `terminalCommand` skickas efter att dialogen stängts.
- **Uppskattad påverkan:** cirka 5 rader och 1 test. Låg risk.

## Loop-Back Log

### Loop-back 1 — 2026-11-13T19:35:45Z
- **Diagnosis:** F-01. När den native dialogen stängs lämnar den tillbaka fokus till det element som hade fokus före `showModal()`, och det tar fokus från terminalen.
- **Root-cause stage:** code-generation
- **Planned fix:** stäng popupen först och sätt fokus i terminalen efteråt (efter `close` eller i nästa frame). Lägg till ett test.
- **Estimated impact:** cirka 5 rader och 1 test. Ingen finansiell kostnad. Låg risk. Användaren valde "Retry with fix".
