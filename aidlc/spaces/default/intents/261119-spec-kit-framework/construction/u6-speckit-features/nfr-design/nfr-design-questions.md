# NFR Design Questions: U6 u6-speckit-features

## Q1. [Product owner] May you edit Spec Kit files yourself in the app's editor?

The requirement "the app never writes in `.specify/` or `specs/`" (NFR3) can be read two ways. Today the artifact reader has an Edit button, and the app's editor saves any project file. The design review pointed out that this lets you change `specs/` files from inside the app. On the other hand, the constitution story (US-1404) says `constitution.md` "opens in the editor", which suggests you do want to edit Spec Kit files yourself.

A. Only the app's own readers never write there. You may still open and save Spec Kit files in the editor yourself; the features view keeps the Edit button.
B. The app never writes there at all. The editor refuses to save under `.specify/` and `specs/`, and the reader shows no Edit button for those files. The constitution then opens read-only, and you change it through the agent (`/speckit-constitution`).
C. In between: the editor may save `.specify/memory/constitution.md` only; everything else under `.specify/` and `specs/` is read-only in the app.
X. Other (please specify)

[Answer]: C
