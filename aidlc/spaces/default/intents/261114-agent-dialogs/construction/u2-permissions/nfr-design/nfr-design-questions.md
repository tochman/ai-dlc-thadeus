# NFR Design questions: u2-permissions

## Q1. [Product] What should the permission dialog do with "Allow always" on opencode?

opencode remembers an "Allow always" choice by its own rule patterns, and the app cannot always say what those patterns are (NFR Requirements review, Major finding on NFR3.17).

A. Show "Allow always" with the exact patterns opencode will remember when the request carries them; when it carries none, do not offer "Allow always" (Allow once and Deny stay)
B. Never offer "Allow always" for opencode; use opencode's own prompt for that. Claude Code keeps it
C. Always offer it, with a generic label even when the app cannot say what opencode will remember
X. Other (please specify)

[Answer]: A
**Mode:** guided
