# User Stories Questions: Release v0.2.13

Plan: the five release stories already exist in the epic files with their acceptance criteria. This stage turns the requirements (FR1–FR5) into stories with stable IDs (`US{n}.{m}`, `AC{n}.{m}.{k}`), each group `US{n}` matching one release story and one Unit. Personas: drawn from the five stories' "As a …" lines, folded into as few as fit. Format: INVEST, Given/When/Then.

## Q1. [Product owner] How finely to split the stories

Each release story becomes one Unit and one pull request either way. The question is only how many stories sit inside each group, which sets how the acceptance criteria are grouped and checked.

A. One story per release story (5 stories), each carrying all of its criteria
B. Split where a release story holds separate user goals: US-0609 into three (the `.thadeus/` sync, the harness settings sync, the setup rule and waiting list), US-0510 into two (see the mark, park and unpark); the others stay one each (about 8 stories)
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] Priority of the two Medium stories

The release plan rates US-0035, US-0036 and US-0609 High, and US-0510 (park and unpark) and US-0415 (fold the list) Medium. The priority says what may slip to v0.2.14 if the release runs late.

A. All five Must Have: the release waits for all of them
B. The High three Must Have; US-0510 and US-0415 Should Have, so they can move to v0.2.14 if needed
X. Other (please specify)

[Answer]: A
