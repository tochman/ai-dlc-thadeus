// US-1201 AC-1: platform detection and the three APIs behind one interface. No network: gh and glab answer through a
// stubbed exec, Bitbucket through a stubbed fetch, both from fixtures shaped as each API documents its replies.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { detectPlatform } from '../../src/main/platforms/detect.js';
import { PLATFORM_TIMEOUT_MS, listComments, listPulls, listReviews } from '../../src/main/platforms/index.js';

const fixture = (name) => JSON.parse(readFileSync(path.resolve(__dirname, `../fixtures/platforms/${name}.json`), 'utf8'));

/** Answers `<cli> api [--hostname h] <endpoint>` from a fixture; the login-shell PATH probe gets a fixed PATH. */
function cliExec(cli, answers) {
  const calls = [];
  const exec = async (file, args, opts) => {
    if (file !== cli) return '__AIDLC_DASH_PATH__/usr/bin';
    calls.push({ args, opts });
    const endpoint = args.at(-1);
    if (!(endpoint in answers)) throw Object.assign(new Error(`Command failed: ${cli} api ${endpoint}\nHTTP 404`), { code: 1 });
    return JSON.stringify(answers[endpoint]);
  };
  return { exec, calls };
}

/** A fetch that answers https://api.bitbucket.org/2.0/<endpoint> from a fixture. */
function bitbucketFetch(answers) {
  return vi.fn(async (url, init) => {
    const endpoint = String(url).replace('https://api.bitbucket.org/2.0/', '');
    if (!(endpoint in answers)) return { ok: false, status: 404, json: async () => ({}) };
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('thomas:secret-pw').toString('base64')}`);
    return { ok: true, status: 200, json: async () => answers[endpoint] };
  });
}
const credentials = async () => ({ username: 'thomas', appPassword: 'secret-pw' });

// The same pull request on every platform, so the common shape can be compared directly.
const FILES = ['src/main/git.js', 'aidlc/spaces/default/intents/intents.json'];

afterEach(() => vi.unstubAllGlobals());

describe('detectPlatform (US-1201 AC-1)', () => {
  it('knows GitHub, GitLab and Bitbucket from https and ssh addresses', () => {
    expect(detectPlatform('https://github.com/tochman/ai-dlc-thadeus.git')).toEqual({
      id: 'github',
      name: 'GitHub',
      host: 'github.com',
      path: 'tochman/ai-dlc-thadeus'
    });
    expect(detectPlatform('git@github.com:tochman/ai-dlc-thadeus.git')).toMatchObject({ id: 'github', path: 'tochman/ai-dlc-thadeus' });
    expect(detectPlatform('https://gitlab.com/team/apps/dash')).toMatchObject({ id: 'gitlab', host: 'gitlab.com', path: 'team/apps/dash' });
    expect(detectPlatform('git@gitlab.com:team/dash.git')).toMatchObject({ id: 'gitlab', path: 'team/dash' });
    expect(detectPlatform('https://thomas@bitbucket.org/team/dash.git')).toEqual({
      id: 'bitbucket',
      name: 'Bitbucket',
      host: 'bitbucket.org',
      path: 'team/dash'
    });
    expect(detectPlatform('git@bitbucket.org:team/dash.git')).toMatchObject({ id: 'bitbucket', path: 'team/dash' });
  });

  it('knows a self-hosted GitLab by "gitlab" in the host name, and nothing else', () => {
    expect(detectPlatform('ssh://git@gitlab.example.com:2222/team/apps/dash.git')).toEqual({
      id: 'gitlab',
      name: 'GitLab',
      host: 'gitlab.example.com',
      path: 'team/apps/dash'
    });
    expect(detectPlatform('https://code.example.com/team/dash.git')).toBeNull();
    expect(detectPlatform('/Users/me/repos/dash.git')).toBeNull();
    expect(detectPlatform('https://github.com/only-owner')).toBeNull();
    expect(detectPlatform('https://github.com/owner/repo;rm -rf')).toBeNull();
    expect(detectPlatform(null)).toBeNull();
  });
});

describe('listPulls, listComments, listReviews (US-1201 AC-1)', () => {
  it('reads GitHub through gh api into the common shape, with the 15 s limit', async () => {
    const { exec, calls } = cliExec('gh', fixture('github'));
    const github = detectPlatform('git@github.com:tochman/ai-dlc-thadeus.git');
    const [pull] = await listPulls(github, { exec });
    expect(pull).toEqual({
      number: 58,
      title: "feat(US-0209): an intent's cost counts every machine",
      branch: 'feat/US-0209',
      author: 'tochman',
      url: 'https://github.com/tochman/ai-dlc-thadeus/pull/58',
      files: FILES
    });
    expect(await listComments(github, 58, { exec })).toEqual([
      {
        author: 'anna',
        body: 'Looks good, one question on the snapshot.',
        time: '2026-11-15T11:00:00Z',
        url: 'https://github.com/tochman/ai-dlc-thadeus/pull/58#issuecomment-1'
      },
      {
        author: 'bo',
        body: 'Why fetch here?',
        time: '2026-11-15T11:30:00Z',
        url: 'https://github.com/tochman/ai-dlc-thadeus/pull/58#discussion_r3',
        thread: { id: 'PRRT_1', path: 'src/main/git.js', line: 14, resolved: false } // US-1203: review threads by GraphQL
      }
    ]);
    const graphql = calls.find((c) => c.args.at(-1) === 'graphql').args;
    expect(graphql).toEqual(expect.arrayContaining(['-f', 'owner=tochman', '-f', 'name=ai-dlc-thadeus', '-F', 'n=58']));
    expect(await listReviews(github, 58, { exec })).toEqual([
      {
        author: 'anna',
        state: 'approved',
        time: '2026-11-15T12:00:00Z',
        body: '',
        url: 'https://github.com/tochman/ai-dlc-thadeus/pull/58#pullrequestreview-2'
      }
    ]);
    expect(calls.every((c) => c.args[0] === 'api' && c.opts.timeout === PLATFORM_TIMEOUT_MS && c.opts.shell === undefined)).toBe(true);
    expect(PLATFORM_TIMEOUT_MS).toBe(15000);
  });

  it('reads GitLab through glab api on its own host into the same shape, leaving system notes out', async () => {
    const { exec, calls } = cliExec('glab', fixture('gitlab'));
    const gitlab = detectPlatform('https://gitlab.example.com/team/apps/dash.git');
    const [pull] = await listPulls(gitlab, { exec });
    expect(pull).toEqual({
      number: 12,
      title: 'US-0209 cost on every machine',
      branch: 'feat/US-0209',
      author: 'tochman',
      url: 'https://gitlab.example.com/team/apps/dash/-/merge_requests/12',
      files: FILES
    });
    expect(await listComments(gitlab, 12, { exec })).toEqual([
      { author: 'anna', body: 'Looks good, one question on the snapshot.', time: '2026-11-15T11:00:00Z', url: null },
      // US-1203: a diff discussion is a thread with its file, line and resolved state
      {
        author: 'bo',
        body: 'Why fetch here?',
        time: '2026-11-15T11:30:00Z',
        url: null,
        thread: { id: 'd2', path: 'src/main/git.js', line: 14, resolved: true }
      }
    ]);
    expect(await listReviews(gitlab, 12, { exec })).toEqual([{ author: 'anna', state: 'approved', time: '2026-11-15T12:00:00Z', body: '', url: null }]);
    expect(calls[0].args.slice(0, 3)).toEqual(['api', '--hostname', 'gitlab.example.com']);
  });

  it('reads Bitbucket through REST with Basic auth into the same shape', async () => {
    const fetch = bitbucketFetch(fixture('bitbucket'));
    const bitbucket = detectPlatform('git@bitbucket.org:team/dash.git');
    const deps = { fetch, credentials };
    const [pull] = await listPulls(bitbucket, deps);
    expect(pull).toEqual({
      number: 7,
      title: 'US-0209 cost on every machine',
      branch: 'feat/US-0209',
      author: 'Thomas Ochman',
      url: 'https://bitbucket.org/team/dash/pull-requests/7',
      files: FILES
    });
    expect(await listComments(bitbucket, 7, deps)).toEqual([
      {
        author: 'Anna',
        body: 'Looks good, one question on the snapshot.',
        time: '2026-11-15T11:00:00+00:00',
        url: 'https://bitbucket.org/team/dash/pull-requests/7/_/diff#comment-1'
      },
      // US-1203: inline comments are a thread under their first comment, with its file and line
      ...[
        ['Bo', 'Why fetch here?', '2026-11-15T11:30:00+00:00', 2],
        ['Thomas Ochman', 'To spare a round trip.', '2026-11-15T11:40:00+00:00', 3]
      ].map(([author, body, time, id]) => ({
        author,
        body,
        time,
        url: `https://bitbucket.org/team/dash/pull-requests/7/_/diff#comment-${id}`,
        thread: { id: 2, path: 'src/main/git.js', line: 14, resolved: false }
      }))
    ]);
    expect(await listReviews(bitbucket, 7, deps)).toEqual([{ author: 'Anna', state: 'approved', time: '2026-11-15T12:00:00+00:00', body: '', url: null }]);
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('names the platform and what went wrong: a missing CLI, a missing login, a timeout, missing credentials', async () => {
    const github = detectPlatform('https://github.com/tochman/ai-dlc-thadeus');
    const failing = (err) => async (file) => {
      if (file !== 'gh') return '__AIDLC_DASH_PATH__/usr/bin';
      throw err;
    };
    await expect(listPulls(github, { exec: failing(Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' })) })).rejects.toMatchObject({
      name: 'PlatformError',
      code: 'cli-missing',
      platform: 'GitHub'
    });
    await expect(
      listPulls(github, { exec: failing(new Error('Command failed: gh api\nTo get started with GitHub CLI, please run:  gh auth login')) })
    ).rejects.toMatchObject({
      code: 'not-logged-in'
    });
    await expect(listPulls(github, { exec: failing(Object.assign(new Error('Command failed'), { killed: true, signal: 'SIGTERM' })) })).rejects.toMatchObject({
      code: 'timeout',
      platform: 'GitHub'
    });
    const bitbucket = detectPlatform('git@bitbucket.org:team/dash.git');
    await expect(listPulls(bitbucket, { fetch: vi.fn(), credentials: async () => null })).rejects.toMatchObject({
      code: 'no-credentials',
      platform: 'Bitbucket'
    });
    const timeout = vi.fn(async () => {
      throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
    });
    await expect(listPulls(bitbucket, { fetch: timeout, credentials })).rejects.toMatchObject({ code: 'timeout' });
    const denied = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    await expect(listPulls(bitbucket, { fetch: denied, credentials })).rejects.toMatchObject({ code: 'not-logged-in' });
  });

  it("a missing login names Settings › Tools for GitHub only; GitLab's and Bitbucket's texts do not change (US-0804 FR4.4)", async () => {
    const loggedOut = async (file) => {
      if (file !== 'gh' && file !== 'glab') return '__AIDLC_DASH_PATH__/usr/bin';
      throw new Error(`To get started, please run: ${file} auth login`);
    };
    const message = (platform, deps) => listPulls(platform, deps).catch((err) => `${err.code}: ${err.message}`);
    expect(await message(detectPlatform('https://github.com/tochman/ai-dlc-thadeus'), { exec: loggedOut })).toBe(
      'not-logged-in: GitHub kan inte läsas: du är inte inloggad. Kör gh auth login i shell-fliken, eller logga in från Inställningar › Verktyg.'
    );
    expect(await message(detectPlatform('https://gitlab.com/team/dash.git'), { exec: loggedOut })).toBe(
      'not-logged-in: GitLab kan inte läsas: du är inte inloggad. Kör glab auth login i shell-fliken.'
    );
    const denied = async () => ({ ok: false, status: 401, json: async () => ({}) });
    const credentials = async () => ({ username: 'dana', appPassword: 'x' });
    expect(await message(detectPlatform('git@bitbucket.org:team/dash.git'), { fetch: denied, credentials })).toBe(
      'not-logged-in: Bitbucket nekade användarnamnet eller app-lösenordet. Ändra dem i Inställningar › Verktyg.'
    );
  });

  it('refuses a pull request number that is not a positive whole number before anything runs', async () => {
    const { exec, calls } = cliExec('gh', fixture('github'));
    const github = detectPlatform('https://github.com/tochman/ai-dlc-thadeus');
    await expect(listComments(github, '58;rm', { exec })).rejects.toThrow();
    await expect(listReviews(github, -1, { exec })).rejects.toThrow();
    await expect(listPulls(null, { exec })).rejects.toMatchObject({ code: 'unknown-platform' });
    expect(calls).toHaveLength(0);
  });
});
