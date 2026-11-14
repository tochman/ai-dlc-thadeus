# Contract Summary: agent dialogs (EPIC-05 US-0506)

## Sources

- Units: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work.md`, `aidlc/spaces/default/intents/261114-agent-dialogs/inception/units-generation/unit-of-work-dependency.md` (U1–U5 and their edges).
- Components: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/domain-design/components.md`, `decisions.md` (ADR-001–ADR-006).
- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md`.
- Existing code: `src/main/ipc.js` (handlers throw `Error` with a translated message), `src/main/pty.js` (`writeSession(id, data)`).
- Answers: `contract-design-questions.md` Q1 `[Q1]`.

Every edge in the Unit graph is the same thing seen from two sides: U1 creates a component and its contract, U2 and U3 add kinds to it, U4 and U5 consume it. So the contracts below are the component boundaries U1 owns, each with the additions the later Units may make. The only boundary outside the app is the hook entry Claude Code and opencode run (C6); no public API is exposed.

## Contracts

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| C1 | U1 (AgentChannel) | ClaudeCodeHook and OpencodePlugin (U1, extended by U2, U3) | files in a per-session folder | U1 |
| C2 | U1 (AgentChannel) | IpcRouter (U1), AgentEventStore (U1) | in-process calls in main | U1 |
| C3 | U1 (HarnessEventAdapter, AgentEventStore) | AgentEventStore, AgentDialog (U1–U5), Notifications (U5) | shared schema (AgentEvent) | U1 |
| C4 | U1 (IpcRouter) | AgentDialog (U1), LatestMessageStrip (U3), AgentDialogsSetupUI (U4) | `window.bridge` IPC (invoke and push) | U1; U3 and U4 add members |
| C5 | U4 (HookInstaller) | AgentEventStore (U1 switch replaced in U4), IpcRouter (U4) | in-process calls in main | U4 |
| C6 | U4 (HookInstaller) | External: Claude Code hooks and opencode's plugin loader | entries in `.claude/settings.json`, committed script and plugin | U4 |

## C1 Hook channel (file protocol)

Used by the sh script and the opencode plugin to reach the app (ADR-001). Plain files, atomic writes, one folder per agent session.

**Provisional until the U1 spike:** the `answer_file` content for questions, and the hook entries in C6, assume a hook can return a question's answer. If the spike finds that Claude Code's hooks can only allow or deny a question tool, and cannot answer it:

- the `question` kind stops waiting: the hook writes the event, exits 0 at once, and the agent shows its own picker;
- every question answer goes `via: keys` (C2 "Delivering an answer"), and no question answer file is ever written;
- C3 and C4 do not change, because the dialog and the answer shape stay the same;
- permission prompts (U2) keep `via: hook`, because a permission hook can always allow or deny;
- replies (U3) are unaffected, because they always go `via: typed`.

The same rule holds for opencode, decided by its own spike result.

```yaml
# shared-schema: hook channel, protocol v1
environment:                 # set by PtyManager on the agent child only (C2)
  THADEUS_SESSION_DIR: "absolute path of the session folder (mode 0700, under the app's userData)"
  THADEUS_SESSION_SECRET: "32 random bytes, hex; never written to a committed file"
  THADEUS_WAIT_SECONDS: "how long a question or permission hook may wait before handing back"
folder:
  alive: "file whose mtime the app refreshes every 500 ms; older than 2 s means the app is gone"
  events/: "event files, written by the hook as <name>.tmp then renamed to <name>.evt"
  answers/: "answer files, written by the app as <name>.tmp then renamed to <name>.ans"
event_file:
  name: "<epoch-ms>-<pid>.evt"
  line_1: "THADEUS-EVENT <version> <kind> <secret>"   # e.g. THADEUS-EVENT v1 question 9f…
  rest: "the harness's input exactly as received (Claude Code hook stdin, opencode event JSON)"
  max_bytes: 1048576
  kinds:
    question: "agent's question tool is about to run (U1)"
    answered: "agent's question tool has finished; closes the open question (U1)"
    permission: "agent asks for permission (U2)"
    reply: "agent finished its turn and waits for input (U3)"
answer_file:
  name: "<same name as the event file>.ans"
  content: "the exact text the hook prints on stdout, built by HarnessEventAdapter; empty means hand back"
waiting:
  question: "waits for the answer file"
  permission: "waits for the answer file"
  answered: "never waits: writes the event and exits 0"
  reply: "never waits: writes the event and exits 0 (FR3.3)"
  stops_waiting_when: "answer file arrives; alive older than 2 s; THADEUS_WAIT_SECONDS minus 5 s reached"
  on_stop_without_answer: "print nothing, exit 0, so the agent shows its own prompt (NFR5)"
versions:                    # [Q1]
  current: v1
  accepted_by_app: "its own version and the one before it"
  other_versions: "event ignored; the hook times out to the terminal; the project shows out of date with Update"
refusals:                    # by AgentChannel, nothing is shown
  - "folder unknown or session ended"
  - "secret does not match the folder's secret"
  - "file over max_bytes, still .tmp, or line 1 malformed"
