# Kodkvalitet: aidlc-dash

## Snabbbedömning

| Område | Betyg | Kommentar |
|--------|-------|-----------|
| Namngivning | good | Tydliga komponent- och klassnamn, konsekventa `data-testid` |
| Funktionsstorlek | fair | De flesta funktioner är små; `App` (render 185-348), `RefreshPanel`, `SetupAidlc`, `Timeline` och `ProjectContent` är långa men sammanhållna |
| Felhantering | good | IPC-fel loggas i main och visas med `role="alert"`; trasig `settings.json` ger standardvärden; inga tysta catch utan kommentar |
| Testnärvaro | fair | Main och de flesta stateful vyer testas; app-skalet har nu `AppShell.test.jsx` |
| Duplicering | fair | `errorText()` i över 10 renderarfiler (nu även `App.jsx` och `AppSettingsDialog.jsx`); filåtgärdsknappar dupliceras i ArtifactReader och FeaturesView |
| Död kod | good | Inga TODO/FIXME, inga `eslint-disable` i de lästa filerna |

## Tester

- **Ramverk**: Vitest 5 med två projekt (`main` i node, `renderer` i jsdom), Testing Library React.
- **main** (15 filer): `check-glibc`, `configuredModels`, `features`, `git`, `icon`, `ledger`, `parsers`, `projectAccess`, `projectService`, `pty`, `ptyPerms`, `settings`, `setup`, `theme`, `watcher`.
- **renderer** (13 filer): `AppShell`, `CostPanel`, `FeaturesView`, `IntentDetail`, `IntentList`, `ProjectSettingsDialog`, `RefreshPanel`, `ResumeButton`, `SetupAidlc`, `Splash`, `TerminalPanel`, `Timeline`, `terminalControl`.
- **Coverage**: ingen konfiguration eller tröskel.
- **Körs i CI**: `npx vitest run tests/` i `verify`-jobbet (från tidigare skanning).
- `src/main/index.js` saknar test (fönster och livscykel); det är där meny- och helskärmskoden hamnar. `settings.test.js` täcker `sanitize()` och är platsen för ett test av en ny nyckel.

### Tester som en ändring av gränssnittet kan bryta

Listan nedan kommer från förra skanningen (före designlyftet) och är inte omverifierad; nya testfiler (`AppShell`, `IntentDetail`, `TerminalPanel`) har tillkommit.

| Test | Beroende |
|------|----------|
| `IntentList.test.jsx` | `.intent-slug` inuti `intent-list-row` |
| `Splash.test.jsx` | `role="img"` med namnet `Auctum`, texten `Auctum AIDLC Control`, `is-leaving` i `className` |
| `Timeline.test.jsx` | `[aria-posinset]`/`aria-setsize`, `.event.is-new`, `.event-row` med `aria-label`, `.event-fields` |
| `CostPanel.test.jsx` | tabellrader (`closest('tr')`) |
| `FeaturesView.test.jsx` | exakt ett `role="status"`; `h1` i fallback |
| `RefreshPanel.test.jsx`, `ResumeButton.test.jsx` | exakt ett `role="status"` |
| Alla renderartester | `data-testid` och svenska etiketttexter |

## Linting, formatering, CI

- Ingen ESLint, Prettier eller EditorConfig i repot (`package.json` har inga sådana beroenden). Stilen är ändå enhetlig (2 blanksteg, enkla citattecken, semikolon).
- CI (`.github/workflows/release.yml`): tester på PR mot `main` och på taggar; macOS- och Linux-bygge; glibc-kontroll; release med `gh release` (`publish: null` i `electron-builder.yml`). Ingen lint-steg.

## Dokumentation

`README.md` (svenska) beskriver start, säkerhet och bygg. `docs/FEATURES.md` och epic-filer bär krav och acceptanskriterier. Koden har korta kommentarer med krav-ID:n.

## Tillgänglighet (befintliga mönster)

- Status alltid med text, aldrig bara färg (`format.js`, `.tag`, `StatusBadge`).
- `:focus-visible`-outline globalt.
- Rörelse: `data-motion` (`full | reduced | off`) med `prefers-reduced-motion` som standard för `reduced`.
- ARIA i app-skalet: `nav.app-arm[aria-label="Projekt och vyer"]`, `aria-current` på aktivt projekt (`true`) och aktiv vy (`page`), `aria-expanded` på Kostnad/Github, `aria-label` på ⚙ och ×, `role="alert"` på felbannern, `aria-hidden` på dekor. App-inställningarna är en native modal `dialog` med `aria-labelledby`; Esc stänger via `onCancel`.
- Kontrast: kommentaren i `theme.css` anger minst 4,5:1 för brödtext; `theme.test.js` finns (innehåll ej omläst).

## Teknisk skuld

1. **Ingen egen meny**: Electrons standardmeny visas, med Reload, Force Reload, Toggle DevTools och Electron-länkar även i paketerad app (`src/main/index.js` importerar inte `Menu`). Linux visar en menyrad i fönstret (`autoHideMenuBar` saknas).
2. **Armens åtgärder är inline-lambdor** i `App.jsx:229-291`; de måste lyftas till namngivna funktioner för att menyn ska kunna dela kodväg.
3. **Terminalstyrningen** (`useTerminal()`) finns bara inne i varje `ProjectView`; App kan inte byta terminalflik eller starta om en flik.
4. **`createWindow()` returnerar fönstret men ingen sparar det** (`index.js:43,56,58`); main saknar en referens att skicka menykommandon till eller läsa helskärmsläget från.
5. `settings.js` vitlistar nycklar; en ny inställning kräver ändring i `sanitize()`.
6. Färger utanför tokens: fönsterbakgrunden i `src/main/index.js:18` är fortfarande en litteral, men matchar nu `--bg` (`#05060a`) enligt kommentaren. Övriga punkter från förra skanningen (xterm-tema, banners, `flash`, `::backdrop`) är inte omverifierade; `tokens.js` exporterar nu `xtermTheme()`.
7. `hidden` sätter `display: none !important`, så in/ut-övergångar på dolda flikar och projekt kräver annan teknik (från tidigare skanning).
