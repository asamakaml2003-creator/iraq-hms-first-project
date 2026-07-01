import { app, BrowserWindow, shell } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

let backendProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

// Only one copy of this app should ever run at a time - a second launch would
// spawn a second backend that immediately dies with EADDRINUSE on port 3001,
// leaving that window stuck on "make sure the backend is running" even though
// the first instance is working fine. Bail out of the second launch instead.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

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

  // In dev, 'inherit' shares this terminal. In a packaged app there is no
  // terminal, so 'inherit' silently discards backend output (e.g. the Prisma
  // connection error that fires when the backend can't find its .env) -
  // log to a file instead so failures are diagnosable. This also captures
  // spawn-level errors (e.g. bad cwd/entry path) that only ever reached
  // console.error before, which is equally invisible in a GUI-launched app.
  //
  // spawn()'s stdio array needs an already-open fd; fs.createWriteStream()
  // opens its fd asynchronously, so passing the stream directly races the
  // 'open' event and throws ERR_INVALID_ARG_VALUE. Use openSync for a fd
  // that's valid immediately.
  let stdio: 'inherit' | [number, number, number] = 'inherit';
  let logFd: number | null = null;
  if (app.isPackaged) {
    const logPath = path.join(app.getPath('logs'), 'backend.log');
    logFd = fs.openSync(logPath, 'a');
    stdio = [logFd, logFd, logFd];
    fs.writeSync(logFd, `\n[${new Date().toISOString()}] spawning backend: entry=${entry} cwd=${backendDir}\n`);
  }
  const logLine = (line: string) => {
    if (logFd !== null) fs.writeSync(logFd, `${line}\n`);
  };

  try {
    backendProcess = spawn(process.execPath, args, {
      cwd: backendDir,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio,
    });
  } catch (err) {
    logLine(`spawn() threw synchronously: ${(err as Error).stack ?? err}`);
    console.error('Failed to spawn backend process:', err);
    if (logFd !== null) fs.closeSync(logFd);
    return;
  }

  backendProcess.on('exit', (code, signal) => {
    logLine(`backend process exited (code=${code}, signal=${signal})`);
    console.log(`Backend process exited (code=${code}, signal=${signal})`);
    backendProcess = null;
    if (logFd !== null) fs.closeSync(logFd);
  });

  backendProcess.on('error', (err) => {
    logLine(`backend process error: ${err.stack ?? err}`);
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
  mainWindow = new BrowserWindow({
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
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

if (gotSingleInstanceLock) {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

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
}
