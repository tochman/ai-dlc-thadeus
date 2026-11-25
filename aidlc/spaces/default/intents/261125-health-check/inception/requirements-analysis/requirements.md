# Requirements: a health check on the start screen, with install commands for what is missing (US-0805)

Source: the story in `docs/features/epic-08-harnesses.md` [desc] (its criteria are kept), the five answers in `requirements-analysis-questions.md` [Q1–Q5], and the tools' own install pages, read 2026-11-25.

## Intent analysis

A new user meets a missing tool today as a feature that fails, or finds it in Settings › Tools, which says "Install it" but not how. The person wants to see at once what the app needs, what is missing or not signed in, and a command to copy. The app shows; the person installs.

## Functional requirements

### FR1: What is checked

- **FR1.1** Five tools are listed: the AI-DLC CLI, Claude Code, Spec Kit (`specify`), opencode and the GitHub CLI [desc, Q2]. GitLab CLI and the shell are not.
- **FR1.2** Each is found (with its version) or not found, from `getTools` (US-0410), and signed in, not signed in, no account connected or unknown, from `checkSignIn` (US-0804), for Claude Code, opencode and the GitHub CLI. No second way of checking is built.
- **FR1.3** The versions show without waiting for the sign-in checks. While something is being checked its row says so.
- **FR1.4** A scan runs once when the app has restored its tabs, when "Check again" is chosen, and after a tool path is changed in Settings. An older answer never replaces a newer one.

### FR2: When everything is ready

- **FR2.1** Claude Code is always needed [Q2]. With an AI-DLC project active the AI-DLC CLI is needed, with a Spec Kit project active `specify` is, and with no project open, or one with no framework yet, either one is enough [Q5]. opencode and the GitHub CLI are optional.
- **FR2.2** "Ready" means every needed tool is found, and Claude Code is not "not signed in" [Q3]. "Unknown" and "checking" never count as a problem, and an optional tool never does. The app does not say "ready" while a needed tool is still being checked.
- **FR2.3** Each row says whether its tool is needed or optional, and what it is for, with the texts Settings › Tools has. With no project open, the AI-DLC CLI and Spec Kit rows say that one of the two is enough.

### FR3: Where it shows

- **FR3.1** On the "No project open" screen the check shows under "Open project" [Q1], which stays usable whatever the check says. The splash is not changed.
- **FR3.2** When ready, it folds to one line, "Everything is ready", that can be opened and closed. Otherwise the list is open, the problems first.
- **FR3.3** With a project open and not ready for that project (FR2.1), one line above the project names what is missing or not signed in [Q1]. "Show" opens the same list in place. The line can be dismissed until the app is started again, and comes back earlier only when a tool that was not a problem becomes one. When ready, there is no line.
- **FR3.4** "Check again" shows with the list, works without a restart, and reads the login shell's PATH again. While it runs the last answers stay, marked as being checked, and a second press starts no second scan.

### FR4: Commands

- **FR4.1** A tool that is not found shows its install command for this platform, a Copy button and a link to the tool's own install page. A copy that fails says so.
- **FR4.2** The commands are kept in one table, one entry per tool and platform, exactly as on the tool's page:

| Tool | macOS | Linux (Ubuntu, Debian) | Page |
|---|---|---|---|
| AI-DLC | `curl -fsSL https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.sh \| sh` | the same | github.com/awslabs/aidlc-workflows |
| Claude Code | `curl -fsSL https://claude.ai/install.sh \| bash` | the same | code.claude.com/docs/en/setup |
| opencode | `curl -fsSL https://opencode.ai/v2/install \| bash` | the same | opencode.ai/docs |
| Spec Kit | `uv tool install specify-cli` (needs uv) | the same | github.com/github/spec-kit |
| GitHub CLI | `brew install gh` (needs Homebrew) | the full Debian chain from GitHub's `install_linux.md`, all lines [Q4] | cli.github.com |

- **FR4.3** A tool that is needed first (uv, Homebrew) is named beside the command. Spec Kit's command is the one the setup view shows (`INSTALL_HINT`), from one place.
- **FR4.4** The app only shows and copies a command. It never runs one, types one into a terminal or sends Enter [desc].
- **FR4.5** A tool that is found but not signed in shows its sign-in command with Copy, from `signInCommand` (US-0804). It is offered for an optional tool too, without counting (FR2.2).
- **FR4.6** A path chosen in Settings that no longer works shows as not found, with the reason Settings gives, and the install command.
- **FR4.7** A tool that is found but does not answer `--version` shows the reason Settings gives and no install command, since it is installed.

### FR5: Interface

- **FR5.1** Every text goes through `t()` in `sv.json` and `en.json`, in the LCARS look, with the rows of Settings › Tools (`ToolRow`).
- **FR5.2** Every control has a `data-testid` and works from the keyboard. Each state is told apart by text, not only by colour. The result of "Check again" is announced politely, without moving focus.
- **FR5.3** The long Linux command is shown in full, wraps or scrolls inside its own box, and is copied unchanged, with its line breaks. Nothing overflows at a window width of 1280.

## Non-functional requirements

- **NFR1** (security) The renderer passes no command and no address to main: the install pages open through `app:openExternal` by a fixed key. The commands are constants, and contain nothing from the person's machine except a chosen tool path, which `signInCommand` quotes.
- **NFR2** (performance) At most one scan runs at a time. The scan never delays the start screen, the restored tabs or an agent tab. A scan or a check that fails leaves the rest of the list working and says what failed.
- **NFR3** (tests) Test first, at least 80% line coverage. Ready-or-not (FR2) is a pure function, tested for each framework and state. A Playwright test with stand-in tools shows the list, the folded line and the line above a project at 1280 before Code Generation's approval.

## Constraints

- The check sees the login shell's PATH. A tool installed elsewhere is not found; Settings › Tools can point to it.
- The commands can change on the tools' pages; the link is there for that. The table is dated in the code.

## Assumptions

- Linux users are on Ubuntu or Debian, as the app ships as a `.deb`.
- opencode's command is for OpenCode 2, as its page gives today.
- An opencode-only project still shows Claude Code as needed, as answered in Q2.
- "Restored its tabs" (FR1.4) is soon enough for the first scan; nothing is read while the splash is being drawn.

## Out of scope

- Running an install or an update, or checking for newer versions (US-0504 has AI-DLC's).
- Install commands in Settings › Tools, and the GitLab CLI, Codex, Kiro and other harnesses.
- Windows.

## Open questions

None.
