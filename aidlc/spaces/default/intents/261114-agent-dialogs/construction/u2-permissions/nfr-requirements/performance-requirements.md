# Performance Requirements: u2-permissions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR1, NFR4, NFR6, NFR7; FR3.3, FR3.4, FR4.4, FR4.6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md` (harness facts, W1, W1b, W3, state machine)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md` (BR5.6, BR5.8, BR5.10, BR5.11, BR5.13)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/entities.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 waiting, C6 entries)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/performance-requirements.md` (the shared base: NFR1.1–NFR1.5, NFR4.1, NFR4.2, NFR6.1–NFR6.3, NFR7.1, NFR7.2)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/nfr-requirements-questions.md` (no questions)

## Scope

The path a permission prompt takes is the path a question takes (u1): hook script or plugin, file channel, main, IPC, dialog, and back. The budget table in u1's performance file applies unchanged. This file adds only what differs for permissions. IDs continue after u1's so that each ID is unique in the intent. "Release Mac" and "timing log" mean what u1 defines (u1 NFR1.6).

## Latency (NFR1)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR1.8 | A permission prompt from an app tab appears in the dialog after the hook fires (`dialogShown − hookReceived`, as u1 NFR1.1). | ≤ 1 s in every one of 20 Claude Code runs; every opencode run of NFR2.5 also ≤ 1 s | Manual run on the release Mac with the timing log on |
| NFR1.9 | A Claude Code permission answer reaches the waiting hook (`answerClicked` to `answerDelivered`, the `.ans` rename). The hook then prints it within u1 NFR1.5's 300 ms. | ≤ 1 s in every one of 20 runs, spread over the three choices | Manual run on the release Mac with the timing log on; script test as u1 NFR1.5 with the `permission` argument |
| NFR1.10 | An opencode permission answer reaches opencode. Measured from `answerClicked` to `agentConfirmed`, when the `answered` event that the plugin writes on `permission.replied` arrives in main (NFR1.13). | ≤ 1 s in every opencode run of NFR2.5 | Manual run on the release Mac with the timing log on |
| NFR1.11 | A permission answered in the opencode terminal leaves the dialog (BR5.11). | `agent-events:changed` is pushed in the same main-process turn as the `answered` raw event; the page shows "Answered in the terminal." ≤ 1 s after that event's file is written | Store unit test (synchronous push); manual opencode run on the release Mac |

There is no `via: keys` path for a permission (BR5.8, W2), so u1 NFR1.3 does not apply to this Unit.

## No harm when the app is absent (NFR4, timing part)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR4.4 | The `PermissionRequest` entry runs for every tool (matcher for all tools) in every session that has the committed settings, the person's own terminal and teammates included. Without `THADEUS_SESSION_DIR`, or with the script missing, its command returns before the script is looked for (FR4.6), as u1 NFR4.1. | exit 0, no output, ≤ 100 ms, in each of 20 runs; Claude Code then shows its own permission prompt unchanged | Script test: the exact C6 command string with the argument `permission`, run with `sh -c`, variable unset and script folder deleted, 20 runs; manual: plain `claude` started outside the app on the release Mac asks for a Bash permission and shows its own prompt at once |

u1 NFR4.2 (variable set, folder or `alive` missing) applies unchanged to the `permission` argument; the u1 script test runs once more with that argument (NFR8.5).

## Dialog use (NFR6, NFR7)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR6.4 | Focus moves into the dialog on a permission page, but to the page title, never to a choice (BR5.6). This replaces u1 NFR6.1's "first choice" for permission pages only. | `document.activeElement` is the page title when the page shows; Enter with no focused choice sends nothing | Renderer test: active element after the push; Enter pressed, `agentEvents.answer` not called |
| NFR6.5 | The permission page (M3) works by keyboard alone. A number key focuses a choice and does not send; Enter sends the focused choice; Tab and arrow keys move between choices; Esc hands back and never denies (BR5.10). | each of the three choices of NFR2.4 can be sent with no pointer event; a number key alone never calls `agentEvents.answer`; Esc calls `agentEvents.close` only | Renderer tests driving only keyboard events, one per choice, one for number key without Enter, one for Esc |
| NFR6.6 | Kind, choice and state are named in text, never by colour alone (BR5.13). | the word PERMISSION and "<harness> asks for permission" in the header; the refusing choice is named in its label, not only by the coral edge; the truncated line, the time-out line, "Sent to <harness>.", the hand-back toast and "Answered in the terminal." are present as text | Renderer test: each text is in the DOM in its state |
| NFR7.3 | Every app text on the permission page goes through `t()` with ICU placeholders, the Allow always label included (the agent's rule text is a placeholder value, not part of the key). The deny message sent to Claude Code (BR5.8) is agent-facing, not user-facing, and is a fixed English constant. | 0 hard-coded user-facing strings in the new code; same keys in `sv.json` and `en.json` | Existing `tests/main/i18nKeys.test.js`; renderer tests in the Swedish locale |
| NFR7.4 | What the agent asks to do (`what`, `detail`, `cwd`, rule texts in the Allow always label) is shown as the agent sent it, never translated. | equal to the payload after the 64 KB cut and the visible-escape rule of NFR3.16 | Adapter test with recorded payloads holding Swedish, emoji and non-ASCII paths |
