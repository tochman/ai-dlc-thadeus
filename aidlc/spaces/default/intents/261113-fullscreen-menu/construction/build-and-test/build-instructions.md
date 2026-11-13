# Bygginstruktioner — EPIC-04 US-0404

Underlag: `construction/code-generation/code-summary.md`.

- **Förberedelser:** Node enligt `.nvmrc` och `npm ci`. Inga nya beroenden.
- **Utvecklingsbygge:** `npx electron-vite build` (exit 0). `npm run dev` visar menyn "Utveckling".
- **Paket:** `npm run build:mac` och `npm run build:linux`. Den paketerade appen har ingen menyn "Utveckling" (`app.isPackaged`).
