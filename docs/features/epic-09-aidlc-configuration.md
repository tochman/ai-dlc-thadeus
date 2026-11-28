# EPIC-09: AI-DLC Configuration from the console

> Epic file — for an overview of all epics see [FEATURES.md](../FEATURES.md).

---

> Today the console can show AI-DLC's records and start work, but changing how AI-DLC runs means remembering `aidlc config` commands, `/aidlc` flags and where each setting lives. This epic gives each project an AI-DLC configuration view: see the current settings, change project defaults, create and reuse custom plans (AI-DLC calls them scopes), and choose the model and effort per agent. What can be changed depends on the harness (Claude Code, opencode, Codex, Kiro, Cursor, Copilot), so the view only offers what the project's harness supports.
>
> **How the app makes changes (decided 2026-11-13, replacing the earlier "the app writes no AI-DLC files" rule for configuration):**
>
> 1. **The app runs the official CLI itself.** This is the default. It runs `aidlc config …` and `aidlc engine config set …` directly, with fixed arguments and no shell. Each change shows a `--dry-run` preview where AI-DLC has one, then an in-app **Apply**, then a reload. AI-DLC does the writing, so its validation, audit and plan compile stay in place.
> 2. **The app edits files directly only where there is no CLI command, and only in files meant for people:**
>    - the descriptive text of a saved plan, `aidlc/scopes/<name>.md` above its END marker;
>    - the Guard Policy section of the memory files;
>    - deleting a saved plan, which removes the record and its harness copy.
>
>    Each such edit shows a diff before saving and is followed by `aidlc engine graph compile` where AI-DLC needs it. The files are in git, so every change can be undone.
> 3. **The app never edits:**
>    - workflow state (`aidlc-state.md`), the audit shards and `intents.json`;
>    - the agent files (`.claude/agents/*`, `.opencode`/`.aidlc` agents). `config models` regenerates them, and `config models --check` flags hand edits;
>    - a plan's stage grid. Composing is the only safe way to change it, so the app sends that request to the agent.
>
> **Two safeguards apply to every change:**
> - A change to committed, project-wide settings (`--project`, `aidlc/scopes/`) says "this changes the project's committed settings" next to **Apply**.
> - Changes to the active work's settings are blocked while the agent tab is busy ("Arbetar").

**Stories:** US-0901–US-0907

**Status (2026-11-28):** ✅ US-0901–US-0904 released (v0.2.2–v0.2.4). ✅ US-0905 released in v0.2.14. 🚧 US-0906 in progress, for v0.3.4. 📋 US-0907 planned, for v0.3.5. Each story names its release.

---

## What AI-DLC lets you configure, by harness

Researched 2026-11-13 from the installed `aidlc` CLI (`--help`, `--show --json`) and [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) (`docs/guide/05-scopes-and-depth.md`, `12-cli-commands.md`, `13-customization.md`, `harnesses/*.md`).

| Area | Command | Applies to | Preview |
|------|---------|------------|---------|
| Model and effort per agent, presets | `aidlc config models --agent <name> --model <id> --effort <level>` or `--preset thorough\|balanced\|minimal`, plus `--project`, `--local` or `--global` and `--yes` | Project (committed), only me (local) or this machine | `--dry-run`, `--check` |
| Provider and region | `aidlc config providers --provider current\|amazon-bedrock\|other [--region] [--profile]` | Project | `--dry-run` |
| Project defaults | `aidlc config flags --default-scope <scope>`, `--swarm on\|off` and similar | Project, local or machine | `--dry-run` |
| Turning a check off or on | `aidlc config flags --bypass <switch>` / `--clear-bypass <switch>` | Local or machine | `--dry-run` |
| Settings for one piece of work | `aidlc engine config set <key> <value>`, for depth, test strategy, review, guard policy, sensors, learnings, summary confirmation, plan approval and collaborators | One intent | none; read with `config get`/`list` |
| Saving a plan | `aidlc engine scope save --name <name> [--keywords …]`, or "Approve and save as scope" when composing | Writes `aidlc/scopes/<name>.md` | none |
| Composing a plan | `/aidlc compose "<task>"` in the agent tab, with an approve/edit/reject gate | One intent, optionally saved | the gate is the preview |
| Plugins and MCP | `aidlc config project --plugins … --mcp …` | Project | `--dry-run` |
| Status line | `aidlc config --statusline on\|off` | Claude: local file. Codex: shared `.codex/config.toml` | none |

