# Security Requirements: u1-questions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR3; FR1.3, FR2.2, FR3.1, FR3.4, FR4.4, FR4.6; Constraints)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md` (W1, W1b, W7, hook entries)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR1.1, BR1.4, BR3.1, BR3.6, BR4.1)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/entities.md` (AgentSession `channelDir`, `secret`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 environment, refusals and security note; C2 `openSession`, guarded write; C3 secret never included; C4 errors)
- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md` (react-markdown without raw HTML, userData path, sandboxed preload)

## Threat model

The app is a single-user local tool (requirements, Assumptions). Everything runs as the person's own OS user. The things worth protecting are:

| Asset | Threat | Where it is stopped |
|---|---|---|
| The person's answer (what an agent is told to do) | sent to the wrong session, or sent without the person | NFR3.4, NFR3.7 |
| The app's dialog | events forged by another process or another tab's session | NFR3.1, NFR3.2, NFR3.3 |
| The renderer | HTML or script inside agent text, unsafe links | NFR3.5, NFR3.6 |
| The hook script and the agent | shell injection through the payload; the hook changing a session the app did not start | NFR3.8, NFR4.1 |
| Teammates' checkouts | the committed hook entry doing anything without the app | NFR4.1 (performance file), NFR4.3 (reliability file) |

Accepted risk (contract C1): a command the agent itself runs can read its own `THADEUS_SESSION_SECRET` and forge events for its own session. That reaches only the person's own dialog for that tab, and every answer still needs the person's click. No further control is added.

Out of scope: other OS users (blocked by folder mode), remote attackers (there is no listener), signing of the committed script (the project's own git history is the control).

## Requirements (NFR3)

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR3.1 | Each session's channel folder is private and outside the project. | folder created with mode `0700` under the app's `userData`; never under a project root; `alive`, `events/` and `answers/` inherit it | Unit test: `fs.statSync(dir).mode & 0o777 === 0o700`; path starts with the `userData` path |
| NFR3.2 | The per-session secret is strong and stays where it belongs. | 32 bytes from `crypto.randomBytes`, hex; present only in the agent child's environment and in main's AgentChannel; absent from every AgentEvent sent to the renderer, every log line, every file in the project | Unit tests: serialised `agentEvents.list` and `agent-events:changed` payloads contain no secret; logged lines of a refused event contain no secret; shell tabs spawn without any `THADEUS_*` variable |
| NFR3.3 | AgentChannel accepts an event file only from a live session with that session's secret, complete and versioned (BR1.1). Comparison of the secret is constant-time (`crypto.timingSafeEqual`). | each of these is deleted and shows nothing: unknown folder, ended session, wrong secret, unaccepted version, line 1 malformed, still `.tmp`, over 1 048 576 bytes | One test per refusal case (7 cases) with recorded files; the store receives no raw event in any of them |
| NFR3.4 | Main accepts an answer only for an open event of a live session that it fits, once (BR3.1, FR3.1). | `agentEvents.answer` refuses with the named C4 error for: unknown event, event not open, session ended, answer does not fit (wrong count, index out of range, two picks on single-select, own text where not allowed), fallback event; a second answer to the same event is refused | One test per error; in each, `writeAnswer` and `writeSession` are never called |
| NFR3.5 | Agent text is shown as sanitized Markdown, never as HTML (BR4.1, FR2.2). | rendered through `FileContent` with raw HTML skipped; `<script>`, `<style>`, `<iframe>`, `<img onerror=…>` and `javascript:` in the text produce no element of that kind and run nothing | Renderer test with a payload holding each of these; DOM query finds no `script`, `style`, `iframe` or event-handler attribute; the text is visible as text |
| NFR3.6 | Links open only on click and only for `http` and `https`. | other schemes (`javascript:`, `file:`, `data:`, custom) show as plain text; `shell.openExternal` is called once per click and never on render | Renderer test: no call on render; one call on click of an `https` link; no anchor for the other schemes |
| NFR3.7 | No answer is sent without the person's action (FR3.4). | delivery starts only from `agentEvents.answer`, which only the dialog's Send, pick key or Enter calls; arrival, time-out, hand-back and app restart send nothing | Store tests: no `writeAnswer` or `writeSession` on arrival, on timedOut, on Close (only the empty hand-back file), on exit |
| NFR3.8 | The hook script never interprets the payload. | the kind comes from the entry's argument (R-01); stdin is copied byte for byte with `cat`; no `eval`, no unquoted expansion of input; a payload with `$(…)`, backticks, `;` and quotes runs nothing and arrives unchanged | Script test: payload with shell metacharacters; the event file body equals stdin byte for byte and a marker file the payload tries to create does not exist |
| NFR3.9 | Answers are written atomically and only into the session's own folder. | `writeAnswer` writes `answers/<name>.tmp` then renames to `.ans`; a file name from an event that is not a plain `<digits>-<digits>.evt` name is refused (no path separators, no `..`) | Unit tests: rename, never a partial `.ans`; a crafted name with `../` is refused |
| NFR3.10 | Fallback (audit) events keep today's path and the new path never writes for them (BR3.6). | `agentEvents.answer` refuses `source: audit` with "fallback event: answered in the terminal path" | Covered by the NFR3.4 tests |

The renderer never writes to a pty or a settings file for this feature (requirements, Constraints); the preload stays sandboxed and exposes only the C4 members.

## Compliance

No personal data leaves the machine, nothing is sent over a network, and no regulated data is stored. The question text lives in main's memory and in the session folder only while the session lives (NFR5.4, NFR5.5). No compliance regime applies.
