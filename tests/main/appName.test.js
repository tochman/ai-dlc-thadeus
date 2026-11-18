import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import * as names from '../../src/shared/appName.js';

const SRC = path.resolve(__dirname, '../../src');
const OLD_NAME = /aidlc[ -]control/i; // "Auctum AIDLC Control", "Aidlc control", the old appId
// Comments may tell the history of the name; only code and markup count.
const withoutComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\/.*$/gm, '');

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
      APP_VENDOR: 'Auctum',
      APP_REPO: 'tochman/ai-dlc-thadeus',
      APP_REPO_URL: 'https://github.com/tochman/ai-dlc-thadeus'
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
    // US-0608 FR9: only the end-to-end tests point it elsewhere, through THADEUS_E2E_USER_DATA.
    expect(main).toContain("app.setPath('userData', process.env.THADEUS_E2E_USER_DATA || join(app.getPath('appData'), 'aidlc-dash'));");
  });

  // US-0027: the repository was renamed from tochman/aidlc-dash to tochman/ai-dlc-thadeus on 2026-11-17.
  it('uses the repository name from appName.js everywhere, with no old address left (US-0027)', () => {
    const OLD_REPO = 'tochman/' + 'aidlc-dash';
    const ROOT = path.resolve(__dirname, '../..');
    const files = [...sourceFiles(SRC), path.join(ROOT, 'package.json'), path.join(ROOT, 'README.md')];
    const offending = files.filter((f) => readFileSync(f, 'utf8').includes(OLD_REPO));
    expect(offending.map((f) => path.relative(ROOT, f))).toEqual([]);
    for (const f of ['main/updater.js', 'main/menu.js', 'main/ipc.js']) {
      expect(readFileSync(path.join(SRC, f), 'utf8')).not.toMatch(/github\.com\/tochman\//);
    }
  });
});
