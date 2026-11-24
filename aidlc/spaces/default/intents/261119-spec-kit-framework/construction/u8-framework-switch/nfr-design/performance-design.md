# Performance Design: U8 u8-framework-switch

Sources: `performance-requirements.md` (NFR7.3–NFR7.5), `tech-stack-decisions.md`, the U8 `functional-spec.md`, and contracts C1 and C10 in `contract-summary.md`. The design reuses `detectProject` and `loadIntentList` (`projectService.js`) and `loadSpeckitFeatures` (`speckitFeatures.js`).

| NFR | Design |
|---|---|
| NFR7.3 | `switchPreview` runs `detectProject(root)` once for `found`, then reads only the old framework's work in progress: for AI-DLC, `listSpaces` and `loadIntentList` per space in parallel, keeping intents whose state is not completed or archived; for Spec Kit, `loadSpeckitFeatures` once, keeping features with done < total. Each list read is wrapped on its own: a throw is logged, adds no item and sets `unread: [kind]` (an additive field), so the preview names the list it could not read. No cache: a preview must see the folder as it is now. Timed test with 20 intents and 20 features asserts 2 s in the retried `scripts` project; the aim is 500 ms. |
| NFR7.4 | After the write, `switch` runs `detectProject` again and applies it through the same code `watchForSetup` uses today (moved into `applyDetection(projectId, detection)`: set `p.framework`, close the old watcher, start `watchSpace` or `watchSpeckit`, send `project:detected`). The push goes out before `switch` returns, and the reply also carries `detection` (additive to C10), so the views follow even if the push is missed. |
| NFR7.5 | `FrameworkSection` disables the switch button and Confirm in every state but `idle` and `preview`. A duplicate `switch` that still reaches main is harmless: the target is always the other framework, the write is atomic and writes the same content, and `applyDetection` is idempotent, so no lock is added in main. |
