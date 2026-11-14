# Security Design: u3-replies

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-design/nfr-design-questions.md` (no questions; four settled points)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/security-requirements.md` (threat model, NFR3.13–NFR3.20, reuse table)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/tech-stack-decisions.md` (D8, D10, D11)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/reviews/review-01.md` (R-02 classifier fail-safe, R-03 format characters and the 64 KB unit)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/functional-design/functional-spec.md` (W1, W3, W4, W9, typed delivery, interfaces)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 security note, C2 guarded `writeSession` caller, C3, C4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/security-design.md` (SD1–SD7)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/security-requirements.md` (NFR3.16, escaping of control and format characters) and its review `reviews/review-01.md` (R-03)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-requirements/security-requirements.md` (NFR3.51, removal of control and bidi characters) and its review `reviews/review-01.md` (R-01)
- Existing code: `src/main/ipc.js` (`'pty:write'` handler calls `writeSession(id, data)`), `src/main/pty.js` (`writeSession`), `src/renderer/TerminalPanel.jsx` (`term.onData` forwards every xterm data event to `ptyWrite`; file drop and `write()` also use `ptyWrite`), `src/renderer/TerminalContext.jsx` (`type`, `answer`, `sequence` write through the tab's `write`), `src/renderer/ArtifactReader.jsx` (`FileContent`), `src/shared/` (code shared by main and renderer)

## Threat model in short

u1's threat model holds unchanged (u1 security-design "Threat model in short"), including its accepted risk: a command the agent runs can forge events for its own session, which reaches only the person's dialog for that tab. Replies add one new way out of the app, the typed answer into a pty, and show agent text in a second place, the strip. Element IDs continue after u1's (u1 ends at SD7).

## SD8 One shared text sanitizer

**Satisfies:** NFR3.14, NFR3.15 (the "does not fit" bound), and u3 NFR review R-03.

The rule for which characters are unsafe is written once, in `src/shared/agentText.js` (LC12), and used by every Unit that handles agent or answer text. The Units differ only in what they do with an unsafe character.

| Export | What it does | Used by |
|---|---|---|
| `UNSAFE` | every `\p{Cc}` (C0, DEL, C1) and `\p{Cf}` character (bidi embeddings, overrides, isolates and marks: U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069; zero-width U+200B, U+200C, U+2060–U+2064, U+FEFF; soft hyphen U+00AD; the tag block), plus U+2028 and U+2029; **except** U+200D (zero-width joiner) | all three functions below |
| `cleanLine(text)` | CR, LF, TAB, U+2028 and U+2029 become one space each; every other `UNSAFE` character is removed; nothing else changes | u3 typed answers (this Unit); u1 own answers typed as keys |
| `stripUnsafe(text)` | as `cleanLine`, then whitespace runs become one space | u5 notification text (u5 NFR3.51) |
| `escapeUnsafe(text)` | every `UNSAFE` character except LF and TAB is shown as `\uXXXX` | u2 permission `detail` (u2 NFR3.16) |
| `utf8Bytes(text)` | `new TextEncoder().encode(text).length` | the 64 KB answer bound |

```js
// LC12 (illustrative). ZWJ stays so emoji sequences such as 👩‍💻 are not broken.
const ZWJ = String.fromCodePoint(0x200d);
export const UNSAFE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;                 // Zl is U+2028, Zp is U+2029
export const cleanLine = (s) => s.replace(/[\r\n\t\p{Zl}\p{Zp}]/gu, ' ').replace(UNSAFE, (c) => (c === ZWJ ? c : ''));
export const utf8Bytes = (s) => new TextEncoder().encode(s).length;
```

- **Checked.** Under Node 22.14 on this machine, the two lines above turn a test string holding ESC, ETX, CR LF, TAB, U+202E, U+200B, U+FEFF, U+00AD, U+200E, U+061C, U+2028, CSI (U+009B) and DEL into plain text with spaces, and keep the emoji sequence U+1F469 U+200D U+1F4BB and `åäö` unchanged. CR LF gives two spaces, one per character, as BR6.11 says.
- **Why remove `Cf` for a typed answer.** The typed line is echoed back by the TUI's input box and is read by the person there. A bidi override can make it read differently from what is sent. Zero-width characters hide text. Nothing a person means to type into an agent needs them. This widens D10's `\p{Cc}` rule, as the review asks.
- **Why keep U+200D.** It joins emoji sequences, and BR6.11 says emoji are unchanged. It does not reorder text.
- **Known cost.** Emoji tag sequences (the flags of England, Scotland and Wales) lose their tag characters and show as a plain black flag. `ponytail:` comment in code: keep tag characters after U+1F3F4 if anyone ever types such a flag to an agent.
- **The 64 KB bound** is 65 536 UTF-8 bytes of the cleaned line, measured with `utf8Bytes`. An answer that is empty after cleaning, or larger than that, is refused with "answer does not fit the event". The renderer imports the same module to keep Send disabled in both cases, so the main-side refusal is a second line of defence, not the person's normal feedback.
- **Ownership.** This Unit defines LC12. Whichever of u2, u3 and u5 reaches Code Generation first creates the file, and the others import it. A Unit that needs a different set changes it here, for all three.

**Tested by:** unit tests on `cleanLine` with `\x03`, `\x1b[201~`, `\x1b[2J`, `\r\n`, `\t`, `\x7f`, `\x9b`, U+202E, U+2067, U+200E, U+200F, U+061C, U+200B, U+FEFF, U+00AD, U+2028, an emoji with ZWJ (`👩‍💻`) and Swedish letters: the expected line for each, ZWJ sequence and `åäö` unchanged; `utf8Bytes` at 65 536 and 65 537 bytes with a 4-byte emoji on the boundary; store tests that an answer of 65 536 cleaned bytes is written and one of 65 537 is refused, that an answer of only `\x1b\x07` is refused, and that the bytes passed to `writeSession` are the expected line plus one `\r` only; one test per u2 and u5 function when those Units use them.

## SD9 The answer goes to one tab, only while it waits, only once

**Satisfies:** NFR3.15, NFR3.16, NFR3.19.

- **Shape check in IpcRouter** (as u1 SD4): `answer.reply.text` is a string of at most 262 144 UTF-16 units before cleaning (four times the byte bound, so no valid answer is cut and no huge string reaches the store). Otherwise "answer does not fit the event".
- **Store check, in BR6.10's order:** event known ("unknown event"); kind `reply` and state `shown` ("event not open"; `queued`, `dismissed`, `stale`, `ended` and `sending` all fail here); session live, `ptyOf` not null ("session ended"); cleaned line 1 byte to 65 536 bytes ("answer does not fit the event"). The move to `sending` and the write happen in the same synchronous step (reliability-design RD13), so a second answer finds the reply no longer `shown`.
- **One target.** The only pty written is `ptyOf(event.sessionId)`. The renderer sends an event id and text, never a pty id or a tab id, so it cannot pick the target (C2, u1 SD4).
- **Nothing typed without Send.** Arrival, a duplicate (RD17), Close and Esc (`dismissed`), reopen, going stale, tab exit and app restart call neither `writeSession` nor `writeAnswer`. A reply never writes an answer file at all.
- **Reopen** (`agentEvents.reopen`) accepts only a reply in state `dismissed` whose session is live and has not moved on. Every other kind or state is refused with "unknown event" or "event not open" and changes nothing.

**Tested by:** one store test per C4 error, each asserting `writeSession` is never called; a second answer to the same reply refused; a two-tab test asserting only the asking tab's pty id is written; store tests for each no-Send path asserting no `writeSession` and no `writeAnswer`; reopen tests per state (`queued`, `shown`, `stale`, `ended`, `sending`, a question event, an unknown id), each refused and unchanged.

## SD10 Telling the person's input from terminal auto-responses

**Satisfies:** NFR3.20, NFR1.10, and u3 NFR review R-02.

xterm.js sends its own replies to terminal queries (cursor position, device attributes, colour queries) and focus reports through the same `term.onData` event that carries keystrokes and pastes. `TerminalPanel.jsx` forwards all of them through `pty:write`. They cannot be told apart in the renderer through xterm's public API, so main classifies the data itself.

**Where.** IpcRouter's existing `'pty:write'` handler calls `store.terminalInput(ptyId, data)` and then `writeSession(ptyId, data)`. The store runs the classifier and, when the data is the person's input, moves the tab's open reply on (reliability-design RD12) in the same synchronous call.

**The rule: data counts as an auto-response only when the whole chunk is one or more of these sequences, and nothing else. Everything else counts as the person's input.**

| Sequence | Form | Sent when |
|---|---|---|
| Cursor position report (CPR), reply to DSR 6 | `ESC [ <n> ; <n> R`, and the DEC form `ESC [ ? <n> ; <n> ( ; <n> )? R` | the TUI asks where the cursor is |
| Device status report, reply to DSR 5 | `ESC [ 0 n` (also `ESC [ 3 n`) | the TUI asks for status |
| Primary and secondary device attributes (DA1, DA2) | `ESC [ ? <params> c`, `ESC [ > <params> c` | the TUI asks what terminal this is |
| Colour query answers (OSC 4, 10, 11, 12) | `ESC ] <4;n \| 10 \| 11 \| 12> ; rgb:<hex>/<hex>/<hex>` ended by `BEL` or `ESC \` | the TUI asks for the palette or the foreground and background |
| Focus in and out | `ESC [ I`, `ESC [ O` | the TUI enabled mode 1004 and the terminal gained or lost focus |

```js
// LC4 (illustrative). One anchored pattern; anything it does not match fully is the person's input.
const H = '[\\da-fA-F]{1,4}';
const AUTO = new RegExp(`^(?:\\x1b\\[\\??\\d+;\\d+(?:;\\d+)?R|\\x1b\\[[03]n|\\x1b\\[[?>][\\d;]*c|` +
  `\\x1b\\](?:4;\\d+|1[0-2]);rgb:${H}/${H}/${H}(?:\\x07|\\x1b\\\\)|\\x1b\\[[IO])+$`); // case-sensitive on purpose
export const isAutoResponse = (data) => typeof data === 'string' && data.length > 0 && AUTO.test(data);
```

- **Checked.** Under Node 22.14 on this machine the pattern returns true for every "true" input in the test list below and false for every "false" input. It is case-sensitive on purpose: lower-case `r`, `n`, `c`, `i` and `o` finals are other sequences.
- **Fail-safe direction: an unclassified write makes the reply stale.** A wrongly stale reply loses nothing: the text is kept and Copy and Open the terminal remain (BR6.13). A wrongly kept reply could type an answer after the tab has moved on, which is the error NFR3.20 exists to prevent. A chunk that mixes an auto-response with a keystroke, or any sequence not in the table (mode reports, XTVERSION, a future xterm reply), counts as the person's input.
- **Other app writes count as the person's input.** File drop, `TerminalContext.type`, `sequence` and the question popup's fallback `answer` all write through `pty:write`, and each is started by a person's click or drop into that tab. They change what the agent sees, so they make the reply stale. This applies NFR3.20's "writes by other app features do not count" in the fail-safe direction settled in the questions file: the only app write that does not count is the store's own typed answer, which never passes through `pty:write` (C2).
- **Known collision.** With a modifier held, xterm sends F3 as `ESC [ 1 ; <mod> R`, which has the CPR form. Shift-F3 or Ctrl-F3 in the agent's tab therefore leaves a shown reply `shown`. Neither key does anything in Claude Code or opencode, so the agent has not moved on. `ponytail:` comment in code naming the ceiling: if a TUI ever binds a modified F3, count a CPR as an auto-response only within 1 s after a DSR 6 query (`ESC [ 6 n`) in that pty's output.

**Tested by:**

- Unit tests on `isAutoResponse`: true for `\x1b[12;40R`, `\x1b[?12;40R`, `\x1b[?12;40;1R`, `\x1b[0n`, `\x1b[?1;2c`, `\x1b[?62;22c`, `\x1b[>0;276;0c`, `\x1b]11;rgb:1e1e/1e1e/1e1e\x07`, `\x1b]10;rgb:ffff/ffff/ffff\x1b\\`, `\x1b]4;1;rgb:cd/00/00\x07`, `\x1b[I`, `\x1b[O`, and `\x1b[I\x1b[12;40R` together; false for `a`, `notes.md`, `\r`, `\x03`, a bracketed paste `\x1b[200~text\x1b[201~`, arrow keys `\x1b[A`, `\x1b[Ia` (focus plus a keystroke), `\x1b[?1;2$y` (not in the table), the empty string and a non-string.
- Store tests: a shown reply stays `shown` after each true case; it goes `stale` after a printable keystroke, a paste, Enter and an unknown sequence.
- Renderer test: a fake bridge records `ptyWrite` from `term.onData` for a keystroke; IpcRouter test that the handler calls `terminalInput` before `writeSession`, in one call.

## SD11 Agent text in the dialog and in the strip

**Satisfies:** NFR3.13, and u1 NFR3.5, NFR3.6 for replies.

The M4 page, the read-only Show view and the strip all render the message through `FileContent` (u1 SD6: `skipHtml`, no `rehype-raw`, links only for `^https?://`, `shell.openExternal` only on click through the window-open handler). The strip passes the first non-empty line in an inline mode (u3 D11) whose component map renders `p`, headings, lists, block quotes and code blocks as `span`, so the strip adds no block element and keeps one sanitizing path for all three views. The agent's text itself is not cleaned by SD8: Markdown rendering already turns control characters into inert text, and FR6.2 shows the message as the agent sent it (NFR7.4).

**Tested by:** renderer tests with one payload holding `<script>`, `<style>`, `<iframe>`, `<img onerror=…>`, a `javascript:` link and a `file:` link, run against the M4 page, the strip and the Show view: no `script`, `style`, `iframe` element and no `on*` attribute in any; anchors only for `http` and `https`; no `openExternal` on render; the strip's DOM holds no `p`, `h1`–`h6`, `ul`, `ol`, `pre` or `blockquote`.

## SD12 Only the payload's own text, and no main-only data in the renderer

**Satisfies:** NFR3.17, NFR3.18.

- The adapter reads `last_assistant_message` (Claude Code) or the context result's text parts (opencode) and nothing else. It never opens `transcript_path`; the adapter module imports no `fs` (it is pure, u1 LC3), so the only file main reads for a reply is the event file itself (u3 D8).
- `agentEvents.latest` builds its result with an explicit field list: `tabId`, `harness`, `text`, `arrivedAt`, `status`, `eventId`, `truncated`, `empty`. The store's LatestMessage holds `sessionId` for its own use; the serializer never copies it. The pushed AgentEvent views are built the same way as u1 SD2's, so they carry no secret and no session folder path.

**Tested by:** adapter test with a recorded Stop payload whose `transcript_path` names a file holding a marker: the marker is not in the shown text, and an `fs` spy records no open; unit test that the serialised `agentEvents.latest` result has exactly the eight keys and that `JSON.stringify` of it and of every push in a full reply round trip contains neither the session id nor the secret.

## Rows reused from u1

Each u1 test for these rows gets one more case with kind `reply`.

| u1 row | u1 element | Holds for replies because |
|---|---|---|
| u1 NFR3.1 | SD1 | the reply event uses the same `0700` session folder |
| u1 NFR3.2 | SD2 | line 1 of the reply event carries the same secret; it never leaves AgentChannel |
| u1 NFR3.3 | SD3 | every kind passes the same checks; RD11 reads the header of an over-limit file through the same checks before acting on it |
| u1 NFR3.5, NFR3.6 | SD6 | SD11 |
| u1 NFR3.7 | SD4 | SD9 "Nothing typed without Send" |
| u1 NFR3.8 | SD5 | the reply branch writes the header with `printf '%s'` and copies stdin with `cat` (reliability-design RD10); nothing is expanded |
| u1 NFR3.9 | SD7 | same names, same check; a reply writes no answer file |
| u1 NFR3.10 | SD4 | fallback (audit) events have no replies; `agentEvents.answer` with `reply` on an audit event is refused as "fallback event: answered in the terminal path" |

## Security implications of this Unit

- A new write path into a pty exists (SD9). It is reachable only through `agentEvents.answer`, only for a shown reply, only into the asking tab, and only with a cleaned single line, so the worst a forged reply can do is show the person a page they then answer themselves.
- The classifier (SD10) decides whether a reply stays answerable. Its errors fall on the safe side except for the named F3 collision, which has no effect in the two supported TUIs.
- No authentication, encryption or secret handling changes; nothing leaves the machine.

## Compliance

As u1: nothing leaves the machine, nothing is stored beyond the app run, and the LatestMessage text is held in main's memory only. No compliance regime applies.
