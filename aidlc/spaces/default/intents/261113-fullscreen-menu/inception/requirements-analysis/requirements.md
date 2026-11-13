# Krav — EPIC-04 US-0404 Helskärm och egen appmeny

Källor:
- `docs/features/epic-04-branding-and-desktop.md` (US-0404)
- svaren i `requirements-analysis-questions.md` (Q1: X, Q2: A)
- kodbasen, beskriven i `aidlc/spaces/default/codekb/aidlc-dash/` och i `inception/reverse-engineering/developer-scan.md`

## Avsiktsanalys

Konsolen ska kunna ta hela skärmen. Menyn ska bara innehålla det appen faktiskt kan göra. I dag visas Electrons standardmeny, med Reload, DevTools och Electron-länkar, också i den paketerade appen. Cmd/Ctrl+W stänger hela fönstret. Alla menyval ska använda samma kod som knapparna i appen.

## Funktionella krav

### FR1 — Helskärm
- **FR1.1** Det går att växla mellan helskärm och fönster på tre sätt:
  - menyvalet "Helskärm" under Visa
  - standardkortkommandot: `Ctrl+Cmd+F` på macOS, `F11` på Linux
  - en knapp i appen

  På macOS används det inbyggda helskärmsläget (`setFullScreen`).
- **FR1.2** Knappen är ett litet LCARS-block längst till höger i den översta balken och syns alltid [Q1].
  - Utanför helskärm heter den **"Helskärm"**, i helskärm **"Lämna helskärm"**.
  - Etiketten och `aria-pressed` följer fönstrets verkliga läge, också när läget ändras via menyn, kortkommandot eller macOS gröna knapp.
- **FR1.3** Appen sparar läget i sin egen `settings.json` (nyckeln `fullscreen`, som `sanitize()` godtar som boolean). Stängs appen i helskärm öppnas den i helskärm nästa gång.
- **FR1.4** Ramarna och layouten håller i helskärm: ingen horisontell rullning och inga trasiga armbågar, också vid 2560 × 1440.

### FR2 — Egen appmeny
- **FR2.1** `Menu.setApplicationMenu` ersätter Electrons standardmeny med en meny som byggs i `src/main/menu.js`. Etiketterna är på svenska och har samma namn som i vänsterarmen.
  - **macOS appmeny:**
    - "Om Auctum AIDLC Control" (standardpanelen "Om" med version och ikon)
    - "Inställningar…" (`Cmd+,`)
    - Göm, Göm övriga, Visa alla
    - "Avsluta Auctum AIDLC Control"
  - **Arkiv:**
    - "Öppna projekt…" (`Cmd/Ctrl+O`)
    - "Stäng projekt" (`Cmd/Ctrl+W`)
    - "Projektinställningar…"
    - på Linux även "Inställningar…" (`Ctrl+,`) och "Avsluta" (`Ctrl+Q`)
  - **Redigera:** de inbyggda rollerna Ångra, Gör om, Klipp ut, Kopiera, Klistra in och Markera allt. Utan dem slutar textfälten och terminalen att fungera på macOS.
  - **Visa:**
    - Intents, Features, Kostnad, Github
    - Helskärm
    - zooma in, zooma ut, återställ zoom
  - **Terminal:** Claude, Shell, "Starta om flik".
  - **Fönster** (bara macOS): Minimera, Zooma, Lägg alla främst.
  - **Hjälp:**
    - "AI-DLC-dokumentation" [Q2]: öppnar det aktiva projektets `docs/README.md` i appens artefaktläsare om filen finns, annars AI-DLC:s webbsida i webbläsaren
    - "Rapportera problem": `https://github.com/tochman/aidlc-dash/issues` i webbläsaren
- **FR2.2** Reload, Force Reload, Toggle Developer Tools och Electron-länkarna finns inte i den paketerade appen (`app.isPackaged`). I utvecklingsläge finns menyn "Utveckling" med Reload och DevTools.
- **FR2.3** På Linux döljs menyraden (`autoHideMenuBar: true`) och visas med `Alt`. Allt som finns i menyn går också att nå i appen.
- **FR2.4** **En kodväg:** varje menyval som gäller appens innehåll skickar ett kommando till renderaren på kanalen `menu:command`, till exempel `{ command: 'view', view: 'features' }`. Renderaren kör samma namngivna funktion som knappen i vänsterarmen:
  - `openProject`
  - `closeActiveProject`
  - `showView`
  - `togglePanel`
  - `openAppSettings`
  - `openProjectSettings`
  - terminalens `setView` och `restart`

  Okända kommandon ignoreras.
- **FR2.5** Renderaren meddelar main när förutsättningarna ändras, på kanalen `menu:state`: om ett projekt är öppet, om det är ett AI-DLC-projekt och om Features visas. Main bygger om menyn efter det:
  - Menyval som kräver ett öppet projekt är avstängda när inget projekt är öppet.
  - Kostnad och Github är avstängda när projektet inte är ett AI-DLC-projekt.
  - Features döljs när vyn inte visas.
- **FR2.6** `Cmd/Ctrl+W` stänger det aktiva projektet, inte fönstret. När inget projekt är öppet gör kommandot ingenting.

## Icke-funktionella krav

- **NFR1 — Säkerhet:** inga nya rättigheter för renderaren. `menu:command` går bara från main till renderaren. Payloaden i `menu:state` valideras: bara booleaner godtas, och annat ignoreras. Externa länkar öppnas med `shell.openExternal`, bara med `https:`, mot fasta adresser.
- **NFR2 — Regression:** alla befintliga tester och `data-testid` behålls. Arm-knapparna beter sig som förut.
- **NFR3 — Tillgänglighet:** helskärmsknappen nås med tangentbordet, har en synlig fokusram och `aria-pressed`.

## Begränsningar

- Inga nya beroenden. Appen skriver inga AI-DLC- eller projektfiler, bara sin egen `settings.json`.

## Antaganden

- `[assumption]` AI-DLC:s webbsida i FR2.1 (Hjälp) är `https://github.com/awslabs/aidlc-workflows`. Adressen ligger som en konstant i `menu.js` och kan bytas.
- `[assumption]` "Helskärm vid start" i inställningsvyn hör till US-0405. Här räcker det att appen kommer ihåg det senaste läget (FR1.3).

## Utanför omfånget

- Översatta menyetiketter (EPIC-07).
- Inställningsvyn (US-0405).

## Öppna frågor

None.
