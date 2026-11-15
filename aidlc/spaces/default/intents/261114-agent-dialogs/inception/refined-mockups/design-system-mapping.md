# Design System Mapping: agent dialogs (EPIC-05 US-0506)

## Sources

- The app's LCARS tokens and rules: `src/renderer/theme.css` (`:root` tokens, `.question-popup*`, `.settings-dialog`, `.btn*`, `lcars-alert` animation, `data-motion` rules).
- Mockups and interaction spec: `mockups.md`, `interaction-spec.md`.
- Stories and requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md`, `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md`.
- Team practices: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/practices-discovery/team-practices.md` (texts through `t()`, `data-testid` kebab-case).

No new design system is introduced. Everything reuses the existing LCARS tokens and the US-0505 dialog frame; only a few new rules and one new token pairing are added.

## Tokens

| Use | Token | Existing? |
|---|---|---|
| Question header bar, calm | `--steel` bar, `--on-light` text | yes (US-0505) |
| Permission header bar | `--amber` bar, `--on-light` text | token yes, use new |
| Message header bar | `--steel-deep` bar, `--steel-light` text | tokens yes, use new |
| Overdue (all kinds) | `--alert`, `--coral` edges, `lcars-alert` pulse | yes (US-0505) |
| Where line | `--steel-meta`, upper case, 14 px | yes |
| Option label / description | `--font-read` 16 px `--text` / 14 px `--text-2` | yes |
| Number key | `--font-head` 18 px `--steel-text` | yes |
| Deny separator | 1 px `--slate-2` rule, 4 px `--coral` left edge | tokens yes, use new |
| Command / code block | `--font-mono` 14 px on `--slate-1`, 1 px `--slate-3` | yes (ArtifactReader code style) |
| Status, failure | `--coral-soft` text with "!" | yes |
| Focus | 2 px `--amber` outline, 2 px offset | yes |
| Diff added / removed | `--steel-deep` / `--coral-a45` backgrounds, with `+` / `-` signs | tokens yes, use new |
| Muted empty text | `--muted` | yes |

## Components

| Mockup element | Existing building block | Change |
|---|---|---|
| AgentDialog frame | `.settings-dialog.question-popup` `<dialog>` | Kind modifier classes `is-question`, `is-permission`, `is-message`; body scroll area |
| Header bar | `.question-popup-head` | Kind pill (dark rounded label) before the title |
| Option button | `.question-popup-choice` + `.question-popup-key` | Description line beneath the label; checkbox square for multi-select |
| Own answer | `.question-popup-own` | Placeholder from the agent's own word; multi-line for replies |
| Pager and actions | `.question-popup-foot`, `.btn`, `.btn-quiet`, `.btn-accent` | "+1 new" badge |
| Markdown text | `FileContent` in `ArtifactReader.jsx` (`skipHtml`, http(s) links only) | Reused for question text and messages, links open only on click |
| Batch rows | new `.agent-batch-row` | Collapsed one-liner with Change |
| Latest-message strip | new `.agent-latest`, styled like `.lcars-readout` rows | New |
| Fallback notice | new `.agent-fallback`, LCARS strip with "!" | New |
| Install preview | `.settings-dialog` + new `.agent-diff` | New diff block |
| Settings row | Settings > Appearance radio rows (as `questionAlerts`) | New row |

## Motion

The calm-to-red transition and the overdue pulse keep US-0505's rules, including `data-motion='reduced'` (static glow) and `off`. The batch collapse uses a 150 ms height transition, none under `data-motion` reduced or off.

## Texts

Every app text goes through `t()` under `app.question.*` (dialog) and new `app.agentDialogs.*` (strip, notice, install), in `sv.json` and `en.json` with the same keys (NFR7). The agent's own text (question, options, descriptions, message, command) is shown as sent and is never translated.

## Test ids

`agent-dialog`, `agent-dialog-title`, `agent-dialog-choice`, `agent-dialog-own`, `agent-dialog-send`, `agent-dialog-status`, `agent-dialog-batch-row`, `agent-latest`, `agent-latest-answer`, `agent-fallback`, `agent-install-preview`, `agent-install-confirm`. The existing `question-popup-*` ids are kept on the same elements while the fallback path still uses them, so current tests keep passing.
