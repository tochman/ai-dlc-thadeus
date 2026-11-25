# Questions: archive and unarchive an intent (US-0513)

The story in `docs/features/epic-05-workflow-control.md` already settles most of this. These are the choices it leaves open.

## Q1. [Product] Choosing several intents to archive

The story lets you archive several complete intents in one go. Where do you choose them? This project has 63 complete intents.

A. A "Select" mode in the intent list: the complete rows get a checkbox, and "Archive N" opens the confirmation. The list's search and filters narrow what you choose from.
B. A dialog, "Archive complete intents", with its own checklist of every complete intent.
C. Both the list mode and the dialog.
X. Other (please specify)

[Answer]: A

## Q2. [Product] Where "Show archived" sits

The list leaves archived intents out and says how many there are. The list also has a status filter that shows the statuses it finds.

A. A line at the foot of the list, "12 archived · Show", which unfolds them below the others.
B. A choice in the status filter, "Archived (12)"; the other choices leave archived intents out.
X. Other (please specify)

[Answer]: B

## Q3. [Product] When Archive is unavailable for the active intent

The story blocks Archive while an agent works on that intent. An agent tab can also be open but idle, or wait for your answer to a question from that intent. Archiving would then leave the agent on an archived intent, where AI-DLC refuses its next step.

A. Blocked only while the agent really works (a busy agent tab, or a stage write in the last minute). An idle tab or a waiting question does not block; the confirmation says the intent is active, and the question goes away.
B. Also blocked while a question from it waits for your answer.
C. Blocked whenever an agent session is open on it, idle or not, as Resume is today.
X. Other (please specify)

[Answer]: C

## Q4. [Development] The files archiving changes

Archiving changes `intents.json` and the intent's state and audit files. Archiving 60 intents leaves about 120 changed files in git. Park also changes AI-DLC's files, and the app commits none of them today.

A. The app commits nothing, as with Park. The result says that the files are changed and need a commit.
B. The app commits and pushes exactly those files as one `chore: archive N intents` commit when the project is on `main`, and leaves them on any other branch.
X. Other (please specify)

[Answer]: B
