# Security Design: u1-questions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/security-requirements.md` (threat model, NFR3.1–NFR3.10)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/observability-requirements.md` (NFR3.11, NFR3.12: what a log line may hold)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/tech-stack-decisions.md` (D3 file names, D5 watcher)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/reviews/review-01.md`
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/functional-spec.md` (W1, W7, hook entries)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/functional-design/rules.md` (BR1.1, BR3.1, BR3.6, BR4.1)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 security note, C2, C3, C4)
- Existing code: `src/main/pty.js` (`env: { ...process.env, … }` for every tab), `src/main/fileWrite.js` (random `.tmp` name, then rename), `src/main/projectAccess.js` (root-confined reads), `src/main/index.js` (window-open handler allows only `http`/`https`; sandboxed preload), `src/renderer/ArtifactReader.jsx` (`FileContent` with `skipHtml` and the link component)

## Threat model in short

Everything runs as the person's own OS user on one machine; there is no listener and no network. The trust boundary is AgentChannel (LC2): every byte a hook writes is checked there before another component sees it. The renderer is trusted with nothing but an event id and option indexes. Accepted risk, unchanged from C1: a command the agent itself runs can read its own `THADEUS_SESSION_SECRET` and forge events for its own session. That reaches only the person's dialog for that tab, and every answer still needs the person's click.

Component IDs are those of `logical-components.md`; RD elements are in `reliability-design.md`.

## SD1 Private channel folders outside the project

**Satisfies:** u1 NFR3.1.

- Root `<userData>/agent-channel/`, one folder per session named by its `sessionId` (a `randomUUID`), with `events/` and `answers/` inside. Each folder is created with `mkdir(…, { mode: 0o700 })` followed by `chmod(…, 0o700)`, so a permissive umask or an existing folder cannot leave it wider. Files inside are only reachable through the `0700` folders.
- The path is built only from `app.getPath('userData')` and the session id; no project path is ever part of it, and AgentChannel has no code path that takes a path from outside.

**Security implication:** other OS users cannot list or read the folders; the project tree never holds a channel file, so nothing is committed by accident.

**Tested by:** channel tests: `fs.statSync(dir).mode & 0o777 === 0o700` for the root, the session folder, `events/` and `answers/` (also with `process.umask(0)` set during the test); the session path starts with the `userData` path given to the channel.

## SD2 The secret: strong, and only where it belongs

**Satisfies:** u1 NFR3.2.

- `randomBytes(32).toString('hex')` per session, kept in AgentChannel's private session map. C2's `openSession` returns it only inside `env`; `AgentSession` views, raw events and `AgentEvent`s never carry it.
- `spawnSession` (LC5) builds the child environment as a copy of `process.env` with every `THADEUS_*` key removed, then adds the channel variables only when `kind === 'agent'`. Removing inherited keys matters when the app itself was started from a terminal that already had them (a development run started inside an app tab), which would otherwise leak a stale secret into shell tabs.
- Log lines name the `sessionId` and the event file name, never the header line (OD2).

**Security implication:** a shell tab, the renderer and the log never see a secret, so a forged event needs the agent's own environment.

**Tested by:** unit tests: the serialised `agentEvents.list` result and every `agent-events:changed` payload of a full question round trip contain no secret; captured `console.warn` lines of a refused event contain no secret; a shell tab spawned with `THADEUS_SESSION_SECRET` set in `process.env` gets an environment without any `THADEUS_*` key; an agent tab gets exactly the three channel keys.

## SD3 Intake checks at the trust boundary

**Satisfies:** u1 NFR3.3.

AgentChannel runs these checks in order for every `.evt` the watcher reports. The first that fails deletes the file, logs one line and emits nothing:

