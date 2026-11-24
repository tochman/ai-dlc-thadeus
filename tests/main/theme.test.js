import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const RENDERER = path.resolve(__dirname, '../../src/renderer');
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '');
const css = withoutComments(readFileSync(path.join(RENDERER, 'theme.css'), 'utf8'));
const ROOT = /:root\s*\{[^}]*\}/;
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i;

// The approved mockup's Designsystem, exactly (EPIC-04 FR1.1).
const TOKENS = {
  '--bg': '#05060a',
  '--slate-1': '#11151f',
  '--slate-2': '#2b3145',
  '--slate-3': '#4a5370',
  '--slate-4': '#6f7894',
  '--slate-5': '#9aa2bb',
  '--steel-deep': '#1f3b57',
  '--steel': '#4fa3d9',
  '--steel-text': '#7cc0ea',
  '--coral': '#ee6c56',
  '--coral-soft': '#f2a389',
  '--amber': '#ff9e40',
  '--text': '#e6e9f2',
  '--text-2': '#c3c9d8',
  '--muted': '#9aa3b8',
  '--on-light': '#000000'
};

describe('theme tokens', () => {
  it('defines the mockup palette on :root and none of the old one (FR1.1, FR1.4)', () => {
    const root = css.match(ROOT)?.[0] ?? '';
    for (const [name, value] of Object.entries(TOKENS)) expect(root).toContain(`${name}: ${value};`);
    for (const old of ['--lavender', '--orange', '--green', '--red', '--blue', '--panel']) expect(root).not.toContain(`${old}:`);
  });

  it('has no colour literal outside :root, in the components or as the window colour (FR1.2)', () => {
    const outside = css
      .replace(ROOT, '')
      .split('\n')
      .filter((line) => COLOUR.test(line));
    expect(outside).toEqual([]);

    const sources = readdirSync(RENDERER).filter((f) => /\.jsx?$/.test(f));
    const offending = sources.flatMap((f) =>
      readFileSync(path.join(RENDERER, f), 'utf8')
        .split('\n')
        .filter((line) => COLOUR.test(line))
        .map((line) => `${f}: ${line.trim()}`)
    );
    expect(offending).toEqual([]);

    const main = readFileSync(path.resolve(__dirname, '../../src/main/index.js'), 'utf8');
    expect(main).toMatch(/backgroundColor: '#05060a'/); // --bg, so the window never flashes another colour
  });
});

const rule = (selector) => css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.-]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? '';

