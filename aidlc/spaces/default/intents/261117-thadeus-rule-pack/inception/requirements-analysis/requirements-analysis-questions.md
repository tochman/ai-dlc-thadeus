# Requirements Analysis Questions: US-0212 THADEUS cost rule pack

The story in `docs/features/epic-02-cost-and-models.md` already fixes most of the behaviour. These questions cover only what it leaves open.

## Q1. [Product] Where the pack is switched on and edited

The story says "in the project's settings". Project settings live in the Configuration arm today.

A. A new "Kostnadsregler" sub-block in the Configuration arm, beside the other project settings (Recommended)
B. A section inside the cost view (EPIC-02), next to the figures it is meant to lower
C. Both: edited in Configuration, with a link from the cost view
X. Other (please specify)

[Answer]: A

## Q2. [Product] What "off" does to the files

When the person turns the pack off, the marked block can either go away or stay as an inert record.

A. Remove the block, markers included, so the files are exactly as before the pack (Recommended)
B. Keep the markers with nothing between them, so turning it on again lands in the same place
C. Keep the lines but comment them out inside the markers
X. Other (please specify)

[Answer]: A

## Q3. [Product] How a clash with team.md is found

The app must warn when a pack line contradicts a rule in `team.md` (for example "only the test being worked on runs" against "the full suite must pass before merge"). The app cannot understand free text.

A. A fixed list of known clash pairs for the shipped lines (keyword pairs such as "full suite" / "suite green"); an edited or new line is checked against the same keywords, and the warning quotes both lines (Recommended)
B. No automatic check: show the related `team.md` sections beside the editor and let the person judge
C. Ask the agent (one short model call) to check the pack against `team.md` before writing
X. Other (please specify)

[Answer]: A

## Q4. [Product] Which language the rule lines are written in

The lines are read by the model on every stage, and this project's rules mix Swedish and English.

A. English always, whatever the app language: shortest in tokens and the same for every team (Recommended)
B. The app's current language (Swedish or English)
X. Other (please specify)

[Answer]: A

## Q5. [Developer] Which space the pack is written to

A project can have several AI-DLC spaces (`aidlc/spaces/<space>/`).

A. The active space only (`aidlc/active-space`, default `default`), named in the view (Recommended)
B. Every space in the project, the same pack in each
X. Other (please specify)

[Answer]: B

## Q6. [Developer] Turning it on in this repository

The release plan builds US-0212 first so that every later v0.2.9 intent runs with it.

A. Yes: once it is built, turn the pack on here through the app (part of the manual check before the release), not by hand-editing the memory files (Recommended)
B. Yes, and also add the lines by hand now, before the app can do it
C. No, leave this repository without the pack for now
X. Other (please specify)

[Answer]: A
