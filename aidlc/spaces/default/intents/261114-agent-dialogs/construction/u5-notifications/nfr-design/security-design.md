# Security Design: u5-notifications

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-design/nfr-design-questions.md` (Q1 B: tool and first line of the command; Q2 A: first line of agent text stays, the OS preview setting decides)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-requirements/security-requirements.md` (threat model, NFR3.50–NFR3.57, accepted risk)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-requirements/tech-stack-decisions.md` (D50, D52, D53)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/nfr-requirements/reviews/review-01.md` (R-01, R-02, R-03, R-07)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/functional-spec.md` (D1, D3, D4, D6, D9; corner "agent text visible on a locked screen")
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/frontend-components.md` (`onAgentEventFocus`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 secret and folder, C3 fields, C4 bridge pattern and ownership rules)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/logical-components.md` (LC3, LC4, LC10, "Reuse by the later Units")
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-design/security-design.md` (SD8, LC12 `src/shared/agentText.js`) and its review `reviews/review-01.md` (R-01, R-07)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-design/security-design.md` (SD9 `visibleText`) and its review `reviews/review-01.md` (R-01)
- Existing code: `src/main/notify.js` (`slice` cut, `questions:focus` click push), `src/main/settings.js` (`QUESTION_ALERTS`, `sanitize`), `src/preload/index.js` (`subscribe`, `onQuestionFocus`), `src/renderer/App.jsx` (the only `onQuestionFocus` subscriber), `src/shared/harnesses.js` (`label`)

## Threat model in short

u1's threat model holds unchanged, including its accepted risk that an agent's own command can forge events for its own session. Notifications add one place where agent text leaves the window (the operating system's notification centre and, by its preview setting, the lock screen) and one way into the app (the click). Element IDs start at SD50.

## SD50 Notification text goes through the intent's one sanitizer

**Satisfies:** NFR3.50, NFR3.51. Resolves review R-01.

`notificationText(raw)` (LC50) runs four steps, all from `src/shared/agentText.js` (u3 LC12, settled in `logical-components.md`):

1. **`firstLine`, bounded.** Leading whitespace skipped; the first line that is neither empty nor only a code fence (```` ``` ````) is taken and cut to 2 000 code units (`performance-design.md` PD52).
2. **`stripUnsafe`.** CR, LF, TAB, U+2028 and U+2029 become a space; every other character of the shared class is removed: `\p{Cc}` (C0, DEL, C1), `\p{Cf}` (bidi embeddings, overrides and isolates U+202A–U+202E and U+2066–U+2069, the marks LRM U+200E, RLM U+200F and ALM U+061C, zero-width U+200B and U+200C, U+2060–U+2064, BOM U+FEFF, soft hyphen U+00AD), lone surrogates `\p{Cs}`, and the whole tag block U+E0000–U+E007F; whitespace runs become one space.
3. **`plainLine`.** Markdown markers dropped as the strip does (u3 BR6.16): heading `#`, emphasis `*` and `_`, strike `~~`, inline code backticks, quote `>`, list markers; `[label](url)` becomes `label`, and the URL is never shown; the result is trimmed.
4. **`cutGraphemes`** (SD51).

- **Order.** The character class goes before the Markdown step, so a zero-width character placed inside a marker (`*`, U+200B, `*bold**`) cannot stop the marker from being recognised. `plainLine` only removes characters, so nothing unsafe comes back after step 2.
- **ZWJ (U+200D).** Removing functions keep it, so emoji sequences such as 👩‍💻 stay whole. It cannot reorder or hide other text, and `Intl.Segmenter` counts it inside the grapheme it joins, so the 120 count tolerates it. A stray ZWJ between letters is invisible and harmless.
- **`{project}`** goes through steps 2 and 4 (cap 40). `{harness}` is never event text (SD51).

```js
// LC50 (illustrative)
export function notificationText(raw) {
  const line = firstLine(String(raw ?? '')).slice(0, 2000);
  return cutGraphemes(plainLine(stripUnsafe(line)), 120);
}
```

**Tested by:** a table of at least 12 Markdown inputs (one per marker, a link, nested emphasis, a code fence first): no marker, no URL in the output; character tests with ESC sequences, NUL, CR, U+202E, U+2067, LRM, RLM, U+061C, U+200B, U+FEFF, U+2028, U+E0041 and a lone U+D800, each next to an emoji: none of them in any title or body, the emoji and `åäö` unchanged, 👩‍💻 whole.

## SD51 A capped length that never splits a character

**Satisfies:** NFR3.52.

- `cutGraphemes(s, n)` (in `agentText.js`) walks one module-level `Intl.Segmenter` (granularity `grapheme`) and, when the text has more than `n` graphemes, returns the first `n` plus "…". `{text}` uses 120, `{project}` 40.
- `{harness}` is `label` from `src/shared/harnesses.js` looked up by `event.harness`; an unknown harness id shows the id from the C3 enum only (`claude` or `opencode`), never free text.

**Tested by:** unit tests at 119, 120 and 121 graphemes and at 64 KB; a family emoji (ZWJ sequence), a flag and a combining accent at position 120 stay whole; `{harness}` is always one of the table's labels for both C3 values.

## SD52 What may appear in a notification

**Satisfies:** NFR3.53, as changed by the person's answer to Q1. Resolves review R-02.

| Kind | `{text}` built from |
|---|---|
| question | the first question's `text` (a batch uses its first question); an audit gate uses `gateText` / `askText` as today |
| permission | `permission.what`, one space, then the first non-empty line of `permission.detail`, together cut as one `{text}` |
| reply | `message.text`, or u3's "finished its turn without a message" line when empty |

