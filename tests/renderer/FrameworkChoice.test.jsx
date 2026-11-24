// US-1406 FR4, AC2.2.1–AC2.2.3 (BR4.4, BR4.6, NFR7.2): the first-open choice screen, with the bridge stubbed in the
// shapes of contract C4. The setup panels are stand-ins here; ProjectView.test.jsx mounts the real ones.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../src/shared/i18n.js';
import FrameworkChoice from '../../src/renderer/FrameworkChoice.jsx';

vi.mock('../../src/renderer/SetupAidlc.jsx', () => ({
  default: ({ onApplied }) => (
    <button data-testid="stub-setup-aidlc" onClick={() => onApplied?.('claude')}>
      AI-DLC setup
    </button>
  )
}));
vi.mock('../../src/renderer/SetupSpeckit.jsx', () => ({
  default: ({ onApplied }) => (
    <button data-testid="stub-setup-speckit" onClick={() => onApplied?.()}>
      Spec Kit setup
    </button>
  )
}));

const t = (key, values) => i18n.t(key, values);
/** A frameworkScan answer: which frameworks were found, which tools are on the PATH, and the proposal. */
const scanOf = ([fa, fs], [ca, cs], proposal = null) => ({ found: { aidlc: fa, speckit: fs }, cli: { aidlc: ca, specify: cs }, proposal });
const SAVED = { ok: true, file: '.thadeus/project.json', next: 'none' };

function stubBridge({ scan = scanOf([true, false], [true, false], 'aidlc'), choose = async () => SAVED } = {}) {
  window.bridge = { frameworkScan: vi.fn(typeof scan === 'function' ? scan : async () => scan), chooseFramework: vi.fn(choose) };
}
const setupApplied = vi.fn();
const view = () => render(<FrameworkChoice projectId="p1" root="/p/app" setupProps={{ onApplied: setupApplied }} />);
const pressed = (id) => screen.getByTestId(`framework-choice-option-${id}`).getAttribute('aria-pressed');

afterEach(() => {
  cleanup();
  delete window.bridge;
  vi.clearAllMocks();
});

