// US-0414 FR2.1, NFR1: no native title= tooltip is left on a DOM element in the renderer; the shared Tooltip shows them.
// A title= prop on a component (CostTable's <caption>, Section's <h2>) is a caption, not a tooltip, and stays.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../src/renderer');

/** Every .jsx file under src/renderer. */
function jsxFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return jsxFiles(p);
    return d.name.endsWith('.jsx') ? [p] : [];
  });
}

/** `file:line <tag>` for each title= attribute whose nearest opening tag is a lowercase (DOM) element. */
function nativeTitles(file) {
  const src = readFileSync(file, 'utf8');
  const found = [];
  for (const m of src.matchAll(/\stitle=/g)) {
    const tags = [...src.slice(0, m.index).matchAll(/<([A-Za-z][\w.]*)/g)];
    const tag = tags.at(-1)?.[1] ?? '';
    if (/^[a-z]/.test(tag)) found.push(`${path.relative(ROOT, file)}:${src.slice(0, m.index).split('\n').length} <${tag}>`);
  }
  return found;
}

describe('native title tooltips (US-0414 FR2.1)', () => {
  it('finds the .jsx files it checks', () => {
    expect(jsxFiles(ROOT).length).toBeGreaterThan(20);
  });

  it('leaves no title= on a DOM element in src/renderer', () => {
    expect(jsxFiles(ROOT).flatMap(nativeTitles)).toEqual([]);
  });
});
