const path = require("node:path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");

const port = process.env.PORT || "3000";
const isDev = process.env.ELECTRON_DEV === "1" || !app.isPackaged;
const startUrl =
  process.env.ELECTRON_START_URL || `http://localhost:${port}`;

function createWindow() {
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

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
