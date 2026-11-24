# Tech Stack Decisions: U9 u9-feature-token-log

Sources: `technology-stack.md` (code knowledge base), U9 `functional-spec.md` and `rules.md`, C8 in
`contract-summary.md`, `requirements.md` (FR9, NFR6, NFR8).

No new dependency. Everything reuses what the app has:

| Need | Choice | Why |
|---|---|---|
| Turn-end trigger | Existing hook channel: Claude Stop (`claudeReply` passes `transcriptPath`) and the opencode plugin's usage event (`opencodeSignal`) | Already arrives once per turn; no timer or new watcher |
| Transcript reading | `tokenHistory.js` `readTranscriptCalls` / `callsOfTranscript`, extended to keep `message.model` per call | One parser for transcripts; pricing needs the model |
| Active feature | U6 `speckitFeatures.js` reader of `.specify/feature.json` (C5) | Same validity rules as the features view (BR2.1) |
| Bucket file | `tokenReadings.js` shape, `readReadings`, `writeAtomic`, `resolveInRoot`; a new add function that replaces the last reading inside 30 s instead of dropping it | Same file shape as the per-intent log (C8); `addReading` stays as it is for AI-DLC |
| Pricing | The app's price table (`costRates` in `ipc.js`, `normalizeModel`), priced per token kind | Q2 of Functional Design; same rates as the cost view |
| Cursor store | JSON file in Electron `app.getPath('userData')`, written atomically | Machine-local; kept out of `.thadeus/tokens/`, which `thadeusSync` merges as reading lists |
| Serialising | One promise queue per project in main | Two sessions cannot race on a bucket (functional spec W1) |
| Tests | vitest `main` project; the plugin under the existing `.opencode/plugins/*.js` coverage | NFR8 |

Alternative rejected: a timer that reads all transcripts in the project's Claude folder every N seconds. It reads
sessions the app never saw and adds load; the hook events already give the exact moment and file.
