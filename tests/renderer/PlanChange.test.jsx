// US-0509 FR1-FR3, FR5.2, NFR1, NFR3: "Change plan" in an intent's detail, its dialog and what it types.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HARNESSES } from '../../src/shared/harnesses.js';
import { t } from '../../src/shared/i18n.js';

const CLAUDE = HARNESSES.find((h) => h.id === 'claude');
const CODEX = HARNESSES.find((h) => h.id === 'codex'); // a table entry without commands
const terminal = { state: vi.fn(() => 'idle'), anyBusy: vi.fn(), asking: vi.fn(), running: vi.fn(), type: vi.fn(), sequence: vi.fn(), harness: CLAUDE };
let mounted = terminal;
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => mounted }));
const { default: PlanChange } = await import('../../src/renderer/PlanChange.jsx');

const intent = {
  dirName: '261125-alpha',
  slug: 'alpha',
  scope: 'feature',
  status: 'in-flight',
  active: true,
  parked: false,
  missingOnDisk: false,
  missingInIndex: false,
  activityAt: 0
};
const other = { ...intent, dirName: '261124-beta', slug: 'beta' };
const stage = (slug, status, over = {}) => ({ slug, status, mode: 'EXECUTE', behind: status === 'done', current: false, ...over });
/** Work at code-generation; mergePipeline's shape. */
const detail = (state = {}, stages) => ({
  dirName: intent.dirName,
  state: { scope: 'feature', plan: null, projectType: 'Brownfield', currentStage: 'code-generation', ...state },
  pipeline: {
    phases: [
      {
        name: 'construction',
        stages: stages ?? [
          stage('state-init', 'done'),
          stage('requirements-analysis', 'done'),
          stage('functional-design', 'not-started', { mode: 'SKIP', behind: true }),
          stage('code-generation', 'in-progress', { current: true }),
          stage('build-and-test', 'not-started'),
          stage('ci-pipeline', 'not-started', { mode: 'SKIP' })
        ]
      }
    ]
  }
});
const PLANS = [
  { name: 'quick-fix', description: 'A small fix', own: true },
  { name: 'feature', description: 'The default', own: false },
  { name: 'express', description: 'Short', own: false },
  { name: 'Bad Name', description: 'Not a plan name', own: false }
];
const STAGES = {
  'quick-fix': { execute: ['state-init', 'code-generation', 'functional-design', 'ci-pipeline'], skip: [] },
  express: { execute: ['state-init', 'requirements-analysis', 'code-generation', 'build-and-test'], skip: [] }
};

const ui = (over = {}, props = {}) => (
  <div className="project-body">
    <ul tabIndex={-1} data-testid="intent-list-rows" />
    <PlanChange
      projectId="p1"
      intent={{ ...intent, ...over }}
      detail={detail()}
      space="default"
      activeSpace="default"
      activeIntent={over.active === false ? other : { ...intent, ...over }}
      {...props}
    />
    <button data-testid="agent-tab">agent</button>
  </div>
);
const show = (over, props) => render(ui(over, props));
const control = () => screen.queryByTestId('plan-change-open');
const unavailable = () => control().getAttribute('aria-disabled') === 'true';
/** The shared tooltip's text on keyboard focus (US-0414). */
function reason() {
  fireEvent.focus(control());
  const text = screen.queryByRole('tooltip')?.textContent ?? '';
  fireEvent.blur(control());
  return text;
}
const byId = (id) => screen.queryByTestId(id);
const textOf = (id) => byId(id)?.textContent ?? null;
/** Opens the dialog from the focused control, with the plans read. */
async function open(over, props) {
  const view = show(over, props);
  control().focus();
  fireEvent.click(control());
  await waitFor(() => expect(byId('plan-change-loading')).toBeNull());
  return view;
}
const select = () => screen.getByTestId('plan-change-plan');
const choose = (name) => fireEvent.change(select(), { target: { value: name } });
async function chooseRead(name) {
  choose(name);
  await screen.findByTestId('plan-change-preview');
}
function describeIt(text) {
  fireEvent.click(screen.getByTestId('plan-change-way-tailored'));
  fireEvent.change(screen.getByTestId('plan-change-description'), { target: { value: text } });
}
const confirm = () => fireEvent.click(screen.getByTestId('plan-change-confirm'));
const group = (kind) => {
  const el = byId(`plan-change-${kind}`);
  return (
    el &&
    within(el)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
  );
};
const typedNothing = () => {
  expect(terminal.type).not.toHaveBeenCalled();
  expect(terminal.sequence).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const f of ['anyBusy', 'asking', 'running']) terminal[f].mockReturnValue(false);
  terminal.type.mockImplementation(async () => true);
  terminal.harness = CLAUDE;
  mounted = terminal;
  window.bridge = {
    listPlans: vi.fn(async () => ({ plans: PLANS, active: null })),
    getPlanStages: vi.fn(async (_p, _h, name) => STAGES[name])
  };
});
afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('Change plan offered or not (FR1.1)', () => {
  it('is offered on an intent in flight, active or not', () => {
    for (const over of [{}, { active: false }]) {
      show(over);
      expect(control().textContent).toBe(t('intents.planChange.open'));
      expect(unavailable()).toBe(false);
      cleanup();
    }
  });

  it.each([
    ['complete', { status: 'complete' }, {}],
    ['archived', { status: 'archived', active: false }, {}],
    ['missing on disk', { missingOnDisk: true }, {}],
    ['missing in the index', { missingInIndex: true }, {}],
    ['with a state file that failed to read', { error: 'EACCES' }, {}],
    ['shown from its last valid data', {}, { detail: { ...detail(), stale: true } }],
    ['without a state file', {}, { detail: { ...detail(), state: null, pipeline: { phases: [] } } }],
    ['without stages', {}, { detail: detail({}, []) }]
  ])('is hidden for one %s', (_what, over, props) => {
    show(over, props);
    expect(control()).toBeNull();
    expect(byId('plan-change-confirm')).toBeNull();
  });

  it('is hidden outside a terminal', () => {
    mounted = null;
    show();
    expect(control()).toBeNull();
  });
});

