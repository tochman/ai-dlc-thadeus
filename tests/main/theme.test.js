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
    const outside = css.replace(ROOT, '').split('\n').filter((line) => COLOUR.test(line));
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
