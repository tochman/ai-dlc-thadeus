// US-0804 FR2.3, FR3.2, FR3.4: the line the app types, or shows to copy.
import { describe, expect, it } from 'vitest';
import { MANUAL_CHECK, SIGN_IN_IDS, shellQuote, signInCommand } from '../../src/shared/signIn.js';
import { shellQuote as typedQuote } from '../../src/renderer/terminalControl.js';

describe('signInCommand (US-0804 FR3.2)', () => {
  it('is the fixed command of each of the three tools', () => {
    expect(SIGN_IN_IDS).toEqual(['claude', 'opencode', 'gh']);
    expect(SIGN_IN_IDS.map((id) => signInCommand(id))).toEqual(['claude auth login', 'opencode auth login', 'gh auth login --hostname github.com']);
  });

  it('a chosen path, quoted for the shell, replaces the name', () => {
    expect(signInCommand('gh', '/opt/homebrew/bin/gh')).toBe('/opt/homebrew/bin/gh auth login --hostname github.com');
    expect(signInCommand('claude', "/Users/dana/My tools/it's/claude")).toBe("/Users/dana/My\\ tools/it\\'s/claude auth login");
    expect(signInCommand('claude', '/tmp/$(touch x);`id`/claude')).toBe('/tmp/\\$\\(touch\\ x\\)\\;\\`id\\`/claude auth login');
  });

  it('without a chosen path, or with one that holds a control character such as Enter, it is the name (FR3.4)', () => {
    for (const none of [undefined, null, '', '/tmp/a\nb/claude', '/tmp/a\rb/claude', '/tmp/\u0003/claude'])
      expect(signInCommand('claude', none)).toBe('claude auth login');
  });

  it('is null for anything else', () => {
    for (const id of ['glab', 'aidlc', 'shell', 'constructor', undefined, null]) expect(signInCommand(id, '/x')).toBeNull();
  });

  it('GitLab has a command to check by hand only (FR2.3)', () => {
    expect(MANUAL_CHECK).toEqual({ glab: 'glab auth status' });
  });

  it('quotes a path as a dropped file is typed', () => {
    expect(typedQuote).toBe(shellQuote);
    expect(shellQuote('/Users/me/Skärm bild.png')).toBe('/Users/me/Skärm\\ bild.png');
  });
});
