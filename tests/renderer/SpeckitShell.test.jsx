// US-1401 FR1.4: the Spec Kit view's empty shell, which U6 fills with the features (BR1.6, BR1.12).
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import i18n, { t } from '../../src/shared/i18n.js';
import SpeckitShell from '../../src/renderer/SpeckitShell.jsx';

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('sv');
});

describe('SpeckitShell', () => {
  it('shows its heading and the empty line in an LCARS frame', () => {
    render(<SpeckitShell />);
    const root = screen.getByTestId('speckit-shell-root');
    expect(root.querySelector('.lcars-frame')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(t('speckit.title'));
    expect(screen.getByText(t('speckit.empty'))).toBeTruthy();
  });

  it('is a labelled region, so the view can be found without seeing it', () => {
    render(<SpeckitShell />);
    expect(screen.getByRole('region', { name: t('speckit.title') })).toBe(screen.getByTestId('speckit-shell-root'));
  });

  it('follows the language (NFR1)', async () => {
    await i18n.changeLanguage('en');
    render(<SpeckitShell />);
    expect(screen.getByTestId('speckit-shell-root').textContent).toContain(t('speckit.empty'));
    expect(t('speckit.empty')).not.toBe(i18n.getFixedT('sv')('speckit.empty'));
  });
});
