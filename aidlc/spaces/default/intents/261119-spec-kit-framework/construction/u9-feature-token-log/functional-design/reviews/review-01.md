## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-24T18:11:53Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/functional-design/rules.md > BR1.2 (first event of a session) and functional-spec.md > Workflow W1 step 3 | "The first event of a session counts the whole session so far" and credits it to the feature active now. A resumed or long session, or one started before the project chose Spec Kit or before any feature existed, puts hours of unrelated spend on one feature. The same applies after the cursor is lost (new machine, cleared user data). This contradicts AC5.1.1's intent of per-feature cost. | Decide the first-event rule explicitly. Either count only calls after the app first saw the session (seed the cursor with the current transcript state), or credit the pre-existing part to `speckit-project`. Record the choice in BR1.2 and add it to the edge cases. | New |
| R-02 | Major | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/functional-design/functional-spec.md > Workflow W1 step 1, Assumptions (opencode usage event); rules.md > BR1.3 | The design relies on an opencode usage event with message id, output and cache write counts. The existing adapter (`agentAdapters.js` `opencodeSignal`, `contextSize.js` `opencodeContext`) passes on only a context total and model. The plugin file is committed by the app. The design lists this as "provisional", but it is a required change to the adapter and the plugin, and no step or contract owns it. | State that this Unit extends the usage signal and the opencode plugin (message id, model, input, output, cache read and write), name the signal shape as part of the design, and give the fallback when the plugin cannot send it, for example opencode readings stay out of scope and the gap is recorded. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/functional-design/entities.md > Call; rules.md > BR1.2, BR4.1 | `Call` carries `model`, but the existing `callsOfTranscript` returns only time and token counts, with no model. Pricing (BR4.1) needs the model per call. | Name the extension to the transcript reader that returns the model per message id, or say where the model comes from. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/functional-design/rules.md > BR1.2 vs BR1.3 | BR1.3 credits only the increase of a re-sent message, but BR1.2 keeps calls "whose usage differs from the cursor's" and credits them whole. If a call's usage grows between two reads, the earlier part is counted twice. | Make BR1.2 credit the difference against the cursor's stored `Call`, as BR1.3 does. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/functional-design/rules.md > BR2.1, BR3.1 | A feature folder named `project` gives the key `speckit-project`, the same as the project-wide bucket, so the two are mixed. | Reject a feature folder named `project` as a feature key (use the project bucket) or give the project bucket a name that no folder can take. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/functional-design/rules.md > BR2.2; src/main/tokenReadings.js `addReading` | The existing `addReading` drops a reading under 30 s and returns the list unchanged. BR2.2 needs "replace the last". The spec does not say this is a new function or a changed one, and the per-intent log must keep its behaviour. | Say that a separate replace-capable function is added and `addReading` for the per-intent log stays as it is. | New |
| R-07 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/functional-design/functional-spec.md > State: session cursor, W1 step 7, Assumptions | Cursor persistence is not specified: its file, its growth (`counted` holds every message id for a session), and what happens if saving the cursor fails after the bucket write (the usage is counted twice). Bucket files are committed, so two machines' cumulative series are merged by time and can go non-monotonic. | Give the cursor a file, prune old sessions, state that a failed cursor save is logged and may double-count once, and note that the merged series across machines is approximate. | New |
| R-08 | Minor | aidlc/spaces/default/intents/261119-spec-kit-framework/construction/u9-feature-token-log/functional-design/rules.md > BR1.1 | "The project's framework is Spec Kit" does not say where that is read from, and no upstream contract is named for it. | Name the source of the framework choice (the repository's saved choice from the earlier unit) and its fallback when unreadable. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| sensor-traceability | Not run | Advisory pass; skipped as the brief allowed. |

### Summary

The design is sound and reuses the existing reading shape, bucket naming and C5 reader well. Two Major points need a decision before code: how the first session event is credited, and who owns the opencode usage signal change. The rest are small gaps a developer can settle while building.
