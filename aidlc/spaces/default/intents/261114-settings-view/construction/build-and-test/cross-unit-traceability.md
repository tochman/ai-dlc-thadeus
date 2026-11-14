# Cross-Unit Traceability — US-0405 Inställningar som vy

**Källa:** `aidlc engine sensor-traceability --stage build-and-test` → `pass: true`, `uncovered: []`.
**Scope:** `ultra-express`, noll Units — all kod kommer från den enda stage-nivå-körningen av Code Generation.

**Utfall: PASS** — 24 av 24 spårade ID:n är täckta, inget oattribuerat.

| ID | Täckt | Byggs/bevisas i |
|----|-------|-----------------|
| FR1.1 | ja | `tests/renderer/AppShell.test.jsx` |
| FR1.2 | ja | `tests/renderer/SettingsView.test.jsx` |
| FR1.3 | ja | `tests/renderer/SettingsView.test.jsx` |
| FR2.1 | ja | `tests/main/tools.test.js` |
| FR2.2 | ja | `tests/renderer/SettingsView.test.jsx` |
| FR2.3 | ja | `tests/main/tools.test.js` |
| FR2.4 | ja | `tests/main/pty.test.js` |
| FR2.5 | ja | `tests/renderer/SettingsView.test.jsx` |
| FR3.1 | ja | `tests/renderer/SettingsView.test.jsx` |
| FR4.1 | ja | `tests/renderer/SettingsView.test.jsx` |
| FR4.2 | ja | `tests/renderer/SettingsView.test.jsx` |
| FR4.3 | ja | `tests/renderer/SettingsView.test.jsx` |
| FR5.1 | ja | `tests/renderer/SettingsView.test.jsx` |
| FR6.1 | ja | `tests/renderer/AppShell.test.jsx` |
| FR6.2 | ja | `tests/renderer/SettingsView.test.jsx` |
| FR6.3 | ja | `src/renderer/SettingsView.jsx` |
| FR7.1 | ja | `tests/main/settings.test.js` |
| FR7.2 | ja | `src/main/settings.js` |
| FR7.3 | ja | `src/main/tools.js` |
| NFR1 | ja | `tests/renderer/SettingsView.test.jsx` |
| NFR2 | ja | `tests/main/i18nKeys.test.js` |
| NFR3 | ja | `src/renderer/theme.css` |
| NFR4 | ja | `tests/renderer/SettingsView.test.jsx` |
| NFR5 | ja | `tests/main/tools.test.js` |

## Ägande stage

| Område | Stage |
|--------|-------|
| Alla 24 ID:n | `code-generation` (stage-nivå, noll Units) |

## Otäckta element

Inga.

## Anmärkning

Raderna ovan visar **var** varje krav är byggt och vilket test eller vilken fil som bär det. Fem av dem (NFR3, FR6.3, FR7.2, FR7.3 och FR2.4:s pty-del) bevisas av källfilen respektive ett main-test i stället för av en renderertestfil — det är samma konvention som tidigare intents använt när kravet är strukturellt (CSS, lagringsform, sökvägsresolver) snarare än beteende i vyn.
