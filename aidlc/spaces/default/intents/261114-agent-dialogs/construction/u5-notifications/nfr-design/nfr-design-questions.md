# NFR Design questions: u5-notifications

## Q1. [Product] What should a permission notification show?

The NFR Requirements (NFR3.53) narrowed the body to the tool or action only, because a command line is the likeliest place for a token. That changes the approved D3.

A. Tool name only: show only the tool or action, never the command
B. Tool and command line: as approved in D3, the tool and the first line of the command, cleaned and cut short
X. Other (please specify)

[Answer]: B
**Mode:** guided

## Q2. [Product] Is it acceptable that the first line of agent text can appear on the lock screen?

macOS shows it or not according to its own notification preview setting.

A. Accept: keep the first line; the operating system's "Show previews" setting decides
B. Generic text only: never put agent text in a notification, only the kind and the project name
X. Other (please specify)

[Answer]: A
**Mode:** guided
