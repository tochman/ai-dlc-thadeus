# Refined Mockups questions: US-0506 agent dialogs

Background: this plan has no rough mockups (the classic plan skips Ideation), so the mockups start from `stories.md` (US1.1–US5.1) and `requirements.md`. Already settled: Markdown text, option descriptions, batches answered together, multi-select, an own-answer field, keyboard use (NFR6), and US-0505's calm-then-red look. Today's popup (`src/renderer/QuestionPopup.jsx`) is a 640 px LCARS dialog with a steel header bar, one question, a pager and Open the terminal / Close. These questions are only about how the new dialog and its neighbours look and behave.

## Q1. [Designer] How should a batch of up to four questions be laid out?

A. All questions stacked on one scrollable page, each with its header as a small title, one Send at the bottom
B. One question at a time with header chips across the top (like Claude Code's own picker), Next/Back between them and Send on the last
C. Stacked like A, but each question collapses to a one-line summary once answered
X. Other (please specify)

[Answer]: C
**Mode:** guided

## Q2. [Designer] How should a permission prompt look different from a question?

The person must never confuse "allow this command" with an ordinary choice (FR3.4).

A. Same dialog, but an amber header bar with the word "Permission", the command shown in a code block, and Deny visually separated from the allow choices
B. Same dialog and colours as a question, only the kind named in the header
C. A separate, smaller dialog just for permissions
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q3. [Designer] How should a reply (the agent finished its turn) appear?

A reply holds nothing: the agent is already waiting at its prompt, and closing only dismisses it (FR3.3).

A. In the same modal dialog as questions, with a quieter steel header "Message from <agent>", the rendered message and an answer field
B. In a non-modal side panel that slides in over the project view, so the person can keep working while it is open
C. Same as A, but a reply never turns red after 20 seconds (only questions and permission prompts escalate)
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q4. [Designer] Where should the per-project latest-message line sit (FR2.8)?

A. A one-line strip directly above the agent terminal panel, showing the tab, the time and the first line of the message, with Answer and Show all
B. In the intent detail's readout column, beside live tokens
C. In the project header bar, next to the project name
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q5. [Designer] Where should Install / Update for the hooks and plugin live, and how is the preview shown?

A. A notice strip in the project view when they are missing or out of date ("Agent dialogs use the terminal fallback"), with Install / Update; the preview opens as a dialog showing the change to each file as a diff, plus Install and Cancel. The same status and actions also appear in Project settings
B. Only in Project settings, with the same diff preview
C. Offered once when the project opens, then only in Project settings
X. Other (please specify)

[Answer]: A
**Mode:** guided
