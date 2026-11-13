import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import * as names from '../../src/shared/appName.js';

const SRC = path.resolve(__dirname, '../../src');
const OLD_NAME = /aidlc[ -]control/i; // "Auctum AIDLC Control", "Aidlc control", the old appId
// Comments may tell the history of the name; only code and markup count.
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\/.*$/gm, '');

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(jsx?|html|css)$/.test(entry.name) ? [full] : [];
  });
}

describe('app name (EPIC-04 US-0406)', () => {
  it('has every form of the name in one module (FR1.1)', () => {
    expect({ ...names }).toEqual({
      APP_NAME: 'T.H.A.D.E.U.S.',
      APP_FULL_NAME: 'Transformative Human-AI Development Environment for Ubiquitous Systems',
      APP_TAGLINE: 'AI-driven software development, under human direction.',
      APP_SHORT: 'THADEUS',
      APP_VENDOR: 'Auctum'
    });
  });

  it('leaves no old name in user-facing text under src/ (FR5.1)', () => {
    const files = sourceFiles(SRC);
    expect(files.length).toBeGreaterThan(10); // the scan really reads the sources
    const offending = files.filter((f) => OLD_NAME.test(withoutComments(readFileSync(f, 'utf8'))));
    expect(offending.map((f) => path.relative(SRC, f))).toEqual([]);
    expect(OLD_NAME.test(withoutComments("const n = 'Auctum AIDLC Control';"))).toBe(true); // the check bites
  });

  it('keeps userData in aidlc-dash so settings survive the rename (FR4.1)', () => {
    const main = readFileSync(path.join(SRC, 'main/index.js'), 'utf8');
    expect(main).toContain("app.setPath('userData', join(app.getPath('appData'), 'aidlc-dash'));");
  });
});
