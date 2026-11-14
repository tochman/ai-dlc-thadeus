import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// The terminal's busy state, as the TerminalProvider gives it; null outside a provider (not busy).
let terminal = null;
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
const { default: ConfigView } = await import('../../src/renderer/ConfigView.jsx');

// The shape config:get returns (src/main/aidlcConfig.js plus activeDir), trimmed from this project's output.
const config = (overrides = {}) => ({
  harness: 'claude',
  activeDir: '261113-config-view',
  models: [
    { agent: 'architect', model: 'inherit', effort: null, modelSource: 'shipped default', effortSource: 'shipped default', env: false },
    { agent: 'product-lead', model: 'sonnet', effort: 'medium', modelSource: 'project', effortSource: 'env', env: true }
  ],
  flags: [
    { name: 'AWS_AIDLC_DEFAULT_SCOPE', value: 'classic', source: 'env', env: true },
    { name: 'AIDLC_USE_SWARM', value: null, source: 'shipped default', env: false }
  ],
  active: [{ key: 'guard-policy', value: 'off', source: 'scope ultra-express', env: false }],
  provider: { provider: 'amazon-bedrock', region: 'eu-north-1', profile: null, harnessManaged: false },
  plugins: { installed: ['aidlc'], selected: null },
  plans: [
    { name: 'ultra-express', description: 'Plan saved from 261113', own: true, active: true },
    { name: 'mvp', description: 'Skip operations, ship the core', own: false, active: false }
  ],
  errors: {},
  ...overrides
});

const CLAUDE = { id: 'claude', label: 'Claude Code', installed: true };
const OPENCODE = { id: 'opencode', label: 'opencode', installed: true };
const CURSOR = { id: 'cursor', label: 'Cursor', installed: true };
const KIRO = { id: 'kiro', label: 'Kiro', installed: false };

let push;
function mockBridge(getAidlcConfig = vi.fn(async () => config())) {
  push = {};
  // Several listeners per channel, as the view and its "Arbetar nu" panel both subscribe.
  const subs = {};
  const listen = (name) =>
    vi.fn((cb) => {
      (subs[name] ??= new Set()).add(cb);
      push[name] = (c) => subs[name].forEach((f) => f(c));
      return () => subs[name].delete(cb);
    });
  window.bridge = {
    getAidlcConfig,
    getWorkingAgents: vi.fn(async () => []),
    onConfigChanged: listen('config'),
    onProjectChanged: listen('project')
  };
  return getAidlcConfig;
}

function renderView(props = {}) {
  return render(<ConfigView projectId="p1" visible harnesses={[CLAUDE, KIRO]} defaultHarness="claude" onSetup={vi.fn()} {...props} />);
}

afterEach(() => {
  cleanup();
  terminal = null;
});

