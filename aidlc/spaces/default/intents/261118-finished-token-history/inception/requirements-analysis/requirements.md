# Requirements: US-0215 Token diagrams and figures for finished intents

## Intent analysis

A developer looking back at a finished intent wants to see how it used its tokens: the same diagrams and figures as a live intent. Today only 11 of 39 intents have recorded readings (`.thadeus/tokens/`), so most finished intents show empty diagrams. The history can be rebuilt after the fact from the Claude Code transcripts of the sessions the ledger names for the intent (`workflows["intent:<uuid>"].sessions`). Story: `docs/features/epic-02-cost-and-models.md`, US-0215 (EPIC-02, for v0.2.10). Depends on US-0208 and US-0209.

Findings that shape the requirements:
- The "Tokens over time" diagram already draws every stored reading. The 120-reading window (`HISTORY_MAX`) belongs only to the live meter in `TokenView.jsx`. Stored readings are capped at 2000, with thinning.
- 22 of the ledger's 84 sessions belong to more than one intent, so a session's transcript holds other intents' calls too.
- The ledger keeps token totals per session and intent, but no timestamps.

## Functional requirements

**FR1 Recorded history.** A finished intent with recorded readings shows its whole run in every diagram, from the first reading to the last, with no 120-reading window. [Q2: A]
- **FR1.1** Recorded readings stay the source whenever any exist, even when they cover only part of the run. The rebuild is used only when there are none.

**FR2 Rebuilt history.** A finished intent with no readings gets "Tokens over time" and the rate rebuilt from the transcripts.
- **FR2.1** The sessions come from the ledger's `sessions` keys for the intent (`transcript:<absolute path>`). Only paths inside the Claude Code projects folder are read, with the same confinement as `readTranscriptContext`.
- **FR2.2** Only the assistant lines with `usage` are counted, each with its timestamp and its token counts by kind (input, output, cache write, cache read). A broken or half-written line is skipped.
- **FR2.3** A line counts for the intent only if its timestamp falls in one of the intent's stage windows: `STAGE_STARTED` to the matching `STAGE_COMPLETED` (or the next event that ends the stage) in the intent's audit log. [Q1: A]
- **FR2.4** The rebuilt points are cumulative readings in the same shape as stored readings, so the existing diagrams draw them unchanged.
- **FR2.5** The view says, in one sentence, that the history was rebuilt from the transcripts.

**FR3 No history on this machine.** With neither readings nor readable transcripts (for example, a teammate's intent or opencode work), the view shows the ledger's totals and splits. It says in one sentence that no time history exists on this machine. It never shows an empty chart as if nothing was used.

**FR4 Figures strip.** The view shows the run's figures:
- **FR4.1** Tokens by kind: input, output, cache write and cache read.
- **FR4.2** Estimated cost: the ledger's cost for the intent, labelled as an estimate. [Q3: A]
- **FR4.3** Duration as two figures: working time (first to last model call or reading) and wall-clock time (workflow start to end in the audit log). [Q4: C]
- **FR4.4** Peak rate: the highest point on the rate diagram, measured the same way. [Q5: A]
- **FR4.5** Cache-read share: cache reads out of input + cache reads + cache writes. [Q6: A]
- **FR4.6** A figure that cannot be known is shown as unknown ("–"), never as 0.

**FR5 Agreement with the ledger.** When the rebuilt totals differ from the ledger's totals for the intent, the view shows the difference and why (for example, sessions the ledger counts that are not on this machine, or calls outside the stage windows).

**FR6 Read-only, kept in memory.** The rebuild reads only transcripts and audit files and writes nothing in `aidlc/` or `.thadeus/`. A rebuilt history is kept in memory per intent while the app runs, so reopening the view is fast. `tokens:readings` returns stored or rebuilt readings, with their source.

## Non-functional requirements

- **NFR1 Responsiveness.** A rebuild never blocks the window. The view shows the ledger figures at once and adds the diagrams when the rebuild finishes. A rebuild that fails leaves the FR3 view.
- **NFR2 Text and look.** Every text goes through `t()` in Swedish and English, in the LCARS look. Status is never shown by colour alone.
- **NFR3 Tests.** TDD: a failing test first for each FR, and the existing suite stays green. Coverage stays at or above 80%.

## Constraints

- The app never writes engine-owned files (state, audit, `intents.json`, `.aidlc-*`).
- Decided 2026-11-17: a rebuilt history is not saved as readings in `.thadeus/tokens/`.
- Transcripts are local to the machine that ran the work (see US-0209).

## Assumptions

- The transcript's `timestamp` field and `message.usage` hold the same fields `contextOfTranscript` reads today. To be checked against a real transcript in Code Generation.
- An intent whose audit log has no stage events (older records) uses its first-to-last audit span as one window.
- Subagent transcripts are not named in the ledger's `sessions` (none of the 84 are), so they are not read. The difference shows under FR5.
- opencode work has no transcripts here and gets the FR3 view.

## Out of scope

- Comparing several intents side by side (a later story, decided 2026-11-17).
- Saving rebuilt histories to disk.
- Live intents: the live view is unchanged.

## Open questions

None.
