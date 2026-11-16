// US-1201 AC-1: which platform the `origin` remote is on (GitHub, GitLab, Bitbucket), from its https or ssh address.
// A self-hosted GitLab is known by "gitlab" in its host name; any other host is no platform (null), and the app
// then works with plain git only.

const NAMES = { github: 'GitHub', gitlab: 'GitLab', bitbucket: 'Bitbucket' };
const SEGMENT = /^[\w.-]+$/;

/** {host, path} from `https://[user@]host[:port]/path`, `ssh://[user@]host[:port]/path` or `[user@]host:path`. */
function split(url) {
  const s = String(url ?? '').trim();
  let m = /^(https?|ssh|git):\/\/(?:[^@/\s]+@)?([^/:\s]+)(:\d+)?\/(.+)$/i.exec(s);
  // The API lives on the web port: an https port is kept, an ssh port is not.
  if (m) return { host: m[2].toLowerCase() + (m[1].toLowerCase().startsWith('http') ? (m[3] ?? '') : ''), path: m[4] };
  m = /^(?:[^@/\s]+@)?([^/:\s]+):([^/].*)$/.exec(s);
  return m ? { host: m[1].toLowerCase(), path: m[2] } : null;
}

function platformOf(host) {
  if (host === 'github.com') return 'github';
  if (host === 'bitbucket.org') return 'bitbucket';
  return host.includes('gitlab') ? 'gitlab' : null;
}

/**
 * US-1201 AC-1: the platform of a remote address, or null for an unknown host or an address that is not a repository.
 * Every path segment is a plain name, so it can go into an API path as it is.
 * @returns {{id: 'github'|'gitlab'|'bitbucket', name: string, host: string, path: string}|null}
 */
export function detectPlatform(url) {
  const parts = split(url);
  if (!parts) return null;
  const id = platformOf(parts.host);
  if (!id) return null;
  const segments = parts.path
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')
    .split('/');
  if (segments.some((s) => !SEGMENT.test(s) || s === '.' || s === '..')) return null;
  if (id === 'gitlab' ? segments.length < 2 : segments.length !== 2) return null;
  return { id, name: NAMES[id], host: parts.host, path: segments.join('/') };
}
