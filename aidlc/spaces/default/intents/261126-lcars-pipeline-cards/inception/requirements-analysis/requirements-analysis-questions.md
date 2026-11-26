# Requirements Analysis — Questions (US-0412)

The approved mockups settle the card shape (elbow), the four effects and when the power-up plays. Two edge cases remain.

## Q1. [Product] What happens when many stages change at once?
Why: a plan switch, a jump or a resumed session can change several cards in one update; sweeping and flashing all of them at once could be noisy.

A. Every changed card sweeps (and flashes when done), all at the same time
B. Up to 3 changed cards get their effect; with more, none do, and the cards just show their new state
C. Only the card that is now current sweeps; others just show their new state
X. Other (please specify)

[Answer]: A

## Q2. [Product] Should the power-up also play when you switch to another intent while the Pipeline view is open?
Why: you chose "every time the Pipeline view opens"; switching intent shows a new pipeline without opening the view again.

A. Yes: a new intent's pipeline powers up too
B. No: only opening the view plays it
X. Other (please specify)

[Answer]: A
