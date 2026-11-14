# Requirements: US-0405 — Settings view with native file pickers

**Story:** US-0405 in [`docs/features/epic-04-branding-and-desktop.md`](../../../../../docs/features/epic-04-branding-and-desktop.md) · **Release:** v0.2.3 ([plan](../../../../../docs/releases/0.2.3.md)) · **Depth:** Minimal · **Test strategy:** Minimal

## Intent analysis

The console is meant to stay open all day, often full screen on its own screen. Two things stand in the way of that today. Tool discovery is silent: the app finds `aidlc`, `claude` and the shell through the login shell's `PATH`, and when one is missing there is nowhere in the app to point it at the right binary. And app settings are scattered across small dialogs, which in full screen feel like a different application.

US-0405 gives every app-level setting one home inside the content frame, in the LCARS style, with the operating system's own file dialogs for the three tools and for the default project folder. It is the first story in v0.2.3 because the release's other three stories — project defaults, models per agent, and app updates — all hang off this view.

The story changes nothing about what the app may write. It still writes only its own `settings.json` in userData (`aidlc-dash`); opened projects stay untouched. [desc][scope]

## Sources

| Tag | Source |
|-----|--------|
| `[desc]` | Initial description: the US-0405 request and the story's acceptance criteria in the epic file |
| `[Q1]`–`[Q4]` | Answers in [requirements-analysis-questions.md](requirements-analysis-questions.md) |
| `[scope]` | Workflow-selected scope: ultra-express (plan approval on; reviews, sensors, learnings, summary confirmation and collaborators off) |
| `[memory]` | `aidlc/spaces/default/memory/org.md` and `project.md` |
| `[codekb]` | `aidlc/spaces/default/codekb/aidlc-dash/` — architecture, code structure, business overview |

## Functional requirements

### FR1 — A settings view inside the app

- **FR1.1** The view opens from "Inställningar" in the left arm and from the app menu's "Inställningar…" (`Cmd/Ctrl+,`). It is a view in the content frame in the LCARS style, not a separate window, and it works in full screen. [desc][Q1]
- **FR1.2** It has four sections as labelled blocks: **Verktyg**, **Utseende**, **Projekt** and **Om**. [desc]
- **FR1.3** Keyboard and screen readers: every field has a label, every file button has a name (for example "Välj sökväg till aidlc"), and focus moves into the view when it opens. [desc]

### FR2 — Verktyg: the three tools

- **FR2.1** Three rows: the **AI-DLC CLI** (`aidlc`), the **Claude Code CLI** (`claude`) and the **shell** used by the terminal tabs. Each shows what was found automatically through the login shell's `PATH` and its version (`aidlc --version`, `claude --version`, run with fixed arguments and no shell). For the shell, the resolved `$SHELL` path and the version it reports when it reports a usable one. [desc]
- **FR2.2** "Välj…" opens the native file dialog (`dialog.showOpenDialog`, files only) to point at another binary; "Återställ" goes back to automatic. [desc]
- **FR2.3** A chosen path is checked before it is saved: the file exists, is executable, and `--version` answers. Otherwise it is not saved and a short message says why. [desc]
- **FR2.4** The chosen paths are used everywhere the app starts those tools: AI-DLC setup and harness setup (US-0503, US-0802), the configured-models reader (US-0204) and the terminal tabs (US-0108, US-0801). [desc]
- **FR2.5** A changed path applies to the **next start** of that tool. Running terminal sessions are left alone, and the view says so in one line beside the field. [Q3]

### FR3 — Utseende: the look and the alerts

- **FR3.1** **Animationer** (Full / Dämpad / Av, US-0402), **Helskärm vid start** (US-0404), **Språk** (US-0701), **Frågor från Claude** (Popup och notis / Bara popup / Av, US-0505) and **Ljud vid notis** (På / Av, US-0505) — all five in this section, each with exactly the choices it has today. [Q1][Q2]

### FR4 — Projekt

