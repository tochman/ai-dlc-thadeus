# External Dependency Map: EPIC-14 Spec Kit

A **Bolt** is one build pass over a piece of the work, ending in something that runs.

| Item | Owner | Lead time | Blocks | If it slips |
|---|---|---|---|---|
| `uv` and `specify-cli` installed on the dev machine | the person | minutes | Making the test project; manual checks of U3 | Install with `uv tool install specify-cli`; U3's unit tests use a stubbed `specify` and are not blocked |
| Spec Kit test project (`specify init`, v1.4.x, Claude and opencode) | developer agent, after the install | under an hour | U6 (C5), U5 (C7) | U6 and U5 follow the epic's assumptions and are revised when the facts arrive |
| Spec Kit licence read | the person | minutes | The v0.3.0 release tag | The release waits |
| `yaml` npm package added | developer agent, in U7's pull request | none | U7 | none |