| # | Check | Refusal reason (log) |
|---|---|---|
| 1 | the path relative to the root is exactly `<sessionId>/events/<name>`, the session id is a live session in the map, `<name>` matches `^\d+-\d+\.evt$` | `unknown session` / `ended session` / `bad name` |
| 2 | `lstat` says it is a regular file (not a symlink, not a folder) and its size is ≤ 1 048 576 bytes | `not a file` / `too large` |
| 3 | line 1, within the first 128 bytes, matches `^THADEUS-EVENT (v\d+) ([a-z]+) ([0-9a-f]{64})$` | `malformed header` |
| 4 | the version is `v1` (the app's own and the one before it, when one exists) | `unaccepted version` |
| 5 | `crypto.timingSafeEqual` of the 32 header bytes and the session's 32 secret bytes (both decoded from hex, so the lengths are equal before the compare) | `wrong secret` |

- `.tmp` files are **ignored, not deleted**. NFR3.3 lists "still `.tmp`" among the delete cases, but a `.tmp` is the hook's own file while it writes, and deleting it would make a legitimate hook's rename fail. Ignoring it meets the requirement's purpose (the store receives no raw event for it); leftovers are removed with the session folder (RD5, RD6).
- The kind is passed on as a string; the adapter ignores kinds it does not know (C1 ownership rules).

**Security implication:** a file from another session's folder, from a session that ended, or without the right secret never reaches the adapter or the dialog; a symlink cannot make main read a file outside the channel.

**Tested by:** one channel test per refusal case with recorded files (unknown folder, ended session, wrong secret, unaccepted version, malformed line 1, over 1 048 576 bytes, symlink, bad name): the file is gone, one log line, the store receives nothing; a `.tmp` file produces no raw event and is still there; a valid file produces exactly one raw event.

## SD4 The answer check in main

**Satisfies:** u1 NFR3.4, NFR3.7, NFR3.10.

- IpcRouter checks the shape before the store sees it: `eventId` is a string of at most 64 characters; `answer.question.picks` is an array of arrays of non-negative integers and `own` an array of strings or `null`. Anything else is refused as "answer does not fit the event".
- The store then applies BR3.1 in this order: event known ("unknown event"); `source` is not `audit` ("fallback event: answered in the terminal path"); state is `shown` or `timedOut` ("event not open"); session live ("session ended"); one entry per question, every index inside that question's options, one pick for single-select, own text only where `allowOwn` ("answer does not fit the event"). Moving to `sending` happens in the same synchronous step as the check, so a second call for the same event finds it no longer open.
- Delivery starts only inside `agentEvents.answer`; arrival, `timedOut`, a hand-back and a restart call no writer. The only write the app makes without a Send is the empty hand-back file on Close, Esc or an unreadable question (RD7), which tells the hook to give up and carries no choice.

**Security implication:** the renderer cannot answer another session, an ended session or a fallback question, and cannot answer twice.

**Tested by:** one store test per C4 error; in each, `writeAnswer` and `writeSession` spies are never called; a second answer to the same event is refused; store tests that arrival, `timedOut`, Close (only the empty file) and a pty exit call no writer with a non-empty text (NFR3.7); the audit case is one of the error tests (NFR3.10).

## SD5 The hook never interprets the payload

**Satisfies:** u1 NFR3.8.

The kind comes only from the entry's argument and is matched against a fixed `case` list (RD4). The header is written with `printf '%s'`, the payload is copied by `cat` from stdin to the file, and no variable that holds input is ever expanded unquoted or passed to `eval`. The script reads no JSON.

**Security implication:** a payload holding `$(…)`, backticks, `;` or quotes is data, never a command.

**Tested by:** script test with a payload containing `$(touch marker)`, `` `touch marker` ``, `; touch marker` and both kinds of quotes: the event file's body equals stdin byte for byte and `marker` does not exist; run under `sh` and `dash` (RD4).

## SD6 Agent text in the renderer

**Satisfies:** u1 NFR3.5, NFR3.6.

- The dialog renders agent text through the existing `FileContent` with a `.md` name, which uses `react-markdown` with `skipHtml` and no `rehype-raw`, so raw HTML is dropped and never parsed into elements. Images render as their alt text (the existing `img` component).
- Links use `FileContent`'s existing link component: an anchor only for `^https?://`, plain text for every other scheme. A click opens the link through the window-open handler in `src/main/index.js`, which calls `shell.openExternal` only for `http`/`https` and denies the new window. Nothing opens on render.

**Security implication:** script, style, frames and event-handler attributes in agent text cannot run in the renderer; a `file:`, `data:` or `javascript:` link cannot be followed.

**Tested by:** renderer test with a payload holding `<script>`, `<style>`, `<iframe>`, `<img onerror=…>` and a `javascript:` link: the DOM has no `script`, `style` or `iframe` element and no `on*` attribute, and the text is visible (NFR3.5); renderer test: no `openExternal` call on render, one on a click of an `https` link, no anchor for `javascript:`, `file:`, `data:` or a custom scheme (NFR3.6, with the window-open handler mocked).

## SD7 Answers only into the session's own folder

**Satisfies:** u1 NFR3.9.

- The answer's base name is the accepted event's name without `.evt`, and it must match `^\d+-\d+$`; the full path is `path.join(sessionDir, 'answers', base + '.ans')`, so no name can contain a separator or `..`.
- The write goes to `answers/<base>.<randomUUID>.tmp` opened with the `wx` flag (it fails if anything, including a symlink, already has that name), then `rename` to `<base>.ans`. This follows `src/main/fileWrite.js`'s pattern. A partial `.ans` never exists.

**Security implication:** main never writes outside a session folder and never follows a planted link.

**Tested by:** unit tests: a crafted file name with `../` or `/` is refused before any write; the `.ans` file appears only by rename (a watcher on `answers/` never sees a partial `.ans`); a planted symlink at a `.tmp` name does not redirect the write.

## Compliance

No personal data leaves the machine, nothing is sent over a network, and no regulated data is stored. Question text lives in main's memory and, while its session lives, in the session folder. The timing log holds no text (OD1). No compliance regime applies.
