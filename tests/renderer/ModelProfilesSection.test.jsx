// US-0210 US1.1: the "Model profiles" section in Configuration (AC1.1.1–AC1.1.6).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ModelProfilesSection from '../../src/renderer/ModelProfilesSection.jsx';

// The shapes plans:list and modelProfile:saved return (src/main/ipc.js).
const PLANS = { plans: [{ name: 'feature' }, { name: 'bugfix' }], active: null };
const SAVED = { editable: true, names: ['strong'], models: ['default', 'opus', 'sonnet'], agents: ['developer', 'quality'] };
const PROFILES = { criticalPlans: [], critical: { models: {} }, economy: { models: {} }, askBeforeBack: false, active: 'critical' };

function mockBridge({ saved = SAVED, set = vi.fn(async (_id, p) => p) } = {}) {
  window.bridge = { listPlans: vi.fn(async () => PLANS), getSavedModelProfiles: vi.fn(async () => saved), setProjectSettings: set };
  return window.bridge;
}

const show = (settings = { modelProfiles: PROFILES }) => render(<ModelProfilesSection projectId="p1" harness="claude" settings={settings} />);

afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('ModelProfilesSection (US-0210 US1.1)', () => {
  it('lists every plan with a critical choice, the profile pickers, and saves the choice (AC1.1.1–AC1.1.4)', async () => {
    const bridge = mockBridge();
    show();
    await screen.findByTestId('model-profiles-plan-feature');
    expect(screen.getByTestId('settings-view-project-model-profiles')).toBeTruthy(); // the LCARS frame
    expect(bridge.listPlans).toHaveBeenCalledWith('p1', 'claude');
    fireEvent.click(screen.getByTestId('model-profiles-plan-feature'));
    fireEvent.change(screen.getByTestId('model-profiles-from-critical'), { target: { value: 'strong' } });
    fireEvent.change(screen.getByTestId('model-profiles-model-critical-developer'), { target: { value: 'opus' } });
    fireEvent.change(screen.getByTestId('model-profiles-model-economy-quality'), { target: { value: 'sonnet' } });
    fireEvent.click(screen.getByTestId('model-profiles-ask-back'));
    fireEvent.click(screen.getByTestId('model-profiles-save'));
    await screen.findByTestId('model-profiles-saved');
    expect(bridge.setProjectSettings).toHaveBeenCalledWith('p1', {
      modelProfiles: {
        criticalPlans: ['feature'],
        critical: { from: 'strong', models: { developer: 'opus' } },
        economy: { models: { quality: 'sonnet' } },
        askBeforeBack: true
      }
    });
  });

  it('says how to save an AI-DLC profile with --save-as when none is reported (AC1.1.2)', async () => {
    mockBridge({ saved: { ...SAVED, names: [] } });
    show();
    expect((await screen.findByTestId('model-profiles-save-as-hint')).textContent).toContain('--save-as');
  });

  it('shows the active profile, and "not set" before any switch (AC1.1.5, FR4.1)', async () => {
    mockBridge();
    show();
    expect((await screen.findByTestId('model-profiles-active')).textContent).toContain('kritisk');
    cleanup();
    mockBridge();
    show({});
    expect((await screen.findByTestId('model-profiles-active')).textContent).toContain('inte satt');
  });

  it('shows why models cannot be picked for a harness without a model table, and the refusal of a save (FR5.2, AC1.1.6)', async () => {
    const set = vi.fn(async () => {
      throw new Error("Error invoking remote method 'projectSettings:set': Error: Ogiltigt värde för modelProfiles.critical: Bad");
    });
    mockBridge({ saved: { editable: false, reason: 'Kiro har ingen modelltabell', names: [], models: [], agents: [] }, set });
    show();
    expect((await screen.findByTestId('model-profiles-reason')).textContent).toContain('Kiro har ingen modelltabell');
    expect(screen.queryByTestId('model-profiles-model-critical-developer')).toBeNull();
    fireEvent.click(screen.getByTestId('model-profiles-save'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Ogiltigt värde för modelProfiles.critical: Bad'));
  });
});
