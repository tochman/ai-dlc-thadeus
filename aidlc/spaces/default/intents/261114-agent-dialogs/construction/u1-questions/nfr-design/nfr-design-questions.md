# NFR Design questions: u1-questions

No questions for this Unit. The open points from the NFR Requirements review are technical and are settled in this stage's design, not by the person:

- Liveness with a 1-second clock: the "app gone" check counts unchanged polls of the alive file (20 polls of 100 ms with no change means at least 2 s without an update), so the hand-back stays at "about 2 seconds" as FR6.3 says; the 595 s deadline keeps the wall clock.
- Contract C1 is amended to say that `THADEUS_WAIT_SECONDS` is the full wait (595) and that event files are ordered by file time, not by name.
- The script's silent exit is `exec 2>/dev/null` plus `|| exit 0`, since dash has no ERR trap; the script tests run under both `sh` and `dash`.
