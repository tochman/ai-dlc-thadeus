# Functional Design Questions — u9-feature-token-log (US-1409)

Settled already, so not asked here: readings come from Claude Code's session transcripts (the Stop event gives the
transcript path) and from the opencode plugin's usage events (FR9.1); with no active feature, an unreadable
`feature.json` or a missing feature folder, readings go to the project-wide bucket (FR9.2, AC5.1.2); files are
`.thadeus/tokens/speckit-<feature-dir>.json` and `speckit-project.json` in the existing per-intent shape (FR9.3, C8).

## Q1. [Product owner] A turn that changes the active feature

`/speckit-specify` creates a new feature and points `.specify/feature.json` at it in the same agent turn. Which
feature gets that turn's tokens?

A. The feature active when the turn ends, so the specify turn lands on the feature it created (simplest; one reading per turn)
B. Split by time: the calls made before `feature.json` changed go to the old feature, the rest to the new one
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] Cost in money

The story asks to see what each feature cost. The per-intent log stores a dollar figure beside the tokens.

A. Store dollars too, worked out per model from the app's existing price table (the same one the session handoff uses)
B. Tokens only; dollars left unknown, as in histories rebuilt from transcripts
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] Showing the log in this story

This Unit is the logging library. The log can be shown somewhere now or later.

A. Log files only in this story; showing them is a later story
B. Also show each feature's token and cost total in the Spec Kit feature detail view now
X. Other (please specify)

[Answer]: A
