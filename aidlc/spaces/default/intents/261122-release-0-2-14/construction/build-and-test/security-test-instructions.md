# Security Test Instructions: Release v0.2.14

- CI's `verify` job runs a gitleaks secret scan on every pull request and the tag; a finding blocks the merge.
- US-0039 types into agent sessions: the lines are fixed text per harness, the renderer sends only an event id and a choice (US-0213 NFR4); covered by `sessionHandoff.test.js`.
- US-1203 shows platform comments and links: links open through the existing window-open handler (http/https only, in the OS browser); comment text is rendered as text, not HTML.
- US-0416 keeps the Bitbucket app password in the existing encrypted store; the view only restyles the form.
