const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tenbaseDesktop", {
  getAppInfo: () => ipcRenderer.invoke("tenbase:app-info"),
});
