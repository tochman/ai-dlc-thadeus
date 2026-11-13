# Affärsöversikt: aidlc-dash (Auctum AIDLC Control, blivande T.H.A.D.E.U.S.)

## Syfte

Auctum AIDLC Control är en skrivbordsapp (Electron) för utvecklare på Auctum Solutions AB som arbetar med AI-DLC. Den visar läget i ett eller flera AI-DLC-projekt som en "bridge console": intents, deras pipeline av stages, en levande tidslinje från audit-loggen, unit-DAG, kostnad per intent och modell, och projektets feature-dokument. Bredvid visningen finns en inbäddad terminal med två flikar (`claude` och `shell`) där personen styr arbetet.

Appen är skrivskyddad mot AI-DLC-filer. Allt som ändrar något (`/aidlc`-kommandon, `git pull`, AI-DLC-uppsättning) skrivs in i en synlig terminalflik och körs först när personen trycker Enter.

## Användare

- Utvecklare som kör AI-DLC i Claude Code och vill se vad agenterna gör medan de arbetar.
- Konsolen hålls öppen hela dagen, ofta på en egen skärm, vilket gör läsbarhet, kontrast, lugn rörelse och helskärm viktiga (EPIC-04).
- Personen har ofta flera projekt öppna och arbetar i andra fönster; väntande frågor visas därför som popup och systemnotis (US-0505, levererad).
- Produktägaren vill att namnet säger vad appen är: en miljö där människor och AI bygger mjukvara tillsammans, inte bara en instrumentpanel (motivet för US-0406).

## Huvudfunktioner (per epic i `docs/FEATURES.md`)

| Epic | Innehåll | Status |
|------|----------|--------|
| EPIC-01 | Grundkonsolen: projektflikar, intent-lista, detaljvy (Pipeline, Tidslinje, Units, Filer), terminal, splash och Auctum-märke, LCARS-tema | Släppt v0.1.0 |
| EPIC-02 | Kostnad och modeller från `usage-ledger.json` och `aidlc config models` | Byggd |
| EPIC-03 | Virtualiserad tidslinje med precisa liveuppdateringar | Byggd |
| EPIC-04 | Ikon och OS-integration (US-0401), glöd och rörelse (US-0402), LCARS-designuppdatering (US-0403), helskärm och egen appmeny (US-0404), inställningsvy (US-0405), namnet T.H.A.D.E.U.S. (US-0406) | US-0401 släppt v0.1.1; US-0402, US-0403 och US-0404 släppta i v0.2.0; US-0405 planerad; US-0406 denna intent |
| EPIC-05 | Arbetsflödesstyrning: Fortsätt, Uppdatera från GitHub, Initiera AI-DLC, frågor och godkännanden som popup och notis (US-0505) | Byggd; US-0505 sammanslagen (commit `146efa2`, PR #11) |
| EPIC-06 | Feature-dokument: Features-vy, projektinställningar | Byggd |

Statusen kommer från `docs/features/epic-04-branding-and-desktop.md` och commit-historiken.

## Designlyftet (US-0402/US-0403, sammanslaget)

Designlyftet ersatte projektflikarna i sidhuvudet med en vänsterarm av LCARS-block (projekt, vyer, Kostnad, Github, Inställningar), införde färgtokens (bakgrund `#05060a`, skiffer, stålblå, korall; Auctum-amber för märket och den primära åtgärden), LCARS-primitiver i `Lcars.jsx` och en global inställning "Animationer: Full / Dämpad / Av" i en egen dialog (`AppSettingsDialog`). Detaljer i `component-inventory.md`.

## Helskärm och appmeny (US-0404, levererad)

Appen har en egen meny (`src/main/menu.js`, `Menu.setApplicationMenu`) med svenska etiketter, utan Reload/DevTools i paketerad app, och helskärm via meny, genväg, macOS gröna knapp och LCARS-knappen `fullscreen-toggle` i sidhuvudet. Helskärmsläget sparas som `fullscreen` i `settings.json`. Varje menykommando når renderaren som `menu:command`. Hjälp-menyn visar projektets `docs/README.md` i `DocsDialog` eller öppnar AI-DLC:s webbsida.

## Väntande frågor (US-0505, levererad)

Main härleder väntande frågor och öppna gates ur alla öppna projekts audit-shards (`src/main/questions.js`), skickar dem till renderaren (`questions:changed`) och visar en systemnotis (`src/main/notify.js`, titel "<projekt>: Claude väntar på ditt svar"). Renderaren visar en LCARS-popup (`QuestionPopup`) med "Svara i Claude", och inställningen "Popup och notis / Bara popup / Av" samt notisljud sparas som `questionAlerts` och `notificationSound`. Dessa filer är bara skummade i denna skanning; se `component-inventory.md`.

## Denna intent

Intent `261113-thadeus-name` (express) ska genomföra US-0406 (`docs/features/epic-04-branding-and-desktop.md`): byta appens namn från "Auctum AIDLC Control" till **T.H.A.D.E.U.S.** (*Transformative Human-AI Development Environment for Ubiquitous Systems*, tagline *AI-driven software development, under human direction.*) överallt där en användare ser det:

- splashen, märkesblocket i sidhuvudets armbåge, fönstertiteln och `<title>`;
- macOS-appmenyn ("Om T.H.A.D.E.U.S.", "Göm …", "Avsluta …") och About-panelen;
- Dock- och startnamnet, Linux `.desktop`-posten, `productName` i `package.json` och `electron-builder.yml`;
- releasens titel i GitHub Actions och artefaktnamnen (`THADEUS-<version>-universal.dmg`, `thadeus_<version>_amd64.deb`);
- README.

Kortformen "THADEUS" används där punkter inte fungerar (bundle och installationsfil), `thadeus` för paketet. Repo-namnet `aidlc-dash` är oförändrat. Auctum-märket står kvar i sidhuvudet, på splashen och som appikon. Sparade inställningar, öppna projekt och fönsterläget ska överleva uppgraderingen: userData-mappen förblir `aidlc-dash`. Var namnet förekommer i dag och vilka risker bytet har finns i `component-inventory.md` (Packaging Config, Main Entry, App Menu, Splash, App Shell) och `code-quality-assessment.md`.

## Affärsregler som påverkar gränssnittet

- Status visas aldrig enbart med färg (FR9.3, NFR3): varje tagg har text.
- Brödtext ska ha minst 4,5:1 kontrast mot `--bg` och `--panel` (NFR3, WCAG AA); gäller även det nya namnet och underraden (US-0406).
- Inga Star Trek-varumärken, logotyper, ljud eller kopierade resurser (FR9.5). Den enda logotypen är Auctum-märket.
- Alla kostnader är uppskattningar och märks så (`COST_LABEL`).
- Dekorativa siffror får inte se ut som riktiga data (US-0403).
- Appen skriver bara sin egen `settings.json` i userData (mappen `aidlc-dash`, oberoende av appens namn).

Komponentdetaljer finns i `component-inventory.md`, arkitektur i `architecture.md`.
