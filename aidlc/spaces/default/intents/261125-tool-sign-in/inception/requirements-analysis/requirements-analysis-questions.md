# Questions: see whether each tool is signed in, and sign in from the app (US-0804)

The story in `docs/features/epic-08-harnesses.md` settles most of this. The tools were tried on 2026-11-25 without a prompt: `gh auth status`, `claude auth status` (JSON) and `opencode auth list --format json` all report their sign-in, and all three also answer clearly when signed out. These are the choices the story leaves open.

## Q1. [Product] Which tools show a sign-in state

The story names Claude Code, opencode and the GitHub CLI. Settings › Tools also lists the GitLab CLI (`glab`), which has `glab auth status` but is not installed here, so its output cannot be tried. AI-DLC, Spec Kit and the shell have no sign-in.

A. The three in the story. The GitLab CLI shows "unknown" with the command to check by hand.
B. The GitLab CLI too, built from its documentation and not tried.
X. Other (please specify)

[Answer]: A

## Q2. [Product] What "Sign in" does in the Shell tab

Each tool has a sign-in command: `gh auth login`, `claude auth login`, `opencode auth login`. Today the app types a command into the Shell tab and the person presses Enter.

A. The app types the command without Enter, as for other commands. The person presses Enter and finishes the sign-in.
B. The app types the command and sends it, so the sign-in starts at once.
X. Other (please specify)

[Answer]: A

## Q3. [Product] "Sign in" when no project is open

Settings can be open without a project, and then there is no Shell tab.

A. The row shows the command with a copy button, to run in any terminal.
B. "Sign in" is unavailable, with the reason that a project must be open.
X. Other (please specify)

[Answer]: A

## Q4. [Product] How an agent tab points to a missing sign-in

The app cannot see why an agent failed without reading the terminal's text, which breaks when a tool changes its wording.

A. When an agent tab starts, the app checks that tool's sign-in in the background. If it is not signed in, the terminal panel says so in one line, with "Sign in" and a link to Settings › Tools. Nothing is blocked.
B. The same line only when the agent's session ends with an error and the tool is not signed in.
C. Agent tabs get nothing. Only the GitHub texts point to Settings › Tools.
X. Other (please specify)

[Answer]: A

## Q5. [Product] opencode without any connected account

opencode lists the providers it is connected to. With none connected it may still run with a model that needs no account.

A. Shown as "no account connected", a neutral state with "Sign in", and no line in the agent tab.
B. Shown as "not signed in", treated as the other tools.
X. Other (please specify)

[Answer]: A
