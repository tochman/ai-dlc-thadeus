# Performance Design: U6 u6-speckit-features

Sources: `performance-requirements.md` (NFR7.1–NFR7.4), `tech-stack-decisions.md` (NFR8.1–NFR8.4, NFR1.1, NFR2.1), `functional-spec.md`, and contract C5 in `contract-summary.md`.

## Watching (NFR7.1, NFR7.2)

Today `watchFiles` only sees `.md` files directly in a folder target. U6 adds one target form to it:
- A target ending in `/**` (for example `specs/**`) matches any file at any depth below that folder, and any folder that is added or removed there.
- `depth` for such a target is capped at 3 levels below the folder (`specs/<feature>/<sub>/<file>`). Spec Kit's deepest files are `contracts/` and `checklists/`. `ponytail:` comment names the cap.
- The `ignored` filter still keeps chokidar inside the targets, so only `specs/` and the two `.specify/` files are watched, not the whole project.

U6's watcher, started in `ipc.js` for a project whose framework is `speckit`, uses `['specs/**', '.specify/feature.json', '.specify/init-options.json']`. These paths never change, so there is no resync step, and a new feature folder is seen on its own, whether or not `feature.json` changes. The debounce stays at 300 ms with an 800 ms ceiling, which gives one push per burst and a worst case well under 2 s.

Cost ceiling: chokidar holds one handle per watched folder. A `specs/` tree with a few hundred features stays small. A `ponytail:` comment says to move to a single recursive `fs.watch` if that is ever measured as a problem.

## Reading (NFR7.3)

- `loadSpeckitFeatures` reads the features with `Promise.all`. Inside one feature, it reads only `spec.md` and `tasks.md`; for the other files it only lists names.
- `parseTasks` makes one pass over the lines with prebuilt regular expressions.
- A fixture with 50 features and a 500-line `tasks.md` each is timed in a test, with a 500 ms budget.

## Renderer (NFR7.4)

- `SpeckitFeatures` calls `speckit:features` once on mount and once per `speckit:changed` push. The selection and rendering work from that one result.
- The listener is removed on unmount.

## Tooling (NFR8.1–NFR8.4, NFR1.1, NFR2.1)

- No new dependency. The parsers are plain JavaScript, the watcher is chokidar, and the view is React in the LCARS frame.
- Every text goes through `t()` with keys in `sv.json` and `en.json`.
- Tests are written first in vitest: the `main` project for the parsers, reader and watcher, and `renderer` for the view.
