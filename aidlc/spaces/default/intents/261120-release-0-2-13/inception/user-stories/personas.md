# Personas

## P1. Dana, the solo developer
- **Role:** builds one product with AI-DLC and THADEUS on one Mac; installs tools through nvm and Homebrew; works story by story on short-lived branches.
- **Goals:** open the app and start the agent tabs at once; see the newest release plan whatever branch is checked out; stop mid-intent and pick it up later without typing AI-DLC commands; see a wide Unit graph whole.
- **Pain points:** the app not finding `claude` after a slow shell start; a release added on `main` missing from the views; "workflow is parked" stops; a list column that cuts the graph off.
- **Tech comfort:** high. **Frequency:** daily, all day.
- **Stories:** US1.1, US2.1, US4.1, US5.1.

## P2. Sam, the developer on several machines
- **Role:** works on the same project from a laptop and a desktop (or with a teammate's clone); relies on the app's hooks and token logs on each.
- **Goals:** the app's own files and hook settings are always on `main`, so every clone has the hooks and no token reading is lost; nothing of the app's ends up in a story commit.
- **Pain points:** uncommitted token logs and `.claude/settings.json` hook entries after a merge; a clone running the coding tool without the app's hooks.
- **Tech comfort:** high. **Frequency:** daily, switching machines.
- **Stories:** US3.1, and US2.1 (planning from another clone).

**Priority:** P1 first (four of five stories); P2 drives the largest story, US3.1.
