# Tech Stack Decisions: u5-notifications

## Sources

- `aidlc/spaces/default/codekb/aidlc-dash/technology-stack.md` (installed versions; no coverage provider, linter or formatter installed)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR7, NFR8; FR5.1–FR5.3)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/functional-spec.md` (D2 `alertPlan`, D3, D4, D6, D7, D9)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/frontend-components.md` (tests table, `onAgentEventFocus`)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/rules.md` (BR8.1–BR8.6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u5-notifications/functional-design/reviews/review-01.md` (R-04, R-05, R-06)
- `aidlc/spaces/default/intents/261114-agent-dialogs/inception/contract-design/contract-summary.md` (C3, C4 and the contract ownership rules)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u1-questions/nfr-requirements/tech-stack-decisions.md` (u1 NFR8.1–NFR8.4, u1 D1–D6)
- `aidlc/spaces/default/intents/261114-agent-dialogs/construction/u3-replies/nfr-requirements/tech-stack-decisions.md` (u3 D11, the strip's line)
- Existing code checked: `src/main/notify.js`, `src/main/settings.js`, `src/preload/index.js`, `src/renderer/App.jsx`, `src/shared/harnesses.js`

## Summary

No new dependency and no new language. Everything is built from Electron's `Notification`, the existing settings store, the existing `t()` and JavaScript built-ins.

| Part | Choice | Version | New? |
|---|---|---|---|
| System notification | Electron `Notification` in main, as `notify.js` today | Electron 45.3.1 | no |
| Alert decision | `alertPlan(kind, settings, inFront)`, one pure function in `src/shared/` imported by main and renderer | ES modules | new file, no dependency |
| Text cleaning and cut | the strip's plain-line function (u3 D11 path) plus `Intl.Segmenter` | Node 22 / Chromium in Electron 45 | no |
| Setting | `REPLY_ALERTS` set beside `QUESTION_ALERTS` in `settings.js`, saved through `setSettings` | — | no |
| Escalation timer | `setTimeout(OVERDUE_MS)` per shown page in AgentDialog, as `QuestionPopup.jsx` | React 19.3.1 | no |
| Click push | `agent-events:focus` through the preload's `subscribe` helper | — | replaces `questions:focus` |
| Texts | `t()` with ICU, keys in `sv.json` and `en.json` | i18next 27.1.1, i18next-icu 2.7.0 | no |
| Tests | vitest projects `main` and `renderer`, Testing Library, fake timers | 5.1.0, 16.3.3 | no |

## Decisions

Numbered from D50 so they cannot meet u1's D1–D6, the D7–D11 that both u2 and u3 use, or this Unit's Functional Design D1–D9.

### D50 Cut by grapheme with `Intl.Segmenter`

- **Context:** D3 and NFR3.52 need a cut at 120 visible characters that never splits a character or an emoji. Today's `slice(0, 119)` counts UTF-16 code units and can cut a surrogate pair in half.
- **Decision:** count and cut with `new Intl.Segmenter(undefined, { granularity: 'grapheme' })`, built once per module.
- **Alternatives rejected:** `Array.from(text)` (code points, still splits ZWJ emoji and combining marks); a grapheme library such as `grapheme-splitter` (a new dependency for what the runtime has built in).
- **Consequences:** correct for every script and emoji; one built-in call per notification.
- **Security:** no broken surrogate reaches the operating system's notification service.

### D51 The decided-id set is capped at 500 (R-04)

- **Context:** D4 keeps every decided id for the app run. The store already calls Notifications once per accepted event (D5), so the set is a second guard.
- **Decision:** keep the `Set`, and when it holds more than 500 ids delete the first one in insertion order. Carry `// ponytail: 500 ids, the store's once-per-event call is the real guard; raise if a run ever passes 500 open events` at the code.
- **Alternatives rejected:** dropping the set (one refactor of the store away from double notifications, and the audit fallback still passes lists); an unbounded set (grows for the whole run, review R-04); a time-based expiry (needs a timer for no gain).
- **Consequences:** memory bounded (NFR1.56); an id older than 500 events can only come back if the store calls twice, which its own tests forbid.
- **Security:** none.

### D52 One plain-line function for the strip and the notification

