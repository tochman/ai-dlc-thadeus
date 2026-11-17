# Requirements: US-0210 model profile switch

## Intent analysis

The person pays for every agent run. They want the expensive model only where a mistake costs more than tokens. When an intent starts on a plan they marked as critical, the app offers to switch AI-DLC to a stronger profile. When the last critical intent ends, the app switches back to a cheaper profile. Source: US-0210 in `docs/features/epic-02-cost-and-models.md` [desc], answers Q1–Q4.

A profile in the app has two parts (Q1 C, Q4 B):
- the name of an AI-DLC saved profile, which sets the effort per group (`--from <name>`);
- one model per agent, set in the app, because AI-DLC saved profiles hold no models and there is no per-group model flag.

## Functional requirements

**FR1 Settings** (Project Settings, in the Configuration view, LCARS)
- FR1.1 The person picks which plans (scopes) count as critical, from the project's plan list.
- FR1.2 The person defines two profiles, "critical" and "economy". Each has an optional AI-DLC saved-profile name, picked from the profiles that `config models --show --json` reports. When none is reported, the app says how to save one with `--save-as`.
- FR1.3 Each profile has an optional model per agent, picked from the harness's model table. An agent left empty is not changed by a switch.
- FR1.4 A switch "Ask before switching back" (default off).
- FR1.5 The settings are saved per project and come back after a restart.

**FR2 Switch to critical**
- FR2.1 When an intent appears whose plan (`plan ?? scope`) is critical, and the critical profile is not active, the app asks once in an LCARS dialog: "Switch to the critical profile?"
- FR2.2 Yes runs `aidlc config models --from <profile> --project --harness <harness> --yes` (left out when the profile names no AI-DLC profile). Then it runs `aidlc config models --agent <a> --model <m> --project --harness <harness> --yes` for each agent that has a model.
- FR2.3 No changes nothing, and that intent gets no second question.
- FR2.4 Intents that are already open when the project is opened get no question.
- FR2.5 An intent on a plan that is not critical gets no question.

**FR3 Switch back to economy**
- FR3.1 The app remembers which open critical intents it switched for. When the last of them is completed or archived, the app switches to the economy profile in the same way as FR2.2. If FR1.4 is on, it asks first (Q2 A: critical wins until the last critical intent ends).
- FR3.2 A non-critical intent that starts or ends while a critical intent is open does not change the profile.
- FR3.3 An intent the person declined (FR2.3) does not trigger a switch back.

**FR4 Feedback**
- FR4.1 The app shows the active profile ("critical", "economy" or "not set") in Project Settings.
- FR4.2 After each switch, the app shows the output of every command it ran.
- FR4.3 If a command fails (for example, a refused setup), the app shows its message. It runs none of the remaining commands and does not change the active profile.

**FR5 Harness** (Q3 A)
- FR5.1 A switch uses the harness that the project's agent tab uses: the saved setting, otherwise the detected harness.
- FR5.2 If that harness has no model table (only Claude Code and opencode have one), the app says so and switches nothing.

## Non-functional requirements

- NFR1 Every text goes through `t()`, with the same keys in `sv.json` and `en.json`.
- NFR2 Commands go through the existing fixed runner (`runFixed`, `buildModelCommand`). Profile names must match `^[a-z0-9][a-z0-9-]*$`. Model ids come only from the harness's model table, and agent names only from the agent list. No shell is used.
- NFR3 The question appears within 2 s of `intents.json` changing; the watcher's debounce is 300–800 ms.
- NFR4 The UI follows LCARS, with no `window.confirm`.
- NFR5 The tests are written first (TDD) and cover each FR. Line coverage stays at or above 80%.

## Constraints

- The app never writes AI-DLC's engine-owned files. It only runs the `aidlc` CLI.
- The settings live in the app's `userData/settings.json`, not in the repository.
- A switch applies only while the app is open with this project.

## Assumptions

- [assumption] An intent created while the app was closed gets no question when the project opens (follows from FR2.4).
- [assumption] A failure part-way through a switch leaves the commands that already ran in place. The app does not roll them back; it shows what ran and what failed.

## Out of scope

- Switching per stage or per Unit.
- Harnesses without a model table, and Kiro's session model.
- Writing AI-DLC saved profiles from the app (`--save-as`).

## Open questions

None.
