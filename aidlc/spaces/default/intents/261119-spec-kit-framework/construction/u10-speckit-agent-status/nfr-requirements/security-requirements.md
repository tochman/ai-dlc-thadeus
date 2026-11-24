# Security Requirements: U10 u10-speckit-agent-status

Sources: NFR3 and NFR5 in `requirements.md`, contract C9 in `contract-summary.md`, and the U10 `functional-spec.md` and `rules.md` (BR10.1, BR10.2, BR10.8). There is no login, no network call and no secret in this Unit. The threats are text an agent writes into a hook question (shown in the renderer), a project id or dir name sent from the renderer, and writes into files Spec Kit owns.

| ID | Requirement | Measure |
|---|---|---|
| NFR3.1 | No U10 code writes, creates, renames or deletes anything under `.specify/` or `specs/`. The feature part goes through U6's `loadSpeckitFeatures` only (BR10.8). | Test runs the `agents:progress` handler on a Spec Kit fixture with a spy on every fs write call; zero calls |
| NFR3.2 | An unknown project id is refused, as today. A dir name, when given, is still checked by the existing `assertName` before any path is built; the Spec Kit branch builds no path from renderer input. | IPC tests: unknown id rejects; `../x` as dir name rejects in an AI-DLC project |
| NFR3.3 | The waiting part reads only the event store's own fields (kind, state, header or body, agent name, harness). It never returns the event's options, tool input or session id. | Test: a permission with a tool input holding a path and a command returns only `question` and `agent` |
| NFR5.1 | The question and agent text are shown as plain text, never as HTML or Markdown, and the question is cut to its first line and 200 characters, so a hook cannot run script or flood the readout. | Renderer test: a `<script>` question shows as text; a 5,000-character body shows 200 characters |
| NFR5.2 | A failing part is `null` and the rest still shows (BR10.1): a features read that throws gives `feature: null`, a missing event store gives `waiting: null`; the call never rejects for a Spec Kit project. | Progress tests: reader throws, store absent, both |
