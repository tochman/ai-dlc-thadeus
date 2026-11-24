# Performance Design: U4 u4-framework-choice

Sources: `performance-requirements.md` (NFR4.3, NFR7.1, NFR7.2), `tech-stack-decisions.md`, the U4 `functional-spec.md`, and contracts C1 and C4 in `contract-summary.md`.

| NFR | Design |
|---|---|
| NFR4.3 | The scan is two folder checks and two PATH lookups, run in parallel over one login-PATH read. The PATH read is shared and cached by `exec.js`, so after the first project open it costs nothing. The design aims at 300 ms; the timed test asserts 1 s in the retried `scripts` project, the bound that stays stable on a loaded CI runner. While a first PATH read runs (up to 20 s), the screen shows Scanning; a timeout falls back to the app's PATH and still gives a result. |
| NFR7.1 | After a successful write, `chooseFramework` runs detection again and sends the `project:detected` push itself, before it returns, so the views switch without waiting for the watcher. Test: the push arrives within 2 s of the call. |
| NFR7.2 | `FrameworkChoice` runs the scan in an effect keyed on the project id and a retry counter. Confirm is disabled while `chooseFramework` runs. A duplicate call that still reaches main is harmless: the write is atomic and writes the same content, so no lock is added. |

No cache beyond the shared PATH read: the screen shows once per project, and a fresh scan after Retry must see a tool the person just installed.
