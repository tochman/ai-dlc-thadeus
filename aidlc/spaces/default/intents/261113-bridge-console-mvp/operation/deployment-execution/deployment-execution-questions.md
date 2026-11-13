# Deployment Execution — frågor

Kontroller före release: 20/20 tester gröna, `electron-vite build` och den lokala macOS-paketeringen är verifierade (Build and Test), repot `tochman/aidlc-dash` är privat med `main` som standardgren. Allt arbete ligger ännu ocommittat på grenen `feat/epic01-bridge-console-mvp`. Det finns inga databasmigreringar och inga beroende tjänster.

Att släppa v0.1.0 betyder: committa, få in koden på `main`, tagga `v0.1.0` och pusha. Då startar `.github/workflows/release.yml`.

## Q1. [Release] Hur ska koden komma in på `main`?

A. Pull request från `feat/epic01-bridge-console-mvp` till `main` som jag skapar och mergar (squash), sedan tagg `v0.1.0` på `main`
B. Pull request som jag skapar, men du granskar och mergar själv; jag taggar när du säger till
C. Direkt merge till `main` lokalt utan PR, sedan tagg och push
X. Other (please specify)

[Answer]: B

## Q2. [Release] Vilken version ska första releasen ha?

A. `v0.1.0` (nuvarande version i `package.json`)
B. `v1.0.0`
X. Other (please specify)

[Answer]: A

## Q3. [Release] Är pull requesten mergad till `main`?

PR #1: https://github.com/tochman/aidlc-dash/pull/1. När den är mergad taggar jag `v0.1.0` på `main` och följer release-workflowen.

A. Ja, den är mergad
B. Inte än. Jag hör av mig.
X. Other (please specify)

[Answer]: A

## Q4. [Release] Hur ska releasen göras om efter rättelsen av macOS-bygget?

Körningen för `v0.1.0` fallerade i `build-mac`: node-pty:s färdigbyggda binärer stoppade sammanslagningen till en universal app. `verify` och `build-linux` gick igenom. Ingen GitHub Release skapades, så `v0.1.0` har aldrig publicerats. Rättelsen ligger i PR #2: https://github.com/tochman/aidlc-dash/pull/2. Universal-bygget är verifierat lokalt.

A. Merga PR #2. Sedan flyttar jag taggen `v0.1.0` till den nya `main` och kör releasen igen. Det går, eftersom `v0.1.0` aldrig publicerades.
B. Merga PR #2. Sedan släpper jag `v0.1.1` i stället, med en versionshöjning i `package.json` via en PR till.
X. Other (please specify)

[Answer]: A

## Q5. [Release] Är PR #2 mergad till `main`?

När den är mergad flyttar jag `v0.1.0` till den nya `main` och följer release-workflowen.

A. Ja, den är mergad
B. Inte än
X. Other (please specify)

[Answer]: A
