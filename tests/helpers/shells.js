// The shells the hook script tests run under (US-0506 u1 RD4, R-07): sh always, dash when installed.
// With THADEUS_REQUIRE_DASH=1 (set in CI) a missing dash fails the run instead of skipping it (NFR8.4).
import { spawnSync } from 'node:child_process';

const hasDash = spawnSync('dash', ['-c', 'exit 0']).status === 0;
if (!hasDash && process.env.THADEUS_REQUIRE_DASH === '1') throw new Error('THADEUS_REQUIRE_DASH=1 but dash is not installed');

export const SHELLS = hasDash ? ['sh', 'dash'] : ['sh'];
