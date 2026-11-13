// Renders build/icon.svg to build/icon.png (1024x1024, transparent corners) with Electron's own Chromium,
// so no image dependency is needed. electron-builder derives .icns and the Linux sizes from the PNG.
// Usage: npx electron scripts/make-icon.cjs   (or: npm run icon)
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const SIZE = 1024;
const svgPath = path.join(__dirname, '..', 'build', 'icon.svg');
const pngPath = path.join(__dirname, '..', 'build', 'icon.png');

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
}

app
  .whenReady()
  .then(render)
  .then(() => app.exit(0))
  .catch((err) => {
    console.error('Kunde inte skapa ikonen:', err);
    app.exit(1);
  });
