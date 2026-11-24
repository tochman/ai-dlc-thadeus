// US-1407 NFR7.3: the switch preview of a project with 20 intents or 20 features is ready within 2 s (aim 500 ms).
// Runs in the retried `scripts` project, after the parallel ones.
import { afterEach, beforeEach, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { switchPreview } from '../../src/main/frameworkSwitch.js';

let root;
beforeEach(async () => {
  root = await openRoot(await fs.mkdtemp(path.join(os.tmpdir(), 'thadeus-fst-')));
});
afterEach(() => fs.rm(root, { recursive: true, force: true }));

async function put(rel, text = '') {
  await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
  await fs.writeFile(path.join(root, rel), text);
}

async function timed(fn) {
  const start = performance.now();
  const value = await fn();
  return { value, ms: performance.now() - start };
}

it('previews 20 intents and 20 features within 2 s each', async () => {
  const entries = Array.from({ length: 20 }, (_, i) => ({ dirName: `2611${String(i).padStart(2, '0')}-intent-${i}`, status: 'active' }));
  await put('aidlc/spaces/default/intents/intents.json', JSON.stringify(entries));
  for (const e of entries) await put(`aidlc/spaces/default/intents/${e.dirName}/aidlc-state.md`, '# State\n');
  await put('.specify/init-options.json', '{}');
  for (let i = 0; i < 20; i++) await put(`specs/${String(i + 1).padStart(3, '0')}-feature/tasks.md`, '- [x] T001 a\n- [ ] T002 b\n');

  const fromAidlc = await timed(() => switchPreview(root, 'aidlc', 'speckit'));
  expect(fromAidlc.value.inProgress).toHaveLength(20);
  expect(fromAidlc.ms).toBeLessThan(2000);

  const fromSpeckit = await timed(() => switchPreview(root, 'speckit', 'aidlc'));
  expect(fromSpeckit.value.inProgress).toHaveLength(20);
  expect(fromSpeckit.ms).toBeLessThan(2000);
});
