# Build Instructions: US-1201

- **Förberedelse:** Node från `.nvmrc`, sedan `npm ci`. Storyn lägger inte till några beroenden; `safeStorage` finns redan i Electron.
- **Verktyg för plattformarna:** för att använda dem i appen behövs `gh` för GitHub och `glab` för GitLab, båda inloggade. Bitbucket kräver användarnamn och app-lösenord, som anges i Inställningar › Verktyg. Inget av detta behövs för testerna.
- **Bygg:** `npx electron-vite build` (main, preload och renderer till `out/`). Paketeringen till `.dmg` och `.deb` görs vid release.
- **Kontrollera:**
  - `npx vitest run tests/ --coverage`: hela sviten och golvet på 80 % radtäckning.
  - `npx eslint .` och `npx prettier --check .`: samma steg som CI kör.
- **Git-version:** krockkontrollen använder `git merge-tree --write-tree`, som kräver git 2.38 eller senare.
