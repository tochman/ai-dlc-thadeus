# Accessibility Checklist: US-0208, detailed token view (WCAG 2.1 AA)

- [ ] The small view is a `button` with an accessible name; Enter and Space open the detail.
- [ ] On open, focus moves to the `h2` "Tokens"; Back and Esc return focus to the small view.
- [ ] Each chart is a `section` with an `h3`; the SVG has `role="img"` and an `aria-label` that sums it up (for example "Tokens over time, 1 h 42 m, 5.6 M tokens").
- [ ] Every series has a text label in the legend and in the tooltip; no meaning by colour alone.
- [ ] Tooltips show on keyboard focus as well as on hover; arrow keys move between points or bars; Esc hides it.
- [ ] Switches are buttons with `aria-pressed`; their labels say what they switch.
- [ ] Table mode is a real `<table>` with `<th scope="col">`, a caption naming the chart, right-aligned numbers.
- [ ] Text contrast: `--text` and `--text-2` on `--slate-1`/`--bg` meet 4.5:1; series fills against `--slate-1` meet 3:1 (amber, coral, steel, steel-light, slate-5).
- [ ] Missing data is said in text, never as an empty or zero chart.
- [ ] Motion follows the animations setting: reduced and off draw new data without easing.
- [ ] Below about 900 px, the frames stack and nothing scrolls sideways except a wide table inside its own frame.
