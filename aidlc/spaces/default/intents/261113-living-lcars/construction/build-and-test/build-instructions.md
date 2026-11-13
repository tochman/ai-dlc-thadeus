# Bygginstruktioner — EPIC-04 US-0402 och US-0403

Underlag: `construction/code-generation/code-summary.md`.

- **Förberedelser:** Node enligt `.nvmrc` och `npm ci`. Inga nya beroenden. Antonio laddas från den lokalt bundlade `@fontsource/antonio` (CSP).
- **Utvecklingsbygge:** `npx electron-vite build` (exit 0).
- **Paket:** `npm run build:mac` och `npm run build:linux`. GitHub Actions kör dem utan ändringar.
