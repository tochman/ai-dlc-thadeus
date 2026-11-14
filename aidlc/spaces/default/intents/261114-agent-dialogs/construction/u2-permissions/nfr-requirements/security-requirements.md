# Security Requirements: u2-permissions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR3; FR3.1, FR3.2, FR3.4, FR6.2; Out of scope: no automatic answers, no app-applied "always allow" rules)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md` (harness facts, W1, W1b, W2, W3, W6; "Not used: `permission.hook("evaluate")`")
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md` (BR5.1, BR5.3–BR5.8, BR5.10, BR5.11)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/entities.md` (Permission `what` max 200, `detail` max 64 KB, `alwaysRules` main only; Answer `via: hook`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/reviews/review-01.md` (R-02 `via` narrowing, R-03 Allow always label)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 security note, C2 "Delivering an answer", C3 `permission` block, C4 errors)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md` (sandboxed preload)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/security-requirements.md` (the shared base: NFR3.1–NFR3.10)

## What this Unit adds to the threat model

u1's threat model, accepted risk and out-of-scope list apply unchanged (u1 security file). A permission is the one answer that lets an agent run something, so the asset changes from "what the agent is told" to "what the agent is allowed to do".

| Asset | Threat | Where it is stopped |
|---|---|---|
| The person's machine (what the agent may run) | the app allows a tool call the person did not choose: on arrival, time-out, app crash, close, restart, a setting or a remembered answer | NFR3.13, NFR3.14 |
| The same | an answer reaches another request: another event, another session, a stale or second answer | NFR3.15 (with u1 NFR3.3, NFR3.4, NFR3.9) |
| The same | the person is misled about what is asked: hidden or spoofed text in the tool name or command, a command cut so the dangerous part is off screen | NFR3.16 |
| The person's permission settings | "allow always" adds more than the agent suggested and the person saw | NFR3.17 |
| The same | an allow sent as keys lands on another prompt | NFR3.19 |

Accepted risk (as C1): a command the agent runs can forge a permission event for its own session. The forged event's answer file is read only by the forger, never by Claude Code or opencode, so allowing it allows nothing real. No further control is added.

## Requirements (NFR3)

u1 NFR3.1 (private folder), NFR3.2 (secret), NFR3.3 (event file checks), NFR3.8 (script never interprets the payload) and NFR3.9 (atomic answer files in the session's own folder) apply unchanged to `permission` event files; their tests gain a `permission` case (NFR8.5).

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR3.13 | The app never answers a permission prompt on its own (FR3.4, BR5.6). The only non-empty permission answer file comes from `agentEvents.answer` with a choice the person sent. Arrival, time-out, app quit or crash, restart, Close, Esc, tab exit, a setting and an earlier answer produce at most an empty answer file. The opencode plugin calls `ctx.permission.reply` only with a decision read from an answer file, and never registers `ctx.permission.hook("evaluate")`. | 0 non-empty answer files and 0 `permission.reply` calls in every path except the person's send | Store tests: no non-empty `writeAnswer` on arrival, on timedOut, on Close, on Esc, on tab exit, on start-up with leftover folders; plugin tests with a stubbed `ctx`: no `reply` without an answer file, `permission.hook` never called; a source test that the plugin file contains no `evaluate` registration |
| NFR3.14 | Nothing is preselected (BR5.6). | no choice has focus, `aria-selected` or a default style when the page shows; Enter alone sends nothing (NFR6.4); a click on a choice or Enter on a choice the person focused is the only send | Renderer tests |
| NFR3.15 | A permission answer is valid only for its own waiting event of a live session, once (BR5.7). | `agentEvents.answer` refuses with the named C4 error, and writes nothing, for: unknown event, event not `shown` (queued, sending, sent, timedOut, handedBack, ended), session ended, hook no longer waiting, choice index not an integer or outside `choices`, a disabled choice, any field besides `choice`; a second answer to the same event is refused | One test per case; in each, `writeAnswer` is never called and no hook output is built |
| NFR3.16 | What the agent asks to do is shown as plain text, whole or visibly cut (BR5.5). `detail` is never Markdown or HTML. C0 and C1 control characters other than newline and tab show as visible escapes (for example `\u001b`), and so do Unicode format characters that reorder or hide text (bidirectional overrides and isolates U+202A–U+202E, U+2066–U+2069, zero-width U+200B–U+200F). `what` is cut at 200 characters. `detail` over 64 KB is cut on a character boundary, `truncated` is set, and both allow choices are disabled. | a payload with `<script>`, `<img onerror>`, Markdown, ANSI colour codes and a right-to-left override renders no element from them and shows each as text; `detail` at 64 KB is unchanged; at 64 KB + 1 byte it is cut and Allow once and Allow always are disabled while Deny, Close and Open the terminal work | Adapter tests at the bounds and per character class; renderer test: `detail` is a text node in a monospaced block, no `script`/`img`/anchor element, allow buttons `disabled` when truncated |
| NFR3.17 | "Allow always" adds only what the agent suggested and the person saw (BR5.3, BR5.8). `alwaysRules` stays in main and never reaches the renderer; the renderer sends only a choice index. Claude Code's `updatedPermissions` is `permission_suggestions` exactly as received. Allow always is offered only when the suggestions are not empty, and its label shows each suggestion's text (FD review R-03 defines the label for suggestions without rule text before Code Generation). `updatedInput` is never set. | built output deep-equals the recorded `permission_suggestions`; serialised `agentEvents.list` and `agent-events:changed` payloads contain no `alwaysRules`; no Allow always choice when suggestions are absent or empty | Adapter tests with recorded `PermissionRequest` stdin (with, without and with empty suggestions); store test of the IPC payloads |
| NFR3.18 | Deny is a plain refusal (BR5.8). | Claude Code output has `behavior: "deny"`, `interrupt: true` and the fixed message, and no agent text; opencode gets `reject` | Adapter tests |
| NFR3.19 | A permission answer goes only through the waiting hook, never as keys, in every state (BR5.8, W2). This narrows C2 "Delivering an answer" for permissions (FD review R-02): `via` is always `hook`. | 0 calls of `writeSession` for any permission event, timed-out ones included; `agentEvents.answer` on a timed-out permission is refused (NFR3.15) | Store tests with a `writeSession` spy across every state |

The renderer stays without pty or settings writes, and the preload exposes no new member (C4 unchanged).

## Compliance

As u1: nothing leaves the machine and no regulated data is stored. A permission's command and the agent's rule suggestions live in main's memory and in the session folder only while the session lives (u1 NFR5.4, NFR5.5). No compliance regime applies.