describe('Change plan unavailable, with a reason that reaches the keyboard (FR1.2-FR1.6)', () => {
  const says = (text) => {
    expect(unavailable()).toBe(true);
    expect(control().disabled).toBe(false); // keeps focus and its tooltip
    expect(reason()).toBe(text);
    fireEvent.click(control());
    expect(byId('plan-change-confirm')).toBeNull();
  };

  it('in another space than AI-DLC’s active one (FR1.5)', () => {
    show({}, { activeSpace: 'team' });
    says(t('intents.planChange.otherSpace', { space: 'default', active: 'team' }));
  });

  it('with a harness without an AI-DLC command, and while detection runs (FR1.5)', () => {
    terminal.harness = CODEX;
    const { rerender } = show();
    says(t('terminal.noCommand', { harness: 'Codex' }));
    terminal.harness = null;
    rerender(ui({ slug: 'alpha2' }));
    says(t('terminal.checking'));
  });

  it('while it is parked (FR1.2)', () => {
    show({ parked: true });
    says(t('intents.planChange.parked'));
  });

  it.each([
    ['busy', 'anyBusy'],
    ['asking', 'asking']
  ])('for the active intent while an agent tab is %s (FR1.3)', (code, seen) => {
    terminal[seen].mockReturnValue(true);
    show();
    says(t(`intents.resume.${code}`, { harness: 'Claude', intent: 'alpha' }));
  });

  it('for the active intent an open, idle session does not block, also when it just wrote its audit (FR1.3)', () => {
    terminal.running.mockReturnValue(true);
    show({ activityAt: Date.now() });
    expect(unavailable()).toBe(false);
  });

  it('for the active intent without a session, while an agent elsewhere wrote in the last 10 minutes (FR1.3)', () => {
    show({ activityAt: Date.now() - 60_000 });
    says(t('intents.resume.elsewhere', { intent: 'alpha' }));
    cleanup();
    show({ activityAt: Date.now() - 11 * 60_000 });
    expect(unavailable()).toBe(false);
  });

  it('for another intent it waits by the whole rule on the active one (FR1.4)', () => {
    terminal.running.mockReturnValue(true);
    show({ active: false });
    says(t('intents.resume.running', { harness: 'Claude', intent: 'beta' }));
    cleanup();
    terminal.running.mockReturnValue(false);
    show({ active: false }, { activeIntent: { ...other, activityAt: Date.now() } });
    says(t('intents.resume.elsewhere', { intent: 'beta' }));
    cleanup();
    show({ active: false, activityAt: Date.now() }, { activeIntent: null }); // its own audit is not the rule
    expect(unavailable()).toBe(false);
  });
});