**Read-only sources for showing the current state:**
- **JSON from the CLI:** `aidlc config --show --json` (every section at once), `aidlc config models --show --json [--harness h]`, `aidlc config flags --show --json`, `aidlc config list --json` (the active intent's settings, each with its source) and `engine orchestrate space|plugin|intent list --json`.
- **No scope list in JSON:** saved scopes are read from the frontmatter of `.claude/scopes/*.md` and `aidlc/scopes/*.md`.

**Differences between harnesses:**

| Harness | Model and effort per agent | Notes |
|---------|----------------------------|-------|
| Claude Code | Yes | Status line supported. Reviewers default to `sonnet` with medium effort |
| Kiro IDE / Kiro CLI v3 | Yes, with Kiro's own model ids | No status line. Presets have no effect |
| Kiro CLI V2 | No, one session model and effort (`--session-model`) | Presets map to session effort |
| Codex CLI, opencode | Unconfirmed: the docs disagree | Model and provider come from the tool's own global config (`~/.codex/config.toml`, opencode's global config) |
| Cursor, GitHub Copilot | No, the session or IDE picker decides | Copilot's provider is set through `COPILOT_PROVIDER_*` environment variables |

Flags, guards, scopes and spaces work the same on every harness. `--harness <h>` is refused for a harness the project does not have installed.

**Only possible by editing files**, with no CLI command:
- editing or deleting a saved scope;
- the Guard Policy strict lock and the other memory rules;
- the harness's own provider and model config.

Tier 2 above covers the first two. The harness's own provider and model config stays outside the app; the view shows it read-only.

### Model rules per harness (US-0904)

Each harness gets one table of rules. One view renders whichever table the project's harness uses, and the command is the same for both: `aidlc config models … --harness claude|opencode`. Claude Code and opencode come first. Codex and Kiro are added later as new tables.

| Rule | Claude Code | opencode |
|------|-------------|----------|
| Models to choose from | Claude models only: aliases (`opus`, `sonnet`, `haiku`) or full ids (`claude-opus-5-5` …) | Any provider opencode is configured for |
| Model id format | Claude id or alias | opencode's `provider/model` form, for example `anthropic/claude-sonnet-…` *(opencode's convention, to verify against `aidlc`)* |
| Where the list comes from | A known list, plus whatever `aidlc` accepts as "enabled on your install" | opencode itself, probably `opencode models` *(to verify)* |
| Default when unset | `inherit` the session model; balanced reviewers run Sonnet at medium effort | Inherit the session model from the global opencode config; reviewers use opencode's medium reasoning setting |
| Effort | `low` … `max`, applied as chosen | `xhigh` runs as `high` (AI-DLC customization guide). How `max` is handled is undocumented *(to verify)*. The view shows the level that actually applies |
| Session model and provider | Claude Code's own setup | opencode's global config, shown read-only |

**To confirm before building,** on a machine that has the opencode harness installed:
- what `opencode models` outputs;
- what `aidlc config models --show --json --harness opencode` reports.

The CLI refuses a harness that the project hasn't installed.

---

## User Stories

**US-0901: See a project's AI-DLC configuration** ✅ Released in v0.2.2
- As a **developer running AI-DLC in several projects**, in order to **know how AI-DLC is set up here before I start work**, I would like to **one view that shows the project's AI-DLC settings and where each value comes from**.
- **Epic:** EPIC-09
- **Priority:** High
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] **A "Konfiguration / Configuration" view** for the active project opens from the left arm and from the settings view (US-0405). It has sections for models and effort, project defaults, the active work's settings, plans (scopes), provider, and plugins.
  - [x] **Values come from the read-only CLI:**
    - `aidlc config <models|flags|providers|project> --show --json --harness <h>` and `aidlc config list --json`, run in parallel with fixed arguments and no shell (changed 2026-11-14: `config --show --json` refuses `--harness` and fails without it in a project with several harnesses).
    - Each value shows its source as AI-DLC reports it (project, local, machine, environment, scope default, "set by you").
    - An environment variable that overrides a value is marked as such.
  - [x] **The view follows the project's harness (US-0801):** it passes `--harness <h>` only for harnesses the project has installed, and greys out areas the harness does not support (for example per-agent models on Cursor and Copilot), with a one-line reason. With several harnesses installed, a picker switches the view (not the agent tab) between them.
  - [x] **When AI-DLC is missing or the CLI fails,** the view says so in one sentence and offers setup (US-0503 / US-0802). It never shows stale values as current. A failure in one section shows in that section only.
  - [x] The view reloads when the project's `aidlc.settings*.json`, `.claude/scopes/`, `aidlc/scopes/` or the active intent's state changes (watcher, US-0302).
