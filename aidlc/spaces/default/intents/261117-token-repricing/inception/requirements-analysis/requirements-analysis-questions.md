# Requirements Analysis Questions: US-0211 Reprice recorded tokens

## Q1. [Product] Which table wins when AI-DLC's shipped table is wrong
The story orders the tables as the project's `AIDLC_MODEL_RATES` file, then AI-DLC's shipped table (`.claude/tools/data/model-rates.json`), then the app's own. But the shipped table is the one with the wrong price (`sonnet-5-5` cache reads at $0.20/M), so with that order the criterion "`sonnet-5-5` cache reads at $0.10/M" can never pass.

A. The app's own table is newer: it ranks above AI-DLC's shipped table (project file → app table → shipped table), per model
B. Keep the story's order, but the app's table corrects known errors in the shipped table, per field
C. Drop AI-DLC's shipped table entirely: project file, else the app's table
X. Other (please specify)

[Answer]: A

## Q2. [Developer] Where the app finds `AIDLC_MODEL_RATES`
AI-DLC reads it from the shell environment. The app is started from the Dock and does not see that environment.

A. From `env.AIDLC_MODEL_RATES` in `.claude/settings.local.json`, then `.claude/settings.json` (where Claude Code passes env to AI-DLC)
B. A path set in the app's project settings
C. Both: the settings files first, the project setting as an override
X. Other (please specify)

[Answer]: C

## Q3. [Product] `haiku-5-5` prices that depend on the prompt size
Issue #64 gives `haiku-5-5` as $0.10 / $0.50 for prompts up to 100K tokens. The stored counts are totals, so the size of each prompt is unknown.

A. Price everything at the up-to-100K tier and say so in the view
B. Price at the higher tier (a ceiling, never under-counted) and say so
X. Other (please specify)

[Answer]: B

## Q4. [Product] Which figure is the headline when they differ
A. The current-price figure is the headline, with "recorded $X" beside it
B. The recorded figure is the headline, with "at current prices $Y" beside it
X. Other (please specify)

[Answer]: B

## Q5. [Product] Where the repricing applies
USD appears in the intent list, intent detail, the cost tab (also per machine), the cost panel, token detail and its chart.

A. Everywhere USD is shown, totals included
B. Only the cost tab and intent detail; the other views stay on the recorded figure
X. Other (please specify)

[Answer]: A
