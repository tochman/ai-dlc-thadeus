# Security policy

## Reporting a vulnerability

Please do **not** report security problems in a public issue, discussion or pull request.

Report them privately through GitHub's private vulnerability reporting: open the repository's [Security tab](https://github.com/tochman/aidlc-dash/security) and choose **Report a vulnerability**. Only the maintainers see the report.

Include what you can:

- what the problem is and what an attacker could do with it,
- the steps to reproduce it, or a proof of concept,
- the app version (**About**) and your operating system.

We aim to acknowledge a report within a week, keep you informed while we work on it, and credit you in the release notes unless you prefer otherwise.

## Supported versions

Fixes go into the latest release only. The app offers updates itself, so please check that a problem still occurs on the [latest release](https://github.com/tochman/aidlc-dash/releases/latest) before you report it.

## Scope

In scope: the T.H.A.D.E.U.S. desktop app and its build and release workflow in this repository. The README's [Security](README.md#security) section describes the app's protections (file access limited to opened projects, a sandboxed renderer, Markdown without raw HTML, fixed commands without a shell).

Out of scope: AI-DLC itself, the agent CLIs the terminal runs (Claude Code, opencode) and GitHub CLI. Report problems in those to their own projects.
