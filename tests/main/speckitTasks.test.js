// US-1402 FR6.3, BR6.4: Spec Kit's tasks.md read as phases of task lines, with Convergence phases as rounds.
import { describe, expect, it } from 'vitest';
import { parseTasks } from '../../src/main/parsers/speckitTasks.js';

const TASKS = [
  '# Tasks: Photo albums',
  '',
  '## Phase 1: Setup',
  '',
  '- [ ] T001 Create the project structure',
  '- [x] T002 [P] Configure the linter',
  '',
  '## Phase 2: User Story 1 - Albums (Priority: P1)',
  '',
  '- [X] T003 [P] [US1] Album model in src/models/album.py',
  '- [ ] T004 [US1] Album service',
  ''
].join('\n');

describe('parseTasks', () => {
  it('gives one phase per "## Phase <n>: <title>" heading, named by its title', () => {
    const { phases } = parseTasks(TASKS);
    expect(phases.map((p) => p.name)).toEqual(['Setup', 'User Story 1 - Albums (Priority: P1)']);
    expect(phases.map((p) => p.items.map((i) => i.id))).toEqual([
      ['T001', 'T002'],
      ['T003', 'T004']
    ]);
  });

  it('reads the ID, the [P] mark, the [USn] story, the text and the tick ([ ], [x], [X])', () => {
    const [setup, story] = parseTasks(TASKS).phases;
    expect(setup.items[0]).toEqual({ id: 'T001', parallel: false, story: null, done: false, text: 'Create the project structure' });
    expect(setup.items[1]).toMatchObject({ id: 'T002', parallel: true, story: null, done: true });
    expect(story.items[0]).toEqual({ id: 'T003', parallel: true, story: 'US1', done: true, text: 'Album model in src/models/album.py' });
    expect(story.items[1]).toMatchObject({ id: 'T004', parallel: false, story: 'US1', done: false });
  });

  it('counts done and total over every task', () => {
    expect(parseTasks(TASKS)).toMatchObject({ done: 2, total: 4, skipped: 0 });
  });

  it('gives Convergence phases rounds 1, 2 in file order and other phases round null', () => {
    const text = `${TASKS}\n## Phase 3: Convergence\n- [x] T005 Fix the gap\n## Phase 4: Polish\n- [ ] T006 Docs\n## Phase 5: Convergence\n- [ ] T007 Again\n`;
    const { phases } = parseTasks(text);
    expect(phases.map((p) => [p.name, p.round])).toEqual([
      ['Setup', null],
      ['User Story 1 - Albums (Priority: P1)', null],
      ['Convergence', 1],
      ['Polish', null],
      ['Convergence', 2]
    ]);
  });

  it('puts tasks before the first phase heading in a phase with an empty name', () => {
    const { phases, total } = parseTasks(`- [ ] T000 Early task\n${TASKS}`);
    expect(phases[0]).toEqual({ name: '', round: null, items: [{ id: 'T000', parallel: false, story: null, done: false, text: 'Early task' }] });
    expect(total).toBe(5);
  });

  it('skips and counts a line that starts with "- [" but is not a task', () => {
    const r = parseTasks(`${TASKS}- [ ] no id here\n- [?] T009 odd tick\n- [ T010 broken\n`);
    expect(r.skipped).toBe(3);
    expect(r.total).toBe(4);
  });

  it('gives zeros and no phases for an empty file', () => {
    expect(parseTasks('')).toEqual({ done: 0, total: 0, skipped: 0, phases: [] });
  });

  it('reads CRLF line endings, indented tasks and multi-digit stories', () => {
    const r = parseTasks('## Phase 1: Setup\r\n  - [x] T101 [P] [US12] Indented\r\n');
    expect(r.phases[0].items[0]).toEqual({ id: 'T101', parallel: true, story: 'US12', done: true, text: 'Indented' });
    expect(r.done).toBe(1);
  });
});
