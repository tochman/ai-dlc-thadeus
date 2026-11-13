# Affärsöversikt: aidlc-dash (Auctum AIDLC Control)

## Syfte

Auctum AIDLC Control är en skrivbordsapp (Electron) för utvecklare på Auctum Solutions AB som arbetar med AI-DLC. Den visar läget i ett eller flera AI-DLC-projekt som en "bridge console": intents, deras pipeline av stages, en levande tidslinje från audit-loggen, unit-DAG, kostnad per intent och modell, och projektets feature-dokument. Bredvid visningen finns en inbäddad terminal med två flikar (`claude` och `shell`) där personen styr arbetet.

Appen är skrivskyddad mot AI-DLC-filer. Allt som ändrar något (`/aidlc`-kommandon, `git pull`, AI-DLC-uppsättning) skrivs in i en synlig terminalflik och körs först när personen trycker Enter.

## Användare

- Utvecklare som kör AI-DLC i Claude Code och vill se vad agenterna gör medan de arbetar.
- Konsolen hålls öppen hela dagen, ofta på en egen skärm, vilket gör läsbarhet, kontrast, lugn rörelse och helskärm viktiga (EPIC-04).

## Huvudfunktioner (per epic i `docs/FEATURES.md`)

| Epic | Innehåll | Status |
|------|----------|--------|
| EPIC-01 | Grundkonsolen: projektflikar, intent-lista, detaljvy (Pipeline, Tidslinje, Units, Filer), terminal, splash och Auctum-märke, LCARS-tema | Släppt v0.1.0 |
| EPIC-02 | Kostnad och modeller från `usage-ledger.json` och `aidlc config models` | Byggd, ej släppt |
| EPIC-03 | Virtualiserad tidslinje med precisa liveuppdateringar | Byggd, ej släppt |
| EPIC-04 | Ikon och OS-integration (US-0401), glöd och rörelse (US-0402), LCARS-designuppdatering (US-0403), helskärm och egen appmeny (US-0404), inställningsvy (US-0405) | US-0401 släppt v0.1.1; US-0402 och US-0403 byggda (designlyftet, intent `261113-living-lcars`), ej släppta; US-0404 planerad; US-0405 planerad efter v0.2.0 |
| EPIC-05 | Arbetsflödesstyrning: Fortsätt, Uppdatera från GitHub, Initiera AI-DLC | Byggd, ej släppt |
| EPIC-06 | Feature-dokument: Features-vy, projektinställningar | Byggd, ej släppt |

## Designlyftet (US-0402/US-0403, sammanslaget)

Designlyftet ersatte projektflikarna i sidhuvudet med en vänsterarm av LCARS-block (projekt, vyer, Kostnad, Github, Inställningar), införde färgtokens (bakgrund `#05060a`, skiffer, stålblå, korall; Auctum-amber för märket och den primära åtgärden), LCARS-primitiver i `Lcars.jsx` och en global inställning "Animationer: Full / Dämpad / Av" i en egen dialog (`AppSettingsDialog`). Detaljer i `component-inventory.md`.

## Denna intent

Intent `261113-fullscreen-menu` (express) ska genomföra US-0404:

- **Helskärm** via menyposten "Helskärm", standardgenvägen (macOS `Ctrl+Cmd+F`, Linux `F11`) och ett LCARS-block i appen; på macOS används det inbyggda helskärmsläget. Valet sparas i appens `settings.json` och appen öppnar i helskärm om den stängdes så.
- **Egen appmeny** (`Menu.setApplicationMenu`) med bara det appen gör: appmeny på macOS ("Om Auctum AIDLC Control", "Inställningar…", dölj, avsluta), Arkiv/Projekt, Redigera, Visa (samma vyer som vänsterarmen, Helskärm, zoom), Terminal, Fönster (macOS) och Hjälp.
- **Borttaget i paketerad app**: Reload, Force Reload, Toggle Developer Tools och Electron-länkar. I `npm run dev` finns en "Utveckling"-meny kvar.
- **Linux**: menyraden är dold som standard (`autoHideMenuBar`) och visas med `Alt`.
- Menyetiketter på svenska med samma namn som vänsterarmen; varje menykommando går genom samma funktion som knappen i appen; poster som kräver ett öppet projekt är inaktiverade utan projekt.

## Affärsregler som påverkar gränssnittet

- Status visas aldrig enbart med färg (FR9.3, NFR3): varje tagg har text.
- Brödtext ska ha minst 4,5:1 kontrast mot `--bg` och `--panel` (NFR3, WCAG AA).
- Inga Star Trek-varumärken, logotyper, ljud eller kopierade resurser (FR9.5). Den enda logotypen är Auctum-märket.
- Alla kostnader är uppskattningar och märks så (`COST_LABEL`).
- Dekorativa siffror får inte se ut som riktiga data (US-0403).
- Appen skriver bara sin egen `settings.json` i userData (gäller även det sparade helskärmsläget).

Komponentdetaljer finns i `component-inventory.md`, arkitektur i `architecture.md`.
