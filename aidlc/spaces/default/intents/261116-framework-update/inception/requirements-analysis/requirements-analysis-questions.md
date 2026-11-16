# Requirements Analysis Questions: US-0504, update the AI-DLC framework from the console

The scan found two different updates. `aidlc update` updates the `aidlc` program on this machine (`aidlc update --check` says whether a newer release exists). `aidlc config --harness <id>` updates the project's AI-DLC files (`.claude/`, `.aidlc/` …); its `--dry-run --json` lists every file it would create, update or remove. The story names both. These questions settle the rest.

## Question 1
What should the console offer?

A. Both, as two rows: "AI-DLC program" (installed version, newer release, types `aidlc update`) and "AI-DLC in this project" (files that would change per harness, types `aidlc config --harness <id> --yes`)
B. Only the project files (`aidlc config`); updating the program stays a terminal task
C. Only the program (`aidlc update`)
X. Other (please specify)

[Answer]: A

## Question 2
Where should it live?

A. In the refresh panel from US-0502, as a new section below "Refresh from GitHub"
B. In the Configuration view (EPIC-09), where the project's AI-DLC settings are
C. In Settings › Tools, next to the `aidlc` version it already shows
X. Other (please specify)

[Answer]: C

## Question 3
When should it check for a newer release (this uses the network)?

A. Only when I press "Check for updates"
B. Automatically once a day, like the app's own update check, and on the button
X. Other (please specify)

[Answer]: X. When the app starts, and on the button
