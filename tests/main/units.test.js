// US-0507 FR6.1: a Unit runs from BOLT_STARTED or WORKTREE_CREATED until BOLT_COMPLETED, as builds log today.
import { describe, expect, it } from 'vitest';
import { unitStatuses } from '../../src/main/parsers/units.js';

const dag = { units: [{ name: 'u1-a' }, { name: 'u2-b' }, { name: 'u3-c' }] };
const ev = (event, slug) => ({ event, fields: { 'Bolt slug': slug } });

describe('unitStatuses (US-0507 FR6.1)', () => {
  it('counts a Unit as running from WORKTREE_CREATED or BOLT_STARTED and done from BOLT_COMPLETED', () => {
    const events = [ev('WORKTREE_CREATED', 'u1-a'), ev('BOLT_STARTED', 'u2-b'), ev('BOLT_STARTED', 'u1-a'), ev('BOLT_COMPLETED', 'u1-a')];
    expect(unitStatuses(dag, events)).toEqual({ 'u1-a': 'done', 'u2-b': 'running', 'u3-c': 'pending' });
  });

  it('still reads UNIT_STARTED and UNIT_COMPLETED by their Unit field, and ignores unknown Units', () => {
    const events = [
      { event: 'UNIT_STARTED', fields: { Unit: 'u3-c' } },
      { event: 'UNIT_COMPLETED', fields: { Unit: 'u2-b' } },
      ev('BOLT_STARTED', 'u9-x')
    ];
    expect(unitStatuses(dag, events)).toEqual({ 'u1-a': 'pending', 'u2-b': 'done', 'u3-c': 'running' });
  });
});
