# Feasibility Questions: EPIC-14 Spec Kit

Context from the codebase (read on 2026-11-19): a project is accepted only with `aidlc/spaces/` (`detectProject`, `src/main/projectService.js`); views are switched by one `isAidlc` flag in `App.jsx` and `ProjectView.jsx`; project settings live in the app's own settings file on this machine, keyed by the project's folder (`src/main/settings.js`), not in the repository; the token log is kept per AI-DLC intent (`.thadeus/tokens/<intent>.json`); setup runs a CLI found on the login shell's `PATH` with fixed arguments (`src/main/setup.js`, `src/main/tools.js`); only Claude Code and opencode can be chosen as the agent's harness (`src/shared/harnesses.js`). Nothing in `src/` knows Spec Kit yet.

## Q1. [Product owner] Should all seven stories (US-1401 to US-1407) go into v0.2.11?

All seven are marked "for v0.2.11" in EPIC-14. Feasibility rates how much of that fits one release.

A. Yes, all seven in v0.2.11
B. The first version in v0.2.11, the rest in a later release
C. No fixed release; ship when ready
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Developer] Where should a project's chosen framework be kept?

US-1401 and US-1406 say "kept in the project settings, and the project is not asked again". Today project settings are kept on this machine only, so another clone or teammate would be asked again.

A. On this machine only, like the other project settings
B. In the repository, so every clone follows the same framework
C. On this machine, but proposed from what the repository has (`aidlc/spaces/` or `.specify/`)
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q3. [Developer] How should the token log work in a Spec Kit project?

EPIC-14 says the token log "works the same for both". Today it is kept per AI-DLC intent; Spec Kit has no intents, only features under `specs/`.

A. One log per Spec Kit feature, the same way as per intent
B. One log for the whole project
C. Leave the token log out of Spec Kit projects in the first version
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. [Developer] Which Spec Kit version does the first version support, and when is it checked?

EPIC-14 names Spec Kit v1.4.2 and asks for a test project made with `specify init` before US-1402 starts, to see how `clarify`, `checklist` and `analyze` record their output.

A. v1.4.x only; the test project is made before Inception starts
B. v1.4.x only; the test project is the first task of Inception
C. Any version; the app reads what it finds and says what it does not understand
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q5. [Developer] Which harnesses should Spec Kit projects support in the first version?

US-1405 runs `specify init --integration <claude|opencode>`. The app's agent tab supports Claude Code and opencode.

A. Claude Code and opencode
B. Claude Code only; opencode later
C. Whatever `specify init` supports, as long as the app can run it
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q6. [Product owner] Is there anything outside the code that limits this work?

For example a rule about what may be sent to or installed from outside, a licence check on Spec Kit, or other work that must come first.

A. None
B. A licence or policy check on using Spec Kit
C. Other work must land first (say which)
D. Not identified
X. Other (please specify)

[Answer]: A
