# Kodsammanfattning — EPIC-05 US-0505 Claudes frågor som popup

Express, Minimal, inga enheter och inga nya beroenden. Alla fem stegen i `code-generation-plan.md` är byggda och avbockade.

## Vad som byggdes

### Steg 1 — Väntande frågor i main (FR1.1–FR1.3, NFR2)
- `src/main/questions.js` (ny, ren): `pendingQuestions(events, { project, intent })` och `parseOptions(raw)`.
  - `DECISION_RECORDED` blir en fråga och `STAGE_AWAITING_APPROVAL` en grind.
  - `QUESTION_ANSWERED` besvarar den äldsta obesvarade frågan i samma stage.
  - `GATE_APPROVED`, `GATE_REJECTED`, `STAGE_COMPLETED`, `STAGE_SKIPPED` och en ny `STAGE_STARTED` stänger allt som är öppet i stagen.
  - Unit: ett svar med `Unit` matchar bara den uniten, och ett svar utan `Unit` matchar hela stagen.
  - `id` är `Question Id`, annars `<intent>:<shard>#<index>`. `Options` läses som en JSON-lista i try/catch, annars som en kommaseparerad lista, annars som råtext.
- `src/main/projectService.js`: `loadPendingQuestions(project, onlyDirs)` läser bara audit-loggarna för pågående intents. En intent räknas inte som pågående om den har status `complete` eller `archived`, om `aidlc-state.md` har status `complete…` eller om alla stages som körs är klara. Resultatet cachas per intent, och med `onlyDirs` läses bara de ändrade intents om. Om en audit-logg inte går att läsa behålls det senaste resultatet för den intenten.

### Steg 2 — Bevakning, kanaler och notiser (FR1.4, FR3.1–FR3.3, FR4.2, NFR3)
- `src/main/ipc.js`:
  - `refreshQuestions` körs när bevakningen av en space startar, alltså vid `project:open`, omdetektering och byte av space. Den körs också vid varje `project:changed` med ändrade intents, i samma debounce som tidigare.
  - Den samlade listan för alla öppna projekt skickas på `questions:changed`, med den nyaste först.
  - `questions:list` returnerar listan. Den är tom när inget projekt är öppet.
  - `questions:activeProject` godtar bara en sträng eller `null`.
  - `startedWith` innehåller de id:n som fanns vid projektets första beräkning. Varje fråga får `early: true|false`.
  - `project:close` skickar en uppdaterad lista.
- `src/main/notify.js` (ny):
  - En `Notification` per nytt id. Rubriken är `<projekt>: Claude väntar på ditt svar` och texten kortas till högst 120 tecken. `silent` följer `notificationSound === false`.
  - Notisen visas bara med `popup-notify` och när fönstret saknar fokus eller frågan gäller ett annat projekt.
  - Ett klick återställer, visar och fokuserar fönstret och skickar `questions:focus`.
- `src/preload/index.js`: `listQuestions`, `onQuestions`, `onQuestionFocus` och `setActiveProject`.

### Steg 3 — Inställningar (FR4.1, FR4.2)
- `src/main/settings.js`: `sanitize()` godtar `questionAlerts` (`popup-notify`, `popup`, `off`) och `notificationSound` (boolean). Ogiltiga värden utelämnas.
- `src/renderer/AppSettingsDialog.jsx`: två nya grupper, "Frågor från Claude" (Popup och notis / Bara popup / Av) och "Ljud vid notis" (På / Av). De använder samma LCARS-radiomönster som tidigare, nu som den lokala komponenten `RadioBlocks`. De befintliga `data-testid` för Animationer är kvar, och de nya heter `app-settings-alerts-*` och `app-settings-sound-*`.

### Steg 4 — Popupen (FR2.1–FR2.5, NFR4, NFR5)
- `src/renderer/QuestionPopup.jsx` (ny):
  - En native `<dialog>` med `showModal()`, `aria-labelledby` och Esc via `onCancel`.
  - Den visar projekt · intent · stage, frågan som text och valen som lista. En grind visas som "Godkännande: a → b".
  - Rubriken "Väntade redan när appen startade" visas för gamla frågor. Popupen har "1 av N" med Föregående och Nästa.
  - "Svara i Claude" får fokus när popupen öppnas.
  - Efter 20 s sätts `is-overdue` och rubriken byts till "Väntar fortfarande på ditt svar". Timern startar om när en annan fråga visas.
  - Popupen har inga `role="status"` eller `role="alert"`.
