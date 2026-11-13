# Kodkvalitet: aidlc-dash

## Snabbbedömning

| Område | Betyg | Kommentar |
|--------|-------|-----------|
| Namngivning | good | Tydliga komponent- och klassnamn, konsekventa `data-testid`; arm och meny delar namngivna funktioner |
| Funktionsstorlek | fair | De flesta funktioner är små; `App` (433 rader, render 261-431), `RefreshPanel`, `SetupAidlc`, `Timeline` och `ProjectContent` är långa men sammanhållna |
| Felhantering | good | IPC-fel loggas i main och visas med `role="alert"`; trasig `settings.json` ger standardvärden; halvskrivna AI-DLC-filer ger förra giltiga värdet; inga tysta catch utan kommentar |
| Testnärvaro | fair | Main och de flesta stateful vyer testas; `windowOptions` och menyn har egna tester; `createWindow()`, fönsterhändelserna och `useProject` saknar egna tester |
| Duplicering | fair | `errorText()` i över 10 renderarfiler (bl.a. `App.jsx`, `useProject.js`, `AppSettingsDialog.jsx`); två debounce-implementationer i `watcher.js`; dialogmönstret (`showModal`/`onCancel`) upprepas i tre dialoger |
| Död kod | good | Inga TODO/FIXME, inga `eslint-disable` i de lästa filerna |

## Tester

- **Ramverk**: Vitest 5 med två projekt (`main` i node, `renderer` i jsdom), Testing Library React.
- **main** (17 filer): `check-glibc`, `configuredModels`, `features`, `git`, `icon`, `ledger`, `menu`, `parsers`, `projectAccess`, `projectService`, `pty`, `ptyPerms`, `settings`, `setup`, `theme`, `watcher`, `windowOptions`.
- **renderer** (13 filer): `AppShell`, `CostPanel`, `FeaturesView`, `IntentDetail`, `IntentList`, `ProjectSettingsDialog`, `RefreshPanel`, `ResumeButton`, `SetupAidlc`, `Splash`, `TerminalPanel`, `Timeline`, `terminalControl`.
- **Coverage**: ingen konfiguration eller tröskel.
- **Körs i CI**: `npx vitest run tests/` i `verify`-jobbet (från tidigare skanning).
- **Platser för US-0505-tester**: en ren funktion för "öppna frågor" testas bäst i node bredvid `parsers.test.js` (audit-block som text in, öppna frågor ut); en ny inställningsnyckel i `settings.test.js`; popup och "Svara i Claude" i `AppShell.test.jsx`. Fixtures för audit-shards finns i `tests/fixtures/`.

### Tester som en ändring av gränssnittet kan bryta

Från tidigare skanning (inte omverifierad):

| Test | Beroende |
|------|----------|
| `IntentList.test.jsx` | `.intent-slug` inuti `intent-list-row` |
| `Splash.test.jsx` | `role="img"` med namnet `Auctum`, texten `Auctum AIDLC Control`, `is-leaving` i `className` |
| `Timeline.test.jsx` | `[aria-posinset]`/`aria-setsize`, `.event.is-new`, `.event-row` med `aria-label`, `.event-fields` |
| `CostPanel.test.jsx` | tabellrader (`closest('tr')`) |
| `FeaturesView.test.jsx` | exakt ett `role="status"`; `h1` i fallback |
| `RefreshPanel.test.jsx`, `ResumeButton.test.jsx` | exakt ett `role="status"` |
| Alla renderartester | `data-testid` och svenska etiketttexter |

En ny popup med `role="status"` eller `role="alert"` i App kan bryta tester som räknar exakt ett sådant element i hela dokumentet.

## Linting, formatering, CI

- Ingen ESLint, Prettier eller EditorConfig i repot. Stilen är ändå enhetlig (2 blanksteg, enkla citattecken, semikolon).
- CI (`.github/workflows/release.yml`): tester på PR mot `main` och på taggar; macOS- och Linux-bygge; glibc-kontroll; release med `gh release`. Inget lint-steg.

## Dokumentation

`README.md` (svenska) beskriver start, säkerhet och bygg. `docs/FEATURES.md` och epic-filer bär krav och acceptanskriterier. Koden har korta kommentarer med krav-ID:n.

## Tillgänglighet (befintliga mönster)

- Status alltid med text, aldrig bara färg (`format.js`, `.tag`, `StatusBadge`).
- `:focus-visible`-outline globalt.
- Rörelse: `data-motion` (`full | reduced | off`) med `prefers-reduced-motion` som standard för `reduced`.
- ARIA i app-skalet: `nav.app-arm[aria-label="Projekt och vyer"]`, `aria-current` på aktivt projekt (`true`) och aktiv vy (`page`), `aria-expanded` på Kostnad/Github, `aria-pressed` på helskärmsknappen, `aria-label` på ⚙ och ×, `role="alert"` på felbannern, `aria-hidden` på dekor.
- Dialoger: `AppSettingsDialog`, `DocsDialog` och `ProjectSettingsDialog` är native modala `dialog` (`showModal`, fokus fångas i dialogen) med `aria-labelledby` på en `h2`; Esc stänger via `onCancel` + `preventDefault` + App:s state; innehållet renderas bara när dialogen är öppen; fel visas i `p.refresh-error[role=alert]`; radioval som `label.lcars-block` runt `input.sr-only` så att tangentbord och skärmläsare får native radioknappar.
- Kontrast: kommentaren i `theme.css` anger minst 4,5:1 för brödtext; `theme.test.js` finns.

## Teknisk skuld

1. **Audit läses bara för den valda intenten** (`useProject.js:119-121`, `projectService.js:131-137`): det finns ingen översikt över händelser i andra intents eller dolda projekt, vilket US-0505 behöver.
2. **Ingen fönsterreferens i main**: `createWindow()` håller `win` lokalt (`index.js:37-65`); `ipc.js` och `menu.js` slår upp fönstret per anrop. Notisklick och fokuskontroll måste göra samma uppslag eller spara en referens.
3. **Ingen fokusdetektering**: inga `focus`/`blur`-lyssnare i main eller renderare.
4. **`runTerminal` beror på det aktiva projektet** via closure (`App.jsx:219-221`); en åtgärd för ett annat projekt kräver `projectId` som argument.
5. **Terminalstyrningen** (`useTerminal()`) finns bara inne i varje `ProjectView`; App når den bara via `terminalCommand`.
6. `settings.js` vitlistar nycklar; en ny inställning kräver ändring i `sanitize()`.
7. Två debounce-implementationer i `watcher.js` (rad 16-30 och 86-91).
8. Bevakningen gäller en space per projekt (`ipc.js:106`); händelser i andra spaces syns inte.
9. Färger utanför tokens: fönsterbakgrunden i `windowOptions()` är en litteral som matchar `--bg` (`#05060a`). Övriga punkter från tidigare skanning (banners, `flash`, `::backdrop`) är inte omverifierade.
10. `hidden` sätter `display: none !important`, så in/ut-övergångar på dolda flikar och projekt kräver annan teknik (från tidigare skanning).

US-0404:s tidigare skuldpunkter (standardmenyn med Reload/DevTools, inline-lambdor i armen, saknad `autoHideMenuBar`) är åtgärdade.
