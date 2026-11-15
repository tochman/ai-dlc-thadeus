# Testresultat — EPIC-05 Workflow Control

Underlag: `construction/code-generation/code-generation-plan.md`, `unit-test-instructions.md` och `code-summary.md`.

## Enhetstester och bygge

| Kommando | Exit | Resultat |
|----------|------|----------|
| `npx vitest run tests/` | 0 | 19 filer, 61/61 gröna (efter loop-back 1) |
| `npx electron-vite build` | 0 | Bygget lyckades |

## Kontroll i riktig Electron

Kontrollen kördes med ett tillfälligt skript (`tests/.tmp/`, git-ignorerat). Inget Enter skickades i ett riktigt projekt.

| Kontroll | Resultat |
|----------|----------|
| Fortsätt-knappar i a reference project (FR2.1, FR2.5) | Visas på intents med status in-flight, t.ex. "Fortsätt vid Code Generation (steg 6 av 10)" |
| Git-status i aidlc-dash (FR3.5) | gren `feat/epic05-workflow-control`, jämfört med `origin/main` (ingen tracking), 14 ändringar under `aidlc/` och 32 övriga |
| Fetch och fjärrändringar (FR3.2, FR3.3) | Fungerar. 0 nya AI-DLC-commits mot `origin/main` |
| `showRemoteFile` med `../package.json` (NFR1) | Avvisas |
| Upptäckt av AI-DLC efter uppsättning (FR4.6) | `project:detected` kommer med `isAidlc: true` när `aidlc/spaces/default` skapas |
| `aidlc --version` (FR4.2) | `aidlc 2.11.3` |
| Claude-fliken i a reference project (FR1.2, efter loop-back 1) | Startar, och statusen växlar mellan "ledig" och "arbetar" |
| Förhandsvisning i en mapp utan AI-DLC (FR4.3, efter loop-back 1) | create=360 och conflict=0. Raden Note visas som en varning. |
| Kommandokedjan (FR4.4, efter loop-back 1) | `aidlc --project-dir . config --harness claude --yes` |
| Konsolfel i renderaren | 0 |

## Fel

### F-01 (rättad i loop-back 1): Claude-fliken startar inte på macOS ("posix_spawnp failed")
- **Repro:** öppna ett projekt. Claude-fliken visar "Kunde inte starta claude: posix_spawnp failed" och har status "avslutad". Shell-fliken drabbas på samma sätt.
- **Orsak:** `node_modules/node-pty/prebuilds/darwin-*/spawn-helper` saknar körrättighet (`-rw-r--r--`) efter installationen. node-pty startar processen via den hjälpen på macOS. På Linux används den inte, så felet syns bara på Mac. Det påverkar också den paketerade Mac-appen, eftersom den unpackade kopian behåller filrättigheterna.
- **Konsekvens:** ledig/arbetar-signalen (FR1.2) och "Fortsätt" (FR2.2, FR2.3) kan inte provas mot ett riktigt Claude.
- **Ansvarigt steg:** code-generation (bygg- och installationskonfiguration).
- **Förslag:** ett `postinstall`-skript, `scripts/fix-pty-perms.cjs`, som sätter körrättighet på `spawn-helper` för alla prebuilds. Detta görs med `fs.chmodSync`, utan något externt kommando. Skriptet körs vid `npm install`/`npm ci` lokalt och i CI. Ett test i `tests/main/` kontrollerar att filerna går att köra efter installationen.

### F-02 (rättad i loop-back 1): Förhandsvisningen för "Initiera AI-DLC" är tom (FR4.3)
- **Repro:** öppna en tom mapp. `aidlc config --harness claude --dry-run` avslutas med exit 2: "non-interactive config outside a recognized project requires --project-dir". Förhandsvisningen blir tom.
- **Orsak:** `aidlc` kräver `--project-dir` (före subkommandot) för icke-interaktiv konfiguration i en mapp som ännu inte är ett AI-DLC-projekt. Med `aidlc --project-dir <mapp> config --harness claude --dry-run` blir svaret `create=360 update=0 merge=0 preserve=1 remove=0 conflict=0` med exit 0.
- **Samma fel i kommandokedjan:** `aidlc config --harness claude --yes` i terminalen skulle misslyckas på samma sätt.
- **Ansvarigt steg:** code-generation.
- **Förslag:**
  - `setup.js` kör `aidlc --project-dir <root> config --harness claude --dry-run`. `root` är den öppnade, redan kontrollerade projektroten.
  - `buildSetupCommand` skriver `aidlc --project-dir . config --harness claude --yes`.
  - `parsePreview` tolkar även `merge=`, `preserve=` och `remove=`, och raden "Note:" visas som en varning.
  - Testerna i `tests/main/setup.test.js` uppdateras.

**Uppskattad påverkan:** ett nytt skript med ett test, cirka 10 ändrade rader i `setup.js` och uppdaterade tester. Ingen kostnad. Låg risk.

## Loop-Back Log

### Loop-back 1 — 2026-11-13T10:58:26Z
- **Diagnosis:** F-01: `spawn-helper` i node-pty:s darwin-prebuilds saknar körrättighet, så pty-flikarna startar inte på macOS. F-02: `aidlc config` kräver `--project-dir` i en mapp utan AI-DLC, så förhandsvisningen och uppsättningskommandot misslyckas.
- **Root-cause stage:** code-generation
- **Planned fix:**
  - `scripts/fix-pty-perms.cjs` som `postinstall`, med ett test.
  - `setup.js`: `aidlc --project-dir <root> config ... --dry-run` och `aidlc --project-dir . config --harness claude --yes`, och utökad tolkning av förhandsvisningen.
  - Uppdaterade tester.
- **Estimated impact:** ett nytt skript och cirka 10 ändrade rader, med tester. Ingen finansiell kostnad. Låg risk. Användaren valde "Retry with fix".
