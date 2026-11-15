# Requirements Analysis — frågor

Feature-dokumentet `docs/features/epic-01-bridge-console-mvp.md` beskriver redan vad appen ska göra (US-0101–US-0110). Frågorna nedan gäller bara det som dokumentet lämnar öppet.

## Q1. [Utvecklare] Vilken teknik ska renderaren (gränssnittet) byggas med?

Det påverkar hela kodbasen och hur lätt det blir att bygga vyerna (pipeline, tidslinje, DAG). Huvudprocessen blir Node/Electron oavsett.

A. React + TypeScript med electron-vite (Vite-baserad hot reload, stort ekosystem för markdown, grafer och xterm.js)
B. Svelte + TypeScript med electron-vite (mindre kod och lättare paket, mindre ekosystem)
C. Vanilla TypeScript utan ramverk (minst beroenden, mer handskriven UI-kod)
D. React med vanlig JavaScript (som a reference project) i stället för TypeScript
X. Other (please specify)

[Answer]: D

## Q2. [Produkt] Hur ska den inbäddade terminalen starta?

Avgör om appen själv startar `claude` eller bara ger dig ett skal i projektmappen.

A. Starta `claude` direkt i projektmappen när terminalpanelen öppnas första gången. Starta om med en knapp när processen avslutas.
B. Starta ditt inloggningsskal (zsh) i projektmappen. Du skriver `claude` själv, och en knapp skriver in det åt dig.
C. Båda: en flik med `claude` och en flik med ett vanligt skal
X. Other (please specify)

[Answer]: C

## Q3. [Produkt] Ska man kunna ha flera projekt öppna samtidigt?

US-0101 säger att man väljer en projektmapp, men inte om flera kan vara öppna samtidigt.

A. Ett projekt åt gången. Man byter via en lista över senast öppnade projekt (enklast).
B. Ett fönster per projekt, så att flera fönster kan vara öppna samtidigt
C. Flikar för flera projekt i samma fönster
X. Other (please specify)

[Answer]: C

## Q4. [Utvecklare] Hur långt ska paketeringen gå i den här omgången?

US-0110 säger att `npm run build` ska ge en macOS-app. Signering och notarisering kräver ett Apple Developer-konto.

A. Osignerad lokal macOS-build (.app/.dmg) för eget bruk. Signering och notarisering kommer senare.
B. Signerad och notariserad macOS-build redan nu
C. Bara `npm run dev` nu. Paketeringen kommer i en senare omgång.
X. Other (please specify)

[Answer]: A
