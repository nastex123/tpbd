import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';

const development = process.argv.includes('--dev');
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
let server;

async function openWindow() {
  const window = new BrowserWindow({
    title: 'TPBD — Data Detective',
    width: 1100,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());

  if (development) {
    await window.loadURL('http://127.0.0.1:1420/');
  } else {
    await window.loadFile(fileURLToPath(new URL('../dist/index.html', import.meta.url)));
  }
}

app.whenReady().then(async () => {
  if (development) {
    const { createServer } = await import('vite');
    server = await createServer({ root: projectRoot });
    await server.listen();
  }
  await openWindow();
}).catch((error) => {
  console.error('No se pudo iniciar TPBD:', error);
  app.exit(1);
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', (event) => {
  if (!server) return;
  event.preventDefault();
  const runningServer = server;
  server = undefined;
  void runningServer.close().finally(() => app.quit());
});
