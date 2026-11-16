# Test Results: US-0414

Run on 2026-11-16 on `feat/US-0414` (working tree).

- **Build:** `npx electron-vite build`, exit 0.
- **Scoped tests:** the unit-test instructions command gave 10 files and 76 tests, all passed. The placement and guard tests ran under their real `.test.jsx` names (see `code-summary.md`).
- **Full suite:** `npx vitest run tests/ --coverage` gave 118 files and 1459 tests, all passed, exit 0. Nothing failed or was skipped.
- **Coverage:** 90.96% of lines, against the 80% floor (`coverage/coverage-summary.json`). Branches 82.46%, functions 85.22%. `Tooltip.jsx` is at 100% of lines.
- **ESLint:** `npx eslint .` gave 0 errors and 24 older `react-hooks/exhaustive-deps` warnings.
- **Prettier:** `npx prettier --check . '!.thadeus/tokens/**'` passes: "All matched files use Prettier code style!". The excluded files are this machine's untracked token readings, which a CI checkout does not have.
- **Requirement coverage:** `aidlc engine sensor-traceability --stage build-and-test` passes, with no ID uncovered.

## Where the tooltip checks ran

All tooltip behaviour was checked in jsdom (a DOM emulator), not in a real browser engine: opening on focus and hover, closing on Esc, the ARIA wiring, and placement as a pure function with stubbed measurements. Three things were not checked: placement in the real window, the hover feel, and stacking against dialogs. They are left to the hand check of the built `.dmg`.

## Efter merge med main (2026-11-16T11:40:14Z)

Build and Test godkändes och agenterna rapporterade allt grönt, men när US-0209 (PR #58) mergades till main först krockade PR #59 med main. Det stod alltså inte rätt till fastän allt var "klart":

- **Konflikter:** de nio filerna i kodkunskapsbasen (`aidlc/spaces/default/codekb/aidlc-dash/`), `intents.json` och `tests/renderer/CostTab.test.jsx` (båda storyerna skapade filen).
- **Ett riktigt fel som ingen test i någon av grenarna fångade:** US-0209 lade till en ny `title=` (taggen "Delvis" i `CostTab.jsx`), och US-0414:s skyddstest `noNativeTitle.test.jsx` underkände den direkt. Två test i US-0209 (`CostTabMachines.test.jsx`, `CostPanel.test.jsx`) kontrollerade `.title` och föll.
- **Orsak:** de två storyerna byggdes parallellt på var sin gren från samma main. Varje gren testades bara mot sin egen bas, så krocken syntes först vid merge.

Åtgärd (merge-commit `54f8525` på `feat/US-0414`):
- Taggen "Delvis" använder nu den delade tooltipen. Testen skrevs om först, föll och gick sedan igenom.
- Båda intents behölls i `intents.json`.
- Kunskapsbasen behöll US-0414:s skanning. US-0209:s anteckningar om kostnadskällor finns kvar i dess egen intent (`261116-cross-machine-cost/inception/reverse-engineering/developer-scan.md`), men inte i den delade kunskapsbasen. Nästa Reverse Engineering bör göra en full skanning.
- US-0209:s test för `CostTab` flyttades till `CostTabMachines.test.jsx`.

Resultat efter merge:
- 122 testfiler och 1484 test, alla gröna.
- ESLint: 0 fel.
- Prettier: rent.

Lärdom: när två storyer pågår samtidigt ska den andra grenen mergas med main (eller rebasas) och testas igen innan den godkänns. Ett "klart" från en gren gäller bara mot dess egen bas.
