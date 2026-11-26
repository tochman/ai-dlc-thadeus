# Questions: a health check on the start screen (US-0805)

The story in `docs/features/epic-08-harnesses.md` settles most of this, and the checks exist: `getTools` (US-0410) and `checkSignIn` (US-0804). The tools' own install pages were read on 2026-11-25. These are the choices the story leaves open.

## Q1. [Product] Where the health check shows

The story says "the start screen" and points to `docs/screenshots/splash.png`. That splash is gone after a few seconds and holds nothing to click. The screen with "No project open" and "Open project" stays, but shows only when no project is open; tabs from the last session are reopened.

A. On the "No project open" screen only. With a project open, Settings › Tools has the same information.
B. On the "No project open" screen, and as one line above an open project when something needed is missing.
X. Other (please specify)

[Answer]: B

## Q2. [Product] What is needed before it says "Everything is ready"

The story says opencode and the GitHub CLI are optional. It does not say whether Claude Code is needed by someone who works with opencode only.

A. The AI-DLC CLI, and at least one of Claude Code and opencode.
B. The AI-DLC CLI and Claude Code, always.
X. Other (please specify)

[Answer]: X: as 2 + speckit, (Q5 settles what Spec Kit's part is)

## Q3. [Product] A needed tool that is found but not signed in

The list says "not signed in" for a tool whose own check answers so. An unknown state (no network, for example) is never counted as a problem.

A. It counts as not ready: the list stays open, with the sign-in command to copy, until a needed agent tool is signed in.
B. It does not count: everything is ready once the needed tools are found, and the sign-in state only shows in the opened list.
X. Other (please specify)

[Answer]: A

## Q4. [Developer] The GitHub CLI's install command

On macOS GitHub's own page gives `brew install gh`, which needs Homebrew. On Ubuntu and Debian it gives a long chain of commands with `sudo` that adds a signing key and a package source, and its site warns that the key was replaced in September 2026. The other three tools have one line that works on both platforms.

A. macOS: `brew install gh`, with a note that it needs Homebrew. Linux: no command, only the link to GitHub's install page, so the app never shows an outdated key step.
B. macOS: `brew install gh`, with the same note. Linux: `sudo apt install gh`, Ubuntu's own older version, and the link.
C. Both platforms show GitHub's full command, the long Linux chain included.
X. Other (please specify)

[Answer]: C

## Q5. [Product] What Spec Kit's part in "ready" is

Q2 was answered "as 2 + speckit": the AI-DLC CLI and Claude Code are needed, and Spec Kit (`specify`) joins the list. A project follows AI-DLC or Spec Kit, never both, and `specify` is only run to set up Spec Kit.

A. Always needed: "Everything is ready" needs the AI-DLC CLI, Claude Code and `specify`.
B. Needed by framework: with a Spec Kit project open, `specify` is needed and the AI-DLC CLI is not; with an AI-DLC project, the other way round. With no project open, either one is enough. Claude Code is always needed.
C. Listed, but optional: it has its row and install command, and never keeps the check open.
X. Other (please specify)

[Answer]: B
