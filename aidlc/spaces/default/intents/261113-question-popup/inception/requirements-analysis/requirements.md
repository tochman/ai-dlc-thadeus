# Krav — EPIC-05 US-0505 Claudes frågor som popup

Källor:
- `docs/features/epic-05-workflow-control.md` (US-0505)
- svaren i `requirements-analysis-questions.md` (Q1: X, Q2: B, Q3: C med tillägg)
- kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/` och `inception/reverse-engineering/developer-scan.md`

## Avsiktsanalys

Personen ska inte låta Claude vänta på en fråga som hen inte har sett. Väntande frågor och godkännanden finns redan i audit-loggen. Appen räknar fram dem utan att skriva något och visar dem på tre sätt:
- en popup mitt i fönstret
- en systemnotis när appen ligger i bakgrunden
- en eskalering till glödande rött om ingen svarar inom 20 sekunder

**Ändring mot storyn:** personen valde en popup mitt i fönstret, ovanpå allt annat, som inställningsdialogen [Q1]. Storyn sa "inte modal". Det valet gäller nu, och epic-dokumentet uppdateras.

## Funktionella krav

### FR1 — Räkna fram väntande frågor (i main)
- **FR1.1** Main räknar fram väntande frågor för varje öppet AI-DLC-projekt, också när det inte är aktivt, utifrån audit-loggen för intents som pågår. En intent pågår när den inte har status `complete` eller `archived` och inte är avslutad i `aidlc-state.md`.
- **FR1.2** En **fråga** är en `DECISION_RECORDED`, och en **grind** är en `STAGE_AWAITING_APPROVAL`. Händelserna sorteras i tidsordning (`timeMs`, `seq`), och en händelse besvarar en tidigare fråga med samma `Stage` (och `Unit` om fältet finns) så här:
  - `QUESTION_ANSWERED` besvarar den äldsta obesvarade frågan i samma stage
  - `GATE_APPROVED`, `GATE_REJECTED`, `STAGE_COMPLETED` och `STAGE_SKIPPED` stänger grinden och alla frågor i samma stage
  - en ny `STAGE_STARTED` för samma stage stänger det som är kvar från förra försöket

  Svar bär inte frågans id. Därför sker matchningen på stage och ordning.
- **FR1.3** Varje väntande fråga har följande fält:
  - `projectId`, projektets namn, `intent` och `stage`
  - `kind` (`question` eller `gate`)
  - `questionId`, eller nyckeln `<shard>#<index>` när id saknas
  - frågetexten (`Decision`) och valen (`Options`, tolkat som lista)
  - för en grind: `Next Stage`
  - tiden
- **FR1.4** Main beräknar om vid varje `project:changed` som rör `aidlc/` och skickar den fullständiga listan på kanalen `questions:changed`. Renderaren kan också hämta listan med `questions:list`. Bara frågor som tillkommit efter att appen startade utlöser popup och notis. Äldre väntande frågor visas i popupen som en lista ("Väntade redan när appen startade"), men ger ingen notis.

### FR2 — Popupen
- **FR2.1** Popupen är en native `<dialog>` med `showModal()`. Den ligger mitt i fönstret, ovanpå allt annat, i samma stil som inställningsdialogen [Q1]. Den har en korallram, rubriken "Claude väntar på ditt svar" och `aria-labelledby`, och `Esc` stänger den.
- **FR2.2** För varje väntande fråga visas projekt · intent · stage, frågan i sin helhet som text (aldrig som HTML) och valen som en lista. En grind visas som "Godkännande: <stage> → <next stage>". Finns flera frågor ligger den nyaste först, och det står "1 av N" med knappar för att bläddra.
- **FR2.3** **"Svara i Claude"** stänger popupen, byter till projektet och öppnar och fokuserar dess Claude-flik via `terminalCommand`, som i US-0404.
- **FR2.4** "Stäng" döljer popupen tills en ny fråga kommer. Frågor som redan är stängda visas inte igen. Popupen stängs av sig själv när alla visade frågor har fått svar i audit-loggen.
- **FR2.5** **Eskalering** [Q3]: om en fråga är obesvarad i 20 sekunder medan popupen är öppen, övergår popupens header och rubrik till **glödande rött**.
  - Färgen är den nya token `--alert`, som klarar WCAG AA.
  - Glöden följer animationsinställningen: Full ger puls, Dämpad ger statisk glöd och Av ger rött utan glöd.
  - Eskaleringen återställs när en ny fråga visas.

### FR3 — Systemnotis
- **FR3.1** När en ny fråga kommer visar main en Electron `Notification`, om fönstret inte har fokus eller om ett annat projekt är aktivt. Rubriken är "<projekt>: Claude väntar på ditt svar", och texten är frågan, kortad till cirka 120 tecken. Notisen visas en gång per fråga.
- **FR3.2** Ett klick på notisen tar fram fönstret och visar popupen för den frågan.
- **FR3.3** Ljudet följer inställningen "Ljud vid notis" [Q3]: på ger systemets standardljud, av ger `silent: true`.

### FR4 — Inställningar
- **FR4.1** I appens inställningsdialog finns:
  - "Frågor från Claude: Popup och notis / Bara popup / Av", standard Popup och notis
  - "Ljud vid notis: På / Av", standard På

  Valen sparas i `settings.json` som `questionAlerts` (`popup-notify`, `popup` eller `off`) och `notificationSound` (boolean). `sanitize()` godtar dem enligt samma mönster som `animations` och `fullscreen`.
- **FR4.2** Med Av visas varken popup eller notis. Med Bara popup visas ingen notis.

## Icke-funktionella krav

- **NFR1 — Skrivskyddat:** appen skriver inga AI-DLC- eller projektfiler och skickar inget till terminalen i den här storyn. Bara den egna `settings.json` skrivs.
- **NFR2 — Säkerhet:** frågetexten visas som text. Valen tolkas med `JSON.parse` i en try/catch, och vid fel visas råtexten. `questions:list` kräver ett öppet projekt.
- **NFR3 — Prestanda:** omberäkningen läser bara audit-loggarna för pågående intents och debouncas tillsammans med befintliga ändringar. Ingen märkbar fördröjning i UI:t.
- **NFR4 — Regression:** alla befintliga tester och `data-testid` behålls. Popupen använder inte `role="status"` eller `role="alert"`, eftersom befintliga tester räknar dem.
- **NFR5 — Tillgänglighet:** fokus hamnar på "Svara i Claude" när popupen öppnas. Eskaleringen syns inte bara genom färgen: rubriken får texten "Väntar fortfarande på ditt svar".

## Begränsningar

- Inga nya beroenden. Projektets befintliga bevakning används.

## Antaganden

- `[assumption]` "Headern och rubriken" i Q3 gäller popupens header och rubrik, inte appens översta balk.
- `[assumption]` "Inaktivitet" betyder att frågan fortfarande är obesvarad. Tiden räknas från när popupen visade frågan.

## Utanför omfånget

- Svara direkt i popupen genom att skicka valet till terminalen (en senare story).
- Frågor som Claude ställer fritt i chatten och Claude Codes egna behörighetsfrågor (kräver Claudes `Notification`-hook).
- Markering av projekt i vänsterarmen [Q2: B].

## Öppna frågor

None.