```

- **Kind comes from the hook entry, not from the input:** each hook entry calls the script with its kind as the first argument, so the script never parses JSON (Domain Design review R-01).
- **Closing a question (FR1.5):** the `answered` event is the session's own signal that the question is done, whether it was answered in the dialog or in the terminal after a hand-back. A newer event from the same session, or the tab's exit, also closes it (Domain Design review R-02).
- **Security:** only the user can read the folder; the secret is in the agent's environment, so a command the agent itself runs could forge events for its own session only, never for another tab. That reaches nothing more than the person's own dialog, and every answer still needs a person's click (FR3.4).

## C2 Channel sessions (main, in-process)

```yaml
# shared-schema: AgentChannel interface
openSession:
  called_by: IpcRouter, before an agent pty spawns
  input: { projectId: string, tabId: string, harness: "claude" | "opencode" }
  output: { sessionId: string, env: { THADEUS_SESSION_DIR: string, THADEUS_SESSION_SECRET: string, THADEUS_WAIT_SECONDS: string } }
  note: "the secret leaves AgentChannel only inside env for the child process; it is not kept on AgentSession views or sent to the renderer"
bindPty:
  called_by: IpcRouter, right after the agent pty spawns with the env from openSession
  input: { sessionId: string, ptyId: string }   # ptyId is the id spawnSession returned, used by writeSession(id, data)
  effect: "AgentSession gains ptyId; AgentEventStore looks it up to type an answer into that tab only"
  errors: ["unknown session", "session already bound"]
ptyOf:
  called_by: AgentEventStore
  input: { sessionId: string }
  output: "ptyId | null (null when the session is not bound yet or has ended)"
closeSession:
  called_by: IpcRouter, on pty exit and at app shutdown
  input: { sessionId: string }
  effect: "folder removed; later files for it refused"
onRawEvent:
  subscriber: AgentEventStore
  payload: { sessionId: string, version: string, kind: string, body: Buffer, file: string }
writeAnswer:
  called_by: AgentEventStore
  input: { sessionId: string, file: string, text: string }
  errors: ["session ended", "event file no longer waiting"]
```

Answers that must be typed for a hook event (a reply's text, keys after a hand-back) go through one guarded caller of the existing `writeSession(id, data)` inside AgentEventStore. It takes the session from the event it holds and the pty from `ptyOf(sessionId)`, and refuses when that is null. The renderer's existing `pty:write` stays for what the person types in the terminal (Domain Design review R-03).

**Fallback (audit) events:** an event with `source: "audit"` has `sessionId: null` and is answered exactly as today. AgentDialog hands it to the existing `TerminalContext.answer()` screen-read path, which writes through `pty:write` (FR4.5, unchanged). `agentEvents.answer` refuses an audit event with the error "fallback event: answered in the terminal path". So the new handlers never write for audit events, and the old path never writes for hook events.

### Delivering an answer (both paths)

Every hook-event answer goes one of three ways. The adapter picks the way from the event kind and from what the harness allows:

| `via` | When | What happens |
|---|---|---|
| `hook` | the hook is still waiting and the harness lets a hook return this kind of answer | the adapter builds the hook's stdout; AgentChannel writes it as the answer file (C1) |
| `keys` | the hook cannot return the answer (spike result), or it has already handed back (`timedOut`) | the store waits for the agent's own picker in that pty's output (below), then types the key sequence the adapter computed from the event's own options |
| `typed` | a reply | the store types the text and Enter into the pty, only while the tab still waits for input (FR2.7) |

**Picker readiness for `keys`:** main already receives the pty's output stream. After a hand-back, the store watches that stream for the agent's picker showing the event's first option label, for at most 3 seconds. If the label appears, it types the keys. If it does not, nothing is typed and the answer fails with "the agent's picker is not showing". The dialog keeps the answer and offers Open the terminal (FR3.5, FR3.6).

## C3 AgentEvent (shared schema)

```yaml
# shared-schema: AgentEvent as main holds it and as the renderer receives it (secret never included)
AgentEvent:
  eventId: string              # unique per app run
  sessionId: string | null     # null for fallback (audit) events
  projectId: string
  tabId: string | null
  harness: "claude" | "opencode"
  source: "hook" | "audit"
  kind: "question" | "permission" | "reply"
  state: "queued" | "shown" | "sending" | "sent" | "handedBack" | "timedOut" | "ended"
  arrivedAt: string            # ISO 8601 with offset
  context: { intent: string, stage: string } | null     # FR1.4, from FallbackQuestionSource
  questions:                   # kind question (U1); 1 to 4 items
    - header: string | null
      text: string             # Markdown, up to 64 KB
      truncated: boolean
      options: [ { label: string, description: string | null } ]   # in the agent's order
      multiSelect: boolean
      allowOwn: boolean
  permission:                  # kind permission (U2)
    what: string               # the tool or action, as the agent reported it
    detail: string             # the command or path, as reported
    cwd: string | null
    choices: [ { label: string, refuses: boolean } ]               # in the agent's order
  message:                     # kind reply (U3)
    text: string               # Markdown, up to 64 KB
    truncated: boolean
