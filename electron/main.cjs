const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");

const port = Number(process.env.PORT || (app.isPackaged ? "3210" : "3000"));
const isDev = process.env.ELECTRON_DEV === "1";
const externalStartUrl = process.env.ELECTRON_START_URL || "";
const startUrlFromPort = `http://127.0.0.1:${port}`;
let nextServerProcess = null;
let updaterInitialized = false;
let updateState = {
  supported: false,
  configured: false,
  status: "unavailable",
  message: "Updates are only available in packaged desktop builds.",
  currentVersion: app.getVersion(),
  availableVersion: null,
  downloadedVersion: null,
  progressPercent: null,
};

function broadcastUpdateState() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("electron:update-state", updateState);
  }
}

function setUpdateState(patch) {
  updateState = {
    ...updateState,
    ...patch,
  };
  broadcastUpdateState();
}

function getRuntimeUpdateFeedUrl() {
  const rawUrl = process.env.AUTO_UPDATE_URL || process.env.DESKTOP_UPDATE_URL;
  if (!rawUrl) {
    return "";
  }

  return rawUrl.trim().replace(/\/+$/, "");
}

function getRuntimeGitHubRepo() {
  const rawRepo = process.env.GITHUB_UPDATER_REPOSITORY || process.env.GITHUB_REPOSITORY;
  if (!rawRepo) {
    return null;
  }

  const [owner, repo] = rawRepo.trim().split("/", 2);
  if (!owner || !repo) {
    return null;
  }

  return { owner, repo };
}

function hasBundledUpdateConfig() {
  return fs.existsSync(path.join(process.resourcesPath, "app-update.yml"));
}

function initializeUpdater() {
  if (updaterInitialized) {
    return;
  }
  updaterInitialized = true;

  if (!app.isPackaged) {
    setUpdateState({
      supported: false,
      configured: false,
      status: "unavailable",
      message: "Updater is disabled while running in development mode.",
    });
    return;
  }

  const runtimeFeedUrl = getRuntimeUpdateFeedUrl();
  const runtimeGitHubRepo = getRuntimeGitHubRepo();
  const bundledConfigExists = hasBundledUpdateConfig();

  if (!bundledConfigExists && !runtimeFeedUrl && !runtimeGitHubRepo) {
    setUpdateState({
      supported: true,
      configured: false,
      status: "unavailable",
      message: "No GitHub release or direct update feed is configured for this build.",
    });
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  if (runtimeFeedUrl) {
    autoUpdater.setFeedURL({
      provider: "generic",
      url: runtimeFeedUrl,
    });
  } else if (runtimeGitHubRepo) {
    autoUpdater.setFeedURL({
      provider: "github",
      owner: runtimeGitHubRepo.owner,
      repo: runtimeGitHubRepo.repo,
      releaseType: "release",
    });
  }

  autoUpdater.on("checking-for-update", () => {
    setUpdateState({
      supported: true,
      configured: true,
      status: "checking",
      message: "Checking for updates...",
      progressPercent: null,
    });
  });

  autoUpdater.on("update-available", (info) => {
    setUpdateState({
      supported: true,
      configured: true,
      status: "available",
      message: `Version ${info.version} is available.`,
      availableVersion: info.version || null,
      downloadedVersion: null,
      progressPercent: null,
    });
  });

  autoUpdater.on("update-not-available", () => {
    setUpdateState({
      supported: true,
      configured: true,
      status: "idle",
      message: "This device is already on the latest version.",
      availableVersion: null,
      downloadedVersion: null,
      progressPercent: null,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    setUpdateState({
      supported: true,
      configured: true,
      status: "downloading",
      message: `Downloading update... ${Math.round(progress.percent)}%`,
      progressPercent: progress.percent,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    setUpdateState({
      supported: true,
      configured: true,
      status: "downloaded",
      message: "Update downloaded. Restart to install it.",
      downloadedVersion: info.version || updateState.availableVersion,
      progressPercent: 100,
    });
  });

  autoUpdater.on("error", (error) => {
    setUpdateState({
      supported: true,
      configured: bundledConfigExists || Boolean(runtimeFeedUrl) || Boolean(runtimeGitHubRepo),
      status: "error",
      message: error?.message || "The updater failed.",
      progressPercent: null,
    });
  });

  setUpdateState({
    supported: true,
    configured: true,
    status: "idle",
    message: "Ready to check for updates.",
  });
}

function waitForServer(url, timeoutMs = 30_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });
      req.on("error", retry);
    };

    const retry = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Timed out waiting for server at ${url}`));
        return;
      }
      setTimeout(probe, 300);
    };

    probe();
  });
}

function runNodeScript(scriptPath, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env,
        ELECTRON_RUN_AS_NODE: "1",
      },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Script failed: ${scriptPath} (exit ${code ?? 1})`));
    });
  });
}

