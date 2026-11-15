# NFR Design questions: u3-replies

No questions for this Unit. The open points from the NFR Requirements review are settled in this stage's design:

- A Stop event refused for being over 1 MB still counts as a newer reply: the older reply of the same session turns stale, and the strip says a newer message could not be shown (the safe direction; nothing answerable is left behind a stop the person never saw).
- A pty write that cannot be classified as a terminal auto-response counts as the person's input (fail safe: the reply turns stale), and the tests include DSR and CPR reply forms.
- Typed answers are cleaned of control and format characters (bidi included); the 64 KB limit counts UTF-8 bytes after cleaning.
- The Stop hook reads stdin with a bounded wait, so stdin left open never holds the agent near the 10 s entry timeout.
