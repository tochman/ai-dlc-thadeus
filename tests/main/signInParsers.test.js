// US-0804 FR1.3–FR1.6, FR2.2, NFR1, NFR2: what each tool's answer means. The outputs are the ones measured on
// 2026-11-25 with names, emails and ids changed.
import { describe, expect, it } from 'vitest';
import { cleanText, parseClaude, parseGh, parseOpencode } from '../../src/main/parsers/signIn.js';
import { t } from '../../src/shared/i18n.js';

const run = (over) => ({ code: 0, stdout: '', stderr: '', killed: false, ...over });
const reason = (key) => t(`signIn.reason.${key}`);
const unknown = (key) => ({ state: 'unknown', account: null, reason: reason(key) });
const OUT = { state: 'out', account: null, reason: null };

describe('parseGh (US-0804 FR1.3)', () => {
  const NETWORK = 'Get "https://api.github.com/user": dial tcp 140.82.121.6:443: connect: connection refused';

  it('exit 0 with a name is signed in, with the account (AC1.1.1)', () => {
    expect(parseGh(run({ stdout: 'octo-dana\n' }))).toEqual({ state: 'in', account: 'octo-dana', reason: null });
  });

  it('exit 4 and a refused token (HTTP 401) are not signed in (AC1.1.3)', () => {
    const stderr = 'To get started with GitHub CLI, please run:  gh auth login\nAlternatively, populate the GH_TOKEN environment variable…';
    expect(parseGh(run({ code: 4, stderr }))).toEqual(OUT);
    const refused = { code: 1, stdout: '{"message":"Bad credentials","status":"401"}', stderr: 'gh: Bad credentials (HTTP 401)\n' };
    expect(parseGh(run(refused))).toEqual(OUT);
  });

  it('no network is unknown with the reason, not "not signed in" (AC1.2.1)', () => {
    expect(parseGh(run({ code: 1, stderr: `${NETWORK}\n` }))).toEqual({ state: 'unknown', account: null, reason: NETWORK });
  });

  it('an empty name, and an answer that is not one name, is unknown (AC1.2.2)', () => {
    expect(parseGh(run({ stdout: '\n' }))).toEqual(unknown('unreadable'));
    expect(parseGh(run({ stdout: '<html>\n<title>Sign in to the network</title>\n' }))).toEqual(unknown('unreadable'));
  });

  it('an unknown exit is unknown: its first stderr line, or that the check failed when there is none', () => {
    expect(parseGh(run({ code: 2, stderr: '\n unknown flag: --hostname \nUsage: gh api' }))).toEqual({
      state: 'unknown',
      account: null,
      reason: 'unknown flag: --hostname'
    });
    expect(parseGh(run({ code: 'ENOENT' }))).toEqual(unknown('failed'));
  });

  it('a stopped check is unknown, whatever it had answered (FR1.6)', () => {
    expect(parseGh(run({ code: null, stdout: 'octo-dana\n', killed: true }))).toEqual(unknown('timeout'));
  });
});

describe('parseClaude (US-0804 FR1.4)', () => {
  const IN = {
    loggedIn: true,
    authMethod: 'claude.ai',
    apiProvider: 'firstParty',
    email: 'dana@example.com',
    orgName: 'Example',
    subscriptionType: 'max'
  };
  const answer = (value, over) => parseClaude(run({ stdout: `${JSON.stringify(value, null, 2)}\n`, ...over }));

  it('signed in names the email and the plan; a missing part leaves the other (FR2.2, AC1.1.1, AC1.1.2)', () => {
    expect(answer(IN)).toEqual({ state: 'in', account: 'dana@example.com · max', reason: null });
    expect(answer({ ...IN, email: undefined })).toEqual({ state: 'in', account: 'max', reason: null });
    expect(answer({ loggedIn: true, authMethod: 'api_key', apiProvider: 'firstParty', email: null })).toEqual({ state: 'in', account: null, reason: null });
  });

  it('loggedIn false is not signed in, also with exit 1 (AC1.1.3)', () => {
    expect(answer({ loggedIn: false, authMethod: 'none', apiProvider: 'firstParty' }, { code: 1 })).toEqual(OUT);
    expect(answer({ loggedIn: false }, { code: 1 })).toEqual(OUT);
  });

  it('loggedIn false with another provider is unknown (AC1.2.3)', () => {
    expect(answer({ loggedIn: false, authMethod: 'none', apiProvider: 'bedrock' }, { code: 1 })).toEqual(unknown('otherProvider'));
  });

  it('no JSON, no loggedIn and a loggedIn that is not true or false are unknown (AC1.2.2)', () => {
    expect(parseClaude(run({ stdout: 'Logged in as dana@example.com' }))).toEqual(unknown('unreadable'));
    for (const value of [{ email: 'dana@example.com' }, { loggedIn: 'true' }, null, [], 'x', 1]) expect(answer(value)).toEqual(unknown('unreadable'));
    expect(parseClaude(run({ code: 127, stderr: 'zsh: command not found: claude' }))).toEqual(unknown('failed'));
  });

  it('a check that failed or was stopped is unknown, never signed in (FR1.6)', () => {
    expect(answer(IN, { code: 139 })).toEqual(unknown('failed'));
    expect(answer(IN, { code: null, killed: true })).toEqual(unknown('timeout'));
  });
});

