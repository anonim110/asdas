// Minimal preload. The renderer is the standard web client and needs no Node
// access; context isolation stays on. We expose only a tiny, safe bridge so the
// web app can (a) know it runs inside the desktop shell and (b) ask the main
// process to bring the window back from the tray when a notification is clicked.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('murmurDesktop', {
  isDesktop: true,
  platform: process.platform,
  focus: () => ipcRenderer.send('murmur:focus'),
});
