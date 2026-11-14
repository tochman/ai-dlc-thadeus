import { describe, expect, it } from 'vitest';
import { parseOptions, pendingQuestions } from '../../src/main/questions.js';
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

  it('(e2) a JSON list keeps its labels; options carry no batch for one question', () => {
    const [q] = pendingQuestions(events(asked('s', 'j2', { Options: '["A. @tanstack/react-virtual (Recommended)","B. Egen fönstring"]' })), where);
    expect(q.options).toEqual(['A. @tanstack/react-virtual (Recommended)', 'B. Egen fönstring']);
    expect(q.batch).toBeNull();
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

// Options as AI-DLC really logged them in this project's audit shards (EPIC-00 US-0006).
describe('parseOptions (US-0006)', () => {
  it('reads comma, pipe, semicolon and JSON lists', () => {
    expect(parseOptions('Retry with fix,Accept failure,Abort').options).toEqual(['Retry with fix', 'Accept failure', 'Abort']);
    expect(parseOptions('|Yes, all three work|Something is wrong (describe)').options).toEqual(['Yes, all three work', 'Something is wrong']);
    expect(parseOptions('Ja; Nej; Kanske').options).toEqual(['Ja', 'Nej', 'Kanske']);
    expect(parseOptions('["Approve Plan","Request Changes","I\'ll edit the files"]').options).toEqual(['Approve Plan', 'Request Changes', "I'll edit the files"]);
  });

  it('strips a description in parentheses, even one holding a comma or semicolon', () => {
    const raw =
      'Guide me (walk through each question interactively here),I\'ll edit the file (they fill in the answers in the file directly),Chat (discuss freely; you extract the decisions from the conversation)';
    expect(parseOptions(raw)).toEqual({ options: ['Guide me', "I'll edit the file", 'Chat'], batch: null });
    expect(parseOptions('Q1: A. Vanlig release direkt,Q1: B. Prerelease först')).toEqual({ options: ['A. Vanlig release direkt', 'B. Prerelease först'], batch: null });
  });

  it('turns a batch summary into one entry per question, in every logged form', () => {
    const forms = [
      '|Q1: A. Every switch|Q1: B. Non-default plus Show all|Q2: A. Agent-tab harness, no switch|Q2: B. Section per harness',
      'Q1: A. Every switch / B. Non-default plus Show all; Q2: A. Agent-tab harness, no switch / B. Section per harness',
      'Q1: A. Every switch / B. Non-default plus Show all,Q2: A. Agent-tab harness, no switch / B. Section per harness'
    ];
    for (const raw of forms) {
      expect(parseOptions(raw).batch, raw).toEqual([
        { id: 'Q1', options: ['A. Every switch', 'B. Non-default plus Show all'] },
        { id: 'Q2', options: ['A. Agent-tab harness, no switch', 'B. Section per harness'] }
      ]);
    }
    expect(parseOptions('Q1: remove dialog, keep dialog; Q2: under Utseende, own section').batch).toEqual([
      { id: 'Q1', options: ['remove dialog', 'keep dialog'] },
      { id: 'Q2', options: ['under Utseende', 'own section'] }
    ]);
    expect(parseOptions('Q1: All six,Q1: Only Claude Code,Q2: Keep it visible,Q2: App runs it').batch.map((b) => b.options)).toEqual([
      ['All six', 'Only Claude Code'],
      ['Keep it visible', 'App runs it']
    ]);
  });
});

describe('pendingQuestions with engine asks and real answers (US-0006)', () => {
  const plan = { Event: 'QUESTION_ASKED', 'Question Id': '32a59f72', 'Question Type': 'plan-approval', Stage: 'code-generation', Options: '["Approve Plan","Request Changes","I\'ll edit the files"]' };

  it('shows a plan-approval ask with its exact options until its reply or PLAN_APPROVAL_RECORDED', () => {
    const [q] = pendingQuestions(events(plan), where);
    expect(q).toMatchObject({ id: '32a59f72', kind: 'question', ask: 'plan-approval', stage: 'code-generation', text: '', options: ['Approve Plan', 'Request Changes', "I'll edit the files"] });
    expect(pendingQuestions(events(plan, { Event: 'PLAN_APPROVAL_RECORDED', Stage: 'code-generation' }), where)).toEqual([]);
    const reply = { Event: 'QUESTION_REPLIED', Reply: 'Approve Plan', Options: '["Approve Plan","Request Changes","I\'ll edit the files"]' };
    expect(pendingQuestions(events(plan, reply), where)).toEqual([]);
    // A gate's reply does not close the plan ask.
    expect(pendingQuestions(events(plan, { ...reply, Options: '["Approve","Request Changes"]' }), where)).toHaveLength(1);
  });

  it('shows a scope-confirm ask, but not one of type gate (that one is STAGE_AWAITING_APPROVAL)', () => {
    const scope = { ...plan, 'Question Id': 's1', 'Question Type': 'scope-confirm', Options: '["Go ahead with the \\"ultra-express\\" plan","Use a different plan"]' };
    const list = pendingQuestions(events(scope, { ...plan, 'Question Id': 'g1', 'Question Type': 'gate' }), where);
    expect(list.map((q) => [q.id, q.ask])).toEqual([['s1', 'scope-confirm']]);
  });

  it('a batch summary row becomes a batch question', () => {
    const row = asked('requirements-analysis', '4e279738', { Decision: 'Q1, Q2', Options: '|Q1: A. Every switch|Q1: B. Only|Q2: A. Here|Q2: B. There' });
    const [q] = pendingQuestions(events(row), where);
    expect(q.batch.map((b) => b.id)).toEqual(['Q1', 'Q2']);
  });

  it('an answer closes only the question it answers', () => {
    const mode = asked('requirements-analysis', 'mode', { Options: "Guide me,I'll edit the file,Chat" });
    const scan = asked('requirements-analysis', 'scan', { Options: 'Full rescan,Focused scan' });
    // The reply names the older question's option: that one closes, the newer stays.
    const one = pendingQuestions(events(mode, scan, { Event: 'QUESTION_ANSWERED', Stage: 'requirements-analysis', 'Person Reply': 'Guide me' }), where);
    expect(one.map((q) => q.id)).toEqual(['scan']);
    // A free-text reply answers the newest (the one on screen), not an older one left open.
    const two = pendingQuestions(events(mode, scan, { Event: 'QUESTION_ANSWERED', Stage: 'requirements-analysis', 'Person Reply': 'Kör en snabb' }), where);
    expect(two.map((q) => q.id)).toEqual(['mode']);
    // An answer never closes an engine ask: its reply does.
    const three = pendingQuestions(events(plan, { Event: 'QUESTION_ANSWERED', Stage: 'code-generation', 'Person Reply': 'Ja' }), where);
    expect(three.map((q) => q.id)).toEqual(['32a59f72']);
  });
});
