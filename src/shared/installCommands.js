// How to install the tools of the health check (EPIC-08 US-0805 FR4.2, FR4.3): one table, each command exactly as on the
// tool's own page, read 2026-11-25. They can change there, which is why the page is linked. The app shows and copies a
// command and never runs one (FR4.4). Pure.

// GitHub's Debian chain (cli/cli docs/install_linux.md); joined below as it is written there, a tab before each `&&`.
const GH_DEBIAN = [
  '(type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y))',
  'sudo mkdir -p -m 755 /etc/apt/keyrings',
  'out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg',
  'cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null',
  'sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg',
  'sudo mkdir -p -m 755 /etc/apt/sources.list.d',
  'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null',
  'sudo apt update',
  'sudo apt install gh -y'
].join(' \\\n\t&& ');

// `mac` replaces `any` on macOS; `needs` is what its command needs first, by name.
const TABLE = {
  aidlc: {
    any: { command: 'curl -fsSL https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.sh | sh' },
    page: 'https://github.com/awslabs/aidlc-workflows'
  },
  claude: { any: { command: 'curl -fsSL https://claude.ai/install.sh | bash' }, page: 'https://code.claude.com/docs/en/setup' },
  specify: { any: { command: 'uv tool install specify-cli', needs: 'uv' }, page: 'https://github.com/github/spec-kit' },
  opencode: { any: { command: 'curl -fsSL https://opencode.ai/v2/install | bash' }, page: 'https://opencode.ai/docs' },
  gh: { any: { command: GH_DEBIAN }, mac: { command: 'brew install gh', needs: 'Homebrew' }, page: 'https://cli.github.com' }
};

/** The tools of the health check, in the order they are listed (FR1.1). */
export const HEALTH_IDS = Object.keys(TABLE);

/**
 * US-0805 FR4.2: a tool's install command on `platform` (process.platform; any but macOS is Linux), what it needs
 * first, and the tool's own page; null for an id that is not in the table.
 * @returns {{command: string, needs: string|null, page: string}|null}
 */
export function installFor(id, platform) {
  if (!HEALTH_IDS.includes(id)) return null;
  const { any, mac, page } = TABLE[id];
  const { command, needs = null } = (platform === 'darwin' && mac) || any;
  return { command, needs, page };
}
