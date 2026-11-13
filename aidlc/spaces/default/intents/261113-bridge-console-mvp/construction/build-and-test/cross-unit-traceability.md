# Spårbarhet — slutlig täckningskontroll

Källa: `aidlc engine sensor-traceability --stage build-and-test` (2026-11-13). Arbetet har inga units (express), så allt byggs i stagen code-generation.

**Utslag:** Kontrollen godkänns inte. Ett id saknar byggmål, NFR1. NFR1 är ett prestandakrav som markerades `Deferred` i Code Generation. Det är uppmätt och uppfyllt i Build and Test (se `build-and-test-summary.md`, NFR1: Met). Ingen kod saknas.

| ID | Täckt | Ägare | Målfil |
|----|-------|-------|--------|
| FR1.1 | Ja | code-generation | src/main/ipc.js |
| FR1.2 | Ja | code-generation | src/main/projectService.js |
| FR1.3 | Ja | code-generation | src/renderer/ProjectView.jsx |
| FR1.4 | Ja | code-generation | src/renderer/App.jsx |
| FR1.5 | Ja | code-generation | src/main/settings.js |
| FR2.1 | Ja | code-generation | src/main/parsers/intents.js |
| FR2.2 | Ja | code-generation | src/main/parsers/pipeline.js |
| FR2.3 | Ja | code-generation | src/main/parsers/intents.js |
| FR2.4 | Ja | code-generation | src/renderer/IntentList.jsx |
| FR2.5 | Ja | code-generation | src/main/parsers/intents.js |
| FR3.1 | Ja | code-generation | src/main/parsers/state.js |
| FR3.2 | Ja | code-generation | src/renderer/Pipeline.jsx |
| FR3.3 | Ja | code-generation | src/renderer/Pipeline.jsx |
| FR3.4 | Ja | code-generation | src/main/parsers/pipeline.js |
| FR3.5 | Ja | code-generation | src/main/parsers/pipeline.js |
| FR4.1 | Ja | code-generation | src/main/parsers/audit.js |
| FR4.2 | Ja | code-generation | src/main/parsers/audit.js |
| FR4.3 | Ja | code-generation | src/main/parsers/audit.js |
| FR4.4 | Ja | code-generation | src/renderer/Timeline.jsx |
| FR4.5 | Ja | code-generation | src/renderer/Timeline.jsx |
| FR4.6 | Ja | code-generation | tests/main/parsers.test.js |
| FR5.1 | Ja | code-generation | src/renderer/BoltDag.jsx |
| FR5.2 | Ja | code-generation | src/main/parsers/units.js |
| FR5.3 | Ja | code-generation | src/renderer/BoltDag.jsx |
| FR6.1 | Ja | code-generation | src/renderer/ArtifactReader.jsx |
| FR6.2 | Ja | code-generation | src/renderer/ArtifactReader.jsx |
| FR6.3 | Ja | code-generation | src/main/ipc.js |
| FR6.4 | Ja | code-generation | src/renderer/ArtifactReader.jsx |
| FR7.1 | Ja | code-generation | src/main/watcher.js |
| FR7.2 | Ja | code-generation | tests/main/watcher.test.js |
| FR7.3 | Ja | code-generation | src/renderer/useProject.js |
| FR7.4 | Ja | code-generation | src/main/projectAccess.js |
| FR8.1 | Ja | code-generation | src/main/pty.js |
| FR8.2 | Ja | code-generation | src/main/pty.js |
| FR8.3 | Ja | code-generation | src/renderer/TerminalPanel.jsx |
| FR8.4 | Ja | code-generation | src/renderer/TerminalPanel.jsx |
| FR8.5 | Ja | code-generation | src/renderer/TerminalPanel.jsx |
| FR8.6 | Ja | code-generation | src/renderer/TerminalPanel.jsx |
| FR8.7 | Ja | code-generation | src/main/pty.js |
| FR9.1 | Ja | code-generation | src/renderer/theme.css |
| FR9.2 | Ja | code-generation | src/renderer/theme.css |
| FR9.3 | Ja | code-generation | tests/renderer/IntentList.test.jsx |
| FR9.4 | Ja | code-generation | src/renderer/theme.css |
| FR9.5 | Ja | code-generation | src/renderer/theme.css |
| FR10.1 | Ja | code-generation | src/main/index.js |
| FR10.2 | Ja | code-generation | src/main/projectAccess.js |
| FR10.3 | Ja | code-generation | package.json |
| FR10.4 | Ja | code-generation | electron-builder.yml |
| FR10.5 | Ja | code-generation | tests/main/parsers.test.js |
| NFR1 | **Nej** (Deferred i Code Generation) | build-and-test | Uppmätt: test-results.md § NFR-mätningar |
| NFR2 | Ja | code-generation | src/main/projectService.js |
| NFR3 | Ja | code-generation | src/renderer/theme.css |
| NFR4 | Ja | code-generation | src/main/projectAccess.js |
| NFR5 | Ja | code-generation | electron-builder.yml |

## Ej täckta

- **NFR1:** Inget byggmål i code-generation, eftersom det markerades `Deferred` med motiveringen att det skulle mätas i Build and Test. Det är nu uppmätt med resultatet Met.
- **Var testerna körde:** Gränssnittet är kontrollerat i den riktiga Chromium-renderaren i Electron. Enhetstesterna för IntentList körde i jsdom.
