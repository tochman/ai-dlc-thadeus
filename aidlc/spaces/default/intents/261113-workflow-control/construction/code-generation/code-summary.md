# Kodsammanfattning — EPIC-05 Workflow Control

Underlag: `requirements.md` för den här intenten och kodbaskunskapen `aidlc/spaces/default/codekb/aidlc-dash/`.

## Skapade filer

- **Huvudprocessen:**
  - `src/main/exec.js` (`runFixed`, `loginPath`, flyttade ur `models.js`)
  - `src/main/git.js` (läsande git: status, fetch, fjärrändringar, `showRemoteFile`, konflikter)
  - `src/main/setup.js` (`getSetupInfo`, `buildSetupCommand`, `parsePreview`)
- **Renderaren:**
  - `src/renderer/terminalControl.js` (ledig/arbetar/avslutad, `waitFor`, `runSequence`)
  - `src/renderer/TerminalContext.jsx`
  - `src/renderer/ResumeButton.jsx`
  - `src/renderer/RefreshPanel.jsx`
  - `src/renderer/SetupAidlc.jsx`
- **Tester:**
  - `tests/main/git.test.js` (4)
  - `tests/main/setup.test.js` (3)
  - `tests/renderer/terminalControl.test.jsx` (3)
  - `tests/renderer/ResumeButton.test.jsx` (3)
  - `tests/renderer/RefreshPanel.test.jsx` (2)
  - `tests/renderer/SetupAidlc.test.jsx` (2)

## Ändrade filer

- **Huvudprocessen och preload:**
  - `src/main/models.js`
  - `src/main/watcher.js` (`watchForAidlc`)
  - `src/main/ipc.js` (7 nya kanaler, `project:detected`, bevakning av mappar utan AI-DLC)
  - `src/preload/index.js`
- **Renderaren:**
  - `TerminalPanel.jsx`, `ProjectView.jsx`, `App.jsx`
  - `IntentList.jsx`, `IntentDetail.jsx`
  - `useProject.js` (`lastIntentChangeAt`)
  - `ArtifactReader.jsx` (exporterar `FileContent`)
  - `format.js`, `theme.css`
- **Tester och dokument:**
  - `tests/main/watcher.test.js` (+1)
  - `docs/features/epic-05-workflow-control.md` (status, besluten för US-0502 och den nya US-0504)
  - `docs/FEATURES.md`
- `src/main/projectAccess.js` är oförändrad. Appen skriver inga AI-DLC-filer.

## Viktiga beslut

- **Ledig-signalen:** en flik räknas som ledig efter 1,5 s tystnad. Bara bytet av intent skickas med Enter, och intentnamnet kontrolleras först mot `^[A-Za-z0-9][A-Za-z0-9._-]*$`.
- **Git:**
  - ref måste vara grenens upstream, eller `origin/main` när upstream saknas
  - värden som börjar med `-` eller innehåller radbrytning avvisas
  - `git show` används med `<ref>:./<rel>`, där sökvägen bara får ligga under `aidlc/`
- **"AI-DLC arbetar":** claude-fliken är `busy`, eller något under intents/ har ändrats under de senaste 5 minuterna (`lastIntentChangeAt`). Det kan stänga av "Hämta in" även efter en egen pull. Det är medvetet försiktigt.
- **`watchForAidlc`:** slår till när den första space-mappen dyker upp, inte redan när `aidlc/spaces` skapas, eftersom det är då som `detectProject` godtar projektet.
- **Plugins:** de valideras i huvudprocessen mot listan från det senaste `setup:info`.

## Testtäckning

- 57/57 gröna (`npx vitest run tests/`), varav 18 nya. `npx electron-vite build` går igenom.

## Inte verifierat i det här steget

- `TerminalContext` och `TerminalPanel` med riktig pty, och omstarten efter uppsättning. Inget av detta har renderartester.
- Felmeddelandet i FR4.8 visas bara om shell-fliken avslutas med en annan kod än 0. Ett misslyckat kommando i ett interaktivt skal avslutar inte skalet, så felet syns oftast bara i terminalen.
- Formatet för konfliktlistan från `aidlc config --dry-run` är en gissning. Antalet och den råa utskriften stänger ändå av "Initiera".
- Om projektroten ligger under repots rot räknas alla ändringar som "övrigt" (markerat med en `ponytail:`-kommentar).

Allt detta kontrolleras manuellt i Build and Test.

## Loop-back 1 (F-01 och F-02 från Build and Test)

- **F-01:** `scripts/fix-pty-perms.cjs` sätter körrättighet på node-pty:s `spawn-helper`. Det körs i `postinstall` (`electron-builder install-app-deps && node scripts/fix-pty-perms.cjs`) och testas i `tests/main/ptyPerms.test.js` (2 fall).
- **F-02:** `setup.js` kör förhandsvisningen med `--project-dir <root>`, och kommandokedjan skriver `aidlc --project-dir . config --harness claude --yes`. `parsePreview` tolkar också `merge`, `preserve`, `remove` och `notes`, och `SetupAidlc.jsx` visar notes som varning.
- 61/61 tester gröna.
- **Kontrollerat i riktig Electron:**
  - claude-fliken startar i visinv och växlar mellan "ledig" och "arbetar"
  - förhandsvisningen visar create=360 och conflict=0
  - kommandot får `--project-dir .`

## Avvikelser från planen

- Testet heter `tests/renderer/terminalControl.test.jsx` i stället för `.js`, eftersom `vitest.config.mjs` bara tar med `.jsx` för renderaren. `unit-test-instructions.md` är uppdaterad.
- `createActivity` tar bara emot `quietMs`. Fejkade timers räcker för testerna.
