# Logical Components: U9 u9-feature-token-log

Sources: `functional-spec.md` (W1), `tech-stack-decisions.md`, `security-requirements.md`, C5 and C8 in
`contract-summary.md`. Kind: library in the main process; no new dependency. There is no `performance-requirements.md`
for this library Unit, so no performance design: a turn is one small local file write.

| Component | Responsibility | Reuses | Failure domain |
|---|---|---|---|
| Turn trigger | Takes Claude Stop (`claudeReply`, `transcriptPath`) and opencode usage events (`opencodeSignal`); drops them unless the framework is Spec Kit (BR1.1) | Existing hook channel | One turn |
| Turn usage | Uncounted calls of the session, with model (BR1.2, BR1.3) | `tokenHistory.js` `readTranscriptCalls` / `callsOfTranscript` | One turn, retried next turn |
| Bucket resolver | Active feature at turn end through the C5 reader; checked key or `speckit-project` (BR1.4, BR2.1) | U6 `speckitFeatures.js` | Falls back to project bucket |
| Pricer | Dollars per token kind; unknown model gives tokens only (BR4.1) | `costRates`, `normalizeModel` | None (pure) |
| Bucket writer | Adds to the last reading or appends; replaces inside 30 s instead of dropping (BR2.2); atomic write (BR3.1) | `tokenReadings.js` `readReadings`, `writeAtomic`, `resolveInRoot`; a new add function beside `addReading` | One bucket file |
| Cursor store | Per project and session ids and counts in user data; advanced after a good write (BR3.2) | `writeAtomic` | One session |
| Project queue | One promise chain per project root, so turns run one at a time (W1) | none | One project |

```mermaid
flowchart LR
  T[Turn trigger] --> Q[Project queue]
  Q --> U[Turn usage]
  U --> R[Bucket resolver]
  R --> P[Pricer]
  P --> W[Bucket writer]
  W -->|ok| C[Cursor store]
```
<!-- Text fallback: the turn trigger feeds the project queue; each queued turn builds its usage, resolves the bucket, prices the calls and writes the bucket; only a good write advances the cursor store. -->

Blast radius: a failure stops one turn of one project and leaves files as they were; the next turn picks the same
calls up. The AI-DLC per-intent log is untouched (`addReading` unchanged). Infrastructure Design has nothing to add:
no service, network or storage beyond local files.
