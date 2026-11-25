# Requirements: see whether each tool is signed in, and sign in from the app (US-0804)

Source: the story in `docs/features/epic-08-harnesses.md` (its criteria are kept), the five answers in `requirements-analysis-questions.md` [Q1–Q5], and the tools themselves, tried 2026-11-25 with no prompt and stdin closed.

## Intent analysis

A missing sign-in shows up today as an agent tab or a GitHub feature that fails for no clear reason. The person wants to see it before, and start the sign-in from the app. The tool does the sign-in. The app never handles a password or token.

## What the tools report (the base for FR1)

| Tool | Command | Signed in | Signed out |
|---|---|---|---|
| `gh` 2.58 | `api user --hostname github.com --jq .login` | exit 0, the account name | exit 4, "To get started with GitHub CLI, please run: gh auth login"; a refused token: exit 1, "HTTP 401" |
| `claude` 2.1.332 | `auth status` | exit 0, JSON `loggedIn: true`, `email`, `subscriptionType` | exit 1, JSON `loggedIn: false` |
| `opencode` 2.1.4 | `auth list --format json` | a list of `{name, connections}` | `[]`, exit 0 |

`gh auth status`, the story's example, is not used: with no network it says "The token … is invalid", exactly as for a refused token, and it also prints a masked token line. `gh api user` tells the two apart ("connection refused" against "HTTP 401") and answers for the active account only. Both need the network.

## Functional requirements

### FR1: The check

- **FR1.1** Claude Code, opencode and the GitHub CLI are checked with the fixed command above and stdin closed, so that it can neither prompt nor wait [Q1]. Only a tool that was found is checked.
- **FR1.2** The GitHub CLI is checked as the app runs it. Claude Code and opencode are checked in the login shell, as agent tabs run them, so that a key set in the shell's startup files counts.
- **FR1.3** `gh`: exit 0 with a name is "signed in". Exit 4, or a refused token (HTTP 401), is "not signed in". No network, and anything else, is "unknown" with the reason.
- **FR1.4** `claude`: `loggedIn` decides, also when the exit code is 1. `false` with an `apiProvider` other than `firstParty` is "unknown", as another provider's sign-in is not Anthropic's. Output that is not the expected JSON is "unknown".
- **FR1.5** `opencode`: one or more connections is "signed in"; none is "no account connected" [Q5]. Output that is not the expected JSON, such as from a version without `--format`, is "unknown".
- **FR1.6** A check is stopped after 20 seconds. A check that fails or is stopped is "unknown" with the reason, never "signed in".
- **FR1.7** The app never reads a credential file and never runs a command that prints a secret (`opencode auth export`, `gh auth status --show-token`, `gh auth token`).

### FR2: Settings › Tools

- **FR2.1** Each of the three tools shows its sign-in state next to its version: checking, signed in, not signed in, no account connected (opencode) or unknown with its reason. A tool that was not found shows none.
- **FR2.2** Signed in names the account: the GitHub account name; Claude Code's email and plan; opencode's provider names. A missing name leaves only the state.
- **FR2.3** The GitLab CLI, when found, shows "unknown" with `glab auth status` as the command to check by hand, and no "Sign in" [Q1]. AI-DLC, Spec Kit and the shell show nothing.
- **FR2.4** The versions and paths show without waiting for the sign-in checks, and one check does not delay another.
- **FR2.5** The state is read again when Settings › Tools opens, on Rescan, after a tool's path is changed, and when the window gets focus back while it shows. An older answer never replaces a newer one. While it is read again, the last state stays, marked as being checked.
- **FR2.6** "Not signed in" counts as a problem in the group's strip, after a missing tool. "No account connected" and "unknown" do not.

### FR3: Sign in

- **FR3.1** "Sign in" is offered for not signed in and for no account connected. For "unknown" it is offered too, for the three tools.
- **FR3.2** With a project open, Settings closes and the command is typed into the active project's Shell tab without Enter [Q2]: `gh auth login --hostname github.com`, `claude auth login` or `opencode auth login`. With a chosen path, that path, quoted for the shell, replaces the name.
- **FR3.3** With no project open, the row shows the command with a copy button, and says it can be run in any terminal [Q3].
- **FR3.4** The app sends no Enter, reads nothing of the sign-in, and stores nothing from it.

### FR4: Where a missing sign-in is met

- **FR4.1** When an agent tab starts, its tool is checked in the background. "Not signed in" shows one line in the terminal panel while that tab is the one shown: the tool, "Sign in", and "Settings › Tools", which opens that tab of Settings. Every other state shows no line [Q4, Q5]. The start is neither delayed nor blocked.
- **FR4.2** "Sign in" there types the command into the Shell tab, as FR3.2. The line can be dismissed, and stays away until the tab is started again.
- **FR4.3** While a line shows, the tool is checked again when the Shell tab goes quiet after "Sign in", and when the agent tab is started again. Signed in removes the line.
- **FR4.4** The texts for `gh` not logged in, in the update check and in the team view, also say that Settings › Tools has the sign-in. The team view's text for other platforms stays.

### FR5: Interface

- **FR5.1** Every text goes through `t()` in `sv.json` and `en.json`, in the LCARS look.
- **FR5.2** Every control has a `data-testid` and works from the keyboard. Each state is told apart by text, not only by colour. The result of a check is announced politely, without moving focus.
- **FR5.3** The rows and the line fit without overflow at a window width of 1280, with a long email.

## Non-functional requirements

- **NFR1** (security) Only the tool's id comes from the renderer. Main picks the command from a fixed list. Main hands the renderer only the state, the account text and the reason. A reason is one line of at most 200 characters, without control characters, and nothing that looks like a token is in it. No output or account is logged or saved.
- **NFR2** (tests) Test first, at least 80% line coverage. Reading each tool's output is a pure function, tested on real output with names changed. A Playwright test with stand-in tools shows the states at 1280 before Code Generation's approval.
- **NFR3** (performance) At most one check per tool runs at a time; a second request shares it. An agent tab's start runs one check, of its own tool.

## Constraints

- The tools decide what signed in means, and may change their output; the app then says "unknown".
- Claude Code's and opencode's checks start a login shell, so they take as long as the person's startup files.

## Assumptions

- `gh` 2.58's exit codes and "HTTP 401" hold for other versions; anything else is "unknown", never a guess.
- A token that cannot read its own user (an app or workflow token) shows as "unknown", with GitHub's reason.
- The app's GitHub features use github.com, so other hosts are not checked.
- A login shell's own output before the tool's answer is expected and skipped.

## Out of scope

- Signing out, switching account, warning that a sign-in expires soon.
- Checking the GitLab CLI, Bitbucket (it has its own row), or the harnesses without an agent tab.
- The start screen's health check (US-0805).

## Open questions

None.
