# Bygginstruktioner — EPIC-02

Underlag: `construction/code-generation/code-summary.md`.

- Krav: Node enligt `.nvmrc`, `npm ci`.
- Utvecklingsbygge: `npx electron-vite build` (exit 0, se `test-results.md`).
- Paket: `npm run build:mac` (universell dmg) och `npm run build:linux` (deb). Releasen byggs i GitHub Actions (`.github/workflows/release.yml`), Linux på `ubuntu-22.04` med `scripts/check-glibc.mjs`.
- Inga nya beroenden i EPIC-02.
