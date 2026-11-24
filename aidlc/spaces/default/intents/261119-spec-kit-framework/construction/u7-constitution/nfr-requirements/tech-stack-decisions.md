# Tech Stack Decisions: U7 u7-constitution

Sources: `technology-stack.md` (code KB, which notes no YAML library is installed), FR7.2, NFR1, NFR2 and NFR8 in `requirements.md`, and the U7 `functional-spec.md`. One new dependency: `yaml`.

| ID | Decision | Why |
|---|---|---|
| NFR8.1 | Add `yaml` (eemeli/yaml, 2.x, no dependencies of its own) as a runtime dependency, used only in the main process by `speckitRules.js`. Parse with `parse(text)` and its default options (schema core, alias limit 100). | FR7.2 names it; Spec Kit writes ordinary block YAML that a hand-written reader would get wrong at the edges |
| NFR8.2 | `hooksFrom(config)` is a pure function; the file reading uses the existing read helpers (`readText`, `listDir`). | BR7.7 read-only; most tests need no files |
| NFR8.3 | Watching stays on chokidar 4.0.3 through `watcher.js`, by adding the three paths of BR7.8 to `speckitWatchPaths` (U6). | Already installed and used |
| NFR8.4 | Tests are vitest: `main` project for the reader, hooks and watcher; `renderer` project (jsdom, Swedish locale) for the section. Tests are written first; 80% line coverage holds. | NFR8, team practice |
| NFR1.1 | Every text goes through `t()` with ICU placeholders, with the same keys in `sv.json` and `en.json`. | NFR1, `i18nKeys.test.js` |
| NFR2.1 | The Spec Kit section uses the LCARS heading, frame and colours of the other Configuration sections; the constitution shows in the artifact reader's FileView. | NFR2, project rule |

Not used: any Markdown or UI library beyond what is installed. The `yaml` licence (ISC) is checked when it is added.
