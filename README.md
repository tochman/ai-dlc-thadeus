# aidlc-dash

An Electron "bridge console" for AI-DLC projects: a sci-fi (LCARS-inspired, kept tasteful) view of what the agents are doing.

## Vision

- Open any project folder that contains `aidlc/spaces/<space>/intents/`
- Browse intents (`intents.json`), their scope, status and stage progress (`runtime-graph.json`, `aidlc-state.md`)
- Live timeline from the audit log (`audit/*.md`): stages, subagent dispatches, gates, questions, decisions
- Bolt / unit DAG view (`bolt_dag` in `runtime-graph.json`)
- Read stage artifacts (markdown) inline
- Watch files and update live while agents work
- Interactive: send commands to Claude (e.g. `/aidlc ...`, answer gate questions) from the console

Built with AI-DLC itself, see `aidlc/spaces/default/intents/`.
