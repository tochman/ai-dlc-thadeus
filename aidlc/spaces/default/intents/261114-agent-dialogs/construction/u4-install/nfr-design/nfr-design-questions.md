# NFR Design questions: u4-install

No questions for this Unit. The open points from the NFR Requirements review are settled in this stage's design, in the safe direction:

- The app's own hook entries are only those whose command runs exactly `.thadeus/hooks/dialog.sh` with one of the four known kinds. Any other command under `.thadeus/hooks/` belongs to someone else: Update and Remove never touch it, and a fixture proves it.
- The settings edit refuses, rather than writes, when its post-check cannot prove the result: duplicate keys, a byte order mark that must be kept, or a spliced result that does not parse to exactly the expected value all mean "refused, file unchanged".
