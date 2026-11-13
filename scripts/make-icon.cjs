// Renders build/icon.svg to build/icon.png (1024x1024, transparent corners) with Electron's own Chromium,
// so no image dependency is needed. electron-builder derives .icns and the Linux sizes from the PNG.
// Usage: npx electron scripts/make-icon.cjs   (or: npm run icon)
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const SIZE = 1024;
const svgPath = path.join(__dirname, '..', 'build', 'icon.svg');
const pngPath = path.join(__dirname, '..', 'build', 'icon.png');
const iconsDir = path.join(__dirname, '..', 'build', 'icons');
const LINUX_SIZES = [16, 24, 32, 48, 64, 128, 256, 512];

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1'); // capture exactly 1024 px on Retina too

async function render() {
  const svg = fs.readFileSync(svgPath, 'utf8');
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    frame: false,
    transparent: true,
    useContentSize: true,
    webPreferences: { offscreen: true }
  });
  const html = `<!doctype html><html><body style="margin:0;background:transparent;overflow:hidden">${svg}</body></html>`;
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((r) => setTimeout(r, 300)); // let the offscreen frame paint
  let image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
  if (image.getSize().width !== SIZE) image = image.resize({ width: SIZE, height: SIZE, quality: 'best' });
  fs.writeFileSync(pngPath, image.toPNG());
  console.log(`Skrev ${path.relative(process.cwd(), pngPath)} (${image.getSize().width}x${image.getSize().height})`);

  // Linux: the hicolor theme on Ubuntu 22.04 looks up the standard sizes (up to 512), not 1024,
  // so electron-builder gets a build/icons/ folder with each size (linux.icon points there).
  fs.mkdirSync(iconsDir, { recursive: true });
  for (const s of LINUX_SIZES) {
    fs.writeFileSync(path.join(iconsDir, `${s}x${s}.png`), image.resize({ width: s, height: s, quality: 'best' }).toPNG());
  }
  console.log(`Skrev ${path.relative(process.cwd(), iconsDir)}/{${LINUX_SIZES.join(',')}}`);
}

app
  .whenReady()
  .then(render)
  .then(() => app.exit(0))
  .catch((err) => {
    console.error('Kunde inte skapa ikonen:', err);
    app.exit(1);
  });
