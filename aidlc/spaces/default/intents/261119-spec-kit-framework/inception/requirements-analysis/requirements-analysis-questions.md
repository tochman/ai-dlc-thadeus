# Requirements Analysis Questions: EPIC-14 Spec Kit

The ten stories (US-1401 to US-1410), the ideation decisions (D1–D14) and the code scan already settle most of the requirements. These four questions cover what is still open and cannot be settled from the code.

## Q1: Where is the project's framework kept in the repository? (US-1408)

The app may not write in `.specify/` or `specs/` (constraint C6). The app already keeps its own project files under `.thadeus/` (hooks, token logs), and those are committed.

A. In `.thadeus/project.json`, as `{ "framework": "speckit" }`, beside the app's other project files
B. In a file of its own at the project root, `.thadeus.json`
X. Other (please specify)

[Answer]: A

## Q2: Where do the token readings for a Spec Kit feature come from? (US-1409)

Today readings are written only from AI-DLC's usage ledger, and a Spec Kit project doesn't have one.

A. From the coding tool's own session records (Claude Code's session transcripts, opencode's session store), credited to the active feature in `.specify/feature.json`
B. Only from what the agent hooks report while the agent runs
X. Other (please specify)

[Answer]: A

## Q3: How should the app read `.specify/extensions.yml`? (US-1404)

Nothing installed today can read YAML.

A. Add the `yaml` npm package (small and widely used) as a new dependency
B. Write a small reader for just that file's shape, with no new dependency
X. Other (please specify)

[Answer]: A

## Q4: When is the Spec Kit test project made?

The ideation planned a test project (`specify init`, v1.4.x) to check how `clarify`, `checklist` and `analyze` record their output, and whether `--integration opencode` works.

A. Now, before the design stages, so the designs are built on real files (needs `specify` installed on this machine)
B. At the start of Construction, before US-1402, as the ideation planned
X. Other (please specify)

[Answer]: A

## Q4a (follow-up to Q4): `specify` is not installed

Neither `specify` nor `uv` is on this machine's login-shell `PATH`, so the test project cannot be made yet.

A. The person installs `uv` and `specify-cli` now; the test project is made in the scratch folder before Domain Design
B. Move the test project to the start of Construction, before US-1402
X. Other (please specify)

[Answer]: A
