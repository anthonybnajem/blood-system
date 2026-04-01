const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: () => ipcRenderer.invoke("electron:is-electron"),
  getVersion: () => ipcRenderer.invoke("electron:get-version"),
  openExternal: (url) => ipcRenderer.invoke("electron:open-external", url),
  getUpdateState: () => ipcRenderer.invoke("electron:get-update-state"),
  checkForUpdates: () => ipcRenderer.invoke("electron:check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("electron:download-update"),
  quitAndInstallUpdate: () => ipcRenderer.invoke("electron:quit-and-install-update"),
  onUpdateState: (listener) => {
    const wrappedListener = (_event, value) => listener(value);
    ipcRenderer.on("electron:update-state", wrappedListener);
    return () => {
      ipcRenderer.removeListener("electron:update-state", wrappedListener);
    };
  },
});
