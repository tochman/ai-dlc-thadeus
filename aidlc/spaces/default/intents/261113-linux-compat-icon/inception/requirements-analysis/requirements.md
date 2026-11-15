# Krav — Bugfix: Linux-kompatibilitet (Ubuntu 22.04) och Auctum-appikon

Källor:
- beställningen
- svaren i `requirements-analysis-questions.md` (Q1 och Q2)
- kodbas-kunskapen i `aidlc/spaces/default/codekb/aidlc-dash/`: `business-overview.md`, `architecture.md` och `code-structure.md`
- `docs/features/epic-04-branding-and-desktop.md` (US-0401)

## Avsiktsanalys

Linux-paketet i v0.1.0 startar inte på Ubuntu 22.04, som är användarens Linux-maskin. Appen ska fungera på Ubuntu 22.04 LTS och nyare, och ett liknande glapp ska upptäckas i CI i framtiden. I samma omgång ska appen få Auctum-ikonen i stället för Electrons standardikon (US-0401).

## Grundorsak

Enligt `architecture.md` och `code-structure.md` importerar huvudprocessen `node-pty` via `src/main/ipc.js` → `src/main/pty.js` när appen startar. I det publicerade `.deb`-paketet är `node-pty/build/Release/pty.node` byggd på `ubuntu-latest` och kräver symbolen `GLIBC_2.42`. Ubuntu 22.04 har glibc 2.35, så modulen går inte att ladda och huvudprocessen kraschar innan något fönster öppnas. Electron-binären kräver bara `GLIBC_2.25`.

## Funktionella krav

### FR1 — Linux-bygget ska fungera på Ubuntu 22.04 och nyare
- **FR1.1** `build-linux` i `.github/workflows/release.yml` ska köras på `ubuntu-22.04` i stället för `ubuntu-latest` (glibc 2.35), så att native-moduler länkas mot glibc 2.35 eller äldre.
- **FR1.2** CI ska stoppa Linux-bygget om någon ELF-binär i paketet (Electron och alla `.node`-filer under `app.asar.unpacked`) kräver en `GLIBC_`-version högre än 2.35. Felmeddelandet ska ange fil och version.
- **FR1.3** Det bundna Linux-paketet ska bara innehålla node-pty-binärer för Linux, inte för Windows eller macOS.

### FR2 — Appen startar även utan fungerande terminalmodul (Q1: A)
- **FR2.1** `node-pty` laddas först när en terminalsession startas, inte när appen startar.
- **FR2.2** Om terminalmodulen inte går att ladda ska resten av appen fungera som vanligt: projektflikar, intents, pipeline, tidslinje, DAG och artefaktläsare.
- **FR2.3** Terminalpanelen ska då visa ett felmeddelande med orsaken (modulens felmeddelande) i stället för en tom terminal. Felet ska också loggas i huvudprocessens konsol.

### FR3 — Auctum-appikon (US-0401, Q2: A)
- **FR3.1** Ikonen är den nya geometriska Auctum-loggan (samma paths som `src/renderer/AuctumMark.jsx`) i amber `#ff9e40`, på en nästan svart (`#0b0b10`) rundad kvadrat med macOS-standardmarginal. Den ska inte byggas av de äldre varianterna i `a reference project/public/logos/`.
- **FR3.2** macOS: `build/icon.icns` med alla storlekar. Dock, Finder, appväxlaren och `.dmg`-fönstret ska visa Auctum-ikonen, och electron-builder ska inte längre varna "default Electron icon is used".
- **FR3.3** Linux: PNG-ikoner i storlekarna 16–512 px, som används av `.desktop`-posten i `.deb`. Programmenyn och fönsterlistan ska visa ikonen. Fönstret får dessutom samma ikon via `BrowserWindow`-optionen `icon` på Linux.
- **FR3.4** Under `npm run dev` på macOS ska Dock-ikonen också vara Auctum (`app.dock.setIcon`).
- **FR3.5** SVG-källan och skriptet som genererar ikonerna ska vara incheckade, så att ikonerna kan genereras om med ett kommando.

## Icke-funktionella krav

- **NFR1 — Kompatibilitet:** `.deb`-paketet installeras med `apt` och startar på Ubuntu 22.04 LTS (glibc 2.35) och nyare. Det verifieras genom CI-kontrollen i FR1.2 och ett manuellt smoke-test på användarens 22.04-maskin.
- **NFR2 — Ingen regression:** Alla befintliga 20 Vitest-tester ska vara gröna. macOS universal-bygget ska fortsätta fungera.

## Begränsningar

- Bugfix-scope: minsta möjliga ändring. Ingen ändring av vyernas beteende utöver FR2.
- Versionen höjs till `v0.1.1` när rättelsen släpps (patch).
- Arbetet görs på grenen `fix/linux-compat-and-icon`.

## Antaganden

- Användarens fel på 22.04 beror på glibc-kravet i `pty.node`. Det stämmer med analysen av binärerna, men användaren har inte skickat terminalutskriften. Om felet kvarstår efter v0.1.1 behövs utskriften från `auctum-aidlc-control` startad i en terminal.
- GitHubs `ubuntu-22.04`-runner finns kvar under releasens livstid.

## Utanför omfånget

- Signering och notarisering, Windows, AppImage
- Stöd för Linux-versioner äldre än Ubuntu 22.04, till exempel 20.04 med glibc 2.31

## Öppna frågor

Inga.