- **Notes:** Shows every project-default switch, with its source. Plans list both the shipped plans and the project's own, the project's own are marked, and the active intent's plan is highlighted. The provider field names are assumed, because no provider record existed when this was built.
- **Dependencies:** US-0801, US-0405

**US-0902: Change project defaults and the active work's settings** ✅ Released in v0.2.3 (intent `261114-intent-0-2-3-release`)
- As a **developer who wants AI-DLC lighter or stricter**, in order to **change how it runs without looking up flags**, I would like to **change the project defaults and the current work's settings from the configuration view**.
- **Epic:** EPIC-09
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] **Project defaults:**
    - default plan (`--default-scope`), parallel Units (`--swarm`), provider and region (`aidlc config providers`) and plugins (`aidlc config project --plugins`).
    - Where each setting applies (this project, only me, this machine) is chosen explicitly.
  - [x] **The active work's settings:** depth, test strategy, reviews, Guard Policy, sensors, learnings, summary confirmation, plan approval and collaborators, through `aidlc engine config set <key> <value>`, for the active intent only.
  - [x] **Checks the person can turn off** (the guard switches) are shown with what each one protects. Turning one off needs a confirmation that names it. Turning it back on needs none.
  - [x] **Preview, then apply (tier 1):**
    - Every change shows the exact command, and its `--dry-run` result where AI-DLC has one.
    - **Apply** runs the command from the app (fixed arguments, no shell) and shows its result or its error.
    - The view reloads after the change.
    - Changes to the active work's settings are blocked while the agent tab is "Arbetar".
  - [x] **The Guard Policy lock (tier 2):** the strict lock in `aidlc/spaces/<space>/memory/*.md` has no CLI command. The app edits only that section, after showing the diff, and never touches the rest of the memory file.
- **Dependencies:** US-0901

**US-0903: Create and reuse custom plans** ✅ Released in v0.2.4 (intent `261114-custom-plans`)
- As a **developer who keeps running the same kind of work**, in order to **start it with the right steps every time**, I would like to **see the saved plans, compose a new one for a task, and save the plan of a running piece of work**.
- **Epic:** EPIC-09
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] **A list of plans:**
    - The stock scopes and the project's saved ones (from `.claude/scopes/*.md` and `aidlc/scopes/*.md` frontmatter), each with its name, description, depth, stage count and default settings (reviews, sensors, plan approval, and so on).
    - Opening one shows which stages it runs and which it skips.
  - [x] **Compose a plan:** "Ny plan / New plan" asks what the work is for and types `/aidlc compose "<task>"` into the agent tab. The approve, edit and reject choices happen there, in AI-DLC's own gate.
  - [x] **Save the running plan:** for an intent on a custom plan, "Spara plan / Save plan" asks for a name (lowercase words joined by hyphens, checked before running) and runs `aidlc engine scope save --name <name>` from the app (tier 1).
  - [x] **Start work on a saved plan:** "Starta med plan / Start with plan" types `/aidlc --scope <name> "<what to build>"` into the agent tab. This is an agent request, not a setting.
  - [x] **Edit a saved plan's description, depth or keywords (tier 2):**
    - The app edits the text above the END marker in `aidlc/scopes/<name>.md` after showing the diff.
    - It then removes the stale harness copy where AI-DLC requires that, and runs `aidlc engine graph compile`.
    - Stock scopes are read-only.
  - [x] **Delete a saved plan (tier 2):** after a confirmation that names the plan, the app removes both `aidlc/scopes/<name>.md` and its harness copy, then recompiles. A plan that a running intent uses can't be deleted.
  - [x] **Change which stages a plan runs:** not edited by the app (tier 3). "Ändra steg / Change steps" types an `/aidlc compose` request into the agent tab.
  - [x] A custom plan's own name is shown wherever an intent's plan is shown (built in US-0701).