- **Context:** u3 BR6.16 drops Markdown markers for the strip's line (u3 D11 renders it through `FileContent`); D3 needs the same markers dropped as plain text for a notification.
- **Decision:** one function `plainLine(text)` in `src/shared/` returns the first non-empty line with markers, control and bidi characters removed (NFR3.50, NFR3.51). Notifications calls it and then the D50 cut. The strip keeps its own rendering by u3 D11 and uses `plainLine` only where it needs plain text (for example its `title` attribute).
- **Alternatives rejected:** rendering the Markdown with `react-markdown` in main and reading its text (pulls React into main); a Markdown-to-text library (new dependency); separate regular expressions in each caller (two lists to keep in step).
- **Consequences:** one table of tests (NFR3.50) covers both callers.
- **Security:** one place to fix if a marker or character is missed.

### D53 `agent-events:focus` replaces `questions:focus` (R-05)

- **Context:** the click must name an AgentEvent of any kind. `questions:focus` is sent only by `notify.js` and subscribed only by `App.jsx` (`onQuestionFocus`). C4 lets later Units add members; it does not list U5.
- **Decision:** add the push member `agentEvents.focus` (`agent-events:focus`, `{ eventId }`) to C4 as an additive U5 member, and remove `questions:focus` and `onQuestionFocus` in the same pull request. The removal is not a C4 change: the old channel is US-0505 code, not a C4 member.
- **Alternatives rejected:** keeping both channels for a release (no external subscriber exists; the preload and renderer ship together in one app build); reusing `questions:focus` for every kind (its name would lie about the payload).
- **Consequences:** NFR Design or Code Generation adds the U5 row to C4's member list in `contract-summary.md`; NFR3.54 checks no old subscriber is left.
- **Security:** the payload is one id, checked at both ends (NFR3.54).

### D54 `alertPlan` lives in `src/shared/` and is imported by both processes

- **Context:** D2 asks one pure function to serve AgentEventStore, Notifications and the renderer so they cannot disagree.
- **Decision:** `src/shared/alertPlan.js`, no imports, exported for main (store, Notifications) and renderer (App shell), like `src/shared/harnesses.js`.
- **Alternatives rejected:** computing it in main and sending `open` with each event (adds a field to C3 for a value the renderer can compute); a copy in each process (two tables to keep in step).
- **Consequences:** one exhaustive test (NFR8.53) covers every consumer.
- **Security:** none.

## Texts and quality gates (NFR7, NFR8)

u1 NFR8.1–NFR8.4 apply to this Unit's files unchanged. Setting up `@vitest/coverage-v8`, ESLint and Prettier in CI is u1's (u1 NFR8.2, u1 NFR8.3); if u5 is built first, it sets them up the same way.

| ID | Requirement | Target | How it is checked |
|---|---|---|---|
| NFR7.51 | Every text this Unit adds or changes goes through `t()` with ICU placeholders, in both languages (D9, BR8.6, AC5.1.4). | the 12 keys of D9 (10 new, 2 with changed text) are in `sv.json` and `en.json`; `app.notification.title` is removed from both; 0 hard-coded user-facing strings in `notify.js`, the M9 row and AgentDialog's overdue title | Existing `tests/main/i18nKeys.test.js`; renderer tests run in the Swedish locale; pull request review for literals |
| NFR7.52 | Agent text in a notification is the agent's text, cleaned but never translated (NFR7). | after `plainLine` and the cut, the text equals the agent's first line for Swedish, emoji and non-ASCII inputs | Unit tests with recorded C3 payloads |
| NFR8.50 | New behaviour is built test first (team TDD). | the frontend-components.md test table and every NFR row of this Unit has its failing test before its code in the Code Generation plan steps | Code Generation plan review; pull request history |
| NFR8.51 | Coverage of this Unit's touched files. | ≥ 80% line coverage for `notify.js`, `settings.js`, `alertPlan.js`, `plainLine`, the M9 row in `SettingsView.jsx`, AgentDialog's escalation code and the App shell's focus handling, measured by `@vitest/coverage-v8` as u1 NFR8.2 | CI `verify` job fails below the floor |
| NFR8.52 | Lint and format. | ESLint and Prettier report 0 errors on the Unit's files | CI `verify` job; a failure blocks the merge (u1 NFR8.3) |
| NFR8.53 | `alertPlan` is tested exhaustively. | all 9 kind-and-setting rows of D2, each with `inFront` true and false (18 cases), plus `notificationSound` false, match D2's table | One table-driven unit test in the `main` project |

## Hand-offs

- **R-06 (feature docs):** AC5.1.1 says red for questions and permission prompts only; D7 makes every kind red. `stories.md` US5.1 and `docs/features/epic-05-workflow-control.md` are updated to "every kind" in Deployment Execution with the story's other feature-doc updates (project Mandated rule).
