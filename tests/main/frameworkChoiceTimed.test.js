// US-1406 NFR4.3: the choice screen's scan answers within 1 s (300 ms is the aim). In the retried `scripts` project, so a
// loaded machine does not make it flaky.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { frameworkScan } from '../../src/main/frameworkChoice.js';

let tmp;

beforeEach(async () => {
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'thadeus-choice-timed-')));
  await fs.mkdir(path.join(tmp, 'bin'));
  await fs.mkdir(path.join(tmp, 'aidlc/spaces/default'), { recursive: true });
  await fs.mkdir(path.join(tmp, '.specify'));
  vi.stubEnv('PATH', [path.join(tmp, 'bin'), path.join(tmp, 'none-1'), path.join(tmp, 'none-2')].join(path.delimiter));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await fs.rm(tmp, { recursive: true, force: true });
});

it('frameworkScan with a stubbed PATH returns within 1 s (NFR4.3)', async () => {
  const exec = async () => {
    throw new Error('the login shell is stubbed out: the app PATH is used');
  };
  const started = performance.now();
  const scan = await frameworkScan(await openRoot(tmp), { exec });
  expect(performance.now() - started).toBeLessThan(1000);
  expect(scan.proposal).toBeNull();
});
