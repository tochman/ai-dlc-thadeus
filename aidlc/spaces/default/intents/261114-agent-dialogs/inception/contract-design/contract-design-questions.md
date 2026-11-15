# Contract Design questions: US-0506 agent dialogs

Background: all five Units ship in one desktop build, so most boundaries are in-process calls or `window.bridge` members that follow the app's existing pattern (handlers throw an `Error` with a translated message, `src/main/ipc.js`). One boundary is different: the hook script and the opencode plugin are committed to the project and can be older or newer than the app a teammate runs (ADR-004). The question below is about that boundary only.

## Q1. [Architect] What happens when the committed hook script or plugin is a different version from the app?

A teammate may pull a newer script while running an older app, or the other way round. The installer already reports "out of date" (FR4.5).

A. Every event file starts with a protocol version (`v1`). The app accepts its own version and the one before; for anything else it ignores the event, the hook times out to the terminal as usual, and the project shows "out of date" with Update
B. Same version line, but the app accepts only its own version; any other version falls back at once
C. No version; the event format must never change, only grow
X. Other (please specify)

[Answer]: A
**Mode:** guided
