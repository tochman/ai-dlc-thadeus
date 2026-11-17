# Requirements Analysis Questions: US-0210 model profile switch

The scan found that a profile saved with `aidlc config models --save-as <name>` holds only the effort per group (deciding, reviewing, writing-up), not models. `--from <name>` sets those efforts and leaves each agent's model alone. This project's model settings today pin models per agent (architect opus, delivery sonnet, pipeline-deploy haiku) and have no saved profiles yet.

## Q1. [Product owner] What should a "critical" or "economy" profile change?

The story wants the stronger model where a mistake costs more than tokens. An AI-DLC saved profile can only change efforts.

A. Efforts only: use AI-DLC's saved profiles as they are (`--from <name>`). Simplest; models stay as set per agent.
B. Models and efforts: the app keeps its own two profiles (a model and effort per agent), and a switch runs one `aidlc config models --agent <a> --model <m> --effort <e>` per agent.
C. Both: an AI-DLC saved profile for the efforts, plus a model per group (deciding, reviewing, writing-up) set in the app, applied with `--group <g> --model <m>` after `--from`.
X. Other (please specify)

[Answer]: C (Both)

## Q2. [Product owner] Two intents at once, one critical and one not: which profile is active?

A. Critical wins until the last open critical intent ends, then the app switches back to economy (the story's proposal).
B. The latest intent to start decides; the app asks again whenever a new intent starts.
X. Other (please specify)

[Answer]: A (Critical wins)

## Q3. [Developer] Which harness does a switch apply to?

The command needs `--harness <name>`. The app's main process does not know which harness the agent tab uses; only the renderer works it out today. Only Claude Code and opencode have model tables.

A. The harness the project's agent tab uses (the saved setting, else the detected one); if it has no model table, the app says so and switches nothing.
B. Every detected harness in the project that has a model table, one command each.
X. Other (please specify)

[Answer]: A (Agent tab harness)

## Q4. [Developer] How should the app set a model per group? (follow-up to Q1)

AI-DLC's `config models` has no `--group <g> --model <m>` flag (the option in Q1 named one by mistake). Models can only be set per agent with `--agent <a> --model <m>`. The command's `--show --json` output says which group (deciding, reviewing, writing-up) each agent belongs to.

A. The person picks one model per group in the app; a switch runs `--from <profile>`, then one `--agent <a> --model <m>` for each agent in that group, using the group of each agent from `--show --json`.
B. The person picks one model per agent in the app (11 agents), and a switch runs `--from <profile>` and then those per-agent commands.
X. Other (please specify)

[Answer]: B (Per agent)
