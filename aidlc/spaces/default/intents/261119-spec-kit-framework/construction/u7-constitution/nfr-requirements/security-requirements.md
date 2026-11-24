# Security Requirements: U7 u7-constitution

Sources: NFR3 and NFR5 in `requirements.md`, contract C6 in `contract-summary.md`, and the U7 `functional-spec.md` and `rules.md` (BR7.1, BR7.3, BR7.6, BR7.7). There is no login, no network call and no secret in this Unit. The threats are paths and names read from files an agent or an extension writes, a YAML file built to exhaust the parser, and writes into files Spec Kit owns.

| ID | Requirement | Measure |
|---|---|---|
| NFR3.1 | No U7 code writes, creates, renames or deletes anything under `.specify/` or `specs/`. The constitution is saved only by the editor's existing path (BR7.2), never by `speckit:rules`. | Test runs `loadSpeckitRules` on a fixture with a spy on every fs write call; zero calls |
| NFR3.2 | Paths stay inside the project. An extension id that does not match `^[a-z0-9][a-z0-9._-]*$`, or is `.` or `..`, is not used to build a path; it shows with no commands and an `errors` entry (BR7.6). A manifest, constitution or `extensions.yml` that is a symbolic link pointing outside the project root is not read and is named in `errors`. | Reader tests: `../x`, `a/b`, `..`, an absolute id, a link to `/etc` |
| NFR3.3 | Every command name and hook command returned by `speckit:rules` matches `^[a-z0-9][a-z0-9._-]*$` (Spec Kit's own form, `speckit.git.commit`). Any other value is left out and named in `errors`, so U5 never sends a name with spaces, `;`, quotes or a line break to the terminal. | Reader tests: `a; rm -rf ~`, a line break, a quote, a 200-character name |
| NFR3.4 | The renderer gets only root-relative paths from `speckit:rules`. Open in editor accepts only `.specify/memory/constitution.md` from this view. | Test: another path from this view is refused |
| NFR5.1 | The constitution and all names are shown as text or as Markdown through the existing reader, with no raw HTML, so a file cannot run script in the renderer. | A fixture with a `<script>` line shows it as text |
| NFR5.2 | A file that cannot be read, is not UTF-8 text, or is larger than 1 MB is named in `errors` with the reason and is not parsed. YAML is parsed with the `yaml` package's alias limit kept at its default (100), so a file built from nested aliases is refused, not expanded. The rest of the view still shows. | Reader tests: unreadable, binary, 2 MB file, an alias bomb |
