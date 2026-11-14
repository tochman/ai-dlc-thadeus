# Functional Design questions: u4-install

Background: the rest of this Unit is settled (US4.1, mockups M7 and M8, ADR-004: the app's entries are those whose command runs a script in `.thadeus/hooks/`; the opencode plugin is `.opencode/plugins/thadeus-dialog.ts`). One case is open: the Refined Mockups review (R-05) noted that nothing says what Update does with an app entry someone has edited by hand.

## Q1. [Product] What should Update do with an app entry or plugin file that was edited by hand?

An entry still runs a script in `.thadeus/hooks/` but differs from what the app would write (for example a teammate changed its timeout), or the plugin file differs from the app's version.

A. Show it as "edited by hand" and, in the preview, show the edit being replaced by the app's version; Update replaces it only after the person's yes
B. Show it as "edited by hand" and leave it alone; Update skips it and says so, Remove still removes it
C. Keep the hand edit where it does not conflict (merge), replace the rest
X. Other (please specify)

[Answer]: A
**Mode:** guided
