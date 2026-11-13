# Bygginstruktioner — EPIC-03

Underlag: `construction/code-generation/code-summary.md`.

- **Krav:** Node enligt `.nvmrc`. Kör `npm ci`, som installerar `@tanstack/react-virtual` `3.14.24` (exakt version) och `@tanstack/virtual-core` `3.19.9`.
- **Utvecklingsbygge:** `npx electron-vite build` (exit 0).
- **Paket:** `npm run build:mac` (universell dmg) och `npm run build:linux` (deb), i GitHub Actions. Det nya beroendet är ren JavaScript utan nativa delar, så paketeringen påverkas inte.
