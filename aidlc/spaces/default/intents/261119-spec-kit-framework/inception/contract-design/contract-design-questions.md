# Contract Design Questions: EPIC-14 Spec Kit

The existing code already settles these, so they are not asked:
- **Mechanism:** Electron IPC. Request/response channels are registered in the `handlers` map of `ipc.js` and named `domain:verb`. Push events go through `sender.send`.
- **Errors:** a handler throws, and the renderer gets a rejected promise. A failure the user is meant to see, such as a failed `specify init`, is returned as `{ ok: false, error: { code, message } }` (US-1201).
- **Versioning:** none for in-app IPC. Producer and consumer ship in the same build.
- **No external API:** nothing is exposed outside the app.

The one contract that outlives a build is `.thadeus/project.json`. It is committed to the repository and read by every clone, including clones on older app versions.

## Q1: What shape should `.thadeus/project.json` have?

A. `{ "version": 1, "framework": "aidlc" | "speckit" }`. An app that finds an unknown `version` or `framework` falls back to detection and says why (FR2.3). Unknown extra keys are kept when the file is rewritten.
B. `{ "framework": "aidlc" | "speckit" }` only, with no version field.
X. Other (please specify)

[Answer]: A
