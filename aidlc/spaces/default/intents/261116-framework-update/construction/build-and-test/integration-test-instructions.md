# Integration Test Instructions: US-0504

No automated integration tests (Minimal strategy). The integration path is checked by hand in the built app:

1. Open a project, go to Settings › Tools.
   - The program row shows `aidlc --version`.
   - It says "Up to date" or names the newer version.
2. The project row lists each installed harness with its counts. Unfold one to see its files.
3. Press "Update AI-DLC".
   - Settings closes and the shell tab shows `aidlc update`, not run.
   - Clear the line.
4. Press the project button. The shell tab shows `aidlc config --harness claude --yes`, not run.
5. Start an agent working. Both buttons are disabled with the wait message.
6. Go offline and press "Check for updates". The row gives the reason in one sentence, and Settings still works.
