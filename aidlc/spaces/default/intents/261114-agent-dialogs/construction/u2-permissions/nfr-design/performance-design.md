# Performance Design: u2-permissions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/performance-requirements.md` (NFR1.8–NFR1.11, NFR4.4, NFR6.4–NFR6.6, NFR7.3, NFR7.4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/security-requirements.md` (NFR3.14)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/observability-requirements.md` (NFR1.12, NFR1.13)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/reviews/review-01.md` (R-04)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md` (W1, W1b, W3, state machine)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md` (BR5.6, BR5.10, BR5.11, BR5.13)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1, C4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/performance-design.md` (latency budget, PD1–PD6, the shared base)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/reliability-design.md` (RD1, RD2)
- Existing code: `src/renderer/QuestionPopup.jsx` (modal `<dialog>`, focus of the first answer), `src/main/notify.js`

## Scope

One person, one machine, no network; latency and keyboard use are the only performance properties. The path of a permission is the path of a question, so u1's latency budget table applies unchanged and u1 PD1 (intake), PD3 (same-turn push) and PD4 (no cost when the app is absent) carry permission events without change. There is no `via: keys` path for a permission (D10), so u1 PD2's picker tap and u1 NFR1.3 do not apply to this Unit. Component IDs are u1's LC1–LC10.

## PD7 Permission latency on the hook path

**Satisfies:** NFR1.8, NFR1.9, u1 NFR1.1, u1 NFR1.5 (for the `permission` argument).

- Arrival: u1 PD1 unchanged. The adapter's extra work for a permission is one `cutUtf8` of at most 64 KB (u1 SCD1), `visibleText` over at most four short fields and the 64 KB `detail` (one linear regular-expression pass), and the SD11 shape check of the suggestions. All are pure, synchronous and well under 5 ms on the largest allowed payload.
- Answer: one atomic write, then u1 RD2's 25 ms marker polls (RD10). For Claude Code the hook takes the file within one 100 ms poll and prints it with `cat`, inside u1 NFR1.5's 300 ms.
- `answerDelivered` is stamped when main sees the take (u1 OD1), not at the `.ans` rename that NFR1.9's wording names. Seeing the take comes after the rename, so the measured value includes the hook's own poll and is the stricter of the two; meeting ≤ 1 s with it meets NFR1.9.

**Tested by:** adapter test that a 64 KB `detail` of mixed text is built in under 50 ms in the test environment (a smoke bound, not the target); script test with the `permission` argument: drop `.ans`, printed byte for byte and exit ≤ 300 ms; manual run on the release Mac with the timing log on: 20 Claude Code runs, `dialogShown − hookReceived` ≤ 1 s and `answerDelivered − answerClicked` ≤ 1 s in each, spread over the three choices.

## PD8 Focus on arrival and the input guard

**Satisfies:** NFR6.4, NFR6.5, NFR3.14, review R-04.

The person may be typing in the app's own terminal tab when a permission arrives. Keys already in flight, such as `1` then Enter meant for the shell, must never answer the page that just opened.

- **No OS focus is taken** (security-design.md SD8). If the window is in the background, the page waits there.
- **In the window, focus goes to the page title,** never to a choice (NFR6.4). The title is a heading with `tabIndex={-1}`. No choice has `autoFocus`, `aria-selected`, `aria-pressed` or a default style.
- **The input guard.** For 500 ms after a permission page is shown, and again each time the shown page changes to another permission, the page swallows every `keydown`, `pointerdown` and `click` on its choices (`preventDefault` and `stopPropagation`) and acts on none of them. After the guard, a number key only focuses a choice, Enter sends the focused choice, Tab and the arrow keys move between choices, Esc hands back (BR5.10). Enter with focus on the title sends nothing.

```js
// LC10 (illustrative): input in flight when a permission page appears is swallowed, never answered (R-04).
const GUARD_MS = 500;
useEffect(() => { titleRef.current?.focus(); guardUntil.current = Date.now() + GUARD_MS; }, [page.eventId]);
function onPermissionInput(e) {
  if (Date.now() < guardUntil.current) { e.preventDefault(); e.stopPropagation(); return true; } // swallowed
  return false;
}
```

- Why 500 ms: it is longer than the gap inside a typed burst (tens of ms between keys) and shorter than the time a person needs to read the page and decide. Two steps are still needed after it (a number key, then Enter), so even input that arrives later needs a focused choice first.
- Keys swallowed by the guard do not reach the terminal either. That loses at most half a second of typing the person was already doing when the page took focus; accepted, because the other choice is to let them answer.
- Esc is guarded too, so a stray Esc cannot close the page unread. It is safe either way (it hands back), but a page the person never saw should not vanish.

