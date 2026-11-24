# Functional Design Questions: U7 u7-constitution (US4.2 / US-1404)

Context: Spec Kit 1.4.x keeps the hooks in `.specify/extensions.yml` (`installed`, `settings`, and `hooks.before_<command>` / `hooks.after_<command>` lists, each hook with `extension`, `command`, `enabled`, `optional`). The commands an extension adds are not in that file: they are in each extension's own `.specify/extensions/<id>/extension.yml` (`provides.commands`). The editor already lets the constitution be saved, and keeps every other Spec Kit file read-only.

## Q1. [Design] Where the constitution and extensions show

AI-DLC shows its own rules in Configuration › AI-DLC. Where should the Spec Kit rules sit?

A. A Spec Kit section in Configuration (Configuration › Spec Kit), in the place of the AI-DLC section (Recommended: same place for the same kind of thing, FR1.4)
B. A sub-block under the Specs view in the left arm (Specs › Features | Rules)
C. A view of its own in the left arm, "Rules"
X. Other (please specify)

[Answer]: A

## Q2. [Developer] Where an extension's commands are read from

The quick commands (U5) need each installed extension's commands (FR5.2, contract C6 `commands`). `extensions.yml` only lists the commands its hooks run.

A. Read each installed extension's own `.specify/extensions/<id>/extension.yml` as well, with the same `yaml` package, read-only (Recommended: the full command list, as `specify extension info` shows it)
B. Only the commands named in `extensions.yml` hooks (simpler, but an extension with no hooks shows no commands)
X. Other (please specify)

[Answer]: A
