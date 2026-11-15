# Accessibility Checklist: agent dialogs (EPIC-05 US-0506)

## Sources

- Requirements: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/requirements-analysis/requirements.md` (NFR6 accessibility, NFR7 localization, NFR3 safety).
- User stories: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/user-stories/stories.md` (AC1.1.11, AC5.1.4).
- Team practices: `aidlc/spaces/default/intents/261114-agent-dialogs/inception/practices-discovery/team-practices.md`.
- Mockups and interaction spec: `mockups.md`, `interaction-spec.md`.

Target: WCAG 2.1 AA for every new screen (M1–M9). Each line is checked by a renderer test where jsdom can check it, and by hand on the release Mac with VoiceOver otherwise.

## Perceivable

- [ ] Kind is named in text in every header ("Question", "Permission", "Message"), never by colour alone (NFR6).
- [ ] Overdue state changes the title text ("still waiting"), not only the colour.
- [ ] Ticked multi-select options show a filled checkbox square and "selected" in the accessible name.
- [ ] Diff lines carry `+` / `-` signs as well as background colour.
- [ ] Failure lines carry an "!" mark and a sentence, not only coral text.
- [ ] Header text contrast: black on `--steel`, `--amber` and `--alert`; `--steel-light` on `--steel-deep`; each at least 4.5:1 (checked with the token values in `theme.css`).
- [ ] Option descriptions (`--text-2` on the dialog background) at least 4.5:1.
- [ ] Rendered Markdown keeps heading levels inside the dialog body below the dialog title (h3 and lower).

## Operable

- [ ] Every action works by keyboard: number keys pick, Space ticks, Enter sends, Esc closes and hands back, Tab cycles inside the dialog (NFR6).
- [ ] Focus moves into the dialog on open (first choice, or the answer field for a message) and returns to where it was on close.
- [ ] Focus stays inside the modal while it is open; the pager and footer buttons are reachable by Tab.
- [ ] In a batch, focus moves to the next unanswered question after one collapses; Change is reachable by Tab.
- [ ] Visible 2 px amber focus outline on every option, button, field and strip button.
- [ ] Permission prompts have no preselected choice; Enter does nothing until a choice has focus (FR3.4).
- [ ] The 20-second escalation does not take any action; nothing is answered on a timeout.
- [ ] The overdue pulse and batch collapse follow `data-motion` (reduced: no pulse, static glow; off: no motion).
- [ ] Links in rendered text open only on click or Enter, and only `http`/`https` (NFR3).

## Understandable

- [ ] Every app text is in `sv.json` and `en.json` through `t()` (NFR7); `tests/main/i18nKeys.test.js` passes.
- [ ] The agent's own text is shown as sent; `lang` of that block is not forced to the app language.
- [ ] Hand-back, time-out, failure and session-ended lines each say what happened and what to do next in one sentence.
- [ ] The own-answer field has a visible label, using the agent's own word for it.
- [ ] Install preview says before Install that the files are committed and shared with the team (FR4.2).

## Robust

- [ ] AgentDialog is a native `<dialog>` with `aria-labelledby` and `aria-describedby`.
- [ ] Single-select options form a `radiogroup` (or buttons with `aria-describedby`); multi-select uses native checkboxes.
- [ ] Status lines use `role="status"`; the "+1 new" and "<n> of <total> answered" counters are polite live regions.
- [ ] No HTML from the agent is rendered; script, style and event-handler content never runs (FR2.2, NFR3).
- [ ] Every new element has a `data-testid` of the form `<component>-<role>`.
