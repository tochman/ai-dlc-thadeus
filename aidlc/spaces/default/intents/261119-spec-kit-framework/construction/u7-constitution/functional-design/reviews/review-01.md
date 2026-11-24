## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T09:45:07Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u7-constitution/functional-design/functional-spec.md > Main-side modules (`speckitWatchPaths`) | The spec says "`speckitWatchPaths` (U6) adds the three paths". No such function exists. `src/main/speckitFeatures.js` exports a constant, `SPECKIT_WATCH_PATHS = ['specs/**', '.specify/feature.json', '.specify/init-options.json']`, and `ipc.js` `watchSpeckit` passes it to `watchFiles`. BR7.8 also lists `.specify/extensions/` as a bare directory, while the existing entries are globs or files. It is unclear whether `watchFiles` sees changes to a nested `extension.yml` through a bare directory. | Name the real constant. Write the new entry as a glob (`.specify/extensions/**`). Add a watcher test that edits a nested `.specify/extensions/<id>/extension.yml`. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u7-constitution/functional-design/frontend-components.md > Interaction and `FileView` row | `FileView` (`ArtifactReader.jsx`) already renders its own edit button (`artifact-reader-edit`, via `useEditor().open(rel)`) plus reveal and open-in-editor buttons. The design adds a second "Open in editor" button (`speckit-rules-edit`, `onEdit` prop) and calls `FileView` "unchanged". The section would show two edit buttons for the same file. | Pick one: reuse `FileView`'s edit button and drop `onEdit` and `speckit-rules-edit`, or render `FileView` with `editable={false}` and keep the dedicated button. Record the choice. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u7-constitution/functional-design/frontend-components.md > Interaction (`/speckit-constitution `) | The no-constitution button sends the literal `/speckit-constitution ` to the agent terminal. The spec says the runnable command form is U5's (C7), and the command prefix can differ per agent. Nothing says which U5 helper U7 calls. | State that the button gets the string from U5's command-form helper (C7), or record the slash form as a deliberate limit. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u7-constitution/functional-design/rules.md > BR7.4 and BR7.5 | The hook shape matches the installed Spec Kit `register_hooks` (`hooks[<event>]` is a list of `{extension, command, enabled, optional (default true), priority, prompt, description, condition}`). Two things are not covered. `priority` is stored, so hook order within an event is undefined in the view. `register_hooks` uses `coerce_hook_entries`, which accepts shapes beyond a single mapping or a list. BR7.4 handles only those two, so other shapes would be counted as skipped. | Say whether hooks are shown in `priority` order. Either reuse the `coerce_hook_entries` shapes or note that other shapes are counted as skipped. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `aidlc engine sensor-traceability --stage functional-design` on `traceability.json` | PASS: no gaps, orphans, invalid entries or findings | All upstream IDs are covered. |
| required-sections, upstream-coverage, linter, type-check | Not run separately | A manual cross-check of FR7, FR5.2, NFR3, C6 and AC4.2.1 to AC4.2.3 against the spec and BR7.1 to BR7.9 found no gaps. |

### Summary

The design is sound and implementable. The `extensions.yml` and manifest shapes match the installed Spec Kit, every rule has a trigger, logic and violation path, and the additive C6 `target` change is clear. Only minor items remain, and none block approval.
