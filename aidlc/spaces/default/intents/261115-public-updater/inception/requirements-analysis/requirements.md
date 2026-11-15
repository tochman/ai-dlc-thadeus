# Requirements: US-0413, update the app from the public release without `gh`

## Intent analysis

The repository is public since v0.2.6. A user who installs the app should get updates without installing and signing in to the GitHub CLI. Today `src/main/updater.js` reads and downloads the release only through `gh`, so an update fails on a machine without a signed-in `gh` (reported 2026-11-15 for v0.2.5). Enhancement, one component (the updater, plus one text in Settings › Tools). Depth: Minimal.

## Functional requirements

- **FR1 Check from the public API.** The check reads `https://api.github.com/repos/tochman/aidlc-dash/releases/latest` with Node's own `fetch` [Q2], no token, no `gh`.
  - **FR1.1** The API answer is mapped to the shape `releaseStatus` reads today (`tag_name`, `body`, `draft`, `prerelease`, `assets[].name/size/browser_download_url`). Drafts and prereleases are still ignored.
  - **FR1.2** At most one automatic check a day, as today; the menu's check still forces one.
- **FR2 Download from the release's own URLs.** This machine's asset and `SHA256SUMS.txt` are fetched from their `browser_download_url`, following GitHub's redirect.
  - **FR2.1** Progress is reported from the bytes received against the asset's size.
  - **FR2.2** Only `tochman/aidlc-dash` release assets with a known name are fetched (`assertOwnAsset`, US-0407 NFR3).
- **FR3 Checksum as today [Q3].** With `SHA256SUMS.txt` the file is verified, and a mismatch deletes it and says so. Without it the package is downloaded and shown as not verified.
- **FR4 Failures say why.** A failed check or download says one of: no connection, a timeout, a full disk, an HTTP status, a checksum mismatch. A partial file is removed.
  - **FR4.1** A 403 or 429 from the API says "try again later" and is not recorded as a check, so the next check tries again.
- **FR5 `gh` as fallback [Q1].** When the public check or download fails and `gh` is found, the updater tries the current `gh` path once. If that also fails, the public API's reason is shown.
  - **FR5.1** No fallback after a checksum mismatch or a refused asset (FR2.2): those are refusals, not network failures.
- **FR6 Settings text.** Settings › Tools says `gh` is used for the GitHub features and as an update fallback, not that it is needed for updates.
- **FR7 Translations.** Every new or changed text goes through `t()` in `sv.json` and `en.json`.

## Non-functional requirements

- **NFR1 No new dependency.** Node's `fetch` (Electron 45) and `node:stream`; `fetch` is injected so the tests fake it.
- **NFR2 A check never blocks the app** (US-0407 NFR5): every failure comes back as `{status: 'unavailable'}` or `{status: 'error'}`, never a throw.
- **NFR3 Bounded waits.** The check times out after 20 s and the download after 30 min, as today, using `AbortSignal.timeout`.

## Constraints

- HTTPS only; no token is read, stored or sent.
- The install step (`hdiutil`/`ditto`, `pkexec dpkg`) is unchanged.

## Assumptions

- [assumption] The fallback runs for any failure other than FR5.1, and only when `gh` is found; a missing `gh` adds no second error. Reason: Q1 keeps `gh` as a help, not a requirement.
- [assumption] The texts `update.ghMissing`, `update.ghLoggedOut` and `update.noAccess` stay, used only when the fallback ran and failed.
- [assumption] Node's `fetch` ignores the system proxy; a user behind one can still update through the `gh` fallback. Reason: Q2.

## Out of scope

- Electron's `net.fetch` and proxy support (Q2).
- Refusing releases without `SHA256SUMS.txt` (Q3).
- Signature checks beyond the checksum, and Windows packages.

## Open questions

None.

## Sources

- Initial description: US-0413 in `docs/features/epic-04-branding-and-desktop.md` [desc]
- Workflow-selected scope: ultra-express [scope]
- Answers in `requirements-analysis-questions.md` [Q1] [Q2] [Q3]
- Current code: `src/main/updater.js`, `src/renderer/locales/en.json` (`tools.gh` description)
