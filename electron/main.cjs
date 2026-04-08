const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { spawn, spawnSync } = require("node:child_process");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");

const port = Number(process.env.PORT || (app.isPackaged ? "3210" : "3000"));
const isDev = process.env.ELECTRON_DEV === "1";
const externalStartUrl = process.env.ELECTRON_START_URL || "";
const startUrlFromPort = `http://127.0.0.1:${port}`;
let nextServerProcess = null;
let stopBundledServerPromise = null;
let isAwaitingBundledServerShutdown = false;
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

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

function serializeForLog(value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value && typeof value === "object") {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_error) {
      return String(value);
    }
  }

  return value;
}

function getDesktopLogPath() {
  try {
    const logDir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(logDir, { recursive: true });
    return path.join(logDir, "desktop-main.log");
  } catch (_error) {
    return path.join(process.cwd(), "desktop-main.log");
  }
}

function traceDesktop(event, details) {
  const payload =
    details === undefined ? undefined : serializeForLog(details);
  const line = `[${new Date().toISOString()}] ${event}${
    payload === undefined ? "" : ` ${JSON.stringify(payload)}`
  }\n`;

  try {
    fs.appendFileSync(getDesktopLogPath(), line, "utf8");
  } catch (_error) {}

  if (payload === undefined) {
    console.log(`[desktop] ${event}`);
    return;
  }

  console.log(`[desktop] ${event}`, payload);
}

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
  traceDesktop("update-state", updateState);
  broadcastUpdateState();
}