**Tested by** (renderer tests with fake timers, Swedish locale): `document.activeElement` is the page title after the push; no choice carries `aria-selected` or `autofocus`; `1` then Enter at 0 ms, 100 ms and 499 ms: `agentEvents.answer` not called and no choice focused; a click on a choice at 200 ms: not called; `1` then Enter at 500 ms: called once with choice 0; a number key alone after the guard focuses a choice and does not call `answer`; Enter on the focused title after the guard does not call `answer`; paging to a second permission restarts the guard; each of the three choices sent by keyboard alone; Esc after the guard calls `agentEvents.close` only.

## PD9 opencode confirmation and terminal answers in the same turn

**Satisfies:** NFR1.10, NFR1.11, NFR1.13 (stamp source).

- The plugin writes an `answered` event on every `permission.replied` (RD13). AgentChannel accepts it like any event (u1 PD1); the store matches it to the open permission by `toolCallId` (the request id) and handles it synchronously, as u1 PD3 does for a closing event: stamp `agentConfirmed` (OD6) when the event was `sending` or `sent`, set `ended` and push `agent-events:changed` before the handler returns. When the event was `shown`, the page shows "Answered in the terminal." and the event ends.
- No debounce and no `await` between the raw event and the push.

**Tested by:** store unit test: after a synchronous `onRawEvent(answered)` for a shown opencode permission, the push spy was called before the call returns, with the "Answered in the terminal." key; the same for a `sent` permission with one `agentConfirmed` stamp; manual opencode run on the release Mac: `agentConfirmed − answerClicked` ≤ 1 s, and an answer typed in the opencode terminal closes the page ≤ 1 s after the event file is written.

## PD10 Texts: the app's own through `t()`, the agent's untouched but visible

**Satisfies:** NFR6.6, NFR7.3, NFR7.4, u1 NFR7.1, u1 NFR7.2, u1 NFR6.3.

- Every app text on the permission page goes through `t()` with ICU placeholders: the header ("{harness} asks for permission") and the word PERMISSION, the three choice labels, the Allow always label with `{rules}` as a placeholder value (SD11), the truncated line, the "Too long to show here" line, the M6 time-out line, "Sent to {harness}.", the hand-back toast, "Answered in the terminal." and "Nothing was sent.". Choice labels are built in main through the shared i18n instance (`src/main/i18n.js`), which follows the same language setting as the renderer; the renderer's own lines use its `t()`. Keys go into `sv.json` and `en.json` together.
- The refusing choice is named in its label ("Deny" or "Reject"), not only by its coral edge; a disabled choice says why in a text line, not only by its grey style (NFR6.6).
- The deny message sent to Claude Code (SD12) is a fixed English constant: it is read by the agent, not shown to the person.
- Agent text (`what`, `detail`, `cwd`, rule lines) is decoded once by `JSON.parse` and changed only by the SCD8 cut and the SD9 escapes; it is never translated, trimmed or normalised.

**Tested by:** the existing `tests/main/i18nKeys.test.js`; renderer tests in the Swedish locale finding each state's text by its Swedish wording (an English literal left in a component fails them); adapter test with recorded payloads holding Swedish, emoji and non-ASCII paths: each field equals the payload after the cut and the escapes (NFR7.4).

## PD11 No cost when the app is absent

**Satisfies:** NFR4.4, u1 NFR4.1, u1 NFR4.2.

u1 PD4 unchanged: the C6 command tests `THADEUS_SESSION_DIR` and the script's existence with the shell's built-in `[` before `sh` starts the script. The `PermissionRequest` entry runs for every tool, so this is the path most sessions take; it costs one shell start. The script's first fallible step is still the `read` of `alive`, before any file is written.

**Tested by:** RD14's script tests with the `permission` argument (the C6 command through `sh -c`, 20 runs each, ≤ 100 ms, exit 0, no output); manual: plain `claude` outside the app shows its own permission prompt at once.

## What does not apply

| u1 element | Why not for permissions |
|---|---|
| u1 PD2 `via: keys` and the picker tap; u1 NFR1.3 | a permission answer is only `via: hook` (D10, SD13) |
| u1 PD5 "focus the first choice"; u1 NFR6.1 | replaced for permission pages by PD8 (focus on the title, guard) |