describe('parseOpencode (US-0804 FR1.5)', () => {
  const provider = (name, n = 1) => ({
    id: name.toLowerCase(),
    name,
    connections: Array.from({ length: n }, (_, i) => ({ type: 'credential', id: `cred_${i}`, label: 'default', method: 'oauth' }))
  });
  const answer = (value, over) => parseOpencode(run({ stdout: JSON.stringify(value), ...over }));

  it('one or more connections is signed in, with the provider names (AC1.1.1)', () => {
    expect(answer([provider('Anthropic')])).toEqual({ state: 'in', account: 'Anthropic', reason: null });
    expect(answer([provider('Anthropic', 2), provider('OpenAI', 0), provider('GitHub Copilot')])).toEqual({
      state: 'in',
      account: 'Anthropic, GitHub Copilot',
      reason: null
    });
    expect(answer([{ connections: [{}] }])).toEqual({ state: 'in', account: null, reason: null }); // AC1.1.2
  });

  it('no connection is "no account connected" (AC1.1.4)', () => {
    const none = { state: 'none', account: null, reason: null };
    expect(answer([])).toEqual(none);
    expect(answer([provider('OpenAI', 0)])).toEqual(none);
  });

  it('no JSON, not a list and a list of something else are unknown (AC1.2.2)', () => {
    expect(parseOpencode(run({ stdout: '┌  Credentials ~/.local/share/opencode/auth.json' }))).toEqual(unknown('unreadable'));
    for (const value of [{}, null, 'x', [null], ['Anthropic'], [{ name: 'Anthropic' }]]) expect(answer(value)).toEqual(unknown('unreadable'));
  });

  it('a check that failed or was stopped is unknown (FR1.6)', () => {
    expect(answer([provider('Anthropic')], { code: 1 })).toEqual(unknown('failed'));
    expect(answer([provider('Anthropic')], { code: null, killed: true })).toEqual(unknown('timeout'));
  });
});

describe('what the page is given (US-0804 NFR1, AC1.2.7)', () => {
  // Put together here, so that no text in this file looks like a token.
  const fill = 'A1b2C3d4E5f6G7h8J9k0L1m2N3o4P5q6R7s8';
  const TOKENS = [
    `gh${'o'}_${fill}`,
    `github${'_pat_'}${fill}`,
    `gl${'pat'}-${fill}`,
    `s${'k'}-ant-api03-${fill}`,
    `ey${'J'}hbGciOi.${fill}.sig`,
    fill + fill,
    'f'.repeat(16) + '0123456789abcdef'
  ];

  it('a reason has no token in it', () => {
    for (const token of TOKENS) {
      const { reason: text } = parseGh(run({ code: 1, stderr: `error: ${token} was refused` }));
      expect(text).not.toContain(token);
      expect(text).toBe('error: ••• was refused');
    }
    for (const line of ['Authorization: Bearer abc.def', 'Authorization: token abc.def', 'access_token=abc.def', 'password: abc.def'])
      expect(parseGh(run({ code: 1, stderr: line })).reason).not.toContain('abc');
    expect(parseGh(run({ code: 1, stderr: 'Get "https://dana:hunter2@proxy.local/": refused' })).reason).not.toContain('hunter2');
  });

  it('a reason is one line without control characters, at most 200 long', () => {
    expect(parseGh(run({ code: 1, stderr: '\u001b[31mno\u0007 route‮ to host\u001b[0m\nsecond line' })).reason).toBe('no route to host');
    expect(parseGh(run({ code: 1, stderr: 'word '.repeat(60) })).reason).toHaveLength(199); // 200, without the space at its end
    expect(cleanText('a,'.repeat(150))).toHaveLength(200);
  });

  it("Claude Code's and opencode's output is never in a reason", () => {
    for (const parse of [parseClaude, parseOpencode])
      for (const code of [0, 1, 127]) {
        const { reason: text } = parse(run({ code, stdout: 'my secret output', stderr: 'my secret error' }));
        expect(text).not.toMatch(/secret/);
        expect(text).toBeTruthy();
      }
  });

  it('an account is cleaned the same way', () => {
    const email = `${'a-long-name.'.repeat(5)}dana@a-very-long-domain-name.example.com`;
    const answer = (value) => parseClaude(run({ stdout: JSON.stringify({ loggedIn: true, email: value }) })).account;
    expect(answer(email)).toBe(email);
    expect(answer('dana\u0000@example.com\nsecond')).toBe('dana@example.com');
    expect(answer(TOKENS[0])).toBe('•••');
    expect(answer('x '.repeat(300)).length).toBeLessThanOrEqual(200);
    for (const name of ['a-name-of-thirty-nine-letters-like-this', 'sk-anna', 'berg-sk-anna']) expect(parseGh(run({ stdout: name })).account).toBe(name);
  });
});
