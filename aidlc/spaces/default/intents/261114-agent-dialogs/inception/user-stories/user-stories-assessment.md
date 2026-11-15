# User Stories Assessment: agent dialogs (EPIC-05 US-0506)

## Sources

- Initial description: "US-0506: nu fokuserar vi på user story som handlar om hur dialogerna formatteras och kommunicerar med claude (men även andra ai-klienter). Det här är högprioriterat utifrån användarvärde. We still have errors on the popup dialogs (screenshot 15.13.46: Could not send: Claude shows other choices than the ones AI-DLC logged). We really need to take another spin at this in a real full plan." `[desc]`
- Workflow-selected scope: classic `[scope]`
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (FR1–FR6, NFR1–NFR8).
- Code knowledge base: `aidlc/spaces/default/codekb/aidlc-dash/business-overview.md`, `aidlc/spaces/default/codekb/aidlc-dash/component-inventory.md`.
- Team practices: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/practices-discovery/team-practices.md`.
- Answers: `user-stories-questions.md` Q1–Q5 `[Q1]`…`[Q5]`.

## Decision

**Execute.**

## Rationale

The work is user-facing from end to end: what the person sees in a dialog, what they click, and what reaches the agent they are running. It touches two kinds of people with different stakes (the developer running agents in the app, and a teammate whose checkout carries the committed hooks without the app), three kinds of events, and two harnesses. Requirements alone list what must hold; stories give the order of delivery, the slice each acceptance check belongs to, and the proof the quality engineer needs (`[Q4]`).

## Factors considered

- **Project type:** brownfield Electron desktop app (main, preload, renderer, shared tables) plus new hook and plugin scripts (component inventory: IPC Router, QuestionPopup, TerminalContext, Picker Reader, Harness Table, Settings Store, Notifications).
- **User-facing scope:** the question dialog, the latest-message line, the install preview, and two settings.
- **Complexity signals:** a new local channel between hook scripts and the app; answers returned through hooks or keys; safety rules (answers only to the asking session, nothing answered automatically, text never HTML); a fallback that must stay unchanged.
- **Cross-person effect:** the hooks sit in the shared, committed `.claude/settings.json`, so they reach teammates who do not use the app (FR4.4, FR4.6).

## Where stories add the most value

- Cutting the work into five vertical slices, one kind of event per slice, so each slice is shown working against real Claude Code and opencode payloads before the next starts (`[Q2]`, `[Q5]`).
- Placing each corner condition (FR6) inside the slice it belongs to rather than in a separate story (`[Q5]`).
- Stating per slice what counts as proof: replayed real payloads in automated tests, plus a manual run on the release Mac before the tag (`[Q4]`).
- Keeping US-0506 as one story in the feature docs; the five stories here are its internal breakdown and ship in one pull request (`[Q1]`).
