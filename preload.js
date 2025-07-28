const { ipcRenderer } = require('electron');

// Expose IPC methods ke window object
window.electronAPI = {
  // Server management
  getServers: () => ipcRenderer.invoke('get-servers'),
  getCurrentServer: () => ipcRenderer.invoke('get-current-server'),
  addServer: (serverData) => ipcRenderer.invoke('add-server', serverData),
  updateServer: (id, serverData) => ipcRenderer.invoke('update-server', id, serverData),
  deleteServer: (id) => ipcRenderer.invoke('delete-server', id),
  setActiveServer: (id) => ipcRenderer.invoke('set-active-server', id),
  
  // Status checking
  checkServerStatus: (serverId) => ipcRenderer.invoke('check-server-status', serverId),
  checkAllServers: () => ipcRenderer.invoke('check-all-servers'),
  
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (config) => ipcRenderer.invoke('update-config', config),

  // Alert functionality
  showAlert: (type, title, message) => ipcRenderer.invoke('show-alert', type, title, message),
  showConfirmation: (title, message) => ipcRenderer.invoke('show-confirmation', title, message),
  showPasswordDialog: (serverInfo) => ipcRenderer.invoke('show-password-dialog', serverInfo),
  
  // Event listeners
  onServersUpdated: (callback) => {
    const wrappedCallback = (event, ...args) => callback(event, ...args);
    ipcRenderer.on('servers-updated', wrappedCallback);
    return () => ipcRenderer.off('servers-updated', wrappedCallback);
  },
  
  onServerSwitched: (callback) => {
    const wrappedCallback = (event, ...args) => callback(event, ...args);
    ipcRenderer.on('server-switched', wrappedCallback);
    return () => ipcRenderer.off('server-switched', wrappedCallback);
  },
  
  onToggleSidebar: (callback) => {
    const wrappedCallback = (event, ...args) => callback(event, ...args);
    ipcRenderer.on('toggle-sidebar', wrappedCallback);
    return () => ipcRenderer.off('toggle-sidebar', wrappedCallback);
  },

  onShowPasswordDialog: (callback) => {
    const wrappedCallback = (event, ...args) => callback(event, ...args);
    ipcRenderer.on('show-password-dialog', wrappedCallback);
    return () => ipcRenderer.off('show-password-dialog', wrappedCallback);
  },
  
  // Send password response
  sendPasswordResponse: (password) => ipcRenderer.send('password-dialog-response', password),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
};

// Initialize persistent sidebar state management
window.addEventListener('DOMContentLoaded', () => {
  // Store reference to sidebar functions globally
  window.sidebarState = {
    isOpen: false,
    servers: [],
    currentServer: null
  };
});

console.log('Preload script loaded successfully');