- **Q1 answered B.** The permission body shows the tool and the first line of the command, cleaned and cut short, as the approved D3 says. This **supersedes NFR3.53's narrowing to `what` only**. D3, the D9 keys and `stories.md` stay as they are; no hand-off rewrite of D3 is needed. The rest of `detail` (its later lines) never appears.
- **Never in a notification:** `cwd`, `sessionId`, `tabId`, `THADEUS_SESSION_SECRET`, the session folder path, `context`, option labels and descriptions, and the person's own answer. `notifyEvent` reads only `eventId`, `kind`, `harness`, `projectId` (as the project's name from the store's context), the first question's `text`, `permission.what`, `permission.detail` and `message.text`.

**Tested by:** a unit test with marker strings in every C3 field and in the second line of `detail`: no title or body contains any marker except the one on `detail`'s first line, which appears (by design); a unit test that a 3-line command shows only its first line.

## SD53 The click push: one id, checked at both ends, contract first

**Satisfies:** NFR3.54. Resolves review R-07.

- **Main.** The click handler sends `agent-events:focus` with `{ eventId }` only, only for an id this run notified (the closure holds it), only to the window it holds and only when `!win.isDestroyed()`.
- **Preload.** `agentEvents.focus` is exposed as `onAgentEventFocus: subscribe('agent-events:focus')`, the existing helper.
- **Renderer.** The App shell ignores a payload that is not an object whose `eventId` is a non-empty string of at most 64 characters, and acts only on an event it holds (otherwise D6 step 6). It never throws on a bad payload.
- **Why 64.** C3 fixes no id format beyond "unique per app run"; the `<digits>-<digits>` shape the review cites is C1's event file name, not the id. The 64-character bound is the one u1 already applies to every `eventId` the bridge accepts (u1 SD4, u1 OD1), so an id longer than that could not be answered or stamped anyway. Code Generation adds one store test that every id u1 LC4 mints, hook and audit (`Question Id` or `<intent>:<key>`), is at most 64 characters.
- **Order of the change.** The first Code Generation step adds the C4 row (`logical-components.md`, "Amendments for Code Generation") to `contract-summary.md`. Only after that step are `questions:focus` and `onQuestionFocus` removed, from `src/main/notify.js`, `src/preload/index.js` and `src/renderer/App.jsx`, the only three places they occur. The grep test covers `src/` only, so it does not fail on the contract file's history.

**Tested by:** main test of the sent payload (keys exactly `eventId`; nothing sent when the window is destroyed); renderer tests with `undefined`, `null`, `'abc'`, `{}`, `{ eventId: '' }`, `{ eventId: 7 }`, a 65-character id and an unknown id: nothing opens, nothing throws; one test that searches `src/` for `questions:focus` and `onQuestionFocus` and finds 0 hits.

## SD54 A notification never answers

**Satisfies:** NFR3.55.

Every `Notification` is built with exactly `{ title, body, silent }`: no `actions`, no `hasReply`, no `replyPlaceholder`. The click handler touches only the window (`restore`, `show`, `focus`), `webContents.send` and the timing stamp; it has no reference to the store's answer, close or reopen paths.

**Tested by:** unit test on the options object passed to a fake `Notification` (keys exactly `title`, `body`, `silent`); unit test that the click handler calls nothing on a store spy.

## SD55 `replyAlerts` sanitised on read and write

**Satisfies:** NFR3.56.

`REPLY_ALERTS = new Set(['dialog-notify', 'line', 'off'])` beside `QUESTION_ALERTS`, and one more spread line in `sanitize`: the key is kept only when `REPLY_ALERTS.has(raw?.replyAlerts)`. `Set.has` on a non-string never matches and never throws, so `'__proto__'`, objects and arrays fall out like any other invalid value; the default applies where the key is read.

**Tested by:** main tests through `getSettings` and `setSettings` for `undefined`, `null`, `''`, `'Off'`, `'line '`, `1`, `true`, `{}`, `[]` and `'__proto__'` (no `replyAlerts` key, no error) and for the three valid values (round-trip).

## SD56 Linux daemons that read markup

**Satisfies:** NFR3.57.

On Linux (`process.platform === 'linux'`), the finished body is escaped for the freedesktop body markup: `&` to `&amp;` first, then `<` to `&lt;` and `>` to `&gt;`. The title is not escaped: it holds only the harness label from the table and translated text. macOS shows the body as plain text and gets no escaping.

- **Known limit.** A daemon that does not read markup shows `&amp;` literally. GNOME Shell on Ubuntu 22.04, the release target, reads it, so escaping is right there. `ponytail:` comment at the code naming this limit.

**Tested by:** unit test with the platform stubbed to `linux` and to `darwin`: `<b>bold</b> & <i>x</i>` becomes the escaped form on Linux and is unchanged on macOS; the manual check on Ubuntu 22.04 GNOME before the release that ships this Unit.

## Accepted risks

Both confirmed by the person in the NFR Design questions:

1. **Q2 A.** The first line of agent text (a question, a reply, cut to 120 graphemes) is visible in the notification centre and, by the operating system's "Show previews" setting, on the lock screen. The app adds no hiding. Reason: single-user local tool; the person controls previews in the system settings.
2. **Q1 B.** The first line of a permission prompt's command is shown the same way. A token on that line can therefore reach the notification centre and the lock screen. The person accepted this for the gain of seeing what is asked without opening the window. The dialog still shows `detail` in full; the notification never shows its later lines.

## Compliance

No regulated data is handled. Nothing leaves the machine: notifications go to the local OS notification service only.
