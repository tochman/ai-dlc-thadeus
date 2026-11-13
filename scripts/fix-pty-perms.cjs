// node-pty ships spawn-helper without the execute bit in some installs, so every pty spawn fails with
// "posix_spawnp failed" (F-01). Runs on postinstall; no external commands.
const fs = require('node:fs');
const path = require('node:path');

/** Makes every prebuilds/<platform>/spawn-helper under `ptyDir` executable. A missing folder is not an error. */
function fixPtyPerms(ptyDir = path.join(__dirname, '..', 'node_modules', 'node-pty')) {
  const prebuilds = path.join(ptyDir, 'prebuilds');
  if (!fs.existsSync(prebuilds)) return [];
  const fixed = [];
  for (const platform of fs.readdirSync(prebuilds)) {
    const helper = path.join(prebuilds, platform, 'spawn-helper');
    if (!fs.existsSync(helper)) continue;
    fs.chmodSync(helper, 0o755);
    fixed.push(helper);
  }
  return fixed;
}

module.exports = { fixPtyPerms };

if (require.main === module) {
  for (const p of fixPtyPerms()) console.log(`spawn-helper körbar: ${p}`);
}