async function startBundledServer() {
  const bundledAppDir = path.join(process.resourcesPath, "app");
  const serverEntry = path.join(bundledAppDir, "server.js");
  const dbSetupScript = path.join(bundledAppDir, "scripts", "setup-sqlite.mjs");
  const sqliteSchemaPath = path.join(bundledAppDir, "sql", "sqlite-schema.sql");

  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Missing bundled Next server: ${serverEntry}`);
  }
  if (!fs.existsSync(dbSetupScript)) {
    throw new Error(`Missing bundled DB setup script: ${dbSetupScript}`);
  }
  if (!fs.existsSync(sqliteSchemaPath)) {
    throw new Error(`Missing bundled SQLite schema: ${sqliteSchemaPath}`);
  }

  const userDataPath = app.getPath("userData");
  const dataDir = path.join(userDataPath, "data");
  const backupDir = path.join(dataDir, "backups");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const runtimeEnv = {
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    SQLITE_DB_PATH: path.join(dataDir, "app.sqlite"),
    SQLITE_BACKUP_DIR: backupDir,
    SQLITE_SCHEMA_PATH: sqliteSchemaPath,
  };

  await runNodeScript(dbSetupScript, {
    cwd: bundledAppDir,
    env: runtimeEnv,
  });

  nextServerProcess = spawn(process.execPath, [serverEntry], {
    cwd: bundledAppDir,
    env: {
      ...process.env,
      ...runtimeEnv,
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: "inherit",
  });

  nextServerProcess.once("exit", (code) => {
    if (code && code !== 0) {
      console.error(`Bundled Next server exited with code ${code}`);
    }
  });

  await waitForServer(startUrlFromPort);
  return startUrlFromPort;
}

function stopBundledServer() {
  if (nextServerProcess && !nextServerProcess.killed) {
    nextServerProcess.kill("SIGTERM");
  }
  nextServerProcess = null;
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

function injectBaseHref(html, baseUrl) {
  if (!baseUrl) {
    return html;
  }

  const baseTag = `<base href="${escapeHtmlAttribute(baseUrl)}" />`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  }

  return `${baseTag}${html}`;
}

function createWindow(startUrl) {
  const startOrigin = new URL(startUrl).origin;

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url || url === "about:blank") {
      return { action: "allow" };
    }

    try {
      const targetUrl = new URL(url, startUrl);
      if (targetUrl.origin === startOrigin) {
        return { action: "allow" };
      }
    } catch (_error) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== startOrigin) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.loadURL(startUrl);
  win.webContents.once("did-finish-load", () => {
    win.webContents.send("electron:update-state", updateState);
  });

  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }
}

ipcMain.handle("electron:is-electron", () => true);
ipcMain.handle("electron:get-version", () => app.getVersion());
ipcMain.handle("electron:open-external", async (_event, url) => {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    return false;
  }
  await shell.openExternal(url);
  return true;
});
ipcMain.handle("electron:open-print-preview", async (event, payload) => {
  const html = typeof payload?.html === "string" ? payload.html : "";
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const baseUrl = typeof payload?.baseUrl === "string" ? payload.baseUrl.trim() : "";

  if (!html) {
    return false;
  }

  const parentWindow = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || null;
  const previewWindow = new BrowserWindow({
    width: 1024,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    parent: parentWindow || undefined,
    backgroundColor: "#f3f1ec",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  previewWindow.once("ready-to-show", () => {
    previewWindow.show();
  });

  await previewWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(injectBaseHref(html, baseUrl))}`
  );

  if (title) {
    previewWindow.setTitle(title);
  }

  return true;
});
ipcMain.handle("electron:get-update-state", () => updateState);
ipcMain.handle("electron:check-for-updates", async () => {
  initializeUpdater();
  if (!updateState.configured) {
    return updateState;
  }

  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setUpdateState({
      status: "error",
      message: error?.message || "Could not check for updates.",
      progressPercent: null,
    });
  }

  return updateState;
});
ipcMain.handle("electron:download-update", async () => {
  initializeUpdater();
  if (!updateState.configured) {
    return updateState;
  }

  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    setUpdateState({
      status: "error",
      message: error?.message || "Could not download the update.",
      progressPercent: null,
    });
  }

  return updateState;
});
ipcMain.handle("electron:quit-and-install-update", () => {
  initializeUpdater();
  if (updateState.status === "downloaded") {
    autoUpdater.quitAndInstall();
    return true;
  }
  return false;
});

app.whenReady().then(async () => {
  try {
    initializeUpdater();
    let resolvedStartUrl = externalStartUrl || startUrlFromPort;
    if (app.isPackaged && !externalStartUrl) {
      resolvedStartUrl = await startBundledServer();
    }

    createWindow(resolvedStartUrl);
  } catch (error) {
    console.error("Electron startup failed:", error);
    app.quit();
    return;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const fallbackUrl = externalStartUrl || startUrlFromPort;
      createWindow(fallbackUrl);
    }
  });
});

app.on("window-all-closed", () => {
  stopBundledServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopBundledServer();
});
