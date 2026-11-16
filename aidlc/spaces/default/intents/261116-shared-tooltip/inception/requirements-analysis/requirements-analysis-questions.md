# Requirements Analysis Questions: US-0414 one LCARS tooltip across the app

Context: the scan found 33 tooltips: 31 native `title=`, the split-bar row tip (the look to copy) and the "Tokens over time" chart tooltip. Of the 31, 10 are on interactive elements, 7 sit on spans inside a button, and 14 are on plain text. See `inception/reverse-engineering/developer-scan.md`, "Tooltip Inventory".

## Q1. [Developer] How the shared tooltip is built

The tooltip must stay inside the window and flip to the side that has room. Scroll areas such as `.lcars-frame-body` (`overflow: auto`) clip anything positioned inside them. No positioning library is installed.

A. A small `Tooltip` component that renders into `document.body` (a React portal), measures itself and its anchor, and flips or clamps to stay in the window. No new dependency.
B. A CSS class only, positioned inside each element. This is smaller, but scroll areas clip it and it cannot flip at the window edge.
C. Add a positioning library (`@floating-ui/react`) and build the component on it.
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)

## Q2. [Product owner] Tooltips on plain text

Fourteen tooltips sit on text that cannot take keyboard focus, for example the cost figures and warning tags in the cost tab, the branch name in the header, the readout names, and the ⓘ next to "estimated cost". The story says a tooltip opens on hover and when reached by keyboard. What should these do?

A. Make each of them focusable (Tab reaches them), so their tooltip opens on focus as well as on hover.
B. Make focusable only those whose text adds information (the ⓘ, warning and "price missing" tags, cost breakdowns). The rest keep a hover-only tooltip, or lose it where it only repeats the visible text.
C. Show the tooltip on hover only, and give screen readers the text through `aria-describedby`. No new Tab stops.
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)

## Q3. [Designer] Tooltips on parts of a button

Seven tooltips sit on small parts inside a button: an intent row's cost, plan name, done/executed count and error tag, and a stage card's level bar, mismatch flag and cost. The keyboard can only reach the button itself.

A. Combine them into the button's own tooltip, so one tooltip per button lists those details.
B. Keep each part's own tooltip on hover, and give the button the combined text for the keyboard (on focus).
C. Keep each part's own tooltip on hover only.
X. Other (please specify)

[Answer]: C (2026-11-16, **Mode:** guided)

## Q4. [Developer] The two disabled controls

The Resume button shows why it cannot run only while it is disabled, and a disabled button gets neither focus nor hover. The terminal's quick-command list has a disabled "no command" `<option>`, and a list option cannot hold an in-page tooltip.

A. Make the Resume button `aria-disabled` (it can be focused and hovered, but clicking does nothing) and give it the shared tooltip. Move the "no command" hint to the quick-command list's own tooltip.
B. Wrap the disabled Resume button in an element that carries the tooltip, and leave the list option's native tooltip as the one exception.
C. Leave both as native tooltips, as the story's two exceptions.
X. Other (please specify)

[Answer]: A (2026-11-16, **Mode:** guided)

## Q5. [Product owner] Keyboard users and the tooltips on parts of a button

Your Q3 answer (parts keep a hover-only tooltip) leaves those seven tooltips out of reach of the keyboard. The story's first criterion says every tooltip opens on hover and when reached by keyboard, and your Q2 answer makes even plain text focusable. How should these seven count?

A. As a stated exception: record in the story that these seven are hover-only, and give screen readers their text through the button's `aria-describedby`.
B. Change Q3 to its B: keep the hover tooltips on the parts, and show the combined text when the button gets keyboard focus.
C. As a stated exception, hover-only, with nothing added for screen readers.
X. Other (please specify)

[Answer]: B (2026-11-16, **Mode:** guided; replaces the Q3 answer C with Q3 B)
