# User Stories: see whether each tool is signed in, and sign in from the app (US-0804)

Six stories, all **Must Have**, built in this order on one branch and one pull request. Requirement IDs are from `requirements.md`.

Every story also meets: texts through `t()` in `sv.json` and `en.json`, the LCARS look (FR5.1); a `data-testid` and keyboard use for every control, states told apart by text (FR5.2); a test that fails first, 80% coverage (NFR2). A criterion's tool state can be set up with a stand-in tool, so each story is tested alone.

## US1.1: See who is signed in
As **Dana (P1)**, I want **each tool's sign-in state and account next to its version**, so that **I know what will work before I start**.
- **AC1.1.1** Given Claude Code, opencode and the GitHub CLI are signed in, when Settings › Tools opens, then each shows "signed in" with its account: Claude Code's email and plan, opencode's provider names, GitHub's account name. (FR1.3, FR1.4, FR1.5, FR2.1, FR2.2)
- **AC1.1.2** Given a tool gives no account name, then only its state shows. (FR2.2)
- **AC1.1.3** Given GitHub answers exit 4 or HTTP 401, or Claude Code says `loggedIn: false` with exit 1, then the state is "not signed in". (FR1.3, FR1.4)
- **AC1.1.4** Given opencode's list is empty, then its state is "no account connected". (FR1.5)
- **AC1.1.5** Given a tool is not found, then it shows no sign-in state and is not checked. AI-DLC, Spec Kit and the shell show none. (FR1.1, FR2.1, FR2.3)
- **AC1.1.6** Given the GitLab CLI is found, then it shows "unknown" with `glab auth status`, and no "Sign in". (FR2.3)
- **AC1.1.7** Given a slow check, then versions, paths and the other states show without waiting for it. (FR2.4)
- **AC1.1.8** Given a tool is not signed in, then its group's strip shows a problem, unless a tool in it is missing, which comes first. "No account connected" and "unknown" do not. (FR2.6)
- **AC1.1.9** Given a long email at a window width of 1280, then nothing overflows. (FR5.3)
- **Dependencies:** none. **INVEST:** medium; one check per tool and its row.

## US1.2: Never a false "signed in"
As **Dana (P1)**, I want **a check that fails to say so**, so that **I can trust the state I see**.
- **AC1.2.1** Given no network, then GitHub is "unknown" with the reason, not "not signed in". (FR1.3)
- **AC1.2.2** Given output the app does not know (not the expected JSON, an empty name, a version without `--format`), then the state is "unknown" with the reason. (FR1.3, FR1.4, FR1.5)
- **AC1.2.3** Given Claude Code says `loggedIn: false` with another provider than `firstParty`, then it is "unknown". (FR1.4)
- **AC1.2.4** Given a check that hangs, then it is stopped after 20 seconds and is "unknown", and its process is gone. (FR1.6)
- **AC1.2.5** Given the shell's startup files set a key, or print a greeting, then Claude Code's and opencode's state is what an agent tab would meet, and the greeting changes nothing. (FR1.2)
- **AC1.2.6** Given a tool that asks a question, then its input is closed, so it can neither prompt nor wait. (FR1.1)
- **AC1.2.7** Given any answer, then the page gets only the state, the account and a one-line reason of at most 200 characters with no control character or token, and nothing is logged or saved. An id that is not one of the three runs nothing. (FR1.7, NFR1)
- **Dependencies:** US1.1. **INVEST:** small; the same checks' other answers.

## US1.3: A state that keeps up
As **Dana (P1)**, I want **the state to be read again when it may have changed**, so that **I see the result of a sign-in without hunting for it**.
- **AC1.3.1** Given Settings › Tools shows, when I open it, press Rescan, choose or reset a tool's path, or come back to the window, then the states are read again. (FR2.5)
- **AC1.3.2** Given a state is read again, then the last one stays, marked as being checked, and the new one is announced without moving focus. (FR2.5, FR5.2)
- **AC1.3.3** Given two reads, when the older answers last, then it does not replace the newer. (FR2.5)
- **AC1.3.4** Given a check of a tool runs, when another is asked for, then they share one process. (NFR3)
- **Dependencies:** US1.1. **INVEST:** small.

## US2.1: Sign in from Settings
As **Dana (P1)**, I want **"Sign in" to put the right command in my Shell tab**, so that **I only have to finish it**.
- **AC2.1.1** Given not signed in, no account connected or unknown, then "Sign in" is offered. Given signed in, or the GitLab CLI, then it is not. (FR2.3, FR3.1)
- **AC2.1.2** Given a project is open, when I press it, then Settings closes and `gh auth login --hostname github.com`, `claude auth login` or `opencode auth login` is in the active project's Shell tab without Enter. (FR3.2, FR3.4)
- **AC2.1.3** Given a chosen path, with a space in it, then that path, quoted for the shell, replaces the name. (FR3.2)
- **Dependencies:** US1.1. **INVEST:** small; the Shell tab's typing is there today.

## US2.2: Sign in before any project is open
As **Nico (P2)**, I want **the command to copy when there is no Shell tab**, so that **I can sign in from any terminal**.
- **AC2.2.1** Given no project is open, then "Sign in" shows the command with a copy button and says it can be run in any terminal. (FR3.3)
- **AC2.2.2** Given I press copy, then the clipboard has exactly the command, and the button says so. A copy that fails says that. (FR3.3)
- **Dependencies:** US2.1. **INVEST:** small.

## US3.1: Told where it fails
As **Dana (P1)**, I want **an agent tab and the GitHub texts to point to the sign-in**, so that **a missing sign-in is not a riddle**.
- **AC3.1.1** Given an agent tab starts and its tool is not signed in, then one line in the terminal panel names the tool with "Sign in" and "Settings › Tools", while that tab is shown. The start is neither delayed nor blocked. (FR4.1)
- **AC3.1.2** Given signed in, no account connected, unknown or still checking, then there is no line. (FR4.1)
- **AC3.1.3** Given the line, when I press "Sign in", then the command is in the Shell tab without Enter; "Settings › Tools" opens that tab of Settings. (FR4.1, FR4.2)
- **AC3.1.4** Given I dismiss the line, then it stays away until the tab is started again. (FR4.2)
- **AC3.1.5** Given I finished the sign-in, when the Shell tab goes quiet or the agent tab starts again, then the tool is checked again and the line goes when it is signed in. (FR4.3)
- **AC3.1.6** Given two agent tabs, then each tab's line is about its own tool, and a start runs one check, of that tool. (FR4.1, NFR3)
- **AC3.1.7** Given the update check or the team view fails because `gh` is not logged in, then the text also names Settings › Tools. GitLab's and Bitbucket's texts are unchanged. (FR4.4)
- **Dependencies:** US1.1, US2.1. **INVEST:** medium; one line and its re-check.

## Assumptions & Open Questions
- The copy button is offered only with no project open; with one, the Shell tab is the way [assumption].
- "Goes quiet" is the Shell tab's own idle signal; a sign-in that waits for the browser may be checked more than once [assumption].