describe('the dialog (FR2)', () => {
  it('names the intent, its plan and the stages that stay done (FR2.1)', async () => {
    await open();
    expect(textOf('plan-change-name')).toBe('alpha');
    expect(textOf('plan-change-current')).toBe(t('intents.planChange.current', { plan: 'feature' }));
    expect(textOf('plan-change-done')).toBe(t('intents.planChange.done', { n: 2, list: 'State Init, Requirements Analysis' }));
    expect(textOf('plan-change-done')).toContain('Requirements Analysis');
  });

  it('names what a tailored plan is based on, and says when no stage is done (FR2.1)', async () => {
    await open({}, { detail: detail({ plan: 'alpha-plan' }, [stage('code-generation', 'in-progress', { current: true })]) });
    expect(textOf('plan-change-current')).toBe(t('intents.planChange.currentBased', { plan: 'alpha-plan', scope: 'feature' }));
    expect(textOf('plan-change-done')).toBe(t('intents.planChange.done', { n: 0, list: '' }));
  });

  it('offers the plans of the agent tab’s harness in their order, without the current scope or a name that is no plan name (FR2.3, NFR1)', async () => {
    await open();
    expect(window.bridge.listPlans).toHaveBeenCalledExactlyOnceWith('p1', 'claude');
    const options = within(select()).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([t('intents.planChange.choose'), 'quick-fix – A small fix', 'express – Short']);
    expect(select().value).toBe('');
  });

  it('reads a plan’s stages only when it is chosen (NFR3)', async () => {
    await open();
    expect(window.bridge.getPlanStages).not.toHaveBeenCalled();
    await chooseRead('express');
    expect(window.bridge.getPlanStages).toHaveBeenCalledExactlyOnceWith('p1', 'claude', 'express');
  });

  it('shows what is added, dropped, kept and passed, each under its own text (FR2.4, FR5.2)', async () => {
    await open();
    await chooseRead('quick-fix');
    expect(group('added')).toEqual(['Ci Pipeline']);
    expect(group('dropped')).toEqual(['Build And Test']);
    expect(group('kept')).toEqual(['State Init', 'Requirements Analysis']);
    expect(group('passed')).toEqual(['Functional Design']);
    for (const kind of ['added', 'dropped', 'kept', 'passed'])
      expect(within(byId(`plan-change-${kind}`)).getByRole('heading').textContent).toBe(t(`intents.planChange.${kind}`, { n: group(kind).length }));
    expect(byId('plan-change-current-dropped')).toBeNull();
    expect(byId('plan-change-nothing')).toBeNull();
  });

  it('names a current stage it drops as skipped (FR2.4)', async () => {
    window.bridge.getPlanStages.mockResolvedValue({ execute: ['state-init', 'build-and-test'], skip: [] });
    await open();
    await chooseRead('express');
    expect(textOf('plan-change-current-dropped')).toBe(t('intents.planChange.currentDropped', { stage: 'Code Generation' }));
  });

  it('says when nothing left to do changes (FR2.4)', async () => {
    await open();
    await chooseRead('express');
    expect(textOf('plan-change-nothing')).toBe(t('intents.planChange.nothing'));
    expect(group('added')).toBeNull();
    expect(group('dropped')).toBeNull();
    expect(group('kept')).toEqual(['State Init', 'Requirements Analysis']);
  });

  it('says where each way is approved (FR2.6), and that a tailored plan changes only stages not started (FR2.7)', async () => {
    await open();
    expect(textOf('plan-change-note')).toBe(t('intents.planChange.readyNote'));
    fireEvent.click(screen.getByTestId('plan-change-way-tailored'));
    expect(textOf('plan-change-note')).toBe(t('intents.planChange.tailoredNote'));
    expect(textOf('plan-change-hint')).toBe(t('intents.planChange.descriptionHint'));
    expect(byId('plan-change-plan')).toBeNull();
    fireEvent.click(screen.getByTestId('plan-change-way-ready'));
    expect(select()).toBeTruthy();
  });

  it('reading, no other plan and a failed read are three texts, and the other way works in each (FR2.8)', async () => {
    const seen = [];
    const cases = [
      ['loading', () => new Promise(() => {})],
      ['none', async () => ({ plans: [PLANS[1]], active: null })],
      ['failed', async () => Promise.reject(new Error("Error invoking remote method 'plans:list': Error: kaputt"))]
    ];
    for (const [what, read] of cases) {
      window.bridge.listPlans = vi.fn(read);
      show();
      fireEvent.click(control());
      seen.push((await screen.findByTestId(`plan-change-${what}`)).textContent);
      expect(byId('plan-change-plan'), what).toBeNull();
      confirm();
      typedNothing();
      describeIt('smaller');
      confirm();
      await waitFor(() => expect(terminal.type).toHaveBeenCalledTimes(1));
      terminal.type.mockClear();
      cleanup();
    }
    expect(seen).toEqual([t('intents.planChange.loading'), t('intents.planChange.none'), t('intents.planChange.failed', { error: 'kaputt' })]);
  });

  it('a plan whose stages cannot be read shows the reason and cannot be chosen (FR2.8)', async () => {
    window.bridge.getPlanStages.mockRejectedValueOnce(new Error("Error invoking remote method 'plans:stages': Error: no such plan"));
    await open();
    choose('express');
    expect(byId('plan-change-stages-loading')).toBeTruthy();
    expect((await screen.findByTestId('plan-change-stages-failed')).textContent).toBe(t('intents.planChange.stagesFailed', { error: 'no such plan' }));
    expect(screen.getByTestId('plan-change-confirm').getAttribute('aria-disabled')).toBe('true');
    confirm();
    typedNothing();
    await chooseRead('quick-fix'); // another one still can
    expect(byId('plan-change-stages-failed')).toBeNull();
  });

  it('drops a late answer for another choice', async () => {
    const answers = {};
    window.bridge.getPlanStages = vi.fn((_p, _h, name) => new Promise((resolve) => (answers[name] = resolve)));
    await open();
    choose('express');
    choose('quick-fix');
    await act(async () => answers.express(STAGES.express));
    expect(byId('plan-change-preview')).toBeNull();
    await act(async () => answers['quick-fix'](STAGES['quick-fix']));
    expect(group('added')).toEqual(['Ci Pipeline']);
  });

  it('refuses an empty and a too long description, with the reason, and takes one of 500 characters (FR2.7)', async () => {
    await open();
    for (const [text, code] of [
      [' \n ', 'empty'],
      ['x'.repeat(501), 'tooLong']
    ]) {
      describeIt(text);
      confirm();
      expect(screen.getByRole('alert').textContent).toBe(t(`intents.planChange.descriptionError.${code}`));
      expect(screen.getByTestId('plan-change-description').getAttribute('aria-invalid')).toBe('true');
    }
    typedNothing();
    describeIt('x'.repeat(500));
    expect(screen.queryByRole('alert')).toBeNull();
    confirm();
    await waitFor(() => expect(terminal.type).toHaveBeenCalledTimes(1));
  });

  it('Cancel and Escape type nothing, give focus back to the control, and the next opening starts afresh (FR2.9, FR5.2)', async () => {
    await open();
    await chooseRead('express');
    fireEvent.click(screen.getByTestId('plan-change-cancel'));
    expect(byId('plan-change-confirm')).toBeNull();
    expect(document.activeElement).toBe(control());
    fireEvent.click(control());
    await waitFor(() => expect(select().value).toBe(''));
    fireEvent.keyDown(screen.getByTestId('plan-change-dialog'), { key: 'Escape' });
    expect(byId('plan-change-confirm')).toBeNull();
    expect(document.activeElement).toBe(control());
    typedNothing();
  });

  describe('while it is open (FR2.9)', () => {
    it('what it shows follows the state', async () => {
      const { rerender } = await open();
      await chooseRead('quick-fix');
      const stages = [stage('state-init', 'done'), stage('code-generation', 'done'), stage('build-and-test', 'in-progress', { current: true })];
      rerender(ui({}, { detail: detail({ plan: 'alpha-plan' }, stages) }));
      expect(textOf('plan-change-current')).toContain('alpha-plan');
      expect(group('kept')).toEqual(['State Init', 'Code Generation']);
      expect(textOf('plan-change-current-dropped')).toContain('Build And Test');
      rerender(ui({}, { detail: detail({ scope: 'quick-fix' }) })); // it was switched to the chosen plan meanwhile
      expect(select().value).toBe('');
      expect(byId('plan-change-preview')).toBeNull();
    });

    it.each([
      ['notInFlight', { status: 'complete', active: false }, {}],
      ['notInFlight', { status: 'archived', active: false }, {}],
      ['unreadable', {}, { detail: { ...detail(), state: null, pipeline: { phases: [] } } }],
      ['parked', { parked: true }, {}]
    ])('the line cannot be typed once it is %s, with the reason', async (code, over, props) => {
      const { rerender } = await open();
      await chooseRead('quick-fix');
      rerender(ui(over, props));
      expect(textOf('plan-change-blocked')).toBe(t(`intents.planChange.${code}`));
      const button = screen.getByTestId('plan-change-confirm');
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.getAttribute('aria-describedby')).toBe(byId('plan-change-blocked').id);
      confirm();
      typedNothing();
    });

    it('focus goes to the list when the control went away meanwhile', async () => {
      const { rerender } = await open();
      rerender(ui({ status: 'complete', active: false }));
      expect(control()).toBeNull();
      fireEvent.click(screen.getByTestId('plan-change-cancel'));
      expect(document.activeElement).toBe(screen.getByTestId('intent-list-rows'));
      expect(byId('plan-change-confirm')).toBeNull();
    });

    it('reads the plans again for another harness, and forgets the choice', async () => {
      const { rerender } = await open();
      await chooseRead('express');
      terminal.harness = HARNESSES.find((h) => h.id === 'opencode');
      rerender(ui({ activityAt: 1 }));
      await waitFor(() => expect(window.bridge.listPlans).toHaveBeenLastCalledWith('p1', 'opencode'));
      await waitFor(() => expect(select().value).toBe(''));
      expect(byId('plan-change-preview')).toBeNull();
    });
  });
});

