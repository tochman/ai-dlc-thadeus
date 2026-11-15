# User Stories questions: US-0506 agent dialogs

Background: `requirements.md` (approved) holds FR1–FR6 and NFR1–NFR8. Requirements Analysis already settled what goes into the first release (everything in US-0506, Claude Code and opencode alike), where the hooks go (shared `.claude/settings.json`), and that only the app's own sessions reach the dialog. These questions are only about how the work is cut into stories.

## Q1. [Product] How should this work appear in the feature docs?

The team ships one squash-merged pull request per story, and `docs/features/epic-05-workflow-control.md` holds US-0506 as one story today.

A. Split US-0506 into several stories in EPIC-05 (US-0506 keeps the first slice, new numbers US-0507, US-0508, … for the rest), each with its own branch and pull request
B. Keep US-0506 as one story in the feature docs; the stories written here are its internal breakdown, delivered in one pull request
C. Keep US-0506 as the umbrella story and add sub-stories under it (US-0506a, US-0506b, …), each with its own pull request
X. Other (please specify)

[Answer]: B
**Mode:** guided

## Q2. [Product] How should the work be cut into stories?

A. By vertical slice per kind of event: first the hook channel with questions end to end, then permission prompts, then replies and the latest-message line, then install and settings
B. By harness: everything for Claude Code first, then opencode as its own stories
C. By workflow step: install the hooks, receive events, show the dialog, send the answer
D. By component: main side, renderer dialog, hook scripts, opencode plugin
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q3. [Developer] How large should each story be?

A. Small: about 1–3 days of work each, which gives roughly 10–14 stories
B. Medium: about 3–5 days each, roughly 6–8 stories
C. Large: one story per functional area (FR1–FR6), 6 stories
X. Other (please specify)

[Answer]: C
**Mode:** guided

## Q4. [Quality] What counts as proof that a story's acceptance criteria hold against a real agent?

The requirements ask that each correctness scenario runs once against Claude Code and once against opencode (NFR2), and jsdom tests do not run the built app.

A. Automated tests that replay real hook and plugin payloads recorded from Claude Code and opencode, plus a manual run of the scenarios on the release Mac before the release tag
B. Automated tests with recorded payloads only
C. A manual run against real sessions only
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q5. [Product] Follow-up to Q2 and Q3: slices per event kind, or one story per functional area?

Q2 chose vertical slices per kind of event (questions, then permission prompts, then replies), while Q3 chose one story per functional area (FR1 events, FR2 dialog, FR3 sending, FR4 install, FR5 settings, FR6 corners). Those two cuts conflict: a functional-area story like "the dialog" (FR2) spans all three kinds, so it is not a vertical slice.

A. Large vertical slices: about 5 stories, each one kind end to end (questions with the hook channel; permission prompts; replies and the latest-message line; install, update and fallback; notifications and settings), with the corner conditions (FR6) inside the slice they belong to
B. One story per functional area, FR1 to FR6 (6 stories), as Q3 said, built in that order
X. Other (please specify)

[Answer]: A
**Mode:** guided
