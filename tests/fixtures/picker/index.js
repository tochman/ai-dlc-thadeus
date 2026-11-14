// Claude Code's question picker as screens, one row per line (EPIC-00 US-0006). The layout is transcribed from the
// person's screenshot of the real picker; the variants change one thing each (see each file's name).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The rows of tests/fixtures/picker/<name>.txt. */
export const fixture = (name) =>
  readFileSync(join(process.cwd(), 'tests/fixtures/picker', `${name}.txt`), 'utf8').replace(/\n$/, '').split('\n');