describe('what is typed (FR3)', () => {
  it('a ready-made plan is typed unsent, and the dialog closes (FR3.1)', async () => {
    await open();
    await chooseRead('quick-fix');
    confirm();
    expect(byId('plan-change-confirm')).toBeNull();
    expect(terminal.type).toHaveBeenCalledExactlyOnceWith('agent', '/aidlc --scope quick-fix', { submit: false });
    expect(terminal.sequence).not.toHaveBeenCalled();
  });

  it('a tailored plan is typed unsent as one quoted line without control characters (FR3.1, NFR1)', async () => {
    await open();
    describeIt('only "code"\r\nand\u001b[201~ C:\\tests');
    confirm();
    expect(terminal.type).toHaveBeenCalledExactlyOnceWith('agent', '/aidlc compose "only \\"code\\" and [201~ C:\\\\tests"', { submit: false });
  });

  it('for another intent the switch is submitted first, and the line is not (FR3.2)', async () => {
    await open({ active: false });
    await chooseRead('express');
    confirm();
    expect(terminal.sequence).toHaveBeenCalledExactlyOnceWith('agent', [
      { text: '/aidlc intent 261125-alpha', submit: true },
      { text: '/aidlc --scope express', submit: false }
    ]);
    expect(terminal.type).not.toHaveBeenCalled();
  });

  it('a folder name that is not safe to submit is refused with Resume’s reason (FR3.2)', async () => {
    await open({ active: false, dirName: '261125 a; rm' });
    await chooseRead('express');
    confirm();
    expect(screen.getByRole('alert').textContent).toBe(t('intents.resume.invalidName', { name: '261125 a; rm' }));
    typedNothing();
  });

  it('is refused at the last moment when the rule blocks then, with the reason (FR1.6)', async () => {
    await open();
    await chooseRead('express');
    terminal.asking.mockReturnValue(true); // nothing has rendered since
    confirm();
    typedNothing();
    expect(screen.getByRole('alert').textContent).toBe(t('intents.resume.asking', { harness: 'Claude' }));
    terminal.asking.mockReturnValue(false);
    confirm();
    expect(terminal.type).toHaveBeenCalledTimes(1);
  });

  it('asks for a plan when none is chosen', async () => {
    await open();
    confirm();
    expect(screen.getByRole('alert').textContent).toBe(t('intents.planChange.chooseFirst'));
    typedNothing();
  });

  it('is typed after the dialog gave focus back, so focus ends in the agent tab (FR5.2)', async () => {
    const order = [];
    terminal.type.mockImplementation(async () => {
      order.push(document.activeElement);
      screen.getByTestId('agent-tab').focus();
      return true;
    });
    await open();
    await chooseRead('express');
    screen.getByTestId('plan-change-confirm').focus();
    confirm();
    expect(order).toEqual([control()]);
    expect(document.activeElement).toBe(screen.getByTestId('agent-tab'));
  });
});
