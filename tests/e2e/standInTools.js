// US-0805 NFR3: stand-in tools for the built-app tests, so the start's health check finds what it needs and no real tool
// runs. A stand-in answers `--version` and its sign-in check, exits at once as an agent tab's CLI (no argument), so no
// agent is ever at work, and fails for anything else. It notes what it is run with in `<file>.ran`, and its check's
// answer is in `<file>.answer`.
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const SCRIPT = [
  '#!/bin/sh',
  'echo "$*" >> "$0.ran"',
  '[ "$1" = --version ] && echo 1.0.0 && exit',
  '[ $# = 0 ] && exit',
  'case "$*" in',
  '  "auth status" | "auth list --format json" | "api user --hostname github.com --jq .login") [ -f "$0.answer" ] && . "$0.answer" && exit ;;',
  'esac',
  'exit 1',
  ''
].join('\n');

// Signed in, as each tool's check prints it (US-0804).
const SIGNED_IN = {
  claude: `echo '${JSON.stringify({ loggedIn: true, apiProvider: 'firstParty', email: 'dana@example.com', subscriptionType: 'max' })}'`,
  opencode: `echo '${JSON.stringify([{ id: 'a', name: 'Anthropic', connections: [{ id: 'c' }] }])}'`,
  gh: 'echo octo-dana'
};

/** What a stand-in's sign-in check prints and how it exits, as shell lines. */
export const answerWith = (file, ...lines) => writeFileSync(`${file}.answer`, `${lines.join('\n')}\n`);

/** One working stand-in for the tool `id`, signed in where that applies. */
export function writeStandIn(file, id) {
  writeFileSync(file, SCRIPT, { mode: 0o755 });
  if (SIGNED_IN[id]) answerWith(file, SIGNED_IN[id]);
}

/**
 * Writes a stand-in for every tool in `dir` but the `missing` ones and returns the settings' toolPaths: every tool has a
 * path, so none is looked up on the person's own PATH. A missing tool's path has no file.
 */
export function standInTools(dir, { missing = [] } = {}) {
  const ids = ['aidlc', 'claude', 'opencode', 'gh', 'glab', 'specify'];
  const paths = Object.fromEntries(ids.map((id) => [id, path.join(dir, `stand-in ${id}`)])); // a space: quoted where it is used
  for (const id of ids) if (!missing.includes(id)) writeStandIn(paths[id], id);
  return paths;
}
