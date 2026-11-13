# Bygginstruktioner — EPIC-05

Underlag: `construction/code-generation/code-summary.md`.

- **Krav:** Node enligt `.nvmrc`. Kör `npm ci`. `postinstall` kör nu också `scripts/fix-pty-perms.cjs`, som sätter körrättighet på node-pty:s `spawn-helper` (F-01).
- **Utvecklingsbygge:** `npx electron-vite build` (exit 0).
- **Paket:** `npm run build:mac` ger en universell dmg och `npm run build:linux` ger en deb. Releasen byggs i GitHub Actions. Där kör `npm ci` samma postinstall, så den paketerade Mac-appen får körbara `spawn-helper`.
- **Beroenden:** inga nya beroenden.
