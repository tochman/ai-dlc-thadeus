# Functional Design Questions: U4 u4-framework-choice (US2.2 / US-1406)

Context: today a project with no saved framework (no `.thadeus/project.json`) opens straight into the framework it finds, and with neither found it shows U3's AI-DLC / Spec Kit setup choice (on `feat/US-1405`, not yet merged). U4 adds the first-open screen: what was found, whether `aidlc` and `specify` are on the `PATH`, a proposal, and the choice saved through U2.

## Q1. [Product owner] One framework found, nothing saved yet

AC2.2.2 says one framework found is proposed and one click confirms it. Today such a project opens straight into that framework, so every existing AI-DLC project without `.thadeus/project.json` would show the choice screen once after this update.

A. Show the choice screen once for every project with no saved choice, the found framework proposed; one click confirms and saves it
B. Keep opening straight into the found framework, and save it to `.thadeus/project.json` silently on first open
C. Keep opening straight into the found framework without saving; the choice screen shows only when both or neither are found
X. Other (please specify)

[Answer]: A

## Q2. [Developer] Neither found: when the choice is saved

With neither framework found, the person picks one and goes on to its setup. Contract C4 saves `.thadeus/project.json` at the click. If setup then fails or is closed, the file names a framework whose folder is missing, and the next open falls back to detection with a reason.

A. Save only after the setup succeeds, as the framework switch (U8) does; until then nothing is written
B. Save at the click, as C4 says; a failed or closed setup leaves the file, and the next open shows the setup again
X. Other (please specify)

[Answer]: A
