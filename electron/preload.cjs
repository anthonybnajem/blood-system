const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: () => ipcRenderer.invoke("electron:is-electron"),
  getVersion: () => ipcRenderer.invoke("electron:get-version"),
  openExternal: (url) => ipcRenderer.invoke("electron:open-external", url),
  openPrintPreview: (payload) => ipcRenderer.invoke("electron:open-print-preview", payload),
  getUpdateState: () => ipcRenderer.invoke("electron:get-update-state"),
  checkForUpdates: () => ipcRenderer.invoke("electron:check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("electron:download-update"),
  quitAndInstallUpdate: () => ipcRenderer.invoke("electron:quit-and-install-update"),
  getUninstallInfo: () => ipcRenderer.invoke("electron:get-uninstall-info"),
  launchUninstaller: () => ipcRenderer.invoke("electron:launch-uninstaller"),
  onUpdateState: (listener) => {
    const wrappedListener = (_event, value) => listener(value);
    ipcRenderer.on("electron:update-state", wrappedListener);
    return () => {
      ipcRenderer.removeListener("electron:update-state", wrappedListener);
    };
  },
});
