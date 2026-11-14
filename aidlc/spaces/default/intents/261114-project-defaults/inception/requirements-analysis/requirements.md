# Requirements: US-0902 — Change project defaults and the active work's settings

**Story:** US-0902 in [`docs/features/epic-09-aidlc-configuration.md`](../../../../../docs/features/epic-09-aidlc-configuration.md) · **Release:** v0.2.3 ([plan](../releases/0.2.3.md)) · **Depth:** Minimal · **Test strategy:** Minimal · **Scope:** ultra-express

**Intent analysis**

The console runs AI-DLC intents with different depths and guard policies. A developer who wants AI-DLC lighter or stricter needs to be able to change the project defaults and the current work's settings from the configuration view. This story makes those settings editable, with preview-then-apply, guard switches, and tiered access.

The story changes nothing about what the app may write. It still writes only its own `settings.json` in userData (`aidlc-dash`); opened projects stay untouched. [desc][scope]

**Sources**

| Tag | Source |
|-----|--------|
| `[desc]` | Initial description: the US-0902 request and the story's acceptance criteria in the epic file |
| `[scope]` | Workflow-selected scope: ultra-express (plan approval on; reviews, sensors, learnings, summary confirmation and collaborators off) |
| `[memory]` | `aidlc/spaces/default/memory/org.md` and `project.md` |

**Functional requirements**

### FR1 — Project defaults

- **FR1.1** The configuration view shows project-level defaults: default plan (`--default-scope`), parallel Units (`--swarm`), provider and region (`aidlc config providers`) and plugins (`aidlc config project --plugins`). [desc]
- **FR1.2** Where each setting applies (this project, only me, this machine) is chosen explicitly with a trio of radio buttons or a segmented control. [desc]
- **FR1.3** Changes to project defaults show a preview command (`--dry-run`) and its result before apply, and the command runs with fixed arguments, no shell. [desc]

### FR2 — The active work's settings

- **FR2.1** The configuration view shows the active work's settings: depth, test strategy, reviews, Guard Policy, sensors, learnings, summary confirmation and collaborators. [desc]
- **FR2.2** Each setting is shown with its current value and an explanation of what it controls. [desc]
- **FR2.3** Turning a guard switch off needs a confirmation dialog that names it; turning it back on needs none. [desc]
- **FR2.4** The Guard Policy lock (`strict` in `aidlc/spaces/<space>/memory/*.md`) has no CLI command. The app edits only that section, after showing the diff, and never touches the rest of the memory file. [desc]

### FR3 — Preview, then apply (tier 1)

- **FR3.1** Every change shows the exact command, and its `--dry-run` result where AI-DLC has one. [desc]
- **FR3.2** **Apply** runs the command from the app (fixed arguments, no shell) and shows its result or its error. [desc]
- **FR3.3** The view reloads after the change. [desc]
- **FR3.4** Changes to the active work's settings are blocked while the agent tab is "Arbetar". [desc]

### FR4 — Guard Policy lock (tier 2)

- **FR4.1** The strict lock in `aidlc/spaces/<space>/memory/*.md` has no CLI command. The app edits only that section, after showing the diff, and never touches the rest of the memory file. [desc]

**Non-functional requirements**

- **NFR1 Accessibility:** text keeps at least 4.5:1 contrast against `--bg` and `--panel`; every field is labelled; file buttons have names; focus enters the view when it opens; the view is fully keyboard operable; no state is shown by colour alone. [desc][memory]
- **NFR2 Localisation:** every visible text comes from `t()` with keys in `src/shared/locales/sv.json` and `en.json`; both files keep the same key set; a missing key falls back to English, then to the key. [desc][memory]
- **NFR3 Layout:** the configuration view holds together from 1100 px to 2560 px; long Swedish and English labels wrap or shrink instead of overflowing their LCARS block. [desc]
- **NFR4 Responsiveness:** command responses answer within the app's fixed timeout and never block the view. [desc][codekb]
- **NFR5 Tests:** unit tests cover the new settings, the guard switches and the preview-then-apply flow; the existing suite stays green. [scope]

**Constraints**

- **C1 Electron security is unchanged:** `contextIsolation: true`, `nodeIntegration: false`, sandboxed renderer. New behaviour is reached only through named preload functions; no generic `invoke` or `send`.
- **C2 Fixed external commands:** every tool run keeps fixed arguments, no shell, and the existing timeout; no string built from a setting is ever handed to a shell.
- **C3 One translation module:** `src/shared/i18n.js` with bundled `sv`/`en`, shared by main and the renderer.
- **C4 Targets:** macOS and Linux, the platforms the release pipeline builds.
- **C5 No new dependency** for this story: the existing settings store, the existing guard policy file format and the existing `/aidlc engine config` commands are enough.

**Assumptions**

- **A1** The guard policy file format is stable and parsable by the app. *Why:* the app already reads it for the current guard policy.
- **A2** "Arbetar" state is already tracked by the agent tab and `aidlc-state.md`. *Why:* one setting, one home (FR6.3).
- **A3** The `/aidlc engine config set` command can set any of the settings listed in FR1 and FR2. *Why:* the app will delegate to that command.

**Out of scope**

- **O1** Moving per-project settings out of the configuration view (they stay).
- **O2** Changing the guard policy file format or adding new guard switches.
- **O3** Any change to what the app may write inside a project.
- **O4** New settings beyond those listed: plans and per-agent models belong to later stories.

**Open questions**

- **OQ1** Whether the guard policy diff view uses a three-way comparison or a simple before/after is a design decision for Code Generation.
- **OQ2** Whether the "Arbetar" block should be shown while the agent tab is busy is deferred; the story asks only for the blocking behaviour.

## Acceptance criteria (from epic file, to be ticked in Code Generation / Deployment Execution)

- [ ] **Project defaults:** default plan, parallel Units, provider, region, plugins, and apply‑scope radio trio are shown and editable.
- [ ] **Active work's settings:** depth, test strategy, reviews, Guard Policy, sensors, learnings, summary confirmation and collaborators are shown, editable and saved.
- [ ] **Guard switches:** turning one off needs a confirmation that names it; turning it back on needs none.
- [ ] **Guard Policy lock:** the strict lock section is edited only after showing the diff, never touching the rest of the memory file.
- [ ] **Preview, then apply:** every change shows the exact `--dry-run` command and its result before apply; apply runs the command from the app with fixed arguments, no shell; the view reloads after the change.
- [ ] **Guard Policy lock (tier 2):** the app edits only the strict lock section after showing the diff.
- [ ] **Checks the person can turn off:** the guard switches shown with what each one protects. Turning one off needs a confirmation that names it. Turning it back on needs none.
- [ ] **Preview, then apply (tier 1):** every change shows the exact command, and its `--dry-run` result where AI-DLC has one. Apply runs the command and shows its result or its error. The view reloads after the change. Changes to the active work's settings are blocked while the agent tab is "Arbetar".