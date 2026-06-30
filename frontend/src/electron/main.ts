import { app, BrowserWindow, shell } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

let backendProcess: ChildProcess | null = null;

// Dev: frontend/out/main/index.js -> repo-root/backend (run TS source via ts-node)
// Prod: resources/app.asar/out/main/index.js -> resources/backend (run compiled dist/index.js)
function getBackendDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, '../../../backend');
}

function startBackend() {
  const backendDir = getBackendDir();
  const entry = app.isPackaged ? path.join(backendDir, 'dist/index.js') : path.join(backendDir, 'src/index.ts');
  // Use Electron's own Node runtime (ELECTRON_RUN_AS_NODE) so the backend doesn't
  // depend on a separately installed system Node.js, in dev or production.
  const args = app.isPackaged ? [entry] : ['-r', 'ts-node/register/transpile-only', entry];

  backendProcess = spawn(process.execPath, args, {
    cwd: backendDir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'inherit',
  });

  backendProcess.on('exit', (code, signal) => {
    console.log(`Backend process exited (code=${code}, signal=${signal})`);
    backendProcess = null;
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process:', err);
  });
}

function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
    backendProcess = null;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Iraq Hospital Management System',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  stopBackend();
});
