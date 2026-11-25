// What each tool's sign-in check answered (EPIC-08 US-0804 FR1.3–FR1.6, FR2.2, NFR1). Pure: each parser takes
// {code, stdout, stderr, killed} and gives {state, account, reason}, where `state` is 'in', 'out', 'none' (opencode
// without an account) or 'unknown'. Anything not known for sure is 'unknown' with its reason, never 'in'.
import { t } from '../../shared/i18n.js';

const TEXT_MAX = 200;
const HIDDEN = '•••';
// What may be a secret: known token prefixes, the value after a word that announces one, a URL's user and password, and
// any long run. 40 is one more than the longest GitHub account name, so a name is never hidden.
const TOKENS = [/\b(?:gh[a-z]_|github_pat_|glpat-|sk-|xox[a-z]-)[\w-]{16,}/g, /\beyJ[\w-]+\.[\w.-]+/g, /\b[0-9a-f]{32,}\b/gi, /[A-Za-z0-9+/_=-]{40,}/g];
const ANNOUNCED = /\b((?:authorization|access_token|api[_-]?key|token|password|secret)\s*[:=]\s*(?:(?:bearer|basic|token)\s+)?|bearer\s+)\S+/gi;
const URL_LOGIN = /(\/\/)[^\s/@]+@/g;

/** NFR1: the first line with text, without escape sequences and control characters, tokens hidden, at most 200 long. */
export function cleanText(text) {
  const lines = String(text ?? '')
    .split(/[\r\n]+/)
    .map((line) =>
      line
        .replace(/\p{Cc}\[[0-9;?]*[A-Za-z]/gu, '')
        .replace(/\p{C}/gu, '')
        .trim()
    );
  let line = lines.find(Boolean) ?? '';
  line = line.replace(URL_LOGIN, `$1${HIDDEN}@`).replace(ANNOUNCED, `$1${HIDDEN}`);
  for (const token of TOKENS) line = line.replace(token, HIDDEN);
  return line.slice(0, TEXT_MAX).trim();
}

const signedIn = (account) => ({ state: 'in', account: account || null, reason: null });
const signedOut = { state: 'out', account: null, reason: null };
/** FR1.6: `reason` is a text of the app, or a cleaned line of gh's. */
const unknown = (reason) => ({ state: 'unknown', account: null, reason });
const stopped = () => unknown(t('signIn.reason.timeout'));
const failed = () => unknown(t('signIn.reason.failed'));
const unreadable = () => unknown(t('signIn.reason.unreadable'));

/** The parsed JSON, or undefined for anything else. */
function json(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** FR1.3: `gh api user --jq .login`. Only gh's own stderr may become a reason. */
export function parseGh({ code, stdout, stderr, killed }) {
  if (killed) return stopped();
  if (code === 0) return /^\S+$/.test(stdout.trim()) ? signedIn(cleanText(stdout)) : unreadable();
  if (code === 4 || /\bHTTP 401\b/.test(stderr)) return { ...signedOut };
  return unknown(cleanText(stderr) || t('signIn.reason.failed'));
}

/** FR1.4: `claude auth status`. `loggedIn` decides, also with exit 1, which is how it answers when signed out. */
export function parseClaude({ code, stdout, killed }) {
  if (killed) return stopped();
  if (code !== 0 && code !== 1) return failed();
  const answer = json(stdout);
  if (typeof answer?.loggedIn !== 'boolean') return unreadable();
  if (answer.loggedIn) {
    const parts = [answer.email, answer.subscriptionType].filter((part) => typeof part === 'string').map(cleanText);
    return signedIn(cleanText(parts.filter(Boolean).join(' · ')));
  }
  // Another provider's sign-in is not Anthropic's, so Claude Code cannot tell.
  return (answer.apiProvider ?? 'firstParty') === 'firstParty' ? { ...signedOut } : unknown(t('signIn.reason.otherProvider'));
}

/** FR1.5: `opencode auth list --format json`, a list of {id, name, connections}. */
export function parseOpencode({ code, stdout, killed }) {
  if (killed) return stopped();
  if (code !== 0) return failed();
  const list = json(stdout);
  if (!Array.isArray(list) || !list.every((p) => Array.isArray(p?.connections))) return unreadable();
  const connected = list.filter((p) => p.connections.length > 0);
  if (connected.length === 0) return { state: 'none', account: null, reason: null };
  const names = connected.map((p) => cleanText(p.name ?? p.id)).filter(Boolean);
  return signedIn(cleanText(names.join(', ')));
}
