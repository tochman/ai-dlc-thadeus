# Tech Stack Decisions: U6 u6-speckit-features

Sources: `technology-stack.md` (code KB), NFR1, NFR2 and NFR8 in `requirements.md`, and the U6 `functional-spec.md`. No new dependency.

| ID | Decision | Why |
|---|---|---|
| NFR8.1 | Parsers are plain JavaScript in `src/main/parsers/`, with line-by-line regular expressions for `tasks.md` and `JSON.parse` for `feature.json` and `init-options.json`. No Markdown parser library. | The formats are line-based; the existing parsers work the same way |
| NFR8.2 | File watching stays on chokidar 4.0.3 through `watcher.js`. | Already installed and used for the AI-DLC and feature-docs watchers |
| NFR8.3 | The view is React 19 in the LCARS frame (`Lcars.jsx`); files open in the existing artifact reader (react-markdown, remark-gfm). | NFR2; reuse |
| NFR8.4 | Tests are vitest: `main` project for parsers, reader and watcher; `renderer` project (jsdom, Swedish locale) for the view. Tests are written first; 80% line coverage holds. | NFR8, team practice |
| NFR1.1 | Every text goes through `t()` with ICU placeholders, with the same keys in `sv.json` and `en.json`. | NFR1, `i18nKeys.test.js` |
| NFR2.1 | The features list and detail use the LCARS heading, frame and colours of the other views. | NFR2, project rule |

Not used: the `yaml` dependency (that is U7's), any new parser or UI library.
