# Cross-Unit Traceability: US-0701 i18n foundation and English

**Verdict: PASS.** 31 of 31 requirement IDs are covered: 29 are built and 2 are marked N/A as constraints. No ID is uncovered. The work is zero-Unit, so every ID is owned by the single Code Generation run.

| ID | Status | Owning stage | Target |
|----|--------|--------------|--------|
| FR1.1 | Built | code-generation | src/renderer/format.js (and every renderer component) |
| FR1.2 | Built | code-generation | src/main/menu.js (and notify.js, main-process errors) |
| FR1.3 | Built | code-generation | src/renderer/featureDocsPrompt.js |
| FR1.4 | Built | code-generation | tests/main/i18nKeys.test.js |
| FR2.1 | Built | code-generation | src/shared/locales/en.json |
| FR2.2 | Built | code-generation | src/shared/locales/sv.json |
| FR2.3 | Built | code-generation | src/shared/locales/en.json |
| FR2.4 | Built | code-generation | src/shared/i18n.js |
| FR3.1 | Built | code-generation | src/shared/i18n.js |
| FR3.2 | Built | code-generation | tests/main/i18n.test.js |
| FR3.3 | Built | code-generation | tests/main/i18n.test.js |
| FR3.4 | Built | code-generation | src/renderer/format.js |
| FR3.5 | Built | code-generation | tests/renderer/format.test.jsx (jsdom) |
| FR4.1 | Built | code-generation | src/renderer/AppSettingsDialog.jsx |
| FR4.2 | Built | code-generation | src/main/i18n.js |
| FR4.3 | Built | code-generation | src/main/settings.js |
| FR4.4 | Built | code-generation | src/main/ipc.js |
| FR4.5 | Built | code-generation | tests/renderer/AppSettingsDialog.test.jsx (jsdom) |
| FR5.1 | Built | code-generation | src/shared/i18n.js |
| FR5.2 | Built | code-generation | src/shared/i18n.js |
| FR6.1 | N/A | code-generation | A constraint on what is not translated: project content is rendered as it is |
| FR6.2 | N/A | code-generation | A constraint on what is not translated: identifier terms stay as they are |
| FR7.1 | Built | code-generation | tests/main/i18nKeys.test.js |
| FR7.2 | Built | code-generation | tests/main/i18nKeys.test.js |
| FR7.3 | Built | code-generation | tests/main/i18nKeys.test.js |
| FR8.1 | Built | code-generation | src/renderer/theme.css |
| FR8.2 | Built | code-generation | tests/main/theme.test.js (CSS rules checked in Node, layout not measured) |
| NFR1 | Built | code-generation | package.json |
| NFR2 | Built | code-generation | vitest.config.mjs (full suite green) |
| NFR3 | Built | code-generation | src/renderer/main.jsx |
| NFR4 | Built | code-generation | src/preload/index.js |

## Notes

- **FR8.2** says no LCARS block overflows at the default window size. The test checks the wrapping and shrinking CSS rules in Node. Nothing measured real layout in a browser.
- **FR4.5** (live switch without a reload) was checked in jsdom, not in a real browser or the running Electron app.
