# User Stories: US-0210 model profile switch

Persona: P1, the paying developer (`personas.md`). All three stories are Must Have. US1.2 and US1.3 depend on US1.1 (they need the settings), and US1.3 depends on US1.2 (it switches back only for intents that US1.2 switched for).

## US1.1 Set up critical plans and two profiles

As the paying developer, I want to mark which plans are critical and define a critical and an economy profile, so that the app knows when to switch and what to switch to.
Priority: Must Have. Covers FR1.1–FR1.5, FR4.1, NFR1, NFR4.

- **AC1.1.1:** Given the project has plans, when I open Project Settings in the Configuration view, then I see a "Model profiles" section in LCARS style. It lists every plan with a choice to mark it critical.
- **AC1.1.2:** Given `config models --show --json` reports saved AI-DLC profiles, when I edit the critical or the economy profile, then I can pick one of them as its effort profile, or none. When none are reported, the section says how to save one with `--save-as`.
- **AC1.1.3:** Given the harness has a model table, when I edit a profile, then I can pick a model for each agent from that table, or leave it empty. An empty agent is not changed by a switch.
- **AC1.1.4:** Given the section is open, when I turn on "Ask before switching back", then the setting is saved.
- **AC1.1.5:** Given I saved the settings, when I restart the app and open the project, then they are all still there. The section shows the active profile: critical, economy or not set.
- **AC1.1.6:** Given a saved profile name that does not match `^[a-z0-9][a-z0-9-]*$`, when the settings are saved, then the name is refused with a message, and the earlier value is kept.

## US1.2 Switch to critical when a critical intent starts

As the paying developer, I want the app to offer the critical profile when an intent starts on a critical plan, so that the first stage already runs on the stronger setup.
Priority: Must Have. Covers FR2.1–FR2.5, FR4.2, FR4.3, FR5.1, FR5.2, NFR2, NFR3, NFR4.

- **AC1.2.1:** Given a plan is marked critical and the critical profile is not active, when a new intent on that plan appears in `intents.json`, then within 2 s the app shows one LCARS dialog: "Switch to the critical profile?"
- **AC1.2.2:** Given the dialog is shown, when I choose Yes, then the app runs `aidlc config models --from <profile> --project --harness <harness> --yes` (only when an effort profile is set), then `aidlc config models --agent <a> --model <m> --project --harness <harness> --yes` for each agent that has a model. It shows each command's output, and the active profile becomes "critical".
- **AC1.2.3:** Given the dialog is shown, when I choose No, then nothing changes, and that intent never gets the question again.
- **AC1.2.4:** Given an intent on a plan that is not critical, or an intent that was already open when I opened the project, when the app sees it, then no question is shown.
- **AC1.2.5:** Given a command fails, when the switch runs, then the app shows that command and its message. It runs none of the remaining commands, and the active profile stays as it was.
- **AC1.2.6:** Given the agent tab's harness has no model table, when a critical intent appears, then the app says that this harness cannot switch models, and runs nothing.

## US1.3 Switch back to economy when the last critical intent ends

As the paying developer, I want the app to return to the economy profile once no critical work is open, so that cheap work does not run on the expensive setup.
Priority: Must Have. Covers FR3.1–FR3.3, FR1.4, FR4.2, FR4.3.

- **AC1.3.1:** Given the app switched to critical for one or more open intents, when the last of them is completed or archived, then the app runs the economy profile's commands in the same way as AC1.2.2, shows their output, and the active profile becomes "economy".
- **AC1.3.2:** Given "Ask before switching back" is on, when the last critical intent ends, then the app first asks in an LCARS dialog. No keeps the critical profile active.
- **AC1.3.3:** Given two critical intents are open, when one of them ends, then the profile stays critical.
- **AC1.3.4:** Given a critical intent is open, when a non-critical intent starts or ends, then the profile does not change.
- **AC1.3.5:** Given I declined the switch for an intent, when that intent ends, then no switch back happens.
- **AC1.3.6:** Given a switch-back command fails, then the app shows its message, and the active profile stays "critical".

## INVEST notes

Each story can be tested on its own with faked intent lists and a faked command runner. They are small enough to build in one Code Generation pass. US1.2 and US1.3 share the switch sequence of AC1.2.2, so that sequence is built once.
