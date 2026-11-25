# Unit Test Instructions: two unstable tests (US-0052)

- **Setup:** vitest 5.1.0, the `renderer` project (jsdom, Swedish locale). Nothing is installed.
- **Run:** `npx vitest run tests/renderer/ConfigView.test.jsx tests/renderer/TokenDetail.test.jsx`
- **Repeat:** the same command 50 times in a row, with other work on the machine for part of it.
- **Coverage:** the project's 80% line floor is checked by Build and Test on the full suite. No source file changes.
- **Mocks and data:** as the two files have them. No time limit is raised and no retry is added.
