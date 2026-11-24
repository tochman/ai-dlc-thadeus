# Security Design: U5 u5-speckit-commands

Sources: `security-requirements.md` in `../nfr-requirements/` (and its review's Minor points), the U5 `functional-spec.md` and `rules.md`, and contracts C6 and C7 in `contract-summary.md`. No login, network call or secret. The boundary is the text U5 types into a live agent terminal: it must hold exactly one command line.

| NFR | Design |
|---|---|
| NFR3.1 | U5 imports no fs module and calls no write IPC. The existing Spec Kit write-spy test is extended: the view with every button clicked makes zero fs write, mkdir, rename or unlink calls. |
| NFR4.1 | The only way out is `useTerminal().type('agent', text, { submit: true })`. No `child_process`, no new IPC channel. A test checks the new files import neither `child_process` nor `window.api` channels beyond `speckit:rules`. |
| NFR4.2 | `speckitCommand(harness, name, args)` accepts a name only when it is a core stem or matches `^speckit(\.[a-z0-9_-]+)+$` (case-insensitive), the same form U7's reader uses (NFR3.3 of U7); otherwise it returns `null` and no button renders. It then maps the name: claude `/speckit-<stem with . as ->`, opencode `/speckit.<stem>`. Tests: `speckit.git.commit` gives a command; `a;rm -rf`, `x\ny`, `speckit.` and `''` give `null`. |
| NFR4.3 | `specifyText(raw)`: replace `\r`, `\n`, `\t`, U+2028 and U+2029 with a space; remove every other control character (C0, DEL and C1, `\p{Cc}`) so an escape sequence loses its ESC; collapse runs of spaces; trim; cut to 1,000 characters; an empty result is `null`. Tests: `a\nb\tc\u001b[2J` gives `a b c[2J`; `\u0085` and ` ` become spaces; 1,500 characters give 1,000; blanks give `null`. |
| NFR4.4 | `type` is called only from a button's `onClick`; no effect calls it. The text is `command` or `command + ' ' + args`, and `submit: true` adds the one Enter. Renderer tests: mount and a `speckit:changed` push make zero `type` calls; a click makes one, with `submit: true`. |
| NFR5.1 | A rejected `speckit:rules` call, or a result naming read errors or `hooksChecked: false`, still shows the core four and one note (`speckit.commands.rulesError`) that extension commands could not all be read. |
| NFR6.1 | The button is ready only when the agent tab's harness is `claude` or `opencode` and the tab is idle; otherwise it is disabled with its reason: no tab, harness not known yet (`terminal.checking`), harness not supported, working (`intents.resume.busy`), asking (`intents.resume.asking`). Test per harness: claude, opencode, codex, unknown. |

**A failed send.** `type` resolves `false` when the tab is gone, and may reject. Either way the button clears `sending`, shows `speckit.commands.sendFailed` beside it, and `console.warn`s the cause. The specify field keeps its text so nothing typed is lost; it is cleared only after a send that resolved `true`.
