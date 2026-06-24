// Electron main process for the Murmur desktop app.
//
// By default the app is a thin native shell around the already-deployed site
// (https://murmur-social.onrender.com). Because that production server serves
// the React client and the API from the *same* origin, auth cookies, CORS and
// Socket.io all work with no extra wiring — the desktop app behaves exactly
// like the website, just in its own window with no browser chrome.
//
// Two optional modes are kept for development / offline use:
//   --dev    load the local Vite dev server (http://localhost:5173)
//   --local  boot the bundled backend and run fully offline on SQLite
//
// You can also override the remote target with the MURMUR_URL env var.

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, dialog, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { fork } = require('child_process');

const REMOTE_URL = process.env.MURMUR_URL || 'https://murmur-social.onrender.com';
const DEV_RENDERER_URL = 'http://localhost:5173';
const LOCAL_PORT = 4000;
const LOCAL_ORIGIN = `http://localhost:${LOCAL_PORT}`;

const mode = process.argv.includes('--dev')
  ? 'dev'
  : process.argv.includes('--local')
    ? 'local'
    : 'remote';

let serverProcess = null;
let mainWindow = null;
let tray = null;
let quitting = false;

const ICON_PATH = path.join(__dirname, 'build', 'icon.png');

function showMainWindow() {
  if (!mainWindow) return;
  if (!mainWindow.isVisible()) mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

// System-tray icon so the app keeps running (and receiving notifications) after
// the window is closed — like Telegram. Closing the window hides it here.
function createTray() {
  if (tray) return;
  let image = nativeImage.createFromPath(ICON_PATH);
  if (!image.isEmpty()) image = image.resize({ width: 16, height: 16 });
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
  tray.setToolTip('Murmur');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Murmur', click: showMainWindow },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', showMainWindow);
}

// ───────────────────────── Local (offline) backend ──────────────────────────
function localPaths() {
  if (app.isPackaged) {
    const base = path.join(process.resourcesPath, 'app');
    return {
      serverCwd: path.join(base, 'server'),
      serverEntry: path.join(base, 'server', 'dist', 'index.js'),
    };
  }
  const repoRoot = path.join(__dirname, '..');
  return {
    serverCwd: path.join(repoRoot, 'server'),
    serverEntry: path.join(repoRoot, 'server', 'dist', 'index.js'),
  };
}

function loadSecrets() {
  const file = path.join(app.getPath('userData'), 'secrets.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    const secrets = {
      JWT_ACCESS_SECRET: crypto.randomBytes(32).toString('hex'),
      JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'),
    };
    fs.writeFileSync(file, JSON.stringify(secrets, null, 2));
    return secrets;
  }
}

function ensureDatabase(serverCwd) {
  const dbPath = path.join(app.getPath('userData'), 'murmur.db');
  if (!fs.existsSync(dbPath)) {
    fs.copyFileSync(path.join(serverCwd, 'prisma', 'template.db'), dbPath);
  }
  return `file:${dbPath.replace(/\\/g, '/')}`;
}

