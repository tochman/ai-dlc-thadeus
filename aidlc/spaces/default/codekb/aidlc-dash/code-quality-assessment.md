# Kodkvalitet: aidlc-dash

## Snabbbedömning

| Område | Betyg | Kommentar |
|--------|-------|-----------|
| Namngivning | good | Tydliga komponent- och klassnamn, konsekventa `data-testid` |
| Funktionsstorlek | fair | De flesta funktioner är små; `RefreshPanel`, `SetupAidlc`, `Timeline` och `ProjectContent` är långa men sammanhållna |
| Felhantering | good | IPC-fel visas med `role="alert"`; trasiga filer ger senaste giltiga värde; inga tysta catch utan kommentar |
| Testnärvaro | fair | Main och de flesta stateful vyer testas; app-skalet, pipelinen, terminalpanelen, DAG och läsaren saknar test |
| Duplicering | fair | `errorText()` i 9 renderarfiler; filåtgärdsknappar dupliceras i ArtifactReader och FeaturesView |
| Död kod | good | Inga TODO/FIXME, inga `eslint-disable`; några klasser i JSX saknar CSS-regel (se nedan) |

## Tester

- **Ramverk**: Vitest 5 med två projekt (`main` i node, `renderer` i jsdom), Testing Library React.
- **main** (14 filer): parsers, ledger, modeller, features, git, setup, settings, watcher, pty, rättigheter, glibc, ikon (`build/icon.png` 1024x1024 RGBA), projectAccess, projectService.
- **renderer** (10 filer): CostPanel, FeaturesView, IntentList, ProjectSettingsDialog, RefreshPanel, ResumeButton, SetupAidlc, Splash, Timeline, terminalControl.
- **Coverage**: ingen konfiguration eller tröskel.
- **Körs i CI**: `npx vitest run tests/` i `verify`-jobbet.

### Tester som en omdesign kan bryta

| Test | Beroende |
|------|----------|
| `IntentList.test.jsx:13` | `.intent-slug` inuti `intent-list-row` |
| `Splash.test.jsx:16,17,25` | `role="img"` med namnet `Auctum`, texten `Auctum AIDLC Control`, `is-leaving` i `className` |
| `Timeline.test.jsx:44,53,56,77` | `[aria-posinset]`/`aria-setsize`, `.event.is-new`, `.event-row` med `aria-label`, `.event-fields` |
| `CostPanel.test.jsx:24` | tabellrader (`closest('tr')`) |
| `FeaturesView.test.jsx:30,70` | exakt ett `role="status"`; `h1` i fallback |
| `RefreshPanel.test.jsx:73`, `ResumeButton.test.jsx:48` | exakt ett `role="status"` |
| `ResumeButton.test.jsx:23` | knappen är ett `BUTTON` |
| `SetupAidlc.test.jsx:94` | `a[href]` i `setup-aidlc-missing` |
| Alla renderartester | `data-testid` och svenska etiketttexter |

Nya dekorativa element (siffror, segment, ränder) bör vara `aria-hidden` och inte ha `role="status"`, annars får `getByRole('status')` flera träffar.

## Linting, formatering, CI

- Ingen ESLint, Prettier eller EditorConfig i repot. Stilen är ändå enhetlig (2 blanksteg, enkla citattecken, semikolon).
- CI (`.github/workflows/release.yml`): tester på PR mot `main` och på taggar; macOS- och Linux-bygge; glibc-kontroll; release med `gh release`. Ingen lint- eller kontraststeg.

## Dokumentation

`README.md` (svenska) beskriver start, säkerhet och bygg. `docs/FEATURES.md` och epic-filer bär krav och acceptanskriterier. Koden har korta kommentarer med krav-ID:n.

## Tillgänglighet (befintliga mönster)

- Status alltid med text, aldrig bara färg (`format.js`, `.tag`, `StatusBadge`).
- `:focus-visible` 2px blå outline globalt.
- `prefers-reduced-motion` stänger av alla animationer och transitions.
- ARIA: `tablist/tab/aria-selected`, `listbox/option`, `aria-expanded`, `aria-pressed`, `aria-current`, `role="separator"` med tangentbord, native modal `dialog`, `role="status"`/`"alert"`, `aria-hidden` på dekor (`.stage-marker`, `.splash-bar`, dekorativt märke).
- Kontrast: kommentaren i `theme.css` anger minst 4,5:1 för brödtext; inget automatiskt test kontrollerar det.

## Teknisk skuld

1. Färger utanför tokens: `TerminalPanel.jsx:17-22` (xterm-tema), `src/main/index.js:18` (fönsterbakgrund), `theme.css:134,135,364,371`, `build/icon.svg`. US-0403 kräver att alla färger kommer från tokens.
2. Magiska layoutmått: elbow-tjocklekar (6, 8, 22px) och radier (30px) upprepas; kolumnbredder i `.stage-row`, `.event-row`, `.project-body`, `.artifact-reader`.
3. Klasser utan CSS-regel: `is-collapsed`, `detail-body`, `intent-header`, `phase`, `timeline`, `features-story`, `setup-feature-docs` (lediga krokar för omdesignen).
4. Globala klasser delas mellan vyer (lista i `dependencies.md`); ändring av en ger effekt på flera ställen.
5. `.project-tabs` är `role="tablist"` men innehåller knappar som inte är flikar; flikar saknar `aria-controls`, och `div.detail-body[role=tabpanel]` saknar `aria-labelledby`.
6. `settings.js` vitlistar nycklar; en ny animationsinställning kräver ändring där.
7. Tidslinjens rader placeras med inline `transform`; inträdesanimation på `transform` krockar med virtualiseraren.
8. `hidden` sätter `display: none !important`, så in/ut-övergångar på dolda flikar och projekt kräver annan teknik (t.ex. animation vid visning).
