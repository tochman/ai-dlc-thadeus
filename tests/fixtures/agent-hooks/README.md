# Settings fixtures for the agent hook installer (US-0506 u4, NFR8.8, RD43)

Each fixture is a `.claude/settings.json` that a test copies into a temporary project. `tests/helpers/agentHooksFixtures.js` loads them with `fixture(name)`.

| Fixture | What it holds |
|---|---|
| `empty-object.json` | `{}` |
| `no-hooks.json` | settings without a `hooks` key |
| `hooks-empty.json` | `"hooks": {}` (an RD37 non-round-trip case) |
| `aidlc.json` | not a file here: the helper reads this repository's own `.claude/settings.json` (AI-DLC's hooks, also under `PreToolUse`, `PostToolUse` and `Stop`), so the copy never goes stale |
| `other-pretooluse.json` | a team's own `PreToolUse` group, plus a key after `hooks` |
| `indent-4.json`, `indent-tab.json` | four-space and tab indentation, with someone else's `Stop` and `PostToolUse` hooks |
| `crlf.json` | generated: `other-pretooluse.json` with CRLF line ends |
| `bom.json` | generated: `other-pretooluse.json` with a leading byte order mark |
| `no-final-newline.json` | generated: `no-hooks.json` without its final newline |
| `bad-utf8.json` | generated: `no-hooks.json` with an invalid UTF-8 byte inside a non-app string |
| `unknown-keys.json` | unknown top-level keys, a non-ASCII string and a `Notification` hook |
| `current.json` | the four current app entries |
| `earlier-release.json` | the app entries as the test-only earlier release `testEarlier()` (timeouts 300) gives them |
| `hand-edited.json` | the `question` entry edited by hand (command and timeout) |
| `duplicate-app.json` | two `question` entries (BR7.6) |
| `invalid.json` | not JSON |
| `hooks-array.json` | `hooks` as an array |
| `teammate-other-sh.json` | a teammate's `sh .thadeus/hooks/other.sh question` entry, never the app's |
| `questionx.json` | a `dialog.sh questionx` entry, never the app's |
| `lookalike.json` | teammate commands that only mention `.thadeus/hooks/dialog.sh` (another path, a prefix command, extra arguments); never the app's |
| `empty-containers.json` | a teammate's empty group and empty event array, which every splice keeps |
| `two-hooks-keys.json` | two top-level `hooks` keys (scanner refusal) |
| `escaped-hooks-key.json` | generated: the key `hooks` written with a `\u` escape for its first letter (scanner refusal) |
| `jsonc-comment.json` | a `//` comment (refused as not plain JSON) |
| `large.json` | generated: `aidlc.json` padded with a 1 MB non-app string |

The generated ones hold bytes (CR, BOM, an invalid byte, no final newline) that are kept exact by building them in code.
