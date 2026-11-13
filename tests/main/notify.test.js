import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../src/shared/i18n.js';

vi.mock('electron', () => ({ Notification: {} }));
const { notificationBody, notificationTitle } = await import('../../src/main/notify.js');

const question = { kind: 'question', projectName: 'visinv', text: 'Which   database?\nPick one.' };
const gate = { kind: 'gate', projectName: 'visinv', stage: 'requirements-analysis', nextStage: 'user-stories' };

afterEach(() => i18n.changeLanguage('sv'));

describe('notifications in the chosen language (EPIC-07 US-0701 FR1.2)', () => {
  it('has an English title and gate body under English', async () => {
    await i18n.changeLanguage('en');
    expect(notificationTitle(question)).toBe('visinv: Claude is waiting for your answer');
    expect(notificationBody(gate)).toBe('Approval: requirements-analysis → user-stories');
    expect(notificationBody({ ...gate, nextStage: null })).toBe('Approval: requirements-analysis');
    expect(notificationBody({ ...gate, stage: undefined, nextStage: null })).toBe('Approval: ?');
  });

  it('keeps the Swedish texts under Swedish and shows a question as flat text, cut to about 120 characters', () => {
    expect(notificationTitle(question)).toBe('visinv: Claude väntar på ditt svar');
    expect(notificationBody(gate)).toBe('Godkännande: requirements-analysis → user-stories');
    expect(notificationBody(question)).toBe('Which database? Pick one.');
    const long = notificationBody({ kind: 'question', text: 'x'.repeat(300) });
    expect(long).toHaveLength(120);
    expect(long.endsWith('…')).toBe(true);
  });
});