Answer:                        # what the renderer sends (C4)
  question: { picks: [ [integer] ], own: [ string | null ] }       # one entry per question, option indexes
  permission: { choice: integer }
  reply: { text: string }
```

- **Additive only:** U2 adds `permission`, U3 adds `message`; no field is renamed or removed in this intent. Consumers ignore fields they do not know.
- **Indexes, not labels:** the renderer answers by option index into the options the event carried, so the dialog and the agent can never disagree about labels (FR3.2).

## C4 Renderer bridge

Follows the existing pattern: one named `window.bridge` member per channel, arguments checked by type and id in main, errors thrown as `Error` with a translated message.

```yaml
# IPC contract: window.bridge members (invoke unless marked push)
agentEvents.list:     { in: { projectId: string }, out: "AgentEvent[] in pager order", unit: U1 }
agentEvents.changed:  { push: "agent-events:changed", payload: { projectId: string, events: "AgentEvent[]" }, unit: U1 }
agentEvents.answer:   { in: { eventId: string, answer: Answer }, out: { state: "sending" | "sent", via: "hook" | "keys" | "typed" }, unit: U1,
                        errors: ["unknown event", "event not open", "session ended", "answer does not fit the event",
                                 "fallback event: answered in the terminal path", "the agent's picker is not showing", "send failed: <cause>"] }
agentEvents.close:    { in: { eventId: string }, out: { state: "handedBack" | "dismissed" }, unit: U1 }
agentEvents.latest:   { in: { projectId: string }, out: "{ tabId, harness, text, arrivedAt, status } | null", unit: U3 }
agentHooks.status:    { in: { projectId: string }, out: "[{ harness, files: [{ path, status }], status }]", unit: U4 }
agentHooks.preview:   { in: { projectId: string, harness: string, action: "install" | "update" | "remove" }, out: "{ previewId, files: [{ path, summary, diff }] }", unit: U4 }
agentHooks.apply:     { in: { projectId: string, previewId: string }, out: "{ status }", unit: U4,
                        errors: ["changed since preview", "not valid JSON: <file>", "cannot write: <file>"] }
```

`status` is one of `current`, `outOfDate`, `missing`, `editedByHand`. A refused answer never reaches a pty or a hook (FR3.1).

## C5 Installer status (main, in-process)

```yaml
# shared-schema: HookInstaller interface used by AgentEventStore
isCurrent:
  input: { projectRoot: string, harness: "claude" | "opencode" }
  output: boolean               # true only when every file of that harness is current
  note: "until U4, AgentEventStore uses a development switch with the same signature"
```

## C6 Installed hook entries (external: Claude Code and opencode)

```yaml
# shared-schema: the app's entries in .claude/settings.json (exact hook event names fixed in Functional Design)
hooks:
  <question-hook-event>:          # before the question tool runs (U1)
    - matcher: "<the question tool's name>"
      hooks:
        - type: command
          command: '[ -n "$THADEUS_SESSION_DIR" ] && [ -f "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ] && sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" question; exit 0'
  <question-done-hook-event>:     # after the question tool ran (U1): same command with "answered"
  <permission-hook-event>:        # permission prompt (U2): same command with "permission"
  <stop-hook-event>:              # turn finished (U3): same command with "reply"
recognised_as_the_apps: "the command runs a script in .thadeus/hooks/ (ADR-004)"
committed_files:
  - .thadeus/hooks/dialog.sh       # name final in Functional Design
  - "<opencode plugin folder>/thadeus-dialog.js"   # path fixed in Functional Design
```

- The command exits 0 with no output when the session variable or the script is missing, before the script is looked for (FR4.6).
- The opencode plugin checks `THADEUS_SESSION_DIR` first and does nothing without it (FR4.4).

## Contract ownership rules

- U1 owns C1–C4; U4 owns C5 and C6.
- Later Units only add: a new event kind, new optional fields, new bridge members. Renaming or removing anything is a breaking change and is agreed by changing the owning Unit's Functional Design first.
- Consumers ignore unknown fields and unknown kinds (an unknown kind is ignored, and the hook hands back).
- The channel protocol carries a version (`[Q1]`); a breaking change to C1 bumps it, and the app keeps accepting the previous version for one release.
- Every contract is tested from both sides with recorded payloads (User Stories proof rule).

## Open questions

| Contract | Question | Blocks |
|---|---|---|
| C1, C6 | Exact Claude Code hook event names, the question tool's name and whether a hook output can return the question's answer or only allow/deny it (both outcomes are specified above; the spike picks one) | U1 Functional Design spike |
| C1 | opencode plugin events for question, permission and idle, and how a plugin returns an answer | U1 Functional Design spike |
| C1 | Claude Code's hook time limit, which sets `THADEUS_WAIT_SECONDS` | U1 |
| C2 | Whether 3 seconds of watching the pty output is enough for the picker to appear after a hand-back, on the release Mac | U1 |
| C6 | The opencode plugin folder and the final script name | U4 |