describe('LCARS labels in both languages (EPIC-07 US-0701 FR8)', () => {
  it('lets a long word wrap or shrink inside its block instead of overflowing it (FR8.1, FR8.2)', () => {
    const block = rule('.lcars-block');
    expect(block).toMatch(/min-width: 0;/);
    expect(block).toMatch(/overflow-wrap: anywhere;/);
    expect(block).toMatch(/hyphens: auto;/);
    const label = rule('.lcars-label');
    expect(label).toMatch(/min-width: 0;/);
    expect(label).toMatch(/overflow-wrap: anywhere;/);
    // The fixed-width tabs shrink their text before it wraps.
    expect(rule('.lcars-block--tab')).toMatch(/font-size: clamp\(/);
    expect(rule('.lcars-block--tab')).toMatch(/max-width: 132px;/);
  });
});

describe('one LCARS select everywhere (hotfix)', () => {
  it('gives every <select> in the renderer the shared lcars-select class', () => {
    const selects = readdirSync(RENDERER)
      .filter((f) => f.endsWith('.jsx'))
      .flatMap((f) => (readFileSync(path.join(RENDERER, f), 'utf8').match(/<select\b[^>]*/g) ?? []).map((tag) => [f, tag]));
    expect(selects.length).toBeGreaterThanOrEqual(12);
    for (const [file, tag] of selects) expect([file, /className="lcars-select[ "]/.test(tag)]).toEqual([file, true]);
  });

  it('styles the closed control, the open list and its options with customizable select', () => {
    expect(css).toMatch(/\.lcars-select, \.lcars-select::picker\(select\) \{ appearance: base-select; \}/);
    expect(css).toMatch(/\n\.lcars-select::picker\(select\) \{[^}]*background: var\(--bg\);/);
    expect(rule('.lcars-select::picker-icon')).toMatch(/background: var\(--slate-5\);/); // US-0417: amber is the mark and focus only
    expect(css).toMatch(/\.lcars-select option \{[^}]*padding:/);
    expect(css).toMatch(/\.lcars-select option:checked \{ background: var\(--slate-5\); color: var\(--on-light\); \}/);
    expect(css).toMatch(/\.lcars-select option::checkmark \{/);
    expect(css).not.toMatch(/(^|[\s,])select(:hover)?\s*\{/); // no bare select rule left beside the shared one
  });

  it('keeps the bar select as tall as the bar, borderless and on the dark segment', () => {
    const bar = rule('.lcars-select--bar');
    expect(bar).toMatch(/height: var\(--bar\);/);
    expect(bar).toMatch(/background: var\(--steel-deep\);/);
    expect(bar).toMatch(/border: 0;/);
  });
});

describe('terminal elbow', () => {
  it('sizes the faded mark from the block, with equal margins (US-0417: the label moved to the foot bar)', () => {
    const mark = rule('.terminal-elbow-mark');
    expect(mark).toMatch(/width: calc\(100% - 2 \* var\(--gap\)\);/);
    expect(mark).toMatch(/left: var\(--gap\);/);
    expect(mark).not.toMatch(/width: \d+px/);
    expect(rule('.terminal-elbow-label')).toBe('');
  });
});

describe('busy glow keeps block edges aligned', () => {
  it('draws the 1px ring of the breathing glow inside the block, never outside it', () => {
    const keyframes = /@keyframes lcars-breathe\s*\{([\s\S]*?)\n\}/.exec(css)?.[1];
    expect(keyframes).toBeTruthy();
    const shadows = [...keyframes.matchAll(/box-shadow:([^;]+);/g), ...css.matchAll(/\.is-breathing\s*\{[^}]*box-shadow:([^;]+);/g)].map((m) => m[1]);
    expect(shadows.length).toBeGreaterThanOrEqual(3);
    for (const s of shadows) {
      expect(s).not.toMatch(/(^|,)\s*0 0 0 1px/);
      expect(s).toMatch(/inset 0 0 0 1px/);
    }
  });
});

describe('the terminal arm (US-0017)', () => {
  it('gives the bow to the first tab only, so a second agent tab is a plain block', () => {
    expect(css).not.toMatch(/\.term-tab--agent\s*\{[^}]*border-radius/);
    expect(css).toMatch(/\.term-tab:first-child\s*\{[^}]*border-radius:\s*32px 0 0 0/);
  });
});

describe('the latest-message line in the frame (US-0018)', () => {
  it('has its own full-width row above the terminal, on one line', () => {
    const app = css.match(/\.app\s*\{[^}]*\}/)?.[0] ?? '';
    expect(app).toMatch(/grid-template-areas:\s*'head head'\s*'arm main'\s*'msg msg'\s*'term term'/);
    const line = css.match(/\.latest-message\s*\{[^}]*\}/)?.[0] ?? '';
    expect(line).toMatch(/grid-area:\s*msg/);
    expect(line).toMatch(/white-space:\s*nowrap/);
    expect(line).toMatch(/text-overflow:\s*ellipsis/);
  });
});

describe('the agent dialog (US-0020)', () => {
  it('puts a choice description on its own line', () => {
    expect(css).toMatch(/\.question-popup-choice small\s*\{[^}]*display:\s*block/);
  });
  it('draws no focus box around the title it focuses on open', () => {
    expect(css).toMatch(/#agent-dialog-title:focus\s*\{[^}]*outline:\s*none/);
  });
  it('folds shut when it closes, with full motion only', () => {
    expect(css).toMatch(/:root\[data-motion='full'\] \.agent-dialog\s*\{[^}]*transition:[^}]*allow-discrete/);
    expect(css).toMatch(/:root\[data-motion='full'\] \.agent-dialog:not\(\[open\]\)\s*\{[^}]*transform:\s*scaleY\(0\)/);
  });
});

describe('the token detail view (US-0208 FR7)', () => {
  it('US-0022: shows the header Activity button only where the frame arm is hidden (US-0417)', () => {
    expect(css).toMatch(/\.intent-tokens-open\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/@container \(max-width: 560px\) \{ \.intent-tokens-open \{ display: flex; \} \}/);
  });

  it('adds the cache write 5 m steel to the palette', () => {
    expect(css.match(ROOT)?.[0]).toContain('--steel-mid: #2f6f9f;');
  });
  it('draws in, grows and eases only with full motion', () => {
    expect(css).toMatch(/:root\[data-motion='full'\] \.token-detail-areas\s*\{[^}]*animation:\s*lcars-draw/);
    expect(css).toMatch(/:root\[data-motion='full'\] \.token-detail-bar-grow\s*\{[^}]*animation:\s*token-detail-grow[^}]*transition:\s*transform 300ms/);
    expect(css).toMatch(/:root\[data-motion='full'\] \.token-detail-rate-line\.is-live\s*\{[^}]*animation:\s*lcars-glow-steel/);
    // No easing outside full motion: the transitions live only under the full-motion selector.
    const unguarded = css.split('\n').filter((line) => /^\.token-detail[^{]*\{[^}]*(transition|animation):/.test(line));
    expect(unguarded).toEqual([]);
  });
});