- **Notes:** Built in its own Plans view, reached from the left arm. A stock plan's stages come from the harness's compiled `tools/data/scope-grid.json`, since its scope file carries no grid block. An edit or a delete removes the copy `<harness>/scopes/aidlc-<name>.md` in every harness folder that has one. Not yet seen on screen: the person should look at the view once before the release.
- **Dependencies:** US-0901, US-0801

**US-0904: Choose models and effort per agent** ✅ Released in v0.2.3 (intent `261114-intent-0-2-3-release`; moved from US-0206)
- As a **developer tuning how AI-DLC spends tokens**, in order to **choose which model and effort each agent uses without remembering `aidlc config` commands**, I would like to **see and change model and effort per agent, with the estimated cost of the choice beside it**.
- **Epic:** EPIC-09
- **Priority:** Medium
- **Complexity:** Medium
- **Acceptance Criteria:**
  - [x] **Every agent is listed** with:
    - its configured model and effort, and where each comes from (`aidlc config models --show --json --harness <h>`);
    - the model it actually ran on, from the ledger (US-0204);
    - its share of the cost.
  - [x] **Choosing a model and effort:**
    - Models come from the lists the installed `aidlc` supports for the harness (Claude ids, Kiro's own ids, `inherit` for the session model).
    - Effort ranges from `low` to `max`, and `default` removes a setting.
    - The presets `thorough`, `balanced` and `minimal` apply to all agents at once. So do the group efforts for deciding, reviewing and writing-up agents.
  - [x] **Per harness, from the rule tables above,** starting with Claude Code and opencode:
    - **Claude Code:** Claude aliases and ids.
    - **opencode:** `provider/model` ids from opencode's own model list, with `xhigh` shown as running at `high`.
    - **Harnesses without a table yet:** Codex, Kiro and others show the section read-only.
    - **Cursor and Copilot:** the section explains that the IDE's picker decides.
    - The list never offers a choice the harness ignores.
  - [x] **Before applying:**
    - The exact command is shown, together with its `--dry-run` result.
    - An estimate shows how the cost would change, based on this project's ledger and API prices, labelled as an estimate.
  - [x] **Applying:**
    - Where the change applies is chosen explicitly: this project (`--project`) or only me (`--local`).
    - **Apply** runs the command from the app (tier 1). AI-DLC then regenerates the agent files itself; the app never edits them.
    - The view reloads after the change.
  - [x] Agents whose run differs from their configuration (US-0204) are marked, with a suggestion to align them. `aidlc config models --check` flags agent files that were edited by hand.
- **Dependencies:** US-0901, US-0204, US-0801

**US-0905: Plans live under Configuration, beside the AI-DLC settings** ✅ Released in v0.2.14
- As a **developer setting up how AI-DLC works in a project**, in order to **find the plans where the rest of the AI-DLC setup is**, I would like **Plans to be part of Configuration, in its AI-DLC part, instead of its own block in the left arm**.
- **Epic:** EPIC-09
- **Priority:** Medium
- **Complexity:** Small
- **Background:** Asked for 2026-11-20 with a screenshot of the left arm: Configuration has the sub-blocks Feature docs, Agent, AI-DLC, Cost rules and Model profiles, and Plans stands on its own right below it, though plans are AI-DLC configuration (US-0903).
- **Acceptance Criteria:**
  - [x] **Given** an AI-DLC project, **then** Plans no longer has its own block in the left arm; it is a sub-view of Configuration › AI-DLC (a switch inside the AI-DLC section: Settings | Plans), not a sibling sub-block (decided 2026-11-22), in the LCARS style of the app's in-view tabs.
  - [x] Everything the Plans view does today (list, open, compose, save, start with, edit, delete) works the same from its new place.
  - [x] **Given** the app was showing Plans when it closed, or a link or menu item opens Plans, **then** it opens at the new place.
  - [x] **Given** a Spec Kit project or one with no framework, **then** Plans is not shown, as today (the shared view list, US-1401).
  - [x] Every text goes through `t()` in `sv.json` and `en.json`; the sub-block carries a `data-testid`.
- **Notes:** Moves the view only; nothing about plans changes. Added to v0.2.14 on 2026-11-22, ahead of US-1401 (v0.3.0): on `main` the move is made where the left arm is built today, and the Spec Kit criterion holds trivially until US-1401 lands; US-1401's shared view list (`src/shared/frameworkViews.js`, on the Spec Kit branches) must then carry Plans under Configuration.
- **Dependencies:** US-0903

**US-0906: Visual plan designer: drag and drop custom plans for AI-DLC and Spec Kit** 🚧 In progress, for v0.3.4
- As a **developer**, in order to **shape how the agents work on my project without writing plan files by hand**, I would like **to design custom plans on a canvas, by dragging, toggling and configuring steps, and save them to the project**.
- **Epic:** EPIC-09
- **Priority:** High
- **Complexity:** Large
- **Source:** GitHub issue [#96](https://github.com/tochman/ai-dlc-thadeus/issues/96)
- **Background:** Builds on the text based Plans view (US-0903). One canvas in the shared shell, one small adapter per framework, so the EPIC-14 rule holds: one value decides the view set, no general plugin system. The designer edits only what the project's framework can run; it is not a free workflow builder.
- **Acceptance Criteria:**
  - [ ] **Given** an AI-DLC project, **when** I open a plan in the designer, **then** its stages show as nodes in pipeline order, skipped stages visibly off, with the plan's defaults in a side panel.
  - [ ] **When** I drag in, remove, toggle or configure a stage, **then** the change is checked against what the framework allows, and a step that is not allowed is refused with the reason.
  - [ ] **When** I save, **then** I see a preview and nothing is written before I click Apply. AI-DLC plans are saved through the `aidlc` CLI (`aidlc engine scope save`).
  - [ ] **Given** a Spec Kit project, **then** the core flow is a locked spine, and I can place, remove and set extensions and hooks around it, saved to `.specify/extensions.yml` after a preview.
  - [ ] **Given** a plan file changed outside the app, **then** the canvas reloads it and never overwrites it silently.
  - [ ] Keyboard and screen reader access, reduced motion respected, every text through `t()` in Swedish and English, in the LCARS look.
- **Notes:** The issue suggests React Flow (xyflow, MIT); the dependency is chosen at the build. The AI-DLC adapter comes first.
- **Dependencies:** US-0903, US-0905, US-1401, US-1403

**US-0907: Compose a plan from a sentence in the designer, and change a running plan directly** 📋 Planned, for v0.3.5
- As a **developer**, in order to **get a plan from a sentence and then adjust it by hand**, I would like **a command bar in the plan designer that asks AI-DLC's composer for a plan and shows the proposal arriving on the canvas**.
- **Epic:** EPIC-09
- **Priority:** Medium
- **Complexity:** Medium
- **Source:** GitHub issue [#105](https://github.com/tochman/ai-dlc-thadeus/issues/105)
- **Background:** AI-DLC already has `/aidlc compose "<request>"`, and `--skip` / `--add` to change a running plan. Changing a running intent's plan from its detail is US-0509; this story adds the designer's way to do it.
- **Acceptance Criteria:**
  - [ ] **When** I type a request in the command bar (also `Cmd/Ctrl+K`) and press Compose, **then** the agent tab holds `<command> compose "<request>"`, safely quoted and not submitted.
  - [ ] **Given** the composer writes an approved plan, **then** the designer shows it arriving, and a Before / After toggle marks added, removed and changed stages against the previous plan.
  - [ ] **Given** the active intent is in flight, **when** I toggle two stages off, **then** the agent tab holds `<command> --skip a,b`, and the stages show dashed until a `RECOMPOSED` event confirms it.
  - [ ] **Given** reduced or no motion, **then** the plan appears without animation, and the Before / After marking still shows.
  - [ ] The command bar writes no plan file itself; every change goes through AI-DLC. Every text through `t()` in Swedish and English, in the LCARS look.
- **Dependencies:** US-0906, US-0509
