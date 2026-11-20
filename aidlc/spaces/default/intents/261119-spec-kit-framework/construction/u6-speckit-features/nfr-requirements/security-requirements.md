# Security Requirements: U6 u6-speckit-features

Sources: NFR3 and NFR5 in `requirements.md`, contract C5 in `contract-summary.md`, and the U6 `functional-spec.md` (BR6.2, BR6.5, BR6.6). There is no login, no network call and no secret in this Unit. The threats are paths read from files the agent writes, and writes into files Spec Kit owns.

| ID | Requirement | Measure |
|---|---|---|
| NFR3.1 | No U6 code writes, creates, renames or deletes anything under `.specify/` or `specs/`. | Test runs every U6 reader on a fixture with a spy on every fs write call; zero calls under those paths |
| NFR3.2 | A Spec Kit file opened from the features view opens read-only: the artifact reader shows no Edit button for paths under `.specify/` or `specs/`. Changing those files is the agent's job. | Renderer test: no edit control for a `specs/` path |
| NFR3.3 | Paths stay inside the project. A `feature_directory` that is absolute outside the root, or uses `..` to leave `specs/`, is not active and is named in `errors`. A feature folder that is a symbolic link is skipped and named in `errors`. Symbolic-link files are left out of the file list. | Reader tests for each case |
| NFR3.4 | The renderer gets only root-relative paths from `speckit:features`, and the open-file call refuses a path that is not one of the listed files of the project. | Test: an unlisted or `..` path is refused |
| NFR5.1 | Text read from Spec Kit files is shown as text or rendered Markdown through the existing reader (no raw HTML), so a file cannot run script in the renderer. | Existing reader setting kept; a test with an HTML/script line shows it as text |
| NFR5.2 | A file that cannot be read, is not UTF-8 text, or is larger than 1 MB is named in `errors` with the reason and is not parsed. The other features still show. | Reader tests: unreadable, binary, 2 MB `tasks.md` |
| NFR5.3 | A version other than v1.4.x shows a warning naming it, or saying it is unknown; reading goes on. | Reader tests: 1.4.3, 1.5.0, 1.3.0, missing |
