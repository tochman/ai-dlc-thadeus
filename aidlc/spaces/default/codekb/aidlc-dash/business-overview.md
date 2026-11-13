# Affärsöversikt: aidlc-dash (Auctum AIDLC Control)

## Syfte

Auctum AIDLC Control är en skrivbordsapp (Electron) för utvecklare på Auctum Solutions AB som arbetar med AI-DLC. Den visar läget i ett eller flera AI-DLC-projekt som en "bridge console": intents, deras pipeline av stages, en levande tidslinje från audit-loggen, unit-DAG, kostnad per intent och modell, och projektets feature-dokument. Bredvid visningen finns en inbäddad terminal med två flikar (`claude` och `shell`) där personen styr arbetet.

Appen är skrivskyddad mot AI-DLC-filer. Allt som ändrar något (`/aidlc`-kommandon, `git pull`, AI-DLC-uppsättning) skrivs in i en synlig terminalflik och körs först när personen trycker Enter.

## Användare

- Utvecklare som kör AI-DLC i Claude Code och vill se vad agenterna gör medan de arbetar.
- Konsolen hålls öppen hela dagen, ofta på en egen skärm, vilket gör läsbarhet, kontrast, lugn rörelse och helskärm viktiga (EPIC-04).
- Personen har ofta flera projekt öppna och arbetar i andra fönster; en AI-DLC-session som väntar på svar märks i dag bara om personen tittar på rätt projekt och rätt intent (motivet för US-0505).

## Huvudfunktioner (per epic i `docs/FEATURES.md`)

| Epic | Innehåll | Status |
|------|----------|--------|
| EPIC-01 | Grundkonsolen: projektflikar, intent-lista, detaljvy (Pipeline, Tidslinje, Units, Filer), terminal, splash och Auctum-märke, LCARS-tema | Släppt v0.1.0 |
| EPIC-02 | Kostnad och modeller från `usage-ledger.json` och `aidlc config models` | Byggd |
| EPIC-03 | Virtualiserad tidslinje med precisa liveuppdateringar | Byggd |
| EPIC-04 | Ikon och OS-integration (US-0401), glöd och rörelse (US-0402), LCARS-designuppdatering (US-0403), helskärm och egen appmeny (US-0404), inställningsvy (US-0405) | US-0401 släppt v0.1.1; US-0402/US-0403 byggda; US-0404 byggd och sammanslagen (commit `f301f28`, "v0.2.0"); US-0405 planerad |
| EPIC-05 | Arbetsflödesstyrning: Fortsätt, Uppdatera från GitHub, Initiera AI-DLC, frågor och godkännanden som popup och notis (US-0505) | Byggd utom US-0505 (denna intent) |
| EPIC-06 | Feature-dokument: Features-vy, projektinställningar | Byggd |

Släppstatus utöver det som commit-historiken visar är inte omverifierad i denna skanning.

## Designlyftet (US-0402/US-0403, sammanslaget)

Designlyftet ersatte projektflikarna i sidhuvudet med en vänsterarm av LCARS-block (projekt, vyer, Kostnad, Github, Inställningar), införde färgtokens (bakgrund `#05060a`, skiffer, stålblå, korall; Auctum-amber för märket och den primära åtgärden), LCARS-primitiver i `Lcars.jsx` och en global inställning "Animationer: Full / Dämpad / Av" i en egen dialog (`AppSettingsDialog`). Detaljer i `component-inventory.md`.

## Helskärm och appmeny (US-0404, levererad)

Appen har nu en egen meny (`src/main/menu.js`, `Menu.setApplicationMenu`) med svenska etiketter, utan Reload/DevTools i paketerad app, och helskärm via meny, genväg, macOS gröna knapp och LCARS-knappen `fullscreen-toggle` i sidhuvudet. Helskärmsläget sparas som `fullscreen` i `settings.json` och används när fönstret skapas. Varje menykommando når renderaren som `menu:command` och kör samma namngivna funktion som armens knapp. Hjälp-menyn visar projektets `docs/README.md` i `DocsDialog` eller öppnar AI-DLC:s webbsida.

## Denna intent

Intent `261113-question-popup` (express) ska genomföra US-0505 (`docs/features/epic-05-workflow-control.md`):

- **Väntande frågor och godkännanden**: en `DECISION_RECORDED` (frågan och dess alternativ) eller `STAGE_AWAITING_APPROVAL` (öppen gate) i en intents audit-shards som ännu inte följts av ett svar (`QUESTION_ANSWERED`) eller godkännande/avslag (`GATE_APPROVED`/`GATE_REJECTED`).
- **LCARS-popup i appen** som visar frågan, projektet och intenten.
- **Electron-systemnotis** när appen är i bakgrunden eller ett annat projekt är aktivt.
- **"Svara i Claude"**: byter till det projektet och dess Claude-terminalflik.
- **Inställning**: "Popup och notis / Bara popup / Av".

Appen svarar inte på frågan själv; svaret ges i Claude-terminalen, i linje med regeln att appen aldrig kör AI-DLC-kommandon utan personens Enter.

## Affärsregler som påverkar gränssnittet

- Status visas aldrig enbart med färg (FR9.3, NFR3): varje tagg har text.
- Brödtext ska ha minst 4,5:1 kontrast mot `--bg` och `--panel` (NFR3, WCAG AA).
- Inga Star Trek-varumärken, logotyper, ljud eller kopierade resurser (FR9.5). Den enda logotypen är Auctum-märket (gäller även notisens ikon och eventuellt ljud).
- Alla kostnader är uppskattningar och märks så (`COST_LABEL`).
- Dekorativa siffror får inte se ut som riktiga data (US-0403).
- Appen skriver bara sin egen `settings.json` i userData (gäller även helskärmsläget och den nya notisinställningen).

Komponentdetaljer finns i `component-inventory.md`, arkitektur i `architecture.md`.
