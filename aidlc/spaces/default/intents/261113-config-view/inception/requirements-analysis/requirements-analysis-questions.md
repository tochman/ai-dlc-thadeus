# Requirements Analysis Questions: US-0901 See a project's AI-DLC configuration

Story and acceptance criteria: `docs/features/epic-09-aidlc-configuration.md` (US-0901). The read-only commands were checked on this project: `aidlc config --show --json` returns the sections models, runtime, providers, trust, flags and project; `aidlc config list --json` returns the active intent's settings with their source in brackets, for example `off (from scope ultra-express)`.

## Q1. [Product owner] Which project defaults (flags) the view lists

`aidlc config flags` reports about 15 switches. On this project only one differs from AI-DLC's shipped default (the default plan, set by an environment variable to `classic`); the rest say "shipped default". Showing every switch makes a long list of values nobody chose.

A. Show every switch, with its value and source
B. Show only switches that are not at the shipped default, plus a "Show all" toggle that lists the rest
C. Show only switches that are not at the shipped default
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] Which harness the view follows when a project has several

A project can have more than one harness installed (for example Claude Code and opencode). The agent tab already runs the harness you chose for the project (US-0801). The model settings differ per harness; the rest of the configuration is the same for all.

A. The harness chosen for the agent tab, with no switch in the view
B. The harness chosen for the agent tab by default, with a picker in the view listing only the installed harnesses
C. Show a models section for each installed harness, one after the other
X. Other (please specify)

[Answer]: B

## Q3. [Developer] What the plans (scopes) section shows

Saved plans are files under `.claude/scopes/` (shipped with AI-DLC) and `aidlc/scopes/` (saved in this project, such as `ultra-express`). Each has a name and a description in its frontmatter. There is no JSON command that lists them, so the app reads the frontmatter.

A. Name and description of every plan, with the project's own plans marked, and the active intent's plan highlighted
B. Only the project's own saved plans (`aidlc/scopes/`), with name and description
C. Name, description and the list of stages each plan runs
X. Other (please specify)

[Answer]: A
