# Personas: US-0210

## P1: The paying developer (primary, only persona)

- **Role:** A developer who runs AI-DLC through THADEUS on their own projects and pays for every agent run.
- **Goals:** Use the expensive model and high effort only on work where a mistake costs more than tokens, without remembering to switch by hand.
- **Pain points:** The developer agent was 44% of one project's cost. Models are set per agent, not per plan, so a critical intent runs on whatever was set last. Switching by hand at every start and end is easy to forget.
- **Context:** Works alone, on one machine, with the app open while AI-DLC runs in a terminal. Saves effort profiles with `aidlc config models --save-as`.

No other persona: the app is single-user and local, and the settings stay on this machine.