function markUpdateAsDownloaded(version) {
  setUpdateState({
    supported: true,
    configured: true,
    status: "downloaded",
    message: "Update downloaded. Restart to install it.",
    downloadedVersion: version || updateState.availableVersion,
    progressPercent: 100,
  });
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

  const bundledConfigExists = hasBundledUpdateConfig();

  traceDesktop("updater-config-detected", {
    bundledConfigExists,
    updateConfigPath: path.join(process.resourcesPath, "app-update.yml"),
  });

  if (!bundledConfigExists) {
    setUpdateState({
      supported: true,
      configured: false,
      status: "unavailable",
      message: "This packaged build is missing app-update.yml, so desktop updates are unavailable.",
    });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = process.platform === "win32";

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
      status: "downloading",
      message: `Version ${info.version} is available. Downloading now...`,
      availableVersion: info.version || null,
      downloadedVersion: null,
      progressPercent: 0,
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
    markUpdateAsDownloaded(info.version);
  });

  autoUpdater.on("error", (error) => {
    setUpdateState({
      supported: true,
      configured: bundledConfigExists,
      status: "error",
      message: error?.message || "The updater failed.",
      progressPercent: null,
    });
  });

  setUpdateState({
    supported: true,
    configured: true,
    status: "idle",
    message: "Ready to check for updates from the packaged release feed.",
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
  traceDesktop("bundled-server-setup-complete", {
    port,
    bundledAppDir,
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
  traceDesktop("bundled-server-spawned", {
    pid: nextServerProcess.pid,
    serverEntry,
  });

  nextServerProcess.once("exit", (code) => {
    traceDesktop("bundled-server-exit", { code });
    if (code && code !== 0) {
      console.error(`Bundled Next server exited with code ${code}`);
    }
  });

  await waitForServer(startUrlFromPort);
  return startUrlFromPort;
}

function stopBundledServer() {
  if (stopBundledServerPromise) {
    traceDesktop("bundled-server-stop-reused");
    return stopBundledServerPromise;
  }

  stopBundledServerPromise = new Promise((resolve) => {
    if (!nextServerProcess || nextServerProcess.killed) {
      traceDesktop("bundled-server-stop-skipped");
      nextServerProcess = null;
      resolve();
      return;
    }

    const processToStop = nextServerProcess;
    nextServerProcess = null;
    traceDesktop("bundled-server-stop-start", {
      pid: processToStop.pid,
      platform: process.platform,
    });

    let finished = false;
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      traceDesktop("bundled-server-stop-finished", {
        pid: processToStop.pid,
      });
      resolve();
    };

    if (process.platform === "win32" && processToStop.pid) {
      try {
        const killer = spawn("taskkill", ["/pid", String(processToStop.pid), "/t", "/f"], {
          stdio: "ignore",
        });
        traceDesktop("bundled-server-stop-taskkill", {
          pid: processToStop.pid,
          killerPid: killer.pid,
        });
        killer.once("exit", finish);
        killer.once("error", () => {
          traceDesktop("bundled-server-stop-taskkill-error", {
            pid: processToStop.pid,
          });
          try {
            processToStop.kill();
          } catch (_killError) {}
          finish();
        });
      } catch (_error) {
        traceDesktop("bundled-server-stop-taskkill-spawn-failed", {
          pid: processToStop.pid,
        });
        try {
          processToStop.kill();
        } catch (_killError) {}
        finish();
      }
    } else {
      try {
        processToStop.once("exit", finish);
        processToStop.kill("SIGKILL");
      } catch (_error) {
        finish();
      }
    }
  }).finally(() => {
    traceDesktop("bundled-server-stop-promise-cleared");
    stopBundledServerPromise = null;
  });

  return stopBundledServerPromise;
}

function scheduleWindowsUninstaller(uninstallPath) {
  const escapedPath = uninstallPath.replace(/"/g, '""');
  const launcher = spawn(
    "cmd",
    [
      "/d",
      "/s",
      "/c",
      `ping 127.0.0.1 -n 2 > nul && start "" "${escapedPath}"`,
    ],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }
  );
  launcher.unref();
  traceDesktop("uninstaller-launcher-spawned", {
    launcherPid: launcher.pid,
    uninstallPath,
  });
  return true;
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

function findWindowsUninstallerPath() {
  if (process.platform !== "win32") {
    return null;
  }

  const installDir = path.dirname(process.execPath);
  const preferredNames = [
    `Uninstall ${app.getName()}.exe`,
    "Uninstall Blood System.exe",
    "Uninstall.exe",
  ];

  for (const name of preferredNames) {
    const candidate = path.join(installDir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const entries = fs.readdirSync(installDir);
    const matched = entries.find((entry) => /^uninstall.*\.exe$/i.test(entry));
    if (matched) {
      return path.join(installDir, matched);
    }
  } catch (_error) {
    // Fall through to registry lookup.
  }

  const registryPath = findWindowsUninstallerPathFromRegistry(installDir);
  if (registryPath) {
    return registryPath;
  }

  return null;
}

function parseExecutablePath(command) {
  const raw = String(command || "").trim();
  if (!raw) {
    return null;
  }

  if (raw.startsWith('"')) {
    const endQuote = raw.indexOf('"', 1);
    if (endQuote > 1) {
      return raw.slice(1, endQuote);
    }
  }

  const exeIndex = raw.toLowerCase().indexOf(".exe");
  if (exeIndex !== -1) {
    return raw.slice(0, exeIndex + 4).trim();
  }

  return null;
}

function findWindowsUninstallerPathFromRegistry(installDir) {
  const registryRoots = [
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  ];
  const normalizedInstallDir = installDir.toLowerCase();
  const candidateNames = new Set(
    [app.getName(), "Blood System", "lab-system-zgharta"].map((value) =>
      String(value || "").trim().toLowerCase()
    )
  );

  for (const root of registryRoots) {
    const result = spawnSync("reg", ["query", root, "/s"], {
      encoding: "utf8",
      windowsHide: true,
    });

    if (result.status !== 0 || !result.stdout) {
      traceDesktop("uninstaller-registry-query-failed", {
        root,
        status: result.status,
        stderr: result.stderr || "",
      });
      continue;
    }

    const lines = result.stdout.split(/\r?\n/);
    let currentKey = "";
    let displayName = "";
    let uninstallString = "";
    let installLocation = "";

    const flush = () => {
      const executablePath = parseExecutablePath(uninstallString);
      if (!executablePath) {
        return null;
      }

      const normalizedExecutablePath = executablePath.toLowerCase();
      const normalizedLocation = installLocation.toLowerCase();
      const displayNameMatches =
        displayName && candidateNames.has(displayName.toLowerCase());
      const installLocationMatches =
        normalizedLocation && normalizedLocation === normalizedInstallDir;
      const uninstallPathMatches = normalizedExecutablePath.startsWith(normalizedInstallDir);

      if (displayNameMatches || installLocationMatches || uninstallPathMatches) {
        traceDesktop("uninstaller-registry-match", {
          currentKey,
          displayName,
          installLocation,
          executablePath,
        });
        return executablePath;
      }

      return null;
    };

    for (const line of lines) {
      if (!line.trim()) {
        const match = flush();
        if (match) {
          return match;
        }
        currentKey = "";
        displayName = "";
        uninstallString = "";
        installLocation = "";
        continue;
      }

      if (/^HKEY_/i.test(line)) {
        currentKey = line.trim();
        continue;
      }

      const valueMatch = line.match(/^\s+([^\s]+)\s+REG_\w+\s+(.*)$/);
      if (!valueMatch) {
        continue;
      }

      const [, name, value] = valueMatch;
      if (name === "DisplayName") {
        displayName = value.trim();
      } else if (name === "UninstallString") {
        uninstallString = value.trim();
      } else if (name === "InstallLocation") {
        installLocation = value.trim();
      }
    }

    const lastMatch = flush();
    if (lastMatch) {
      return lastMatch;
    }
  }

  traceDesktop("uninstaller-registry-no-match", { installDir });
  return null;
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
    const result = await autoUpdater.checkForUpdates();
    if (result?.downloadPromise) {
      void result.downloadPromise
        .then(() => {
          if (updateState.status === "downloading") {
            markUpdateAsDownloaded(result.updateInfo?.version);
          }
        })
        .catch((error) => {
          setUpdateState({
            status: "error",
            message: error?.message || "Could not download the update.",
            progressPercent: null,
          });
        });
    }
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
ipcMain.handle("electron:quit-and-install-update", async () => {
  initializeUpdater();
  if (updateState.status === "downloaded") {
    traceDesktop("quit-and-install-requested", {
      version: updateState.downloadedVersion || updateState.availableVersion,
    });
    await stopBundledServer();
    autoUpdater.quitAndInstall(true, true);
    return true;
  }
  return false;
});
ipcMain.handle("electron:get-uninstall-info", () => {
  const userDataPath = app.getPath("userData");
  return {
    supported: process.platform === "win32" && app.isPackaged,
    platform: process.platform,
    userDataPath,
    dataPath: path.join(userDataPath, "data"),
    uninstallPath: findWindowsUninstallerPath(),
  };
});
ipcMain.handle("electron:launch-uninstaller", async () => {
  if (process.platform !== "win32" || !app.isPackaged) {
    traceDesktop("uninstaller-launch-unsupported", {
      platform: process.platform,
      isPackaged: app.isPackaged,
    });
    return false;
  }

  const uninstallPath = findWindowsUninstallerPath();
  if (uninstallPath) {
    traceDesktop("uninstaller-launch-requested", { uninstallPath });
    await stopBundledServer();
    scheduleWindowsUninstaller(uninstallPath);
    isAwaitingBundledServerShutdown = true;
    for (const win of BrowserWindow.getAllWindows()) {
      win.close();
    }
    setTimeout(() => {
      traceDesktop("app-quit-for-uninstall");
      app.quit();
    }, 100);
    return true;
  }

  traceDesktop("uninstaller-not-found-opening-settings");
  await shell.openExternal("ms-settings:appsfeatures");
  return true;
});

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) {
    return;
  }

  try {
    traceDesktop("app-ready", {
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      platform: process.platform,
    });
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
    traceDesktop("app-activate");
    if (BrowserWindow.getAllWindows().length === 0) {
      const fallbackUrl = externalStartUrl || startUrlFromPort;
      createWindow(fallbackUrl);
    }
  });
});

app.on("second-instance", () => {
  traceDesktop("app-second-instance");
  const [existingWindow] = BrowserWindow.getAllWindows();
  if (!existingWindow) {
    return;
  }

  if (existingWindow.isMinimized()) {
    existingWindow.restore();
  }

  existingWindow.focus();
});

app.on("window-all-closed", () => {
  traceDesktop("window-all-closed");
  void stopBundledServer().finally(() => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
});

app.on("before-quit", (event) => {
  traceDesktop("before-quit", {
    awaitingShutdown: isAwaitingBundledServerShutdown,
  });
  if (isAwaitingBundledServerShutdown) {
    return;
  }

  event.preventDefault();
  isAwaitingBundledServerShutdown = true;
  void stopBundledServer().finally(() => {
    traceDesktop("before-quit-resume");
    app.quit();
  });
});

app.on("will-quit", () => {
  traceDesktop("will-quit");
});

app.on("quit", (_event, exitCode) => {
  traceDesktop("quit", { exitCode });
});

process.on("uncaughtException", (error) => {
  traceDesktop("uncaught-exception", error);
});

process.on("unhandledRejection", (reason) => {
  traceDesktop("unhandled-rejection", reason);
});
