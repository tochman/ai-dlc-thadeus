// US-1101 FR6.1: the third-party licence list is built from what the packaged app bundles (package-lock.json).
import { describe, expect, it } from 'vitest';
import { collectLicenses } from '../../scripts/third-party-licenses.mjs';

/** A lock shaped like package-lock.json v3: the app itself at '', then one entry per installed package. */
const lock = {
  lockfileVersion: 3,
  packages: {
    '': { name: 'aidlc-dash', version: '0.2.6', license: 'MIT' },
    'node_modules/react': { version: '19.3.1', license: 'MIT' },
    'node_modules/@fontsource/antonio': { version: '5.3.0', license: 'OFL-1.1' },
    'node_modules/react-markdown/node_modules/react': { version: '19.3.1', license: 'MIT' }, // same package twice
    'node_modules/no-file': { version: '1.0.0', license: 'ISC' },
    'node_modules/monaco-editor': { version: '0.57.0', license: 'MIT', dev: true },
    'node_modules/@monaco-editor/react': { version: '4.7.0', license: 'MIT', dev: true },
    'node_modules/@monaco-editor/loader': { version: '1.7.0', license: 'MIT', dev: true },
    'node_modules/vitest': { version: '5.1.0', license: 'MIT', dev: true },
    'node_modules/eslint': { version: '9.39.5', license: 'MIT', dev: true }
  }
};
const files = {
  'node_modules/react': 'MIT License\nCopyright (c) Meta',
  'node_modules/react-markdown/node_modules/react': 'MIT License\nCopyright (c) Meta',
  'node_modules/@fontsource/antonio': 'SIL Open Font License 1.1',
  'node_modules/monaco-editor': 'MIT License\nCopyright (c) Microsoft',
  'node_modules/@monaco-editor/react': 'MIT License (react wrapper)',
  'node_modules/@monaco-editor/loader': 'MIT License (loader)',
  'node_modules/vitest': 'MIT License (vitest)',
  'node_modules/eslint': 'MIT License (eslint)'
};
const readText = (dir) => files[dir] ?? null;
const byName = (list) => Object.fromEntries(list.map((e) => [e.name, e]));

describe('collectLicenses (US-1101 FR6.1)', () => {
  it('lists every non-dev package once, with its version, licence and licence text, and leaves the app out', () => {
    const list = collectLicenses(lock, readText);
    const by = byName(list);
    expect(by.react).toEqual({ name: 'react', version: '19.3.1', license: 'MIT', text: 'MIT License\nCopyright (c) Meta' });
    expect(by['@fontsource/antonio'].text).toBe('SIL Open Font License 1.1');
    expect(list.filter((e) => e.name === 'react')).toHaveLength(1);
    expect(by['aidlc-dash']).toBeUndefined();
    expect(list.map((e) => e.name)).toEqual([...list.map((e) => e.name)].sort());
  });

  it('also lists the dev packages the renderer bundles (Monaco), and no other dev package', () => {
    const by = byName(collectLicenses(lock, readText));
    expect(by['monaco-editor'].text).toBe('MIT License\nCopyright (c) Microsoft');
    expect(by['@monaco-editor/react']).toBeTruthy();
    expect(by['@monaco-editor/loader']).toBeTruthy();
    expect(by.vitest).toBeUndefined();
    expect(by.eslint).toBeUndefined();
  });

  it('falls back to the license field when a package has no licence file', () => {
    const by = byName(collectLicenses(lock, readText));
    expect(by['no-file']).toEqual({ name: 'no-file', version: '1.0.0', license: 'ISC', text: 'License: ISC (no licence file in the package)' });
  });
});
