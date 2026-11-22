# Personas: EPIC-14 Spec Kit

## P1: Dana, developer driving a project in THADEUS (primary)

- **Role:** builds software with an AI coding agent (Claude Code or opencode) and uses THADEUS as the cockpit: views, agent terminal, editor and git.
- **Goals:**
  - Open a project that follows Spec Kit and see its features and tasks.
  - Run the next `/speckit-*` command with one click.
  - Set up Spec Kit in a new project from the app.
- **Pain points:**
  - THADEUS refuses projects without `aidlc/spaces/`.
  - Spec Kit has no state file or approval gates, so progress has to be read off files by hand.
- **Context:** works alone or in a small team. Reads Swedish or English. Expects the LCARS look everywhere.

## P2: Dana on a second clone

- **Role:** the same developer, or a teammate, opening the same repository on another machine.
- **Goal:** the project follows the same framework without being asked again (US-1408).
- **Pain point:** project settings are kept on one machine today, keyed by the folder.

## Priority

P1 drives every story. P2 matters only for US-1408 and US-1406.
