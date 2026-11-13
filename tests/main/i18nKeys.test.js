import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import IntlMessageFormat from 'intl-messageformat';
import sv from '../../src/shared/locales/sv.json';
import en from '../../src/shared/locales/en.json';

const SRC = path.resolve(__dirname, '../../src');

/** { 'a.b.c': text } for every leaf of a nested translation file. */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
const SV = flatten(sv);
const EN = flatten(en);

/** The argument names an ICU text uses ({name}, {n, plural, ...}), also inside plural and select options. */
function placeholders(text) {
  const names = new Set();
  const walk = (elements) => {
    for (const el of elements) {
      if (el.type >= 1 && el.type <= 6) names.add(el.value); // argument, number, date, time, select, plural
      for (const option of Object.values(el.options ?? {})) walk(option.value);
      if (el.children) walk(el.children);
    }
  };
  walk(new IntlMessageFormat(text, 'en', undefined, { ignoreTag: true }).getAst());
  return [...names].sort();
}

const sources = readdirSync(SRC, { recursive: true })
  .filter((f) => /\.jsx?$/.test(f))
  .map((f) => ({ file: f, text: readFileSync(path.join(SRC, f), 'utf8') }));

/** Lines of interface text with å, ä or ö, outside comments and console.* calls (FR1.4). */
function swedishLines(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '') // block and JSX comments
    .split('\n')
    .map((line) => line.replace(/(^|\s)\/\/.*$/, '')) // line comments (not the // of a URL)
    .filter((line) => !line.includes('console.') && /[åäöÅÄÖ]/.test(line));
}

describe('translation keys (EPIC-07 US-0701 FR7)', () => {
  it('has exactly the same keys in sv.json and en.json, and no empty text (FR7.1, FR5.1)', () => {
    expect(Object.keys(SV).sort()).toEqual(Object.keys(EN).sort());
    for (const [file, texts] of [['sv', SV], ['en', EN]]) {
      const empty = Object.entries(texts).filter(([, v]) => typeof v !== 'string' || v.trim() === '').map(([k]) => k);
      expect(empty, file).toEqual([]);
    }
  });

  it('has every literal t(…) key used in src/ in en.json (FR7.2)', () => {
    const used = sources.flatMap(({ file, text }) =>
      [...text.matchAll(/\b(?:t|translate)\(\s*(['"])([^'"`$]+)\1/g)].map((m) => ({ file, key: m[2] }))
    );
    expect(used.length).toBeGreaterThan(300); // the scan really finds the calls
    expect(used.filter(({ key }) => !(key in EN))).toEqual([]);
  });

  it('uses the same {placeholders} for a key in both languages, and every text parses as ICU (FR7.3, FR3.2)', () => {
    const differing = Object.keys(EN)
      .map((key) => ({ key, sv: placeholders(SV[key]), en: placeholders(EN[key]) }))
      .filter((p) => p.sv.join() !== p.en.join());
    expect(differing).toEqual([]);
    expect(placeholders('{n, plural, one {# klar} other {# av {total}}}')).toEqual(['n', 'total']); // the check itself
  });

  it('leaves no Swedish interface text in the renderer or the app menu (FR1.4 regression)', () => {
    // The check itself: interface text is caught, comments and console logs are not.
    expect(swedishLines("<button>Stäng</button>\nconst x = 'Öppna';")).toHaveLength(2);
    expect(swedishLines("// Stäng\n/* Öppna */\nconsole.error('Kunde inte läsa', err);\nfetch('https://x.se') // Hjälp")).toEqual([]);

    const checked = sources.filter(({ file }) => file.startsWith(`renderer${path.sep}`) || file === path.join('main', 'menu.js'));
    expect(checked.length).toBeGreaterThan(20);
    const offending = checked.flatMap(({ file, text }) => swedishLines(text).map((line) => `${file}: ${line.trim()}`));
    expect(offending).toEqual([]);
  });
});
