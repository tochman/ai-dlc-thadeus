# Requirements — US-1302 Savings hints

## Sources

- Initial description: US-1302 story text and acceptance criteria in `docs/features/epic-13-insights.md` [desc]
- Workflow-selected scope: ultra-express [scope]
- This stage's answers: [Q1] A, panel plus intent tab; [Q2] A, usual numbers from every intent, hints only for intents not archived; [Q3] A, fixed defaults, 3 runs; [Q4] A, next cheaper family; [Q5] A, 20 points below median; [Q6] A, twice the median after 5 runs; [Q7] A, dismiss one hint
- Current code: `src/main/parsers/ledger.js` (`summarizeLedger`, `byStage`, `stageModels`), `src/main/reprice.js` and `src/main/modelRates.js` (US-0211 price table), `src/main/rework.js` (`stageAttempts`, US-1301), `src/main/tokenHistory.js` (`callsOfTranscript`, `stageWindows`), `src/renderer/CostPanel.jsx`, `src/renderer/CostTab.jsx`, `src/renderer/ConfigEdit.jsx` (model per agent, US-0904), `src/renderer/CostRulesSection.jsx` (rule pack, US-0212), `src/renderer/ProjectSettingsView.jsx` (`project-handoff`, US-0213)

## Intent

Point at AI spend that the same work could do for less, with what it would save, how that was worked out, and a link to the setting that changes it. The app suggests; the person decides.

## Functional requirements

- **FR1 Baseline and scope.** The usual numbers (medians, usual shares) come from every intent in the ledger, archived ones included. Hints are shown only for intents that are not archived [Q2].
- **FR2 Lighter model.** A stage gets a hint when all hold [Q3]:
  - FR2.1 its runs used the dearest model family in the price table (Opus today);
  - FR2.2 its output tokens per run are below the project's median for that stage;
  - FR2.3 at most 1 in 10 of its runs was rejected (`GATE_REJECTED`, counted as US-1301 does);
  - FR2.4 it has at least 3 runs.
  - FR2.5 The hint names the stage and its agent, suggests the next cheaper family in the table (Opus to Sonnet, Sonnet to Haiku), and shows the saving: the stage's recorded tokens repriced at that model's rates, per run on average and in total [Q4]. It links to that agent's model setting in Configuration (US-0904).
- **FR3 Low cache share.** An intent gets a hint when its cache-read share (cache reads / (input + cache writes + cache reads)) is at least 20 percentage points below the project's median share [Q5]. The hint names the intent and the likely causes: a fresh session started mid-stage, or a long context.
- **FR4 Many turns.** A stage run gets a hint when its turns (model calls inside its window, from the transcript calls) are at least twice the median for that same stage, and the stage has at least 5 earlier runs [Q6]. It names the stage and intent and links to the THADEUS rule pack in Configuration (US-0212) and to the session handoff setting (US-0213).
- **FR5 How it was worked out.** Every hint can unfold its working: the figures it compared, the thresholds, and the prices used.
- **FR6 Dismiss.** A hint can be dismissed; that one hint (its kind plus its stage or intent) stays hidden for the project. Dismissals are kept in the project's `.thadeus/` folder. A "show dismissed" link lists them and can bring each back [Q7].
- **FR7 Where.** The project cost panel has a "Savings" section with all hints, largest saving first, hints without a money figure after. The intent's cost tab shows the hints for that intent. With no hints, it says so in one line [Q1].

## Non-functional requirements

- **NFR1** Never changes a setting: links only open the setting. Nothing is written in `aidlc/`; the only write is the dismissal file in `.thadeus/`.
- **NFR2** A saving is labelled an estimate with its basis. A model with no price shows "no price", never a saving of 0.
- **NFR3** Every text goes through `t()` with the same keys in `sv.json` and `en.json`, in the LCARS look.
- **NFR4** Working out the hints reuses the ledger, audit and readings already loaded for the cost panel; opening it adds no noticeable delay.
- **NFR5** TDD, with the 80% line-coverage floor kept.

## Constraints

- The ledger does not cross agent and model, so the agent named in FR2.5 is the one `agentModels` can attribute (`ledger.js`); where it cannot, the hint names the stage only and links to the model list.
- The ledger sums a stage's runs; runs per stage are counted from the audit's attempts (US-1301 `stageAttempts`).

## Assumptions

- Turns can only be counted where transcripts are on this machine; a run without them gets no turns hint (never a guessed one). [assumption]
- A stage that ran on more than one family counts as top tier when the dearest family is most of its cost. [assumption]

## Out of scope

- Changing a setting from the hint, thresholds in settings, per-kind switch-off, savings per release (US-1303), quality signals (US-1305).

## Assumptions & Open Questions

None.