- **FR4.1** The default folder for "Öppna projekt…", chosen with the native folder dialog. [desc]
- **FR4.2** The list of recently opened projects, where entries can be removed. [desc]
- **FR4.3** A link to each open project's Projektinställningar. The per-project settings themselves (feature docs and the agent-terminal harness choice) stay in that dialog. [Q4]

### FR5 — Om

- **FR5.1** The app version, the AI-DLC version that was found (or "not found" with the reason), the Auctum symbol, and links to the repository and the feature docs. [desc]

### FR6 — One home for each setting

- **FR6.1** `AppSettingsDialog` is removed. Nothing opens it any more, and the five settings it held are the ones FR3.1 shows. [Q1][Q2]
- **FR6.2** Projektinställningar stays as a per-project dialog and is reached from the view (FR4.3). [Q4]
- **FR6.3** Every setting that exists in the app today has exactly one place after this story, and no setting is offered twice. [desc]

### FR7 — Storage and safety

- **FR7.1** Settings are saved in the app's own `settings.json`, validated by `sanitize()` on every read and write; an unknown or invalid value is dropped so the default applies. [desc][scope]
- **FR7.2** Nothing is written into any opened project. [desc][scope]
- **FR7.3** Paths are stored as absolute paths and never passed through a shell. [desc]

## Non-functional requirements

- **NFR1 Accessibility:** text keeps at least 4.5:1 contrast against `--bg` and `--panel`; every field is labelled; file buttons are named; focus enters the view when it opens; the view is fully keyboard operable; no state is shown by colour alone. [desc][memory]
- **NFR2 Localisation:** every visible text comes from `t()` with keys in `src/shared/locales/sv.json` and `en.json`; both files keep the same key set; a missing key falls back to English, then to the key. [desc][memory]
- **NFR3 Layout:** the view holds together from 1100 px to 2560 px; long Swedish and English labels wrap or shrink instead of overflowing their LCARS block. [desc]
- **NFR4 Responsiveness:** a path check answers within the app's fixed 10 s command timeout and never blocks the view; the three tool rows render from the saved settings before any check returns. [desc][codekb]
- **NFR5 Tests:** unit tests cover `sanitize()` for the new settings, the path validation (missing file, not executable, failing `--version`) and the view's fields and buttons; the existing suite stays green. [scope]

## Constraints

- **C1 Electron security is unchanged:** `contextIsolation: true`, `nodeIntegration: false`, sandboxed renderer. New behaviour is reached only through named preload functions; no generic `invoke` or `send`.
- **C2 Fixed external commands:** every tool run keeps fixed arguments, no shell, and the existing timeout; no string built from a setting is ever handed to a shell.
- **C3 One translation module:** `src/shared/i18n.js` with bundled `sv`/`en`, shared by main and the renderer.
- **C4 Targets:** macOS and Linux, the platforms the release pipeline builds (US-0110).
- **C5 No new dependency** for this story: the native dialog, the existing LCARS components and the current settings store are enough.

## Assumptions

- **A1** The shell does not report a usable version on every platform. Where it reports nothing useful, the row shows the resolved path and says the version is unknown, rather than showing an empty or invented value. *Why:* the story asks for a version per tool, and a wrong version is worse than an honest gap.
- **A2** "Helskärm vid start" already lives in `settings.json` from US-0404, so the view edits that key rather than introducing a second one. *Why:* one setting, one home (FR6.3).
- **A3** A tool that is not found shows "hittades inte", what was tried automatically, and the choose/reset actions — never an empty version or a zero. *Why:* the same rule the cost views follow for missing data.

## Out of scope

- **O1** New settings beyond the ones listed: project defaults, plans and per-agent models belong to EPIC-09 (US-0902–US-0904).
- **O2** The "Skip this version" setting for app updates, which arrives with US-0407.
- **O3** Moving per-project settings out of Projektinställningar (Q4: they stay).
- **O4** Any change to what the app may write inside a project.

## Open questions

- **OQ1** Where the view's own entry sits in the left arm once the old Inställningar button no longer opens a dialog — a new labelled block or the existing one — is a design decision for Code Generation.
- **OQ2** Whether the Om section should name the harness of each open project is deferred; the story asks only for the app version, the AI-DLC version and the links.
