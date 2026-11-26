// US-0805 FR4.2, FR4.3: the install commands and pages, exactly as the requirements' table has them.
import { describe, expect, it } from 'vitest';
import { HEALTH_IDS, installFor } from '../../src/shared/installCommands.js';
import { INSTALL_HINT } from '../../src/main/speckitSetup.js';

const SAME = {
  aidlc: ['curl -fsSL https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.sh | sh', 'https://github.com/awslabs/aidlc-workflows'],
  claude: ['curl -fsSL https://claude.ai/install.sh | bash', 'https://code.claude.com/docs/en/setup'],
  opencode: ['curl -fsSL https://opencode.ai/v2/install | bash', 'https://opencode.ai/docs'],
  specify: ['uv tool install specify-cli', 'https://github.com/github/spec-kit']
};

// GitHub's own lines, from cli/cli docs/install_linux.md, read 2026-11-25: the continuation lines start with one tab.
const GH_LINUX = [
  '(type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y)) \\',
  '\t&& sudo mkdir -p -m 755 /etc/apt/keyrings \\',
  '\t&& out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg \\',
  '\t&& cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \\',
  '\t&& sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \\',
  '\t&& sudo mkdir -p -m 755 /etc/apt/sources.list.d \\',
  '\t&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \\',
  '\t&& sudo apt update \\',
  '\t&& sudo apt install gh -y'
].join('\n');

describe('the install commands (US-0805 FR4.2, FR4.3)', () => {
  it('lists the five tools, and neither GitLab nor the shell (FR1.1)', () => {
    expect([...HEALTH_IDS].sort()).toEqual(['aidlc', 'claude', 'gh', 'opencode', 'specify']);
  });

  it.each(Object.keys(SAME))('gives %s the same command and page on macOS and Linux', (id) => {
    for (const platform of ['darwin', 'linux']) {
      expect(installFor(id, platform)).toEqual({ command: SAME[id][0], needs: id === 'specify' ? 'uv' : null, page: SAME[id][1] });
    }
  });

  it('gives the GitHub CLI Homebrew on macOS and the whole Debian chain, line breaks and tabs included, elsewhere', () => {
    expect(installFor('gh', 'darwin')).toEqual({ command: 'brew install gh', needs: 'Homebrew', page: 'https://cli.github.com' });
    expect(installFor('gh', 'linux')).toEqual({ command: GH_LINUX, needs: null, page: 'https://cli.github.com' });
    expect(installFor('gh', 'freebsd').command).toBe(GH_LINUX);
    expect(installFor('gh', undefined).command).toBe(GH_LINUX);
  });

  it('gives null for an id without a command', () => {
    for (const id of ['glab', 'shell', 'toString', '', undefined]) expect(installFor(id, 'darwin')).toBeNull();
  });

  it("is where the setup view's Spec Kit command comes from", () => {
    expect(INSTALL_HINT).toBe(installFor('specify', 'linux').command);
    expect(INSTALL_HINT).toBe('uv tool install specify-cli');
  });
});
