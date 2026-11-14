# Functional Design questions: u3-replies

Background: the rest of this Unit is settled (US3.1, mockups M4 and M5, contracts C1–C4; Claude Code's `Stop` hook carries `last_assistant_message`, opencode reports idle through `session.status`). One point conflicts between two approved documents.

## Q1. [Designer] Should a reply dialog turn red after 20 seconds?

The approved mockup M4 lets a reply escalate to red like a question, but the approved story US5.1 (AC5.1.1) limits red to questions and permission prompts, and its aim is not to interrupt on every finished turn. The reviewer flagged this at Refined Mockups.

A. No: a reply stays calm; only questions and permission prompts turn red (as the story says)
B. Yes: a reply turns red after 20 seconds like a question (as the mockup shows)
X. Other (please specify)

[Answer]: B
**Mode:** guided
