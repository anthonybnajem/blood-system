const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { app, BrowserWindow, ipcMain, shell } = require("electron");

const port = Number(process.env.PORT || (app.isPackaged ? "3210" : "3000"));
const isDev = process.env.ELECTRON_DEV === "1";
const externalStartUrl = process.env.ELECTRON_START_URL || "";
const startUrlFromPort = `http://127.0.0.1:${port}`;
let nextServerProcess = null;

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

app.whenReady().then(async () => {
  try {
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
