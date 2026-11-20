# Requirements Analysis Questions: Release v0.2.13

The five stories (US-0035, US-0036, US-0609, US-0510, US-0415) already carry their acceptance criteria in the epic files. These questions cover only what the stories leave open.

## Q1. [Product owner] Park and unpark an intent that is not the active one (US-0510)

AI-DLC's `park` and `unpark` commands act only on the active intent; they take no intent name. The intents list shows every intent, so a row may belong to an intent that is not active.

A. Offer Park and Unpark only on the active intent; other rows show the Parked mark but no buttons
B. On another intent, first make it active through AI-DLC's own command (`aidlc intent <name>`), then park or unpark it
C. Offer Unpark on any intent (switching it active first), but Park only on the active one
X. Other (please specify)

[Answer]: C

## Q2. [Product owner] Where a story branch reads its planning when `main` is protected (US-0036)

When `main` is protected, the app pushes planning to a docs branch and merges it through a pull request. A release can then be on the docs branch before it is on `main`.

A. Read from `origin/<docs branch>` when one is set, else `origin/main`, so the newest planning shows
B. Always read from `origin/main`, so the views show only what has merged
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] Which files under `.thadeus/` the app keeps in sync (US-0609)

The story says "every file the app writes", while the project rule (2026-11-18) says "every other file under `.thadeus/`". A person might also put their own files there.

A. Every file under `.thadeus/`, whoever wrote it
B. Only the files the app itself writes (token logs, usage snapshots, `hooks/dialog.sh`); other files are named in the waiting list and left for the person
X. Other (please specify)

[Answer]: A

## Q4. [Product owner] Remembering the folded list column (US-0415)

The story says the folded or open state is kept per view across restarts.

A. Per view, the same in every project
B. Per view and per project
X. Other (please specify)

[Answer]: A

## Q5. [Developer] How long the app waits for the login shell (US-0035)

Today it waits 5 s. The reported shell (nvm, RVM and several `brew --prefix` calls) can take 5 to 10 s. Since a timed-out answer is no longer kept, every lookup after a timeout waits the full time again.

A. 15 s
B. 20 s
C. 10 s
X. Other (please specify)

[Answer]: B

## Q6. [Developer] Which harness settings US-0609 commits

The installer writes hook entries for Claude Code (`.claude/settings.json`) and opencode (the app's opencode plugin file). The other harnesses have no app hooks today.

A. Claude Code and opencode, the two the installer writes today; a harness added later joins by being listed in one table
B. Claude Code only for now; opencode follows in a later story
X. Other (please specify)

[Answer]: A