describe('FrameworkChoice (US-1406)', () => {
  it('shows Scanning, then each framework found or not and its tool on the PATH or not (AC2.2.1)', async () => {
    let answer;
    stubBridge({ scan: () => new Promise((r) => (answer = r)) });
    view();
    expect(screen.getByTestId('framework-choice-root').textContent).toContain(t('frameworkChoice.scanning'));
    await act(async () => answer(scanOf([true, false], [false, true], 'aidlc')));
    const ai = screen.getByTestId('framework-choice-option-aidlc').textContent;
    const kit = screen.getByTestId('framework-choice-option-speckit').textContent;
    expect(ai).toContain(t('frameworkChoice.found'));
    expect(ai).toContain(t('frameworkChoice.cliMissing', { tool: 'aidlc' }));
    expect(ai).toContain(t('frameworkChoice.proposed'));
    expect(kit).toContain(t('frameworkChoice.notFound'));
    expect(kit).toContain(t('frameworkChoice.cliFound', { tool: 'specify' }));
    expect(window.bridge.frameworkScan).toHaveBeenCalledWith('p1');
  });

  it('a failed scan shows its reason, and Retry scans again', async () => {
    stubBridge();
    window.bridge.frameworkScan.mockRejectedValueOnce(new Error("Error invoking remote method 'project:frameworkScan': Error: EACCES"));
    view();
    const error = await screen.findByTestId('framework-choice-error');
    expect(error.textContent).toBe(t('frameworkChoice.scanFailed', { reason: 'EACCES' }));
    fireEvent.click(screen.getByTestId('framework-choice-retry'));
    expect(await screen.findByTestId('framework-choice-option-aidlc')).toBeTruthy();
    expect(window.bridge.frameworkScan).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('framework-choice-error')).toBeNull();
  });

  it('the proposal is preselected and one Confirm click saves it (AC2.2.2, BR4.4)', async () => {
    stubBridge({ scan: scanOf([false, true], [false, true], 'speckit') });
    view();
    await screen.findByTestId('framework-choice-option-speckit');
    expect(pressed('speckit')).toBe('true');
    expect(pressed('aidlc')).toBe('false');
    fireEvent.click(screen.getByTestId('framework-choice-confirm'));
    await waitFor(() => expect(window.bridge.chooseFramework).toHaveBeenCalledWith('p1', 'speckit'));
  });

  it('with both found nothing is preselected, and Confirm waits for a pick (AC2.2.2)', async () => {
    stubBridge({ scan: scanOf([true, true], [true, true]) });
    view();
    await screen.findByTestId('framework-choice-option-aidlc');
    expect(pressed('aidlc')).toBe('false');
    expect(pressed('speckit')).toBe('false');
    expect(screen.getByTestId('framework-choice-confirm').disabled).toBe(true);
    fireEvent.click(screen.getByTestId('framework-choice-option-aidlc'));
    expect(pressed('aidlc')).toBe('true');
    fireEvent.click(screen.getByTestId('framework-choice-confirm'));
    await waitFor(() => expect(window.bridge.chooseFramework).toHaveBeenCalledWith('p1', 'aidlc'));
  });

  it('Confirm is disabled while saving, so a double click sends one call (NFR7.2)', async () => {
    let done;
    stubBridge({ choose: () => new Promise((r) => (done = r)) });
    view();
    const confirm = await screen.findByTestId('framework-choice-confirm');
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(confirm.disabled).toBe(true);
    expect(window.bridge.chooseFramework).toHaveBeenCalledTimes(1);
    await act(async () => done(SAVED));
  });

  it('a missing framework shows its setup; Back returns with no call (AC2.2.3, BR4.6)', async () => {
    stubBridge({ scan: scanOf([false, false], [false, false]), choose: async () => ({ ok: true, file: null, next: 'setupSpeckit' }) });
    view();
    fireEvent.click(await screen.findByTestId('framework-choice-option-speckit'));
    fireEvent.click(screen.getByTestId('framework-choice-confirm'));
    expect(await screen.findByTestId('stub-setup-speckit')).toBeTruthy();
    expect(screen.queryByTestId('framework-choice-option-aidlc')).toBeNull();
    fireEvent.click(screen.getByTestId('framework-choice-back'));
    expect(await screen.findByTestId('framework-choice-option-aidlc')).toBeTruthy();
    expect(screen.queryByTestId('stub-setup-speckit')).toBeNull();
    expect(window.bridge.chooseFramework).toHaveBeenCalledTimes(1);
  });

  it('a successful setup saves the choice; the AI-DLC setup keeps its own onApplied (BR4.6)', async () => {
    stubBridge({ scan: scanOf([false, false], [true, false]) });
    window.bridge.chooseFramework.mockResolvedValueOnce({ ok: true, file: null, next: 'setupAidlc' });
    view();
    fireEvent.click(await screen.findByTestId('framework-choice-option-aidlc'));
    fireEvent.click(screen.getByTestId('framework-choice-confirm'));
    fireEvent.click(await screen.findByTestId('stub-setup-aidlc'));
    await waitFor(() => expect(window.bridge.chooseFramework).toHaveBeenCalledTimes(2));
    expect(window.bridge.chooseFramework).toHaveBeenLastCalledWith('p1', 'aidlc');
    expect(setupApplied).toHaveBeenCalledWith('claude');
  });

  it('a setup that has not succeeded saves nothing (Q2 = A)', async () => {
    stubBridge({ scan: scanOf([false, false], [false, false]), choose: async () => ({ ok: true, file: null, next: 'setupAidlc' }) });
    view();
    fireEvent.click(await screen.findByTestId('framework-choice-option-aidlc'));
    fireEvent.click(screen.getByTestId('framework-choice-confirm'));
    expect(await screen.findByTestId('stub-setup-aidlc')).toBeTruthy();
    expect(window.bridge.chooseFramework).toHaveBeenCalledTimes(1);
  });

  it('a save failure shows its reason and lets the person confirm again', async () => {
    stubBridge();
    window.bridge.chooseFramework.mockRejectedValueOnce(new Error("Error invoking remote method 'project:chooseFramework': Error: disk full"));
    view();
    fireEvent.click(await screen.findByTestId('framework-choice-confirm'));
    expect((await screen.findByTestId('framework-choice-error')).textContent).toBe(t('frameworkChoice.saveFailed', { reason: 'disk full' }));
    expect(screen.getByTestId('framework-choice-confirm').disabled).toBe(false);
  });

  it('every text goes through t(), in Swedish and English', async () => {
    stubBridge();
    view();
    await screen.findByTestId('framework-choice-option-aidlc');
    const root = screen.getByTestId('framework-choice-root');
    expect(root.textContent).toContain(t('frameworkChoice.title'));
    expect(root.textContent).toContain(t('frameworkChoice.intro'));
    expect(screen.getByTestId('framework-choice-confirm').textContent).toBe(t('frameworkChoice.confirm'));
    await act(() => i18n.changeLanguage('en'));
    try {
      expect(screen.getByTestId('framework-choice-confirm').textContent).toBe(i18n.t('frameworkChoice.confirm'));
      expect(i18n.t('frameworkChoice.confirm')).not.toBe(i18n.t('frameworkChoice.confirm', { lng: 'sv' }));
    } finally {
      await act(() => i18n.changeLanguage('sv'));
    }
  });
});
