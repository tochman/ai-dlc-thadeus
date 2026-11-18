# Personas (US-0608)

## P1. Pia the planner (primary)
- **Role:** developer or product owner who plans releases and writes stories in THADEUS, often while a story branch is checked out and an agent works in a terminal.
- **Goals:** assign stories to releases without errors; never lose a planning change; keep each story's pull request free of unrelated planning.
- **Pain points:** the intermittent "file changed" error; the waiting changes never shown; a new story that reached `main` only inside another story's pull request (US-0030 in #76).
- **Tech comfort:** high. **Frequency:** daily.

## P2. Max the maintainer
- **Role:** develops THADEUS itself and reviews its pull requests.
- **Goals:** know the planning flow works in the built app, not only with mocks; have CI fail when it breaks.
- **Pain points:** no end-to-end tests; every test of this flow mocks git or the bridge above `planningSync`.
- **Tech comfort:** high. **Frequency:** every pull request.

## Non-human actor
- **An agent in a terminal session in the app** writes feature docs (new stories, markers). It is not a persona: its writes are changes the app must keep for P1.

**Priority:** P1 first; P2 owns the proof that P1's stories hold.
