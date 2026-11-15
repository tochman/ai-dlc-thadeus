// US-0506 u2 SCD9, SCD7, BR5.12: the pager order shared by the store and the app.
import { describe, expect, it } from 'vitest';
import { byPager } from '../../src/shared/agentOrder.js';

const ev = (id, kind, arrivedAtMs, tabId = 'agent:claude', seq = 1) => ({ eventId: id, kind, arrivedAtMs, tabId, seq });
const order = (list) => [...list].sort(byPager).map((e) => e.eventId);

describe('byPager', () => {
  it('puts questions and permissions before replies, whatever the arrival', () => {
    expect(order([ev('r', 'reply', 1), ev('p', 'permission', 5), ev('q', 'question', 9)])).toEqual(['p', 'q', 'r']);
  });

  it('then arrival, then tab, then seq', () => {
    expect(
      order([
        ev('b', 'question', 2, 'agent:b'),
        ev('a2', 'permission', 2, 'agent:a', 2),
        ev('a1', 'question', 2, 'agent:a', 1),
        ev('first', 'permission', 1, 'agent:z')
      ])
    ).toEqual(['first', 'a1', 'a2', 'b']);
  });

  it('equal arrival times follow seq, never the file names (SCD7)', () => {
    const one = { ...ev('one', 'permission', 7, 'agent:claude', 1), file: '9-1' };
    const two = { ...ev('two', 'permission', 7, 'agent:claude', 2), file: '10-1' };
    expect(order([two, one])).toEqual(['one', 'two']);
  });

  it('two replies keep their own arrival order behind every question; a missing tab sorts first', () => {
    expect(order([ev('r2', 'reply', 3), ev('r1', 'reply', 1), ev('q', 'question', 4, null)])).toEqual(['q', 'r1', 'r2']);
  });

  it('is a stable comparator: identical keys compare equal', () => {
    expect(byPager(ev('x', 'question', 1), ev('y', 'question', 1))).toBe(0);
  });
});