// US-0417: the written rules, the one scale and the colour rule (the approved mockup's rules panel).
describe('the US-0417 LCARS language', () => {
  const raw = readFileSync(path.join(RENDERER, 'theme.css'), 'utf8');

  it('writes the rules down in the theme', () => {
    for (const name of [
      'Containment',
      'No local bulges',
      'Gaps',
      'Curves follow curves',
      'Titles',
      'Readouts never look like controls',
      'Colour rule',
      'Shape rule',
      'Entrance'
    ])
      expect(raw).toContain(name);
  });

  it('defines one spacing scale, one set of bar thicknesses, the elbow ratios, the title sizes and the motion tokens', () => {
    const root = css.match(ROOT)?.[0] ?? '';
    for (const token of [
      '--gap: 6px;',
      '--gap-m: 12px;',
      '--gap-l: 18px;',
      '--bar-thin: 18px;',
      '--bar-med: 30px;',
      '--bar-large: 42px;',
      '--bar-wide: 60px;',
      '--bar-thick: 150px;',
      '--elbow-outer: 0.7;',
      '--elbow-inner: 1.4;',
      '--title-window: 35px;',
      '--title-frame: 49px;',
      '--title-section: 21px;',
      '--e-dur: 300ms;',
      '--e-stagger: 25ms;'
    ])
      expect(root).toContain(token);
  });

  it('keeps amber for the mark and the focus ring only', () => {
    const uses = [...css.matchAll(/([^{}]+)\{[^}]*var\(--amber\)[^}]*\}/g)].map((m) => m[1].trim());
    expect(uses.length).toBeGreaterThan(0);
    expect(uses.filter((selector) => !/focus|mark/.test(selector))).toEqual([]);
    expect(rule('.app-brand')).toMatch(/background: var\(--slate-4\);/); // the brand corner is slate, its mark amber
    expect(css).toMatch(/\.app-brand \.app-mark\s*\{[^}]*color: var\(--amber\);/);
  });

  it('animates the drawer and the entrance only with full motion, with transform and opacity only', () => {
    const lines = css.split('\n');
    const unguarded = lines.filter((line) => /^\.(lcars-drawer|is-entering)[^{]*\{[^}]*(transition|animation):/.test(line));
    expect(unguarded).toEqual([]);
    expect(css).toMatch(/:root\[data-motion='full'\] \.lcars-drawer[^{]*\{[^}]*transition:/);
    expect(css).toMatch(/:root\[data-motion='full'\] \.is-entering \.lcars-e-block\s*\{[^}]*animation:/);
    for (const frames of css.matchAll(/@keyframes lcars-e-[a-z]+\s*\{([\s\S]*?)\n\}/g)) expect(frames[1]).not.toMatch(/(width|height|left|top|margin):/);
  });

  it('keeps the window clear of the macOS menu bar in full screen', () => {
    expect(css).toMatch(/\.app\.is-fullscreen\s*\{[^}]*padding-top: 28px;/);
  });

  it('gives a read-only meter no knob, hover or pointer', () => {
    expect(rule('.lcars-meter')).toMatch(/cursor: default;/);
    expect(css).not.toMatch(/\.lcars-(meter|segmeter)[^{]*:hover/);
  });

  // US-1402 FR6: the Spec Kit views follow the same language.
  it('draws the Spec Kit views in the LCARS language: scale gaps, no cards, square state blocks, selection by brightness', () => {
    const speckit = [...css.matchAll(/(?:^|\n)(\.speckit[^{]*)\{([^}]*)\}/g)];
    expect(speckit.length).toBeGreaterThan(0);
    for (const [, , body] of speckit) {
      expect(body).not.toMatch(/border-radius/); // square blocks, no pills for readouts
      expect(body).not.toMatch(/gap: \d/); // gaps come from --gap, --gap-m, --gap-l
    }
    expect(rule('.speckit-feature')).toBe(''); // no boxed card
    expect(rule('.speckit-list .link.is-selected, .speckit-files .link.is-selected')).toMatch(/background: var\(--slate-5\);[^}]*color: var\(--on-light\);/);
    expect(rule('.speckit-flow li')).toMatch(/border-left: var\(--gap\) solid var\(--slate-3\);/);
    expect(rule('.speckit-flow li.is-done')).toMatch(/border-left-color: var\(--slate-5\);/);
  });
});

// US-0417: the intent tabs stay one row of tiles, so the tab content never draws over a wrapped second row.
describe('intent tab tiles (US-0417)', () => {
  it('keeps the tab row on one line, unshrunk, with tiles that may narrow', () => {
    expect(css).toMatch(/\.detail-tabs\s*\{[^}]*flex-wrap:\s*nowrap[^}]*\}/);
    expect(css).toMatch(/\.detail-tabs\s*\{[^}]*flex:\s*none[^}]*\}/);
    expect(css).toMatch(/\.detail-tabs \.lcars-tile\s*\{[^}]*min-width:\s*0[^}]*\}/);
  });
});
