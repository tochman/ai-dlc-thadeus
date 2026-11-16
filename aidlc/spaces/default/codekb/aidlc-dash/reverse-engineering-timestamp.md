# Reverse Engineering Timestamp

## Run Record

- Date: 2026-11-16
- Commit: f46cb71d05d86bea71fdc9d9e82e2087f67f8cc3
- Intent: shared-tooltip (`261116-shared-tooltip`, EPIC-04 US-0414)

This was a focused scan of `src/renderer`, merged onto the store from the full scan at `721e051` (intent agent-progress). That store was stale, so only this run's renderer coverage is recorded as verified, and the earlier `./` is demoted to shallow. The prose outside the renderer is kept from that scan and is marked where it is not re-verified. The developer agent did both the scan and the synthesis, because the architect was switched off for this run.

What was read, and how closely:
- Read line by line: `TokenDetail.jsx`, `Lcars.jsx`, the tooltip, z-index and overflow rules in `theme.css`, and every `title=` site with its surrounding markup.
- Read at the level of header, imports and searches: the rest of `src/renderer`.
- Searched only, outside the analyzed path: `tests/renderer/` (title and tooltip asserts), `src/shared/locales/*.json` (the `cost` keys), `package.json`.
- Not opened: `node_modules/`, `out/`, `dist/`, `coverage/`, `tests/.tmp/`, `.thadeus/`, and AI-DLC's install and workspace.

Code was read only: no tests, builds or app runs.

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: shared-tooltip
fingerprint: 0c970c3d739ea48bfd3871bd664357cdcc488eb0
analyzed:
  paths:
    - src/renderer
  components:
    - App Shell
    - TerminalPanel
    - ResumeButton
    - IntentList
    - IntentDetail
    - Pipeline
    - ArtifactReader
    - CostPanel
    - CostTab
    - TokenDetail
    - AgentProgress
    - ProjectSettingsView
    - SettingsView
    - ConfigEdit
    - FeaturesView
    - Editor
    - LCARS Primitives
    - Format Helpers
    - Theme Stylesheet
shallow:
  paths:
    - ./
    - docs/
    - build/
    - tests/renderer/
    - src/shared/locales/
```
