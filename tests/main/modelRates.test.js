// US-0211 US1.1 AC1.1.1–AC1.1.5, US1.5 AC1.5.2: the rate table per model, from the project's override file, the app's
// table and AI-DLC's shipped table, in that order; read again only when one of those files changes.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadRates, normalizeModel } from '../../src/main/modelRates.js';

const TMP_BASE = path.join(process.cwd(), 'tests/.tmp');
const row = (input) => ({ input, output: input * 5, cacheWrite5m: input * 1.25, cacheWrite1h: input * 2, cacheRead: input / 10 });
const AIDLC = { rates: { 'opus-5-5': row(4), 'sonnet-5-5': row(2), 'opus-4-8': row(5) } };
let root;

const write = async (rel, value) => {
  await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
  await fs.writeFile(path.join(root, rel), typeof value === 'string' ? value : JSON.stringify(value));
};
const settingsWith = (p) => ({ env: { AIDLC_MODEL_RATES: p } });

beforeEach(async () => {
  await fs.mkdir(TMP_BASE, { recursive: true });
  root = await fs.realpath(await fs.mkdtemp(path.join(TMP_BASE, 'rates-')));
  await write('.claude/tools/data/model-rates.json', AIDLC);
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('loadRates (US-0211 FR1.1–FR1.6)', () => {
  it('without an override, prices from the app table and from AI-DLC only where the app lacks the model (AC1.1.1)', async () => {
    const r = await loadRates(root);
    expect(r.rates['sonnet-5-5'].source).toBe('app');
    expect(r.rates['opus-4-8'].source).toBe('aidlc');
    expect(r.rates['opus-4-8'].input).toBe(5);
    expect(r.sources).toMatchObject({ 'sonnet-5-5': 'app', 'opus-4-8': 'aidlc', 'fable-5-2': 'app' });
    expect(r.notes).toEqual([]);
  });

  it("has the app's current list prices: sonnet-5-5 cache reads $0.10/M, rows for fable-5-2 and haiku-5-5 (AC1.1.5)", async () => {
    const { rates } = await loadRates(root);
    expect(rates['sonnet-5-5'].cacheRead).toBe(0.1);
    expect(rates['fable-5-2']).toMatchObject({ input: 8, output: 40, cacheRead: 0.2 });
    expect(rates['haiku-5-5']).toMatchObject({ input: 0.5, output: 2.5 }); // the higher prompt-size tier (FR1.4)
  });

  it('prices the models in the settings.local.json override from it, before settings.json (AC1.1.2)', async () => {
    await write('rates/local.json', { rates: { 'opus-5-5': row(1) } });
    await write('rates/shared.json', { rates: { 'opus-5-5': row(9), 'opus-4-8': row(9) } });
    await write('.claude/settings.local.json', settingsWith('rates/local.json'));
    await write('.claude/settings.json', settingsWith('rates/shared.json'));
    const r = await loadRates(root);
    expect(r.rates['opus-5-5']).toMatchObject({ input: 1, source: 'project' });
    expect(r.rates['opus-4-8'].source).toBe('aidlc'); // only one override file is used, the local one
    expect(r.overridePath).toBe('rates/local.json');
  });

  it('falls back to settings.json when settings.local.json names no override, and takes an absolute path', async () => {
    await write('rates/shared.json', { rates: { 'opus-4-8': row(3) } });
    await write('.claude/settings.local.json', { env: {} });
    await write('.claude/settings.json', settingsWith(path.join(root, 'rates/shared.json')));
    expect((await loadRates(root)).rates['opus-4-8']).toMatchObject({ input: 3, source: 'project' });
  });

  it("lets the app's project setting win over both settings files (AC1.1.3)", async () => {
    await write('rates/app.json', { rates: { 'opus-5-5': row(7) } });
    await write('rates/local.json', { rates: { 'opus-5-5': row(1) } });
    await write('.claude/settings.local.json', settingsWith('rates/local.json'));
    expect((await loadRates(root, { ratesPath: 'rates/app.json' })).rates['opus-5-5'].input).toBe(7);
  });

  it('skips a missing override file with a note and uses the next table (AC1.1.4)', async () => {
    await write('.claude/settings.json', settingsWith('rates/gone.json'));
    const r = await loadRates(root);
    expect(r.notes).toEqual([{ kind: 'overrideMissing', path: 'rates/gone.json' }]);
    expect(r.rates['sonnet-5-5'].source).toBe('app');
  });

  it('skips an override that is not valid JSON, or has no rates, with a note (AC1.1.4)', async () => {
    await write('rates/bad.json', '{ not json');
    expect((await loadRates(root, { ratesPath: 'rates/bad.json' })).notes).toEqual([{ kind: 'overrideInvalid', path: 'rates/bad.json' }]);
    await write('rates/shape.json', { opus: 1 });
    const r = await loadRates(root, { ratesPath: 'rates/shape.json' });
    expect(r.notes).toEqual([{ kind: 'overrideInvalid', path: 'rates/shape.json' }]);
    expect(r.rates['opus-5-5'].source).toBe('aidlc');
  });

  it('keeps working without AI-DLC table or with a broken settings file', async () => {
    await fs.rm(path.join(root, '.claude'), { recursive: true });
    await write('.claude/settings.json', '{ broken');
    const r = await loadRates(root);
    expect(r.rates['opus-5-5']).toBeUndefined();
    expect(r.rates['sonnet-5-5'].source).toBe('app');
  });

  it('reads the files once, and again only when one of them changes (AC1.5.2, NFR2)', async () => {
    await write('rates/local.json', { rates: { 'opus-5-5': row(1) } });
    await write('.claude/settings.local.json', settingsWith('rates/local.json'));
    const first = await loadRates(root);
    expect(await loadRates(root)).toBe(first); // nothing changed: the cached table
    await write('rates/local.json', { rates: { 'opus-5-5': row(2) } });
    const later = new Date(Date.now() + 5000);
    await fs.utimes(path.join(root, 'rates/local.json'), later, later);
    const second = await loadRates(root);
    expect(second).not.toBe(first);
    expect(second.rates['opus-5-5'].input).toBe(2);
  });
});

describe('normalizeModel (US-0211 FR2.3, as AI-DLC matches)', () => {
  const rates = { 'opus-5-5': row(4), 'haiku-5-5': row(1) };
  it('matches the wire forms and the bare ledger key exactly', () => {
    expect(normalizeModel('opus-5-5', rates)).toBe('opus-5-5');
    expect(normalizeModel('claude-opus-5-5', rates)).toBe('opus-5-5');
    expect(normalizeModel('global.anthropic.claude-opus-5-5[1m]', rates)).toBe('opus-5-5');
    expect(normalizeModel('converse/us.anthropic.claude-haiku-5-5-20261001-v1:0', rates)).toBe('haiku-5-5');
  });
  it('never borrows a family or another version, and refuses junk', () => {
    expect(normalizeModel('opus-5', rates)).toBeNull();
    expect(normalizeModel('claude-opus-5-5-1', rates)).toBeNull();
    expect(normalizeModel('opus', rates)).toBeNull();
    expect(normalizeModel('<synthetic>', rates)).toBeNull();
    expect(normalizeModel('converse/opus-5-5', rates)).toBeNull();
    expect(normalizeModel(null, rates)).toBeNull();
  });
});