function startLocalServer() {
  const { serverCwd, serverEntry } = localPaths();
  const databaseUrl = ensureDatabase(serverCwd);
  const secrets = loadSecrets();

  serverProcess = fork(serverEntry, [], {
    cwd: serverCwd,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production', // serve the built client + persist uploads in the DB
      DESKTOP: '1', // keep cookies Lax/insecure for same-origin localhost
      PORT: String(LOCAL_PORT),
      API_URL: LOCAL_ORIGIN,
      CLIENT_URL: LOCAL_ORIGIN,
      DATABASE_URL: databaseUrl,
      ...secrets,
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  serverProcess.stdout?.on('data', (d) => process.stdout.write(`[server] ${d}`));
  serverProcess.stderr?.on('data', (d) => process.stderr.write(`[server] ${d}`));
  serverProcess.on('exit', (code) => {
    serverProcess = null;
    if (code && code !== 0 && !quitting) {
      dialog.showErrorBox('Murmur', `The backend stopped unexpectedly (code ${code}).`);
      app.quit();
    }
  });
}

function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(`${LOCAL_ORIGIN}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else retry();
      });
      req.on('error', retry);
      req.setTimeout(2000, () => req.destroy());
    };
    const retry = () => {
      if (Date.now() > deadline) reject(new Error('Backend did not start in time'));
      else setTimeout(attempt, 400);
    };
    attempt();
  });
}

// ──────────────────────────────── Window ────────────────────────────────────
function createWindow(url, { devtools = false } = {}) {
  const appOrigin = (() => {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  })();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    title: 'Murmur',
    icon: ICON_PATH,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Keep timers and the realtime socket alive when the window is hidden in
      // the tray, so message/notification toasts still arrive.
      backgroundThrottling: false,
    },
  });

  // Grant only permissions Murmur uses, and only to the configured app origin.
  const allowedPermissions = new Set([
    'media',
    'display-capture', // screen sharing
    'notifications',
    'clipboard-sanitized-write',
  ]);
  const isTrustedOrigin = (value) => {
    try {
      return !!appOrigin && new URL(value).origin === appOrigin;
    } catch {
      return false;
    }
  };
  mainWindow.webContents.session.setPermissionRequestHandler((wc, permission, cb, details) => {
    const requestingUrl = details?.requestingUrl || wc.getURL();
    cb(isTrustedOrigin(requestingUrl) && allowedPermissions.has(permission));
  });
  mainWindow.webContents.session.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    return isTrustedOrigin(requestingOrigin) && allowedPermissions.has(permission);
  });

  // Screen sharing (getDisplayMedia) needs an explicit source in Electron;
  // auto-grant the primary screen so "Share screen" works without a picker.
  if (mainWindow.webContents.session.setDisplayMediaRequestHandler) {
    mainWindow.webContents.session.setDisplayMediaRequestHandler((_request, callback) => {
      desktopCapturer
        .getSources({ types: ['screen'] })
        .then((sources) => callback(sources[0] ? { video: sources[0] } : undefined))
        .catch(() => callback(undefined));
    });
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Closing the window hides it to the tray instead of quitting.
  mainWindow.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    try {
      const parsed = new URL(target);
      if (appOrigin && parsed.origin === appOrigin) {
        mainWindow.loadURL(target);
      } else if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
        shell.openExternal(target);
      }
    } catch {
      // Deny malformed and unknown URLs.
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, target) => {
    try {
      const parsed = new URL(target);
      if (appOrigin && parsed.origin !== appOrigin && ['http:', 'https:'].includes(parsed.protocol)) {
        event.preventDefault();
        shell.openExternal(target);
      }
    } catch {
      event.preventDefault();
    }
  });

  mainWindow.loadURL(url);
  if (devtools) mainWindow.webContents.openDevTools({ mode: 'detach' });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function boot() {
  createTray();

  if (mode === 'dev') {
    createWindow(DEV_RENDERER_URL, { devtools: true });
    return;
  }

  if (mode === 'local') {
    startLocalServer();
    try {
      await waitForServer();
    } catch (err) {
      dialog.showErrorBox('Murmur', `Could not reach the local backend.\n\n${err.message}`);
      app.quit();
      return;
    }
    createWindow(LOCAL_ORIGIN);
    return;
  }

  // Default: wrap the live site.
  createWindow(REMOTE_URL);
}

// ─────────────────────────────── Lifecycle ──────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showMainWindow);

  // A clicked OS notification asks the shell to bring the window back.
  ipcMain.on('murmur:focus', showMainWindow);

  app.whenReady().then(boot);

  app.on('activate', () => {
    if (mainWindow) showMainWindow();
    else boot();
  });
}

// The app lives in the tray; don't quit just because the window was closed.
app.on('window-all-closed', () => {});

app.on('before-quit', () => {
  quitting = true;
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
