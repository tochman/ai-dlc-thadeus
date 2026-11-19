# Feasibility Assessment: EPIC-14 Spec Kit

Input: the approved intent statement (`ideation/intent-capture/intent-statement.md`): developers with Spec Kit projects cannot use THADEUS; the first version is judged on setting up a new project on Spec Kit from the app and starting its first feature; US-1405 is raised to High. Answers: `feasibility-questions.md` (Q1–Q6). Codebase read on 2026-11-19.

## Verdict

**Feasible, with conditions.** Nothing in the stack blocks it: the app already reads project files, watches folders, runs CLIs from the login shell's `PATH` with a preview, and sends commands to the agent terminal. Three things must be settled before the work is built, and one plan choice is at risk (all seven stories in one release).

## By story

| Story | Feasibility | What it rests on today | Main uncertainty |
|---|---|---|---|
| US-1401 one framework per project | Feasible, Medium-High effort | Views already split on one "AI-DLC or not" flag in about ten places (`App.jsx`, `ProjectView.jsx`) | The framework must be kept in the repository (Q2), not in the app's per-machine settings the story names |
| US-1402 features and progress | Feasible, Medium | File reading, watching and the artifact reader exist | Progress is guessed from files; "any version" (Q4) means formats can change under it |
| US-1403 run Spec Kit commands | Feasible, Low-Medium | Commands are already typed into the agent terminal (`/aidlc`, Resume) | The command form each harness expects for Spec Kit is unchecked for opencode |
| US-1404 constitution and extensions | Feasible, Low | Markdown and YAML reading, the editor (EPIC-10) | `extensions.yml` shape is unchecked against a real project |
| US-1405 set up Spec Kit | Feasible, Medium | The AI-DLC setup flow (US-0503): CLI on `PATH`, preview, fixed arguments, no shell | `specify init` may have no dry run, so the "preview" may have to be the app's own description |
| US-1406 detect and choose | Feasible, Medium | Detection and the setup watcher exist for `aidlc/spaces/` | The choice is stored in the repository (Q2), which writes a file before the setup the person confirms |
| US-1407 switch framework | Feasible, Medium | Builds on US-1401, US-1405, US-1406 | Telling "work in progress" in Spec Kit relies on the guessed progress of US-1402 |

## Conflicts found in the stories

1. **Where the choice is kept.** US-1401 and US-1406 say "kept in the project settings". Project settings live on one machine, keyed by the folder. The answer is to keep it in the repository so every clone follows it (Q2). The stories must say so, and say which file and who commits it.
2. **Token log "the same for both".** The token log is kept per AI-DLC intent and rebuilt from the intent's stage windows. Spec Kit has no intents or stages. The answer is one log per Spec Kit feature (Q3). That is new work, not "the same", and no story holds it.
3. **Waiting questions and agent progress.** The waiting-questions popup and the agent progress are read from an AI-DLC intent's audit events (`src/main/questions.js`, `src/main/agentProgress.js`). A Spec Kit project has no audit log, so "works the same" holds for the terminal, the agent dialog hooks and the editor, not for these two. No story says what they show in a Spec Kit project.
4. **Version.** "Any version" (Q4) conflicts with fixed file paths in US-1402 to US-1404. It is workable only if every view says what it could not read, as US-1404 already does.

## Release fit

All seven stories in v0.2.11 (Q1) is the largest risk: about seven Medium stories, plus the token log and the repository setting that no story holds yet. Scope Definition should check that against the first-version measure.

## Assumptions & Open Questions

- [assumption] `specify init --integration opencode` works the way the epic says; not run here.
- [assumption] Spec Kit's licence allows use from the app; Q6 says nothing limits the work.
