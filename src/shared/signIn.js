// The tools whose sign-in the app shows and the line that starts it (EPIC-08 US-0804 FR2.3, FR3.2). Pure. The tool does
// the sign-in: the app types or shows this line and never sends Enter (FR3.4).

const SIGN_IN_ARGS = {
  claude: 'auth login',
  opencode: 'auth login',
  gh: 'auth login --hostname github.com'
};
export const SIGN_IN_IDS = Object.keys(SIGN_IN_ARGS);

/** FR2.3: a tool the app does not check, with the command to check it by hand. */
export const MANUAL_CHECK = { glab: 'glab auth status' };

/** A path as a shell word: every character outside letters, digits and `_@%+=:,./-` backslash-escaped, as a drop in Terminal.app types it. */
export const shellQuote = (path) => String(path).replace(/[^\p{L}\p{N}_@%+=:,./-]/gu, '\\$&');

/**
 * US-0804 FR3.2: the sign-in command of a tool, with the chosen path in place of its name; null for any other id.
 * A path with a control character is not used: typed into a terminal, a line break in it would be an Enter (FR3.4).
 */
export function signInCommand(id, savedPath) {
  if (!SIGN_IN_IDS.includes(id)) return null;
  const tool = savedPath && !/\p{Cc}/u.test(savedPath) ? shellQuote(savedPath) : id;
  return `${tool} ${SIGN_IN_ARGS[id]}`;
}
