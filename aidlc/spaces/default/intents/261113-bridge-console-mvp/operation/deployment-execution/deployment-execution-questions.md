# Deployment Execution — frågor

Kontroller före release: 20/20 tester gröna, `electron-vite build` och den lokala macOS-paketeringen är verifierade (Build and Test), repot `tochman/aidlc-dash` är privat med `main` som standardgren. Allt arbete ligger ännu ocommittat på grenen `feat/epic01-bridge-console-mvp`. Det finns inga databasmigreringar och inga beroende tjänster.

Att släppa v0.1.0 betyder: committa, få in koden på `main`, tagga `v0.1.0` och pusha. Då startar `.github/workflows/release.yml`.

## Q1. [Release] Hur ska koden komma in på `main`?

A. Pull request från `feat/epic01-bridge-console-mvp` till `main` som jag skapar och mergar (squash), sedan tagg `v0.1.0` på `main`
B. Pull request som jag skapar, men du granskar och mergar själv; jag taggar när du säger till
C. Direkt merge till `main` lokalt utan PR, sedan tagg och push
X. Other (please specify)

[Answer]:

## Q2. [Release] Vilken version ska första releasen ha?

A. `v0.1.0` (nuvarande version i `package.json`)
B. `v1.0.0`
X. Other (please specify)

[Answer]:
