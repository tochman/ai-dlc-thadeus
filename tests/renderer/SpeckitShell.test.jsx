// US-1401 FR1.4: the Spec Kit view in the LCARS frame (BR1.6, BR1.12); US-1402 FR6 fills it with the features.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import i18n, { t } from '../../src/shared/i18n.js';

vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => null }));
const { default: SpeckitShell } = await import('../../src/renderer/SpeckitShell.jsx');

beforeEach(() => {
  window.bridge = {
    speckitFeatures: vi.fn(async () => ({ version: { found: '1.4.3', supported: true }, features: [], active: null, errors: [] })),
    onSpeckitChanged: vi.fn(() => () => {}),
    getAgentProgress: vi.fn(async () => ({ source: 'none', waiting: null, feature: null })), // US-1410
    agentEvents: { onChanged: vi.fn(() => () => {}) }
  };
});
afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('sv');
});

describe('SpeckitShell', () => {
  it('shows its heading and the features view in an LCARS frame (US-1402)', async () => {
    render(<SpeckitShell projectId="p1" />);
    const root = screen.getByTestId('speckit-shell-root');
    expect(root.querySelector('.lcars-frame')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(t('speckit.title'));
    expect(root.contains(screen.getByTestId('speckit-features-root'))).toBe(true);
    expect(await screen.findByTestId('speckit-features-empty')).toBeTruthy();
    expect(window.bridge.speckitFeatures).toHaveBeenCalledWith('p1');
  });

  it('shows the agent progress readout above the features list (US-1410 BR10.5)', async () => {
    render(<SpeckitShell projectId="p1" />);
    const progress = await screen.findByTestId('speckit-progress-root');
    const features = screen.getByTestId('speckit-features-root');
    expect(progress.compareDocumentPosition(features) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(window.bridge.getAgentProgress).toHaveBeenCalledWith('p1');
  });

  it('is a labelled region, so the view can be found without seeing it', () => {
    render(<SpeckitShell projectId="p1" />);
    expect(screen.getByRole('region', { name: t('speckit.title') })).toBe(screen.getByTestId('speckit-shell-root'));
  });

  it('follows the language (NFR1)', async () => {
    await i18n.changeLanguage('en');
    render(<SpeckitShell projectId="p1" />);
    expect((await screen.findByTestId('speckit-features-empty')).textContent).toBe(t('speckit.features.empty'));
    expect(t('speckit.features.empty')).not.toBe(i18n.getFixedT('sv')('speckit.features.empty'));
  });
});
