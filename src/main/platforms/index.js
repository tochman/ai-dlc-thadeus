// US-1201 AC-1: one interface over the three platforms: listPulls, listComments, listReviews. GitHub is read through
// `gh api` and GitLab through `glab api`, each with the person's own login; Bitbucket through REST with the username and
// app password the caller passes in (`credentials`). Every call has a 15 s limit, and every failure becomes a
// PlatformError that names the platform and what the person can do, so the rest of the app keeps working.
import { runFixed } from '../exec.js';
import { toolPath } from '../tools.js';
import { t } from '../../shared/i18n.js';
import * as github from './github.js';
import * as gitlab from './gitlab.js';
import * as bitbucket from './bitbucket.js';

export const PLATFORM_TIMEOUT_MS = 15000;
const MODULES = { github, gitlab, bitbucket };
const CLI = { github: 'gh', gitlab: 'glab' };
const BITBUCKET_API = 'https://api.bitbucket.org/2.0/';

/** A failure with a code the views can act on: cli-missing, not-logged-in, no-credentials, timeout, failed, unknown-platform. */
export class PlatformError extends Error {
  constructor(code, platform, cause) {
    // Bitbucket has no CLI to log in with: a refused login is about the saved app password.
    const key = code === 'not-logged-in' && platform?.id === 'bitbucket' ? 'bad-credentials' : code;
    super(t(`team.errors.${key}`, { platform: platform?.name ?? '–', cli: CLI[platform?.id] ?? '', error: cause?.message ?? '' }));
    this.name = 'PlatformError';
    this.code = code;
    this.platform = platform?.name ?? null;
  }
}

function codeOf(err) {
  if (err.code === 'ENOENT') return 'cli-missing';
  if (err.code === 'no-credentials') return 'no-credentials';
  if (err.killed || err.name === 'TimeoutError' || err.name === 'AbortError') return 'timeout';
  if (err.status === 401 || err.status === 403 || /auth login|not logged in|unauthorized|HTTP 401/i.test(err.message)) return 'not-logged-in';
  return 'failed';
}

/** Bitbucket's REST API with Basic auth; the credentials are read once per call of the interface and never logged. */
function bitbucketApi({ fetch = globalThis.fetch, credentials }) {
  let auth = null;
  return async (endpoint) => {
    auth ??= Promise.resolve(credentials?.()).then((c) => {
      if (!c) throw Object.assign(new Error('no credentials'), { code: 'no-credentials' });
      return `Basic ${Buffer.from(`${c.username}:${c.appPassword}`).toString('base64')}`;
    });
    const res = await fetch(`${BITBUCKET_API}${endpoint}`, {
      headers: { Authorization: await auth, Accept: 'application/json' },
      signal: AbortSignal.timeout(PLATFORM_TIMEOUT_MS)
    });
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
    return res.json();
  };
}

/** `api(endpoint)` for one platform: parsed JSON from its CLI or its REST API. */
function client(platform, deps) {
  if (platform.id === 'bitbucket') return bitbucketApi(deps);
  const host = platform.id === 'gitlab' ? ['--hostname', platform.host] : [];
  return async (endpoint) =>
    JSON.parse(await runFixed(toolPath(CLI[platform.id]), ['api', ...host, endpoint], { timeout: PLATFORM_TIMEOUT_MS, exec: deps.exec }));
}

async function run(platform, deps, fn) {
  if (!MODULES[platform?.id]) throw new PlatformError('unknown-platform', platform);
  try {
    return await fn(MODULES[platform.id], client(platform, deps));
  } catch (err) {
    throw new PlatformError(codeOf(err), platform, err);
  }
}

function checkNumber(number) {
  if (!Number.isInteger(number) || number <= 0) throw new Error(t('errors.invalidValue', { what: 'pull request', value: String(number) }));
}

/**
 * US-1201 AC-1: the open pull requests (GitLab: merge requests) of the remote.
 * @param {{id: string, name: string, host: string, path: string}} platform from detectPlatform
 * @param {{exec?: Function, fetch?: Function, credentials?: () => Promise<{username: string, appPassword: string}|null>}} deps
 * @returns {Promise<Array<{number: number, title: string, branch: string|null, author: string|null, url: string|null, files: string[]}>>}
 */
export async function listPulls(platform, deps = {}) {
  return run(platform, deps, (m, api) => m.pulls(api, platform));
}

/** US-1201 AC-1: one pull request's comments as {author, body, time, url}. */
export async function listComments(platform, number, deps = {}) {
  checkNumber(number);
  return run(platform, deps, (m, api) => m.comments(api, platform, number));
}

/** US-1201 AC-1: one pull request's reviews as {author, state: 'approved'|'changes'|'commented', time, body, url}. */
export async function listReviews(platform, number, deps = {}) {
  checkNumber(number);
  return run(platform, deps, (m, api) => m.reviews(api, platform, number));
}
