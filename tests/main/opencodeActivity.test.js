// US-0058 FR1, FR3: opencode's stored tool timeline is exposed as text-free activity events.
import { describe, expect, it } from 'vitest';
import { opencodeActivityEvents } from '../../src/main/opencodeActivity.js';

describe('opencodeActivityEvents (US-0058 FR1, FR3)', () => {
  it('uses assistant lifecycle timestamps while omitting message content', () => {
    const events = opencodeActivityEvents(
      {
        sessions: [{ id: 'main-session', directory: '/project', parent_id: null, agent: 'build' }],
        messages: [{ id: 'message-id', session_id: 'main-session', data: { time: { created: 1, streamed: 2 }, text: 'private message' } }]
      },
      '/project'
    );

    expect(events).toEqual([
      { sessionId: 'main-session', harness: 'opencode', agentType: 'build', toolId: 'message-id', atMs: 1, name: 'prompt' },
      { sessionId: 'main-session', harness: 'opencode', agentType: 'build', toolId: 'message-id', atMs: 2, name: 'stop' }
    ]);
    expect(JSON.stringify(events)).not.toContain('private');
  });

  it('uses the persisted assistant completion timestamp to stop a turn', () => {
    const events = opencodeActivityEvents(
      {
        sessions: [{ id: 'main-session', directory: '/project', parent_id: null, agent: 'build' }],
        messages: [{ id: 'message-id', session_id: 'main-session', data: { time: { created: 1, completed: 3 } } }]
      },
      '/project'
    );

    expect(events).toContainEqual({ sessionId: 'main-session', harness: 'opencode', agentType: 'build', toolId: 'message-id', atMs: 3, name: 'stop' });
  });

  it('maps main and child tool events without exposing messages or tool input', () => {
    const events = opencodeActivityEvents(
      {
        sessions: [
          { id: 'main-session', directory: '/project/subproject', parent_id: null, agent: 'build' },
          { id: 'child-session', directory: '/project', parent_id: 'main-session', agent: 'explore' }
        ],
        parts: [
          {
            id: 'call-1',
            session_id: 'main-session',
            type: 'tool',
            data: {
              tool: 'read',
              callID: 'call-1',
              state: { status: 'completed', time: { start: 100, end: 120 }, input: { filePath: '/project/subproject/src/a.js', text: 'private prompt' } }
            }
          },
          {
            id: 'call-2',
            session_id: 'child-session',
            type: 'tool',
            data: { tool: 'bash', callID: 'call-2', state: { status: 'completed', time: { start: 130, end: 150 }, input: { command: 'private command' } } }
          }
        ]
      },
      '/project'
    );

    expect(events).toEqual([
      {
        sessionId: 'main-session',
        harness: 'opencode',
        agentType: 'build',
        atMs: 100,
        name: 'toolStart',
        tool: 'read',
        toolId: 'call-1',
        paths: [{ path: 'subproject/src/a.js', kind: 'read' }]
      },
      {
        sessionId: 'main-session',
        harness: 'opencode',
        agentType: 'build',
        atMs: 120,
        name: 'toolEnd',
        tool: 'read',
        toolId: 'call-1',
        paths: [{ path: 'subproject/src/a.js', kind: 'read' }]
      },
      { sessionId: 'main-session', harness: 'opencode', agentType: 'explore', agentId: 'child-session', ref: 'child-session', atMs: 130, name: 'agentStart' },
      {
        sessionId: 'main-session',
        harness: 'opencode',
        agentType: 'explore',
        agentId: 'child-session',
        ref: 'child-session',
        atMs: 130,
        name: 'toolStart',
        tool: 'bash',
        toolId: 'call-2',
        paths: null
      },
      {
        sessionId: 'main-session',
        harness: 'opencode',
        agentType: 'explore',
        agentId: 'child-session',
        ref: 'child-session',
        atMs: 150,
        name: 'toolEnd',
        tool: 'bash',
        toolId: 'call-2',
        paths: null
      }
    ]);
    expect(JSON.stringify(events)).not.toContain('private');
  });

  it('ignores malformed, unsupported, and untimed records', () => {
    expect(
      opencodeActivityEvents(
        {
          sessions: [{ id: 's', directory: '/project', parent_id: null }],
          parts: [
            { session_id: 's', type: 'tool', data: '{bad json' },
            { session_id: 's', type: 'text', data: { text: 'secret' } },
            { session_id: 's', type: 'tool', data: { tool: 'read', state: { status: 'running', input: {} } } }
          ]
        },
        '/project'
      )
    ).toEqual([]);
  });
});
