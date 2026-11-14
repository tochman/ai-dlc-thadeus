# Security Design: u2-permissions

## Sources

- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-design/nfr-design-questions.md` (Q1: A)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/security-requirements.md` (threat model, NFR3.13–NFR3.19)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/performance-requirements.md` (NFR6.4, NFR6.5, NFR7.3, NFR7.4)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/reliability-requirements.md` (NFR5.16, NFR5.19)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/observability-requirements.md` (NFR3.20)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/tech-stack-decisions.md` (D7–D11)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/nfr-requirements/reviews/review-01.md` (R-01 to R-06)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/functional-spec.md` (harness facts, W1, W1b, W2, W3, W6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/rules.md` (BR5.1–BR5.8, BR5.10, BR5.11)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u2-permissions/functional-design/entities.md` (Permission, PermissionChoice, `alwaysRules` main only)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C1 security note, C2 "Delivering an answer", C3 `permission`, C4 errors)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/security-design.md` (SD1–SD7, the shared base)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/reliability-design.md` (RD2, RD3, RD4, RD6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/logical-components.md` (LC1–LC10, C1 amendment)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-design/reviews/review-01.md` (R-01 dash `:` redirect, R-02 single instance, R-04 sent on a gone folder)
- Existing code: `src/main/notify.js` (`win.show()` and `win.focus()` only on a notification click), `src/main/i18n.js` (main's `t()` shares the renderer's i18n instance), `src/main/index.js` (no `requestSingleInstanceLock`), `src/renderer/QuestionPopup.jsx` (modal `<dialog>` that focuses its first answer)

## Threat model in short

u1's threat model and accepted risk apply unchanged (u1 security design, "Threat model in short"). A permission is the one answer that lets an agent run something, so every element below serves one promise: **the agent is allowed exactly what the person picked on a page that showed it whole, and nothing else, ever.** When anything is unclear, the app hands back and the agent's own prompt decides.

Component IDs (LC1–LC10) are u1's (`logical-components.md` of u1); u2 adds no component. RD elements of this Unit are in this folder's `reliability-design.md`; u1's are cited as "u1 RDn".

u1 SD1 (private folders), SD2 (secret), SD3 (intake checks), SD5 (no interpretation in the script) and SD7 (answer writes into the session's own folder) apply to `permission` event files unchanged. Their tests gain one `permission` case each (NFR8.5). This file designs only what permissions add.

## SD8 The app never answers a permission on its own

**Satisfies:** NFR3.13, NFR3.14 (with PD8), u1 NFR3.7 for permissions.

- **One writer of a decision.** The only code that writes a non-empty permission answer file is `sendPermission` in LC4 (reliability-design.md RD10), and its only caller is `agentEvents.answer` after the SD10 check. Arrival, the store's time-out timer, Close, Esc, tab exit and start-up call `handBack(ev)`, which takes no text argument and always writes the empty file. A hand-back therefore cannot carry a choice by construction, not by convention.
- **No memory of earlier answers.** LC4 keeps no per-tool or per-command record of what the person chose. No setting exists that answers a permission. A remembered rule is the agent's own business (Claude Code's settings, opencode's rule store), applied by the agent before it asks, never by the app.
- **The plugin decides nothing.** LC9 subscribes to `permission.asked` and `permission.replied` only and never calls `ctx.permission.hook`. It calls `ctx.permission.reply` only with a decision read from an answer file whose whole content is exactly `once`, `always` or `reject` (RD13). Any other content, the empty file included, is a hand-back: no reply.
- **No window focus from the app.** An arriving permission never calls `BrowserWindow.focus()`, `show()` or `moveTop()`. The window comes forward only by the person's own act (a click on a u5 notification, as `src/main/notify.js` does for questions today). This settles the OS-focus half of review R-04; the in-window half is PD8.

**Security implication:** no code path, timer or stored state can turn into an allow or a deny. The worst a fault can do is hand the prompt back to the terminal.

**Tested by:**

- store tests with spies on `writeAnswer`: arrival, the time-out timer (fake clock), Close, Esc, tab exit and a start-up with leftover folders call it only with `text === ''`, or not at all;
- a source test that `handBack` has arity 0 beyond the event and that `sendPermission` is referenced only from the `answer` handler;
- plugin tests with a stubbed V2 `ctx`: no `reply` without an answer file; answer file `''`, `'allow'`, `'once\n'` and `'ALWAYS'` give no `reply`; `ctx.permission.hook` is never called; a source test that `thadeus-dialog.js` contains no `evaluate` string;
- main test: an accepted permission calls none of the window's `focus`, `show` or `moveTop` (spies on a fake `BrowserWindow`).

## SD9 One rule for showing agent text as plain text

**Satisfies:** NFR3.16, NFR7.4, review R-02 (escaping part), review R-03.

Every agent-supplied string on a permission page goes through one function in LC3 before it leaves main: `what`, `detail`, `cwd`, every Allow always rule line and its destination or type. The same function cleans the 80-character excerpt in log lines (OD7), so a command cannot colour or rewrite the terminal the app was started from.

```js
// LC3 (illustrative): the only escaping rule for agent text shown as plain text (NFR3.16, R-03); u1 and u5 reuse it.
const HIDDEN = /[\p{Cc}\p{Cf}\p{Cs}  \u{E0000}-\u{E007F}]/gu;
export function visibleText(s, { multiline = false } = {}) {
  return s.replace(HIDDEN, (ch) => {
    if (multiline && (ch === '\n' || ch === '\t')) return ch;
    const cp = ch.codePointAt(0);
    return cp > 0xffff ? `\\u{${cp.toString(16)}}` : `\\u${cp.toString(16).padStart(4, '0')}`;
  });
}
```

- **The class.** `\p{Cc}` holds C0, DEL and C1. `\p{Cf}` holds every format character: the bidirectional embeddings, overrides and isolates (U+202A–U+202E, U+2066–U+2069), U+061C, U+200B–U+200F, U+2060–U+2064, U+FEFF, U+00AD, U+180E and the assigned tag characters. U+2028 and U+2029 are added by name because they are `Zl` and `Zp`, not `Cf`. The whole tag block U+E0000–U+E007F is added because some of it is unassigned (`Cn`). `\p{Cs}` catches a lone surrogate that `JSON.parse` lets through from a `\ud800` escape. The regular expression needs the `u` flag; Node 20 in Electron supports Unicode property escapes.
- **Newline and tab.** Only `detail` is multi-line (`multiline: true`), so a multi-line command reads as written. Every other field is one line, so a newline inside a rule text or a tool name is shown as `\u000a` and cannot make one rule look like two.
- **Order.** Cut first, on the agent's own text, then escape (D11). The caps in SCD8 therefore count what the agent sent, and the escaped form may be longer; it is display only.
- **One function for the intent.** `visibleText` is exported from `src/main/agentAdapters.js` and is the only escaping code in the intent. u1's question header and option labels and u5's notification title and body call it when they show agent text as plain text; none of them writes its own pattern. u1's Markdown body (u1 SD6) is not passed through it, because Markdown rendering is u1's own rule.
- **What it does not catch.** Variation selectors (`Mn`) and invisible letters such as U+3164 are not escaped. They cannot reorder or hide other text; they only change how one glyph looks. Accepted. A ZWJ emoji sequence (U+200D is `Cf`) shows its joiners as escapes; a command rarely holds one, and showing it is the honest result.
- **The renderer adds nothing.** LC10 renders every one of these strings as a React text node. `detail` is in a monospaced block with `white-space: pre-wrap` and `overflow-wrap: anywhere`, so no part of a line is pushed off screen sideways; a long command scrolls inside the block with a visible scroll bar. `FileContent` and `react-markdown` are not used for any permission field (D11).

**Security implication:** HTML, Markdown, ANSI escapes and characters that reorder or hide text reach the person as visible text, never as markup or as a different reading order.

**Tested by:**

- adapter tests, one per range: U+0000, U+001B, U+007F, U+0085, U+009F, U+00AD, U+061C, U+180E, U+200B, U+200D, U+200F, U+202A, U+202E, U+2028, U+2029, U+2060, U+2064, U+2066, U+2069, U+FEFF, U+E0001, U+E0041, U+E007F and a lone U+D800: each shows as its `\u` escape; `\n` and `\t` are kept in `detail` and escaped in `what`, `cwd` and rule lines;
- adapter test with recorded payloads holding Swedish text, a plain emoji, an emoji with U+FE0F and non-ASCII paths: equal to the payload (NFR7.4);
- renderer test: a payload with `<script>`, `<img onerror=…>`, a Markdown link, ANSI colour codes and a right-to-left override renders no `script`, `img` or `a` element and shows each as text; `detail` is a text node inside the monospaced block;
- log test: a refused event whose `what` holds ESC and U+202E writes a line with the escapes, not the raw characters (OD7).

## SD10 The permission answer check

**Satisfies:** NFR3.15, NFR3.19 (refusal half), review R-05 (named signal).

IpcRouter first checks the shape (u1 SD4): `eventId` a string of at most 64 characters; for a permission event `answer` has exactly one key, `permission`, and `answer.permission` has exactly one key, `choice`. The store then runs BR5.7 in this order and moves the event to `sending` before its first `await`, so a second call finds it no longer open:

```js
// LC4 (illustrative): BR5.7 in order; nothing is written when any step refuses (NFR3.15).
function checkPermissionAnswer(ev, answer) {
  if (!ev) throw fail('unknown event');
  if (ev.kind !== 'permission' || ev.state !== 'shown') throw fail('event not open');
  if (!channel.isLive(ev.sessionId)) throw fail('session ended');
  const { choice } = answer.permission;
  const c = Number.isInteger(choice) ? ev.permission.choices[choice] : undefined;
  if (!c || !c.enabled) throw fail('answer does not fit the event');
  ev.state = 'sending'; // same synchronous step as the checks
}
```

After the check, `sendPermission` asks u1 RD3's `hookWaits(ev)`: the hook's `answers/<name>.wait` marker exists and less than `waitSeconds + 5` s have passed since `arrivedAt`. **That marker is the named signal for "hook still waiting"** (review R-05); the store's own clock never decides it. When it is false the store writes nothing, sets `timedOut` with `lastError`, and the call is refused with `event not open`.

| Case (NFR3.15) | C4 error | State after |
|---|---|---|
| unknown event id | `unknown event` | — |
| state queued, sending, sent, timedOut, handedBack, ended; second answer | `event not open` | unchanged |
| session ended | `session ended` | unchanged |
| hook no longer waiting (`.wait` gone or stale) | `event not open` | timedOut |
| choice not an integer, outside `choices`, or a disabled choice | `answer does not fit the event` | unchanged |
| any key besides `permission`, or besides `choice` inside it | `answer does not fit the event` | unchanged |

Only `shown` can be answered. A timed-out permission is never answered from the app, unlike a timed-out question (u1 SD4), because its only route would be keys (D10).

**Tested by:** one store test per row; in each, `writeAnswer` and `writeSession` spies are never called and no hook output is built; a test that two `answer` calls started in the same tick give one `sending` and one `event not open`; a test with a fake channel whose `.wait` is gone: refused, state `timedOut`, `lastError` set.

## SD11 Allow always applies only what the person saw

**Satisfies:** NFR3.17, Q1 (A), review R-01, review R-02 (label part), FD review R-03.

**Claude Code.** `alwaysRules` is `permission_suggestions` as parsed from the hook stdin. LC4 keeps it in a private `Map` keyed by `eventId`, outside the `AgentEvent` object, and the view sent over IPC is built by an allowlist of fields, so it cannot leak by accident. The allow-always output is `updatedPermissions: alwaysRules`, the same parsed value, never rebuilt. `updatedInput` is never set.

Allow always is offered only when every suggestion is a shape whose whole effect can be shown in words:

| Suggestion | Shown line (agent strings through `visibleText`) | Offered |
|---|---|---|
| `type: "addRules"`, `behavior: "allow"`, `rules` a non-empty array of `{ toolName, ruleContent? }` strings, `destination` a string, no other keys | one line per rule: `<destination>: <toolName>(<ruleContent>)`, or `<destination>: <toolName>` without content | yes |
| `type: "addDirectories"`, `directories` a non-empty array of strings, `destination` a string, no other keys | one line per folder: `<destination>: <directory>` | yes |
| anything else: `setMode`, `replaceRules`, `removeRules`, `removeDirectories`, `addRules` with another `behavior`, an unknown type, an unknown key, a field of the wrong type | — | **no** Allow always; Allow once and Deny stay |
| `permission_suggestions` absent, not an array, or empty | — | no (BR5.3) |

Refusing unknown keys is deliberate: a field the app cannot show could change what is saved. A newer Claude Code that adds a key loses the dialog's Allow always until the fixture is re-recorded; the terminal prompt still offers it.

**opencode (Q1 A).** opencode remembers an `always` decision by the request's own always-patterns; the reply carries only the decision, so the app cannot change what is saved, only show it. The adapter reads the request's always-pattern list (expected `always: string[]` beside `permission` and `patterns` in the opencode 2.1.4 V2 types; the field name is taken from the recorded fixture before the adapter is written, FD open point). When it is a non-empty array of non-empty strings, Allow always is offered with one line per pattern, `<permission>: <pattern>`. When the field is missing, empty or of another shape, Allow always is not offered; Allow once and Reject stay. That narrows BR5.3's opencode clause and NFR2.7 (logical-components.md, "BR5.3 amendment").

**The label fits whole, or Allow always is disabled.** The label is built in main through the shared `t()` (`src/main/i18n.js`) as `t('agentDialog.permission.allowAlways', { rules })`, with the lines joined by newlines as the placeholder value (NFR7.3). Before escaping, the lines must fit SCD8's caps: at most 8 lines, each at most 256 characters, at most 1 024 characters together. If they do not, the choice is kept with `enabled: false`, its label is the bare "Allow always" without any rule, and the page shows "Too long to show here. Use the terminal for Allow always." A rule list is never shown cut. The renderer shows the label with `white-space: pre-wrap` and no `text-overflow`, so every line is on screen.

**Security implication:** Allow always saves exactly the lines the button showed, on both harnesses. Anything the app cannot put into words is not offered.

**Tested by:**

- adapter tests with recorded `PermissionRequest` stdin: with one `addRules` suggestion, with `addRules` plus `addDirectories`, without suggestions, with `[]`, with `setMode`, with `addRules` and `behavior: "deny"`, with an extra key: Allow always present only in the first two; built output deep-equals the recorded `permission_suggestions`; no `updatedInput` key;
- adapter tests with recorded `permission.asked` fixtures: with always-patterns (offered, one line per pattern), with `always: []`, without the field, with a number in the array (not offered);
- cap tests: 8 lines offered, 9 disabled; 1 024 characters offered, 1 025 disabled; a 257-character line disabled; a disabled choice's label holds no rule text;
- store test: serialised `agentEvents.list` and every `agent-events:changed` payload hold no `alwaysRules` or `permission_suggestions` key, and each choice has only `label`, `effect`, `refuses` and `enabled`;
- renderer test: the Allow always button's text equals the label, each rule line is visible, and the button has no ellipsis style.

## SD12 Deny is a plain refusal

**Satisfies:** NFR3.18.

The Claude Code deny output is `{ behavior: "deny", interrupt: true, message: DENY_MESSAGE }`, where `DENY_MESSAGE` is a fixed English constant in LC3 ("The person denied this in the app."). No agent text, no `updatedInput`. opencode gets `reject`.

**Tested by:** adapter test: deny output equals the constant shape exactly, with recorded stdin whose command holds text that must not appear; plugin test: `reply` called with `decision: 'reject'`.

## SD13 Permission answers never as keys

**Satisfies:** NFR3.19, D10.

LC4's delivery is chosen by kind. `permission` goes to `sendPermission`, which has no reference to the guarded `writeSession` caller or to the pty output tap (u1 RD3). Every branch where u1 RD2 would fall back to `sendViaKeys` ends in `timedOut` for a permission (RD10). The renderer can only call `agentEvents.answer`, which for a timed-out permission is refused (SD10).

**Tested by:** store tests with a `writeSession` spy across every state (queued, shown, sending, sent, timedOut, handedBack, ended) and every RD10 outcome: 0 calls; a source test that the permission delivery module does not import the keys sender.

## SD14 Shared-base fixes this Unit relies on

These are u1's to make; u2's guarantees assume them, and its tests check them for the `permission` argument.

| u1 fix | Why u2 needs it | Checked by |
|---|---|---|
| u1 NFR Design review R-01: create the wait marker with `printf '' > "$a.wait" \|\| exit 0`, never `: > file`; no other bare redirect on a special builtin | under dash a failed redirect on `:` exits 2 before `\|\| exit 0`, so a permission hook with a missing `answers/` would exit non-zero; u2 adds no redirect of its own, only `permission` to the waiting kinds on the `case` line | the permission script cases "`answers/` missing" and "`events/` not writable" under `dash` (RD14) |
| u1 NFR Design review R-02: take `app.requestSingleInstanceLock()` before `init()`; a second start quits and brings the first window forward | a second instance's start-up wipe would remove the first instance's live session folders; the waiting permission hooks would hand back (safe), but `answerState` on a gone folder must not read as "taken" (RD10 checks the folder) | u1's second-start test; RD10's gone-folder case |
| u1 NFR Design review R-04: `sent` only while the session is live and its folder exists | a permission reported "Sent" that never reached the agent is a false statement about what was allowed | RD10 store test with the folder removed during the poll |

## Review findings (NFR Requirements review-01)

| Finding | Resolution |
|---|---|
| R-01 Major: opencode Allow always shows nothing | SD11: shown with the request's own always-patterns; not offered without them (Q1 A); BR5.3 amendment in `logical-components.md` |
| R-02 Major: rule text not escaped or capped | SD9 covers every agent string, the label included; SD11 and SCD8 cap the label and disable Allow always when it does not fit whole |
| R-03 Minor: escape class too narrow | SD9: `\p{Cc}`, `\p{Cf}`, `\p{Cs}`, U+2028, U+2029 and the tag block, one test per range; one function for the intent |
| R-04 Minor: focus on arrival | SD8: the app never takes OS focus; PD8: focus on the page title and a 500 ms input guard |
| R-05 Minor: "hook no longer waiting" unnamed | SD10 and RD10: u1's `.wait` marker through `hookWaits` |
| R-06 Minor: residual window in `permission.reply` | RD13: accepted, opencode takes the first decision; a replied-during-reply test |

## Compliance

As u1: nothing leaves the machine and no regulated data is stored. A permission's command and the agent's rule suggestions live in main's memory and in the session folder only while the session lives (u1 RD5, RD6). No compliance regime applies.
