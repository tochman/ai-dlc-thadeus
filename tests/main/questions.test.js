import { describe, expect, it } from 'vitest';
import { pendingQuestions } from '../../src/main/questions.js';
import { mergeAudits } from '../../src/main/parsers/audit.js';

const where = { project: { projectId: 'p1', name: 'aidlc-dash' }, intent: '261113-question-popup' };

// Real shards in AI-DLC's audit format, run through the same parser loadAuditEvents uses.
const block = (fields) => Object.entries(fields).map(([k, v]) => `**${k}**: ${v}`).join('\n');
function events(...blocks) {
  const text = blocks.map((f, i) => block({ Timestamp: new Date(Date.UTC(2026, 10, 13, 10, 0, i)).toISOString(), ...f })).join('\n\n---\n\n');
  return mergeAudits([{ source: 'host-1.md', text }]);
}
const asked = (stage, id, extra = {}) => ({ Event: 'DECISION_RECORDED', Stage: stage, Decision: `Fråga ${id}?`, Options: 'A,B,X', 'Question Id': id, ...extra });

describe('pendingQuestions (US-0505 FR1.2, FR1.3)', () => {
  it('(a) lists an unanswered question with its fields and options', () => {
    const [q] = pendingQuestions(events({ Event: 'STAGE_STARTED', Stage: 'requirements-analysis' }, asked('requirements-analysis', '8c1829d0')), where);
    expect(q).toMatchObject({
      id: '8c1829d0',
      projectId: 'p1',
      projectName: 'aidlc-dash',
      intent: '261113-question-popup',
      stage: 'requirements-analysis',
      kind: 'question',
      text: 'Fråga 8c1829d0?',
      options: ['A', 'B', 'X'],
      nextStage: null
    });
    expect(q.timeMs).toBe(Date.UTC(2026, 10, 13, 10, 0, 1));
  });

  it('(b) QUESTION_ANSWERED in the same stage answers the oldest question', () => {
    const list = pendingQuestions(
      events(asked('requirements-analysis', 'q1'), asked('requirements-analysis', 'q2'), { Event: 'QUESTION_ANSWERED', Stage: 'requirements-analysis', Details: 'A' }),
      where
    );
    expect(list.map((q) => q.id)).toEqual(['q2']);
  });

  it('(c) a gate shows its next stage and is closed by GATE_APPROVED, STAGE_COMPLETED and STAGE_SKIPPED', () => {
    const gate = { Event: 'STAGE_AWAITING_APPROVAL', Stage: 'code-generation', 'Next Stage': 'build-and-test', 'Question Id': 'g1' };
    const [open] = pendingQuestions(events(gate), where);
    expect(open).toMatchObject({ id: 'g1', kind: 'gate', stage: 'code-generation', nextStage: 'build-and-test', options: [] });

    for (const closer of ['GATE_APPROVED', 'STAGE_COMPLETED', 'STAGE_SKIPPED']) {
      const list = pendingQuestions(events(gate, asked('code-generation', 'q1'), { Event: closer, Stage: 'code-generation' }), where);
      expect(list, closer).toEqual([]);
    }
  });

  it('(d) a new STAGE_STARTED for the stage closes what the last attempt left', () => {
    const list = pendingQuestions(
      events(asked('units-generation', 'old'), { Event: 'STAGE_STARTED', Stage: 'units-generation' }, asked('units-generation', 'new')),
      where
    );
    expect(list.map((q) => q.id)).toEqual(['new']);
  });

  it('(e) Options that are not JSON still give a list; a JSON list is read as one; a missing id gets the event key', () => {
    const [plain, json] = pendingQuestions(
      events(
        { Event: 'DECISION_RECORDED', Stage: 's', Decision: 'Hur?', Options: 'Focused scan,Full rescan' },
        asked('t', 'j1', { Options: '["Ja, kör","Nej"]' })
      ),
      where
    );
    expect(plain.options).toEqual(['Focused scan', 'Full rescan']);
    expect(plain.id).toBe('261113-question-popup:host-1.md#0');
    expect(json.options).toEqual(['Ja, kör', 'Nej']);
    const [broken] = pendingQuestions(events(asked('s', 'b1', { Options: '[not json' })), where);
    expect(broken.options).toEqual(['[not json']);
  });

  it('(f) an answer in another stage or for another unit does not answer the question', () => {
    const list = pendingQuestions(
      events(
        asked('functional-design', 'q1', { Unit: 'u1-api' }),
        { Event: 'QUESTION_ANSWERED', Stage: 'nfr-design' },
        { Event: 'QUESTION_ANSWERED', Stage: 'functional-design', Unit: 'u2-ui' },
        { Event: 'GATE_APPROVED', Stage: 'functional-design', Unit: 'u2-ui' }
      ),
      where
    );
    expect(list.map((q) => q.id)).toEqual(['q1']);
  });
});
