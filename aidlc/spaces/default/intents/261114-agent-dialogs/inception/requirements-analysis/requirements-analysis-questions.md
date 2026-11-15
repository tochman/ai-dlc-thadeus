# Requirements Analysis questions: US-0506 agent dialogs

Background from the code scan (`aidlc/spaces/default/codekb/aidlc-dash/architecture.md`): the popup learns about a question only from AI-DLC's audit log, and sends the answer by reading Claude Code's picker off the terminal screen and pressing the matching key. When the logged options and the options on screen differ, as with "Approve / Request changes" against "Complete workflow / Request Changes" on 2026-11-14, the popup refuses with "Could not send". A question asked as plain chat text has no picker, so it can never be sent from the popup. The app uses no Claude Code hooks and no opencode events today.

## Q1. [Product] What should reach the dialog in the first release of this work?

A. Everything in US-0506: questions, permission prompts ("Allow this command?"), "the agent is waiting for you", and the agent's latest message
B. Questions and permission prompts; waiting and messages come in a later story
C. Only questions (AI-DLC's and the agent's own), done right; the rest later
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q2. [Product] Where does the dialog get the question from, for Claude Code?

A. From Claude Code itself, through its hooks: the dialog shows exactly the question and options Claude Code shows, and AI-DLC's audit log only adds context (stage, intent)
B. From AI-DLC's audit log as today, with better matching against the screen
C. Both, side by side: hooks when installed, audit log and screen reading otherwise
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q3. [Product] Where may the app add its hooks or plugin, and how is the person asked?

The hooks have to be written into a harness settings file. The app shows what it will add before writing, and writes nothing without consent.

A. This project only, in the person's own uncommitted file (`.claude/settings.local.json`; for opencode its project plugin folder)
B. This project, in the shared committed settings, so every teammate gets it
C. For this person on this machine, in every project (`~/.claude/settings.json`)
X. Other (please specify)

[Answer]: B
**Mode:** guided

## Q4. [Product] When the dialog is open, can the person still answer in the terminal?

A. Yes, both work: whichever answers first wins, and the other closes or updates within a second
B. No, the dialog takes over until it is answered or closed
X. Other (please specify)

[Answer]: B
**Mode:** guided

## Q5. [Product] How much of this applies to opencode in the same release?

A. The same as Claude Code: questions, permissions and whatever Q1 includes, through opencode's plugin and event API
B. Claude Code first; opencode keeps today's behaviour and gets its own story
C. opencode questions and permissions only, even if Claude Code gets more
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q6. [Designer] What must the dialog show that it does not show well today? (choose all that apply)

A. The question text formatted as Markdown (headings, lists, `code`), never as raw HTML
B. Each option's description under its label, not just the label
C. All questions of a batch (up to four at once) in one dialog, answered together
D. Questions where several options can be picked (multi-select)
X. Other (please specify)

[Answer]: A, B, C, D
**Mode:** guided

## Q7. [Product] What about a question the agent asks in plain chat text, with no picker?

A. Show it in the dialog with an answer field; the answer is typed into the agent tab that asked, with Enter
B. Do not show it in the dialog; a notification says the agent is waiting and opens the terminal
C. Show it read-only with a button that opens the terminal
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Q8. [Product] Follow-up to Q3 and Q4: what happens when Claude Code runs in a terminal outside the app?

The hooks sit in the project's shared settings (Q3: B), so they also run for a Claude Code session the person started in their own terminal, and for teammates who do not use the app. Q4 says the dialog takes over while it is open.

A. Only sessions started in the app's own agent tabs go to the dialog; any other session behaves as if the hooks were not there
B. Every session in the project goes to the dialog while the app has the project open; when the app is closed, sessions behave as normal
X. Other (please specify)

[Answer]: A
**Mode:** guided

## Assumption Confirmation

`requirements.md` rests on five assumptions; the first three are checked by a spike against a real Claude Code and opencode session in Functional Design, with the fallback in FR3.6 if they do not hold:

- Claude Code's hooks report the structured question (text, options with descriptions, header, multi-select, batch), permission prompts, and the end of each turn with the last message.
- Where a hook cannot return the answer itself, pressing the picker's keys computed from the hook's exact options is reliable.
- A hook can wait minutes for the person, with a time limit after which it hands back to the terminal.
- The app can tell its own sessions apart by a value it sets when it starts the agent tab.
- The app is a single-user local tool.

A. Accept assumptions
B. Convert to follow-up questions
X. Other (please specify)

[Answer]: A. Accept assumptions
**Mode:** guided
