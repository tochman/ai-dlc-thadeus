# Requirements Analysis Questions: US-0413, update from the public release without `gh`

The story's acceptance criteria settle most of the work. `src/main/updater.js` reads and downloads the release through `gh` today. These three questions settle what the criteria leave open.

## Question 1
What should happen to the `gh` path in the updater?

A. Remove it: updates use only the public API, and `gh` is no longer touched for updates
B. Keep it as a fallback when the public API call fails (for example on a rate limit)
X. Other (please specify)

[Answer]: B

## Question 2
Which `fetch` should the updater use?

A. Electron's `net.fetch`: it goes through Chromium's network stack, so it follows the system proxy and the system's certificates (company networks)
B. Node's own `fetch`, as the story's note says: simpler to fake in tests, but it ignores the system proxy
X. Other (please specify)

[Answer]: B

## Question 3
Today a release without `SHA256SUMS.txt` is still downloaded, and the app says it is not verified. What should happen now that the download no longer goes through `gh`?

A. Keep it as today: download, and say it is not verified
B. Refuse it: no update is offered without `SHA256SUMS.txt`
X. Other (please specify)

[Answer]: A
