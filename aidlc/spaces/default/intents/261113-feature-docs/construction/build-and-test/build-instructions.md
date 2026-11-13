# Bygginstruktioner — EPIC-06

Underlag: `construction/code-generation/code-summary.md`.

- **Krav:** Node enligt `.nvmrc`. Kör `npm ci`. Inga nya beroenden har tillkommit.
- **Utvecklingsbygge:** `npx electron-vite build` (exit 0).
- **Paket:** `npm run build:mac` och `npm run build:linux`, som körs i GitHub Actions utan ändringar.
