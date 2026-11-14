import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ConfigView from '../../src/renderer/ConfigView.jsx';

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
  const listen = (name) => vi.fn((cb) => ((push[name] = cb), () => delete push[name]));
  window.bridge = { getAidlcConfig, onConfigChanged: listen('config'), onProjectChanged: listen('project') };
  return getAidlcConfig;
}

function renderView(props = {}) {
  return render(<ConfigView projectId="p1" visible harnesses={[CLAUDE, KIRO]} defaultHarness="claude" onSetup={vi.fn()} {...props} />);
}

afterEach(cleanup);

describe('ConfigView', () => {
  it('shows a loading state, then the six sections in order with values and sources (FR1.2, FR2.2–FR2.7, NFR4)', async () => {
    mockBridge();
    renderView();
    expect(screen.getByTestId('config-view-loading')).toBeTruthy();

    await screen.findByTestId('config-view-models');
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Modeller och effort', 'Projektets standardval', 'Pågående arbete', 'Planer', 'Leverantör', 'Pluginer']);

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
});
