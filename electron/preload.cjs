const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: () => ipcRenderer.invoke("electron:is-electron"),
  getVersion: () => ipcRenderer.invoke("electron:get-version"),
  openExternal: (url) => ipcRenderer.invoke("electron:open-external", url),
});
