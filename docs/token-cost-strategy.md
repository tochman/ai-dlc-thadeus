# Token cost strategy

> Written 2026-11-17 for future reference. THADEUS's main value on top of AI-DLC is **minimising waste**, and token cost is the first target. The stories are in [EPIC-02](features/epic-02-cost-and-models.md) and [EPIC-06](features/epic-06-feature-docs.md); the order of work is in the [v0.2.9 release plan](releases/0.2.9.md).

## Where the money goes

From this repository's committed audit rows (197 stage rows, about $1,860, almost all on `opus-5-5`):

| | Share or figure |
|---|---|
| `main` (the session itself) | 57% |
| `aidlc-developer-agent` | 36% |
| Architect and reviewers | about 7% |
| Code Generation | about $13.60 per run, the most expensive stage |
| Tokens | about 5 billion cache reads against 18.5M output tokens |

Cache reads cost about $1,000, output about $370. **The cost is the same long context read again on every turn**: context length times the number of turns. Short sessions and small contexts are the lever, not cheaper thinking.

## Principles

- **Add on top of AI-DLC, never change it.** No edits to AI-DLC's files, hooks or engine, and no drift from the version on GitHub.
- **Rules shape behaviour, THADEUS acts.** A rule is text the model reads. Anything that must happen at a set moment (compacting, a fresh session) is done by the app, from outside.
- **Every rule costs tokens on every stage.** Rule text is read again constantly, so it stays a handful of lines.

## The decisions

**Rule pack (US-0212).** AI-DLC builds each stage's rules from whole files with fixed names in `aidlc/spaces/<space>/memory/`: `org.md`, `team.md`, `project.md` and `phases/<phase>.md` (`resolveRulesForStage`, `.claude/tools/aidlc-graph.ts`). These files reach the delegated agents too. A file of its own (`thadeus.md`) would never be read, so THADEUS owns a marked block inside them:

```
<!-- thadeus:cost-rules:start -->
## Cost discipline (managed by THADEUS)
- ...
<!-- thadeus:cost-rules:end -->
```

General rules go in `project.md`; phase rules go in their phase file (targeted tests in `phases/construction.md`). First pack: `main` delegates reading and writing source code to the developer agent; agents report in a few lines; only the test being worked on runs during the TDD loop, the full suite once before Build and Test is approved; never read `node_modules`, lock files, `dist`/`build` or large logs. No rule may contradict `team.md` (for example "suite green before merge").

**Compact or fresh session (US-0213).** Checked against the Claude Code and opencode docs on 2026-11-17:

- A Claude Code hook cannot run `/compact` or `/clear`, and it cannot start a session. It can report (`Stop`, `transcript_path`) and steer the summary (`PreCompact` stdout becomes the compaction instruction).
- Both harnesses have the same commands: `/compact` (opencode also `/summarize`), `/clear` (opencode also `/new`), and `/aidlc` to resume.
- So: the THADEUS hook reports the context size, the app opens a dialog (context over the threshold, stage completed, gate waiting) and types the chosen command into the agent tab when the agent is idle.
- AI-DLC keeps its state on disk and its `SessionStart` hook injects the resume context, so a fresh session at a stage boundary loses nothing.
- `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (100k–1M tokens) makes Claude Code compact earlier by itself; the app can set it when it starts `claude`.
- Hooks are installed the same way as the US-0506 dialog hooks (`src/main/agentHooks.js`, `.thadeus/hooks/`, `.opencode/plugins/`), next to AI-DLC's entries.
- Still open: whether AI-DLC accepts an approval given in a fresh session; autonomous Construction rarely goes idle, because AI-DLC's `continue-workflow` `Stop` hook keeps it going.

**Correct prices (US-0211, issue #64).** AI-DLC's price table has `sonnet-5-5` cache reads at $0.20/M (published: $0.10/M) and lacks `fable-5-2` and `haiku-5-5`. The app reprices from the stored tokens and shows both figures when they differ. It never rewrites the audit shards.

**Model profiles (US-0210).** Switch to a stronger model profile when a critical intent starts, back to the economy profile when it ends, through `aidlc config models --from <name>`.

**Planning never lost (US-0606, US-0607).** Release list actions are committed on their own and kept in a local record outside the working tree, then pushed to `main` at intervals or when the app is idle.

## Working habits until the stories are built

- One story at a time; parallel stories mean a merge and a full suite run again.
- A fresh session after each stage or batch; park and resume with `/aidlc`.
- Run only the test the change touches; the full suite once at the Build and Test gate, and in CI.
- Short briefs to agents, short stage documents.
- Ideas not yet written as stories: cost per stage and agent against the project's averages; "what this intent would have cost on another model" (builds on US-0211); a plan's usual cost shown at intent start.

## Next step

Start US-0212 in a fresh session: `/aidlc` with the ultra-express plan, story US-0212 in EPIC-02.
