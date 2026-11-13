# Krav — EPIC-04 US-0406 Namnet T.H.A.D.E.U.S.

Källor:
- `docs/features/epic-04-branding-and-desktop.md` (US-0406)
- svaren i `requirements-analysis-questions.md` (Q1: B, Q2: B, Q3: B)
- kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/` och `inception/reverse-engineering/developer-scan.md`

## Avsiktsanalys

Appen ska heta T.H.A.D.E.U.S. överallt där användaren ser namnet, och namnet ska föras igenom rent:
- sidhuvudet visar bara namnet [Q1]
- appen får ett nytt appId på macOS [Q2]
- Linux-paketet får ett nytt namn som ersätter det gamla [Q3]

Auctum-symbolen står kvar som ikon och märke. Inställningar och öppna projekt överlever bytet.

## Namnformer

| Form | Värde | Används för |
|------|-------|-------------|
| Visningsnamn | `T.H.A.D.E.U.S.` | All text i UI, menyer, fönstertitel, About-panelen, startposten på Linux och README |
| Utskrivet namn | `Transformative Human-AI Development Environment for Ubiquitous Systems` | Startskärmen, About-panelen och README |
| Tagline | `AI-driven software development, under human direction.` | Startskärmen, About-panelen och README |
| Kortform | `THADEUS` | `productName` (appbundlen `THADEUS.app`), titeln på dmg-filen |
| Paketform | `thadeus` | `name` i package.json (deb-paketet), `executableName` |
| appId | `se.auctum.thadeus` | Bundle-id [Q2] |

## Funktionella krav

### FR1 — En källa för namnet
- **FR1.1** Namnformerna ligger på ett ställe. En liten modul, till exempel `src/shared/appName.js`, används av både main och renderer. Inget annat ställe i koden skriver namnet själv.

### FR2 — I appen
- **FR2.1** Sidhuvudets armbåge visar Auctum-symbolen och **bara** "T.H.A.D.E.U.S." på en rad [Q1]. Underraden "Aidlc control" tas bort. Texten får plats utan att klippas vid 1100 px bredd.
- **FR2.2** Startskärmen visar Auctum-symbolen och "T.H.A.D.E.U.S." som stor rubrik, under den det utskrivna namnet och taglinen. Texten radbryts eller krymper i stället för att flöda över vid 1100 px. Kontraktet `role="img"` med namnet "Auctum" och `is-leaving` behålls.
- **FR2.3** Fönstertiteln och `<title>` är "T.H.A.D.E.U.S.".
- **FR2.4** Menyn på macOS visar "Om T.H.A.D.E.U.S.", "Göm T.H.A.D.E.U.S." och "Avsluta T.H.A.D.E.U.S.". About-panelen (`setAboutPanelOptions`) visar namnet, versionen, det utskrivna namnet och taglinen samt "© Auctum".

### FR3 — Paketering och release
- **FR3.1** `electron-builder.yml` och `package.json`:
  - `appId: se.auctum.thadeus` [Q2]
  - `productName: THADEUS`
  - `name: thadeus`, så att deb-paketet heter `thadeus` [Q3]
  - `executableName: thadeus`
  - startposten på Linux visar "T.H.A.D.E.U.S."
  - `artifactName` ger `THADEUS-<version>-universal.dmg` och `thadeus_<version>_amd64.deb`
- **FR3.2** deb-paketet markeras som att det ersätter och krockar med `aidlc-dash` [Q3], via fpm-flaggorna `--replaces aidlc-dash` och `--conflicts aidlc-dash` i `deb.fpm`. Då tas det gamla paketet bort när det nya installeras. Det verifieras på det byggda paketet med `dpkg-deb -f`.
- **FR3.3** Releasetiteln i `release.yml` blir "T.H.A.D.E.U.S. <tagg>". Globbarna fortsätter att hitta filerna.

### FR4 — Inget förloras
- **FR4.1** userData stannar i `aidlc-dash` (`app.setPath('userData', …)` står kvar och kommentaren skrivs om). Inställningar, öppna projekt och fönsterläge finns kvar efter uppgraderingen.
- **FR4.2** README beskriver uppgraderingen från "Auctum AIDLC Control":
  - **macOS:** den nya appen är en ny app (nytt appId). Ta bort den gamla från Program. Behörigheten för notiser och Dock-fästet görs om. Första start kräver högerklick och Öppna, eftersom appen inte är signerad.
  - **Linux:** det nya paketet ersätter det gamla automatiskt.

### FR5 — Text och dokumentation
- **FR5.1** README inleds med namnet, det utskrivna namnet och taglinen. Alla användarsynliga förekomster av det gamla namnet i appen och README är borta. Feature-dokumenten nämner det gamla namnet bara som historik.

## Icke-funktionella krav

- **NFR1 — Layout och kontrast:** sidhuvudet och startskärmen håller i LCARS-ramarna vid 1100 × 800 och 2560 × 1440. Ingen text klipps eller flödar över. AA-kontrast.
- **NFR2 — Regression:** alla tester är gröna. Tester som kontrollerar namnet uppdateras (`menu.test.js`, `Splash.test.jsx`, `AppShell.test.jsx`). Ett nytt test kontrollerar att namnmodulen används för fönstertitel och meny.

## Begränsningar

- Inga nya beroenden. Repo-namnet `aidlc-dash` och userData-mappen ändras inte.

## Antaganden

- `[assumption]` Kortformen THADEUS används för bundlen och dmg-filen, eftersom punkter i ett appnamn ger mapp- och filnamn med punkter. Visningsnamnet med punkter används överallt i UI:t.
- `[assumption]` "© Auctum" i About-panelen är rätt avsändare.

## Utanför omfånget

- En ny ikon. Auctum-symbolen står kvar.
- Signering och notarisering för macOS.

## Öppna frågor

None.
