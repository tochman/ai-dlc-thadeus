# Requirements Analysis — frågor (bugfix: Linux 22.04 och appikon)

## Diagnos

`.deb`-paketet i v0.1.0 innehåller en terminalmodul (`node-pty/build/Release/pty.node`) som kräver **glibc 2.42**. Det beror på att den byggdes på `ubuntu-latest` i GitHub Actions. Ubuntu 22.04 har glibc 2.35. `src/main/ipc.js` importerar terminalmodulen när appen startar, så hela huvudprocessen kraschar innan något fönster öppnas.

Electron-binären (`auctum-aidlc-control`) kräver bara glibc 2.25, så den är inte orsaken.

Det här är redan beslutat: minsta Linux-version är Ubuntu 22.04 LTS (från beställningen). `build-linux` ska köras på `ubuntu-22.04` i stället för `ubuntu-latest` (användaren 2026-11-13: "we need to change build-linux runs-on").

## Q1. [Utvecklare] Ska appen starta även om terminalmodulen inte går att ladda?

Det är ett extra skydd. Laddas terminalmodulen först när en terminalflik öppnas, så startar resten av appen (intents, pipeline, tidslinje, kostnad) även om modulen saknas eller är inkompatibel. Terminalpanelen visar då ett tydligt felmeddelande.

A. Ja. Ladda terminalmodulen först när den behövs och visa ett felmeddelande i terminalpanelen om det misslyckas.
B. Nej. Det räcker att bygga på 22.04 och lägga till CI-kontrollen.
X. Other (please specify)

[Answer]: A

## Q2. [Design] Hur ska appikonen se ut?

Ikonen byggs av den nya geometriska Auctum-loggan (`visinv/public/auctum.svg`). Startskärmen visar loggan i amber på nästan svart bakgrund.

A. Amber logga på en mörk rundad kvadrat, samma uttryck som startskärmen
B. Vit logga på en amber rundad kvadrat, som syns bra i både ljus och mörk Dock
C. Svart logga på vit rundad kvadrat, neutral som Auctums vanliga logga
X. Other (please specify)

[Answer]: A