- `src/renderer/App.jsx`:
  - App prenumererar på frågorna och hämtar listan när den startar.
  - Popupen öppnas bara för ett id som inte setts förut och inte är `early`, och aldrig med "Av".
  - "Stäng" döljer popupen tills ett nytt id kommer.
  - Popupen stängs av sig själv när ingen ny fråga väntar längre.
  - "Svara i Claude" anropar `setActiveId` och `setTerminalCommand({ seq, action: 'claude', projectId })` direkt.
  - App meddelar main om aktivt projekt när `activeId` ändras.
- `src/renderer/theme.css`:
  - Ny token `--alert: #ff3b3b` med `--alert-a0/-a45/-a90`, bara på `:root`. Kontrasten är ca 5,7:1 mot `--bg` och 5,9:1 mot `--on-light`.
  - Popupen har korallram och korallhuvud, och huvudet blir `--alert` när frågan är försenad.
  - Med Full pulserar huvudet med `lcars-alert`, 1,2 s per cykel. Med Dämpad får det en statisk glöd, och med Av är det rött utan glöd.

### Steg 5 — Tester
- `tests/main/questions.test.js`: 6 tester (a)–(f). Händelserna går genom `mergeAudits`, alltså samma form som `loadAuditEvents` ger.
- `tests/main/settings.test.js`: +1 test för `questionAlerts` och `notificationSound`.
- `tests/renderer/QuestionPopup.test.jsx`: 3 tester.
  - Innehåll, text som inte tolkas som HTML, fokus och "Svara i Claude".
  - Eskalering efter 20 s med fake timers, och att den återställs av en ny fråga.
  - En grind.

## Viktiga beslut
- Avvikelse från planen: ett svar utan `Unit` matchar hela stagen och ett svar med `Unit` bara den uniten. Annars skulle en per-unit-fråga aldrig stängas av ett `STAGE_COMPLETED` utan `Unit`.
- Baslinjen (`startedWith`) är projektets första beräkning, inte bara appens start. Ett projekt som öppnas senare ger alltså ingen popup för frågor som redan väntade. Byte av space ger en ny baslinje.
- Ett id avgörs för notis en gång, när frågan kommer. En fråga som kom medan fönstret hade fokus på samma projekt ger ingen notis senare.
- Standardvärdena (`popup-notify`, ljud på) gäller där värdena läses (`notify.js`, `App.jsx`), eftersom `sanitize()` utelämnar ogiltiga värden. Det är samma mönster som för `animations`.
- Bridge-anropen i `App.jsx` är valfria (`?.`), så att befintliga skaltester utan fråge-API fortsätter fungera.

## Avvikelser
- `src/renderer/tokens.js` är oförändrad. `token('--alert')` fungerar redan, och ingen JS-kod behöver färgen.
- `.lcars-radio-group .lcars-block` har nu `min-width: 110px` i stället för `width: 110px`, så att "Popup och notis" får plats. Korta etiketter ser ut som förut.
- Planen anger `Question Id` eller `<intent>:<key>`, och kraven anger `<shard>#<index>`. Koden använder `<intent>:<shard>#<index>`, som är unikt över intents.

## Testresultat
- `npx vitest run tests/`: 32 filer och 111 tester gröna, varav 101 befintliga och 10 nya.
- `npx electron-vite build`: bygget lyckades.
- Manuell verifiering i riktig Electron (notis, fokus och klick) återstår för Build and Test. Se `unit-test-instructions.md`.

## Loop-back 1 (F-01)
- **Orsak (bekräftad i koden):** `terminal.show('claude')` i `TerminalContext.jsx` fokuserar xterm-sessionen synkront, i `ProjectView`:s effekt för `terminalCommand`. Den effekten körde i samma commit som popupens effekt som stänger dialogen, och före den. När dialogen sedan stängdes lämnade den tillbaka fokus till det element som hade fokus före `showModal()`.
- **Rättelse:** `QuestionPopup.jsx` har en ny funktion `answer()`. "Svara i Claude" stänger dialogen direkt med `close()`, så att återlämningen av fokus sker först, och anropar `onAnswer(q)` i nästa `requestAnimationFrame`. `App.jsx` är oförändrad: `answerInClaude` körs nu efter att dialogen har stängts.
- **Test:** ett nytt test i `tests/renderer/QuestionPopup.test.jsx` kontrollerar att callbacken inte anropas i klicket, att dialogen redan är stängd och att callbacken sedan anropas en gång med projektet. Det första testet väntar nu på callbacken med `waitFor`.
- **Resultat:** `npx vitest run tests/` gav 32 filer och 112 tester gröna, och `npx electron-vite build` lyckades. Kontrollen i riktig Electron att `document.activeElement` ligger i `.terminal-panel` görs av orkestreraren.
