# Cross-Unit Traceability: US-0605

**Verdict: PASS.** `aidlc engine sensor-traceability --stage build-and-test` reports every ID covered, none uncovered. Zero-Unit work: everything is built in the stage-level Code Generation.

| ID | Covered | Built in | Checked by (Node / jsdom) |
|---|---|---|---|
| FR1.1 | yes | `src/main/parsers/releases.js` | `releaseOptions` / `nextVersions` tests (Node); New release suggestions (jsdom) |
| FR1.2 | yes | `src/main/parsers/releases.js` | `newReleaseError` test (Node); bad and existing version (jsdom) |
| FR1.3 | yes | `src/main/releases.js` | `createRelease` test (Node) |
| FR2.1 | yes | `src/main/parsers/releases.js` | `buildReleases` with plans (Node) |
| FR2.2 | yes | `src/main/features.js` | `loadFeatures` plans and `featureWatchPaths` tests (Node) |
| FR3.1 | yes | `src/renderer/FeaturesView.jsx` | Add story test (jsdom) |
| FR3.2 | yes | `src/renderer/FeaturesView.jsx` | Remove test (jsdom) |
| FR3.3 | yes | `src/renderer/FeaturesView.jsx` | locked-until-reload test (jsdom) |
| FR4.1 | yes | `src/main/parsers/releases.js` | `canDelete` and `deleteRelease` tests (Node); Delete visibility (jsdom) |
| FR5 | yes | `src/renderer/FeaturesView.jsx` | Continuous delivery test (jsdom) |
| FR6 | yes | `src/shared/locales/sv.json` | `i18nKeys.test.js` (Node) |
| NFR1 | yes | `src/main/releases.js` | existing-file and stale-hash refusals (Node) |
| NFR2 | yes | `package.json` | unchanged |
| NFR3 | yes | `src/renderer/FeaturesView.jsx` | failure message tests (jsdom) |

Uncovered: none.
