const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('localApi', {
  request: (request) => ipcRenderer.invoke('local-api:request', request),
});