describe('ConfigView', () => {
  it('shows a loading state, then the six sections in order with values and sources (FR1.2, FR2.2–FR2.7, NFR4)', async () => {
    mockBridge();
    renderView();
    expect(screen.getByTestId('config-view-loading')).toBeTruthy();

    await screen.findByTestId('config-view-models');
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Modeller och effort', 'Projektets standardval', 'Pågående arbete', 'Arbetar nu', 'Planer', 'Leverantör', 'Pluginer']);

    const models = screen.getByTestId('config-view-models');
    expect(within(models).getByText('architect').closest('tr').textContent).toMatch(/inherit—shipped default/);
    expect(within(models).getByText('product-lead').closest('tr').textContent).toMatch(/project \/ env.*satt av en miljövariabel/);
    expect(within(screen.getByTestId('config-view-defaults')).getByText('AWS_AIDLC_DEFAULT_SCOPE').closest('tr').textContent).toMatch(
      /classic.*env.*miljövariabel/
    );
    expect(screen.getByTestId('config-view-active').textContent).toMatch(/guard-policy.*off.*scope ultra-express/);
    const plans = screen.getAllByTestId('config-view-plan');
    expect(plans.map((p) => p.textContent)).toEqual([
      expect.stringMatching(/ultra-express.*projektets egen.*aktiv/),
      expect.stringMatching(/^mvp.*Skip operations/)
    ]);
    expect(plans[0].getAttribute('aria-current')).toBe('true');
    expect(screen.getByTestId('config-view-provider').textContent).toMatch(/amazon-bedrock.*eu-north-1.*Profil—.*nej/);
    expect(screen.getByTestId('config-view-plugins').textContent).toMatch(/Installeradeaidlc.*Valda—/);
  });

  it('shows no picker with one installed harness; with two it lists only those and reloads for the choice (FR4.1, FR4.2)', async () => {
    const get = mockBridge();
    renderView();
    await screen.findByTestId('config-view-models');
    expect(screen.queryByTestId('config-view-harness')).toBeNull();
    expect(get).toHaveBeenCalledWith('p1', 'claude');
    cleanup();

    const get2 = mockBridge();
    renderView({ harnesses: [CLAUDE, OPENCODE, KIRO] });
    const select = await screen.findByTestId('config-view-harness');
    expect([...select.options].map((o) => o.value)).toEqual(['claude', 'opencode']);
    expect(select.value).toBe('claude'); // the agent tab's harness
    fireEvent.change(select, { target: { value: 'opencode' } });
    await waitFor(() => expect(get2).toHaveBeenLastCalledWith('p1', 'opencode'));
  });

  it('greys out the models on Cursor with the reason (FR4.4)', async () => {
    mockBridge(vi.fn(async () => config({ harness: 'cursor' })));
    renderView({ harnesses: [CURSOR], defaultHarness: 'claude' });
    const models = await screen.findByTestId('config-view-models');
    expect(models.className).toMatch(/is-greyed/);
    expect(models.textContent).toMatch(/På Cursor väljer sessionens eller IDE:ns väljare modellen/);
  });

  it('after a failed read shows one sentence with the error and the setup button, and no earlier values (FR5.1, FR5.2)', async () => {
    const get = mockBridge();
    const onSetup = vi.fn();
    renderView({ onSetup });
    await screen.findByTestId('config-view-models');

    get.mockResolvedValueOnce(config({ models: null, flags: null, active: null, provider: null, plugins: null, errors: { missing: true, models: 'spawn aidlc ENOENT' } }));
    await act(async () => push.config({ projectId: 'p1' }));
    const error = await screen.findByTestId('config-view-error');
    expect(error.textContent).toMatch(/aidlc hittades inte: spawn aidlc ENOENT/);
    expect(screen.queryByTestId('config-view-models')).toBeNull();
    expect(screen.queryByText('architect')).toBeNull();
    fireEvent.click(screen.getByTestId('config-view-setup'));
    expect(onSetup).toHaveBeenCalledTimes(1);

    get.mockRejectedValueOnce(new Error("Error invoking remote method 'config:get': Error: AI-DLC är inte installerat"));
    await act(async () => push.config({ projectId: 'p1' }));
    await waitFor(() => expect(screen.getByTestId('config-view-error').textContent).toMatch(/kunde inte läsas: AI-DLC är inte installerat/));
  });

  it('shows the error of one failed command in its section and keeps the others (FR5.3)', async () => {
    mockBridge(vi.fn(async () => config({ active: null, errors: { active: 'Command failed: aidlc config list' } })));
    renderView();
    const active = await screen.findByTestId('config-view-active');
    expect(active.textContent).toMatch(/Command failed/);
    expect(screen.getByTestId('config-view-models').textContent).toMatch(/architect/);
  });

  it('reloads on config:changed and on a change to the active intent while visible, and on the next show when hidden (FR6.1)', async () => {
    const get = mockBridge();
    const { rerender } = renderView();
    await screen.findByTestId('config-view-models');
    expect(get).toHaveBeenCalledTimes(1);

    await act(async () => push.config({ projectId: 'p1' }));
    await act(async () => push.config({ projectId: 'other' }));
    expect(get).toHaveBeenCalledTimes(2);

    await act(async () => push.project({ projectId: 'p1', dirNames: ['261113-config-view'], indexChanged: false }));
    await act(async () => push.project({ projectId: 'p1', dirNames: ['261110-other'], indexChanged: false }));
    expect(get).toHaveBeenCalledTimes(3);

    rerender(<ConfigView projectId="p1" visible={false} harnesses={[CLAUDE]} defaultHarness="claude" />);
    await act(async () => push.config({ projectId: 'p1' }));
    expect(get).toHaveBeenCalledTimes(3);
    rerender(<ConfigView projectId="p1" visible harnesses={[CLAUDE]} defaultHarness="claude" />);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(4));
  });

  it('lists the agents working now beside the active work, with stage and a live counter, and updates on a change event', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    try {
      vi.setSystemTime(Date.parse('2026-11-14T02:10:00Z'));
      mockBridge();
      // The shape agents:working returns.
      const developer = { agent: 'aidlc-developer-agent', name: 'developer', startedMs: Date.parse('2026-11-14T02:07:00Z'), stage: 'code-generation', intent: 'config-view' };
      window.bridge.getWorkingAgents.mockResolvedValueOnce([developer]).mockResolvedValue([]);
      renderView();
      const working = await screen.findByTestId('config-view-working');
      expect(screen.getByTestId('config-view-active').parentElement).toBe(working.parentElement); // side by side
      const row = await within(working).findByTestId('config-view-working-agent');
      expect(row.textContent).toMatch(/developer/);
      expect(row.textContent).toMatch(/3 min/);
      expect(row.textContent).toMatch(/config-view · code-generation/);

      await act(async () => vi.advanceTimersByTime(60 * 1000));
      expect(row.textContent).toMatch(/4 min/);

      // The inflight file emptied: config:changed reads again and the empty line shows.
      await act(async () => push.config({ projectId: 'p1' }));
      expect(within(working).getByText('Inga agenter arbetar.')).toBeTruthy();
      expect(window.bridge.getWorkingAgents).toHaveBeenCalledWith('p1');

      window.bridge.getWorkingAgents.mockResolvedValue([{ ...developer, name: 'quality', stage: 'build-and-test' }]);
      await act(async () => push.project({ projectId: 'p1', dirNames: ['261113-config-view'], indexChanged: false }));
      expect(within(working).getByTestId('config-view-working-agent').textContent).toMatch(/quality.*build-and-test/);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ConfigView changes (EPIC-09 US-0902, US-0904)', () => {
  /** The bridge calls the edit panels use, shaped like config:preview / config:apply / models:* return. */
  function mockEditing(extra = {}) {
    mockBridge();
    Object.assign(window.bridge, {
      previewConfigChange: vi.fn(async (_p, c) => ({ command: `aidlc engine config set ${c.key} ${c.value}`, dryRun: null })),
      applyConfigChange: vi.fn(async () => ({ ok: true, command: 'x', output: '' })),
      ...extra
    });
  }

  it('changing depth shows the command preview, and Apply sends only {kind, key, value}', async () => {
    mockEditing();
    renderView();
    const select = await screen.findByTestId('config-edit-active-depth');
    fireEvent.change(select, { target: { value: 'Standard' } });
    expect((await screen.findByTestId('config-change-command')).textContent).toBe('aidlc engine config set depth Standard');
    expect(window.bridge.previewConfigChange).toHaveBeenCalledWith('p1', { kind: 'active', key: 'depth', value: 'Standard' });
    fireEvent.click(screen.getByTestId('config-change-apply'));
    await waitFor(() => expect(window.bridge.applyConfigChange).toHaveBeenCalledWith('p1', { kind: 'active', key: 'depth', value: 'Standard' }));
    expect(await screen.findByTestId('config-change-result')).toBeTruthy();
  });

  it('turning a guard off asks for a confirmation naming it and where; turning it on does not', async () => {
    mockEditing();
    renderView();
    fireEvent.click(await screen.findByTestId('config-edit-guard-off-AIDLC_DISABLE_REVIEW_FREEZE_HOOK'));
    const confirm = screen.getByTestId('config-edit-guard-confirm');
    expect(confirm.textContent).toMatch(/Stänga av kontrollen "Frysning under granskning"/);
    expect(window.bridge.previewConfigChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('config-edit-guard-confirm-yes').disabled).toBe(true); // where is chosen explicitly
    fireEvent.click(screen.getByTestId('config-edit-guard-where-local'));
    fireEvent.click(screen.getByTestId('config-edit-guard-confirm-yes'));
    await waitFor(() =>
      expect(window.bridge.previewConfigChange).toHaveBeenLastCalledWith('p1', {
        kind: 'guard', key: 'AIDLC_DISABLE_REVIEW_FREEZE_HOOK', value: 'off', where: 'local'
      })
    );

    fireEvent.click(screen.getByTestId('config-edit-guard-on-AIDLC_SKIP_ARTIFACT_GUARD'));
    expect(screen.queryByTestId('config-edit-guard-confirm')).toBeNull();
    await waitFor(() =>
      expect(window.bridge.previewConfigChange).toHaveBeenLastCalledWith('p1', { kind: 'guard', key: 'AIDLC_SKIP_ARTIFACT_GUARD', value: 'on' })
    );
  });

  it('disables Apply for the active work while an agent tab is busy, with the reason', async () => {
    terminal = { anyBusy: () => true };
    mockEditing();
    renderView();
    fireEvent.change(await screen.findByTestId('config-edit-active-sensors'), { target: { value: 'on' } });
    await screen.findByTestId('config-change-command');
    expect(screen.getByTestId('config-change-apply').disabled).toBe(true);
    expect(screen.getByTestId('config-change-blocked').textContent).toMatch(/agentflik arbetar/);
    expect(window.bridge.applyConfigChange).not.toHaveBeenCalled();
  });

  // Shaped like models:options (modelChoice.modelOptions plus the ledger usage).
  const options = (harness, extra = {}) => ({
    harness,
    editable: true,
    models: ['default', 'inherit', 'opus', 'sonnet', 'haiku'],
    efforts: ['low', 'medium', 'high', 'xhigh', 'max', 'default'],
    applied: harness === 'opencode' ? { xhigh: 'high' } : {},
    usage: { totalUsd: 10, usdByAgent: { architect: 7.5 }, agentModels: { main: ['claude-opus-5-5'], architect: ['claude-sonnet-5-5'] } },
    ...extra
  });

  it('choosing a model shows the preview and the cost estimate labelled as an estimate', async () => {
    mockEditing({
      getModelOptions: vi.fn(async (_p, h) => options(h)),
      previewModelChange: vi.fn(async () => ({
        command: 'aidlc config models --agent architect --model sonnet --harness claude --project --yes',
        dryRun: 'models configuration plan: update=1',
        estimate: { estimate: true, before: 10, after: 6, delta: -4 }
      })),
      applyModelChange: vi.fn(async () => ({ ok: true, output: '' }))
    });
    renderView();
    const row = await screen.findByTestId('config-edit-models-row-architect');
    expect(row.textContent).toMatch(/claude-sonnet-5-5.*avviker.*75 %/); // ran on another model than inherit (opus)
    fireEvent.click(screen.getByTestId('config-edit-models-where-project'));
    fireEvent.change(screen.getByTestId('config-edit-models-agent'), { target: { value: 'architect' } });
    fireEvent.change(screen.getByTestId('config-edit-models-model'), { target: { value: 'sonnet' } });
    fireEvent.click(screen.getByTestId('config-edit-models-preview-agent'));
    expect(window.bridge.previewModelChange).toHaveBeenCalledWith('p1', { harness: 'claude', where: 'project', agent: 'architect', model: 'sonnet' });
    expect((await screen.findByTestId('config-change-command')).textContent).toMatch(/--model sonnet/);
    expect(screen.getByTestId('config-edit-models-estimate').textContent).toMatch(/uppskattning: \$10\.00 → \$6\.00 \(−\$4\.00\)/);
  });

  it('shows an opencode xhigh row as "körs som high", and a harness without rules read-only with the reason', async () => {
    const xhigh = { agent: 'architecture-reviewer', model: null, effort: 'xhigh', modelSource: 'project', effortSource: 'project', env: false };
    mockEditing({ getModelOptions: vi.fn(async (_p, h) => options(h)) });
    window.bridge.getAidlcConfig = vi.fn(async () => config({ harness: 'opencode', models: [xhigh] }));
    renderView({ harnesses: [OPENCODE], defaultHarness: 'opencode' });
    expect((await screen.findByTestId('config-edit-models-row-architecture-reviewer')).textContent).toMatch(/xhigh \(körs som high\)/);
    expect([...screen.getByTestId('config-edit-models-effort').options].map((o) => o.textContent)).toContain('xhigh (körs som high)');
    cleanup();

    mockEditing({ getModelOptions: vi.fn(async () => ({ editable: false, reason: 'Kiro har inga modellregler i appen än.' })) });
    renderView();
    expect((await screen.findByTestId('config-edit-models-readonly')).textContent).toMatch(/inga modellregler/);
    expect(screen.queryByTestId('config-edit-models-agent')).toBeNull();
  });
});